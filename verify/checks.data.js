/**
 * Database integrity sweep - talks to PostgreSQL through Prisma directly.
 * These are the invariants the problem statement calls out as "real business logic":
 * period-based contracts, leave balance consumption, ordered salary rules,
 * and payroll error detection before finalisation.
 */
const path = require('path');
const { section, check, warn, assert } = require('./runner');

const ROOT = path.resolve(__dirname, '..');

function loadPrisma() {
  // Reuse the backend's own client + .env so we hit the same database the API does.
  require(path.join(ROOT, 'backend', 'node_modules', 'dotenv')).config({
    path: path.join(ROOT, 'backend', '.env'),
  });
  return require(path.join(ROOT, 'backend', 'src', 'config', 'database'));
}

const overlaps = (a, b) => {
  const aStart = new Date(a.startDate).getTime();
  const aEnd = a.endDate ? new Date(a.endDate).getTime() : Infinity;
  const bStart = new Date(b.startDate).getTime();
  const bEnd = b.endDate ? new Date(b.endDate).getTime() : Infinity;
  return aStart <= bEnd && bStart <= aEnd;
};

async function run() {
  const prisma = loadPrisma();

  section('DATA / Contract integrity (A2 - payroll must use one period contract)');

  await check('A2', 'No employee has more than one ACTIVE contract', async () => {
    const grouped = await prisma.contract.groupBy({
      by: ['employeeId'],
      where: { status: 'ACTIVE' },
      _count: { _all: true },
    });
    const bad = grouped.filter((g) => g._count._all > 1);
    assert(bad.length === 0,
      bad.length + ' employees have concurrent ACTIVE contracts (employeeIds: ' +
      bad.slice(0, 10).map((b) => b.employeeId).join(', ') + ') - payroll cannot pick a period contract');
    return grouped.length + ' employees with an active contract';
  });

  await check('A2', 'No employee has overlapping contract date ranges', async () => {
    const contracts = await prisma.contract.findMany({
      select: { id: true, employeeId: true, startDate: true, endDate: true, status: true },
      orderBy: [{ employeeId: 'asc' }, { startDate: 'asc' }],
    });
    const byEmp = new Map();
    for (const c of contracts) {
      if (!byEmp.has(c.employeeId)) byEmp.set(c.employeeId, []);
      byEmp.get(c.employeeId).push(c);
    }
    const clashes = [];
    for (const [empId, list] of byEmp) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          if (overlaps(list[i], list[j])) {
            clashes.push('employee ' + empId + ': contract #' + list[i].id + ' overlaps #' + list[j].id);
          }
        }
      }
    }
    assert(clashes.length === 0,
      clashes.length + ' overlapping ranges:\n       - ' + clashes.slice(0, 8).join('\n       - '));
    return contracts.length + ' contracts across ' + byEmp.size + ' employees';
  });

  await check('A2', 'Every ACTIVE employee has at least one contract', async () => {
    const orphans = await prisma.employee.findMany({
      where: { status: 'ACTIVE', contracts: { none: {} } },
      select: { id: true, employeeId: true, name: true },
    });
    if (orphans.length) {
      throw warn(orphans.length + ' active employees have no contract and will fail payroll: ' +
        orphans.slice(0, 6).map((e) => e.employeeId + ' ' + e.name).join(', '));
    }
    return 'all active employees contracted';
  });

  section('DATA / Time off integrity (A4/B4 - balances must reconcile)');

  await check('A4', 'Allocation remaining = allocated - taken for every row', async () => {
    const allocations = await prisma.timeOffAllocation.findMany();
    const bad = allocations.filter((a) => Math.abs(a.remainingDays - (a.allocatedDays - a.takenDays)) > 0.01);
    assert(bad.length === 0,
      bad.length + ' allocations out of balance, e.g. #' + (bad[0] && bad[0].id) + ': ' +
      (bad[0] && bad[0].allocatedDays) + ' - ' + (bad[0] && bad[0].takenDays) + ' != ' + (bad[0] && bad[0].remainingDays));
    return allocations.length + ' allocations balanced';
  });

  await check('B4', 'takenDays matches the sum of APPROVED requests per allocation', async () => {
    const allocations = await prisma.timeOffAllocation.findMany({
      include: { timeOffType: { select: { allocationRequired: true, name: true } } },
    });
    const approved = await prisma.timeOffRequest.findMany({
      where: { status: 'APPROVED' },
      select: { employeeId: true, timeOffTypeId: true, startDate: true, durationDays: true },
    });
    const sums = new Map();
    for (const r of approved) {
      const key = r.employeeId + ':' + r.timeOffTypeId + ':' + new Date(r.startDate).getFullYear();
      sums.set(key, (sums.get(key) || 0) + r.durationDays);
    }
    const drift = [];
    for (const a of allocations) {
      if (!a.timeOffType || !a.timeOffType.allocationRequired) continue;
      const expected = sums.get(a.employeeId + ':' + a.timeOffTypeId + ':' + a.year) || 0;
      if (Math.abs(a.takenDays - expected) > 0.01) {
        drift.push('allocation #' + a.id + ' (employee ' + a.employeeId + ', ' + a.timeOffType.name +
          ' ' + a.year + '): takenDays=' + a.takenDays + ' but approved requests total ' + expected);
      }
    }
    if (drift.length) {
      throw warn(drift.length + ' allocations drifted from their approved requests:\n       - ' +
        drift.slice(0, 6).join('\n       - '));
    }
    return allocations.length + ' allocations reconcile with ' + approved.length + ' approved requests';
  });

  await check('A4', 'No allocation is over-consumed (taken > allocated)', async () => {
    const over = await prisma.timeOffAllocation.findMany({ where: { remainingDays: { lt: 0 } } });
    assert(over.length === 0, over.length + ' allocations have a negative remaining balance');
    const raw = await prisma.timeOffAllocation.findMany();
    const bad = raw.filter((a) => a.takenDays > a.allocatedDays + 0.01);
    assert(bad.length === 0, bad.length + ' allocations have taken more days than allocated (ids: ' +
      bad.slice(0, 6).map((a) => a.id).join(', ') + ')');
    return 'no over-consumption';
  });

  section('DATA / Salary configuration integrity (A5/A6)');

  await check('A6', 'Salary rule codes are unique within each structure', async () => {
    const structures = await prisma.salaryStructure.findMany({ include: { salaryRules: true } });
    const dupes = [];
    for (const s of structures) {
      const seen = new Map();
      for (const r of s.salaryRules) {
        if (seen.has(r.code)) dupes.push(s.name + ': code "' + r.code + '" used by rules #' + seen.get(r.code) + ' and #' + r.id);
        seen.set(r.code, r.id);
      }
    }
    assert(dupes.length === 0, 'Duplicate rule codes break the sequential accumulator:\n       - ' + dupes.join('\n       - '));
    return structures.length + ' structures checked';
  });

  await check('A6', 'Every structure has BASIC and NET rules', async () => {
    const structures = await prisma.salaryStructure.findMany({ include: { salaryRules: true } });
    const incomplete = structures
      .filter((s) => s.salaryRules.length > 0)
      .filter((s) => {
        const cats = new Set(s.salaryRules.map((r) => r.category));
        return !cats.has('BASIC') || !cats.has('NET');
      })
      .map((s) => s.name);
    assert(incomplete.length === 0, 'structures without a BASIC or NET rule: ' + incomplete.join(', '));
    const empty = structures.filter((s) => s.salaryRules.length === 0).map((s) => s.name);
    if (empty.length) throw warn('structures with no rules at all (a payrun using them computes nothing): ' + empty.join(', '));
    return structures.length + ' structures complete';
  });

  section('DATA / Payroll integrity (B6/B7 - errors must surface before payment)');

  await check('B6', 'No duplicate payslip for the same employee in a payrun', async () => {
    const grouped = await prisma.payslip.groupBy({
      by: ['payrunId', 'employeeId'],
      _count: { _all: true },
    });
    const dupes = grouped.filter((g) => g._count._all > 1);
    assert(dupes.length === 0,
      dupes.length + ' duplicate payslips, e.g. payrun ' + (dupes[0] && dupes[0].payrunId) +
      ' employee ' + (dupes[0] && dupes[0].employeeId));
    return grouped.length + ' unique payrun/employee payslips';
  });

  await check('B7', 'Every computed payslip has itemised rule lines', async () => {
    const empty = await prisma.payslip.findMany({
      where: { status: { in: ['COMPUTED', 'VALIDATED', 'PAID'] }, payslipLines: { none: {} } },
      select: { id: true, payslipNumber: true, status: true },
    });
    assert(empty.length === 0,
      empty.length + ' non-draft payslips have no salary lines: ' +
      empty.slice(0, 6).map((p) => p.payslipNumber || p.id).join(', '));
    return 'all computed payslips itemised';
  });

  await check('B7', 'Payslip net equals gross minus deductions in the database', async () => {
    const slips = await prisma.payslip.findMany({
      where: { status: { in: ['COMPUTED', 'VALIDATED', 'PAID'] } },
      select: { id: true, payslipNumber: true, grossSalary: true, totalDeductions: true, netSalary: true },
    });
    const bad = slips.filter((s) => Math.abs(s.netSalary - (s.grossSalary - s.totalDeductions)) > 0.05);
    assert(bad.length === 0,
      bad.length + ' payslips do not reconcile, e.g. ' + (bad[0] && bad[0].payslipNumber) +
      ': ' + (bad[0] && bad[0].grossSalary) + ' - ' + (bad[0] && bad[0].totalDeductions) + ' != ' + (bad[0] && bad[0].netSalary));
    return slips.length + ' payslips reconcile';
  });

  await check('B7', 'No payslip has a non-positive net salary', async () => {
    const bad = await prisma.payslip.findMany({
      where: { status: { in: ['COMPUTED', 'VALIDATED', 'PAID'] }, netSalary: { lte: 0 } },
      select: { id: true, payslipNumber: true, netSalary: true },
    });
    assert(bad.length === 0, bad.length + ' payslips have net <= 0: ' +
      bad.slice(0, 6).map((p) => p.payslipNumber + '=' + p.netSalary).join(', '));
    return 'all nets positive';
  });

  await check('B7', 'Each payslip uses a contract that actually covers its payroll period', async () => {
    const slips = await prisma.payslip.findMany({
      where: { status: { in: ['COMPUTED', 'VALIDATED', 'PAID'] } },
      select: {
        payslipNumber: true, employeeId: true,
        contract: { select: { id: true, employeeId: true, startDate: true, endDate: true } },
        payrun: { select: { periodStart: true, periodEnd: true } },
      },
    });
    const bad = [];
    for (const s of slips) {
      if (!s.contract) { bad.push(s.payslipNumber + ': no contract'); continue; }
      if (s.contract.employeeId !== s.employeeId) {
        bad.push(s.payslipNumber + ': contract #' + s.contract.id + ' belongs to another employee');
        continue;
      }
      const start = new Date(s.contract.startDate);
      const end = s.contract.endDate ? new Date(s.contract.endDate) : null;
      // The contract must overlap the payrun period, not merely exist.
      if (start > new Date(s.payrun.periodEnd) || (end && end < new Date(s.payrun.periodStart))) {
        bad.push(s.payslipNumber + ': contract #' + s.contract.id + ' (' +
          String(s.contract.startDate).slice(0, 10) + '..' + String(s.contract.endDate || 'open').slice(0, 10) +
          ') does not cover period ' + String(s.payrun.periodStart).slice(0, 10) + '..' + String(s.payrun.periodEnd).slice(0, 10));
      }
    }
    assert(bad.length === 0,
      bad.length + ' payslips used a contract outside their period:\n       - ' + bad.slice(0, 6).join('\n       - '));
    return slips.length + ' payslips use a period-valid contract';
  });

  await check('B6', 'Payrun totals equal the sum of their payslips', async () => {
    const payruns = await prisma.payrun.findMany({
      where: { payslips: { some: {} } },
      select: {
        id: true, name: true, totalGross: true, totalDeductions: true, totalNet: true,
        payslips: { select: { grossSalary: true, totalDeductions: true, netSalary: true } },
      },
    });
    const drift = [];
    for (const p of payruns) {
      const sum = p.payslips.reduce(
        (acc, s) => ({
          gross: acc.gross + s.grossSalary,
          ded: acc.ded + s.totalDeductions,
          net: acc.net + s.netSalary,
        }),
        { gross: 0, ded: 0, net: 0 }
      );
      // Tolerance scales with the run: these are sums of hundreds of rounded values.
      const tol = Math.max(1, p.payslips.length * 0.5);
      if (Math.abs(p.totalGross - sum.gross) > tol || Math.abs(p.totalNet - sum.net) > tol) {
        drift.push(
          `#${p.id} "${p.name}": header gross ${p.totalGross}/net ${p.totalNet} vs payslips ` +
          `${Math.round(sum.gross)}/${Math.round(sum.net)} over ${p.payslips.length} slips`
        );
      }
    }
    assert(drift.length === 0, drift.length + ' payruns disagree with their payslips:\n       - ' + drift.slice(0, 5).join('\n       - '));
    return payruns.length + ' payruns reconcile with their payslips';
  });

  await check('B7', 'GROSS and NET line items match the payslip totals', async () => {
    const slips = await prisma.payslip.findMany({
      where: { status: { in: ['COMPUTED', 'VALIDATED', 'PAID'] } },
      select: {
        payslipNumber: true, grossSalary: true, netSalary: true,
        payslipLines: { select: { category: true, amount: true } },
      },
    });
    const bad = [];
    let withTotals = 0;
    for (const s of slips) {
      const grossLine = s.payslipLines.find((l) => l.category === 'GROSS');
      const netLine = s.payslipLines.find((l) => l.category === 'NET');
      if (!grossLine && !netLine) continue;
      withTotals++;
      if (grossLine && Math.abs(grossLine.amount - s.grossSalary) > 0.05) {
        bad.push(`${s.payslipNumber}: GROSS line ${grossLine.amount} != grossSalary ${s.grossSalary}`);
      }
      if (netLine && Math.abs(netLine.amount - s.netSalary) > 0.05) {
        bad.push(`${s.payslipNumber}: NET line ${netLine.amount} != netSalary ${s.netSalary}`);
      }
    }
    assert(bad.length === 0, bad.length + ' payslips have inconsistent subtotal lines:\n       - ' + bad.slice(0, 5).join('\n       - '));
    return withTotals + ' payslips carry GROSS/NET lines, all consistent';
  });

  await check('B6', 'PAID payruns have no PAID payslip left behind', async () => {
    const inconsistent = await prisma.payrun.findMany({
      where: { status: 'PAID', payslips: { some: { status: { not: 'PAID' } } } },
      select: { id: true, name: true },
    });
    assert(inconsistent.length === 0,
      inconsistent.length + ' PAID payruns contain unpaid payslips: ' +
      inconsistent.slice(0, 5).map((p) => '#' + p.id + ' ' + p.name).join(', '));
    return 'payrun/payslip statuses consistent';
  });

  section('DATA / Attendance integrity (B3)');

  await check('B3', 'No attendance record has check-out before check-in', async () => {
    const records = await prisma.attendance.findMany({
      where: { checkOut: { not: null } },
      select: { id: true, employeeId: true, checkIn: true, checkOut: true, workedHours: true },
    });
    const bad = records.filter((r) => new Date(r.checkOut) < new Date(r.checkIn));
    assert(bad.length === 0, bad.length + ' records check out before checking in (ids: ' +
      bad.slice(0, 6).map((r) => r.id).join(', ') + ')');
    const negative = records.filter((r) => r.workedHours != null && r.workedHours < 0);
    assert(negative.length === 0, negative.length + ' records have negative worked hours');
    return records.length + ' completed records valid';
  });

  await check('B3', 'No employee has two attendance records on the same day', async () => {
    const grouped = await prisma.attendance.groupBy({
      by: ['employeeId', 'date'],
      _count: { _all: true },
    });
    const dupes = grouped.filter((g) => g._count._all > 1);
    if (dupes.length) {
      throw warn(dupes.length + ' employee/day pairs have multiple attendance rows, e.g. employee ' +
        dupes[0].employeeId + ' on ' + new Date(dupes[0].date).toISOString().slice(0, 10));
    }
    return grouped.length + ' unique employee/day records';
  });

  section('DATA / Demo readiness');

  await check('DEMO', 'Employees selected for payroll have bank details', async () => {
    const missing = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ bankAccountNumber: null }, { bankIfscCode: null }, { bankAccountNumber: '' }, { bankIfscCode: '' }],
      },
      select: { employeeId: true, name: true },
    });
    if (missing.length) {
      throw warn(missing.length + ' active employees are missing bank details and will raise payroll warnings: ' +
        missing.slice(0, 6).map((e) => e.employeeId + ' ' + e.name).join(', '));
    }
    return 'all active employees have bank details';
  });

  await check('DEMO', 'Seed data covers every module needed for the walkthrough', async () => {
    const counts = {
      employees: await prisma.employee.count(),
      contracts: await prisma.contract.count(),
      schedules: await prisma.workingSchedule.count(),
      attendance: await prisma.attendance.count(),
      timeOffTypes: await prisma.timeOffType.count(),
      allocations: await prisma.timeOffAllocation.count(),
      requests: await prisma.timeOffRequest.count(),
      structures: await prisma.salaryStructure.count(),
      rules: await prisma.salaryRule.count(),
      payruns: await prisma.payrun.count(),
      payslips: await prisma.payslip.count(),
    };
    const thin = Object.keys(counts).filter((k) => counts[k] === 0);
    assert(thin.length === 0, 'no records at all for: ' + thin.join(', ') + ' - run `npm run seed` in backend/');
    return Object.keys(counts).map((k) => k + '=' + counts[k]).join(' ');
  });

  await check('DEMO', 'At least one PAID payrun exists for dashboard history', async () => {
    const paid = await prisma.payrun.count({ where: { status: 'PAID' } });
    if (paid === 0) {
      throw warn('no PAID payruns - "Total Net Salary Paid" and the monthly trend chart will render empty');
    }
    return paid + ' paid payruns';
  });

  await check('DEMO', 'Monthly trend chart has more than one month of history', async () => {
    const payruns = await prisma.payrun.findMany({
      where: { status: 'PAID' },
      select: { periodStart: true },
    });
    const months = new Set(payruns.map((p) => new Date(p.periodStart).toISOString().slice(0, 7)));
    if (months.size < 2) {
      throw warn('only ' + months.size + ' month(s) of paid payroll history - the trend chart will be a single point');
    }
    return months.size + ' months of history';
  });

  return prisma;
}

/** Remove artifacts created by the write-mode API run so demo data stays clean. */
async function cleanup(tag) {
  const prisma = loadPrisma();
  const removed = { payslipLines: 0, warnings: 0, payslips: 0, payruns: 0, requests: 0, allocations: 0 };

  const payruns = await prisma.payrun.findMany({
    where: { name: { contains: tag } },
    select: { id: true },
  });
  const payrunIds = payruns.map((p) => p.id);
  if (payrunIds.length) {
    const payslips = await prisma.payslip.findMany({
      where: { payrunId: { in: payrunIds } }, select: { id: true },
    });
    const payslipIds = payslips.map((p) => p.id);
    if (payslipIds.length) {
      removed.payslipLines = (await prisma.payslipLine.deleteMany({ where: { payslipId: { in: payslipIds } } })).count;
    }
    removed.warnings = (await prisma.payrollWarning.deleteMany({ where: { payrunId: { in: payrunIds } } })).count;
    removed.payslips = (await prisma.payslip.deleteMany({ where: { payrunId: { in: payrunIds } } })).count;
    removed.payruns = (await prisma.payrun.deleteMany({ where: { id: { in: payrunIds } } })).count;
  }

  const reqs = await prisma.timeOffRequest.findMany({
    where: { reason: { contains: tag } },
    select: { id: true, employeeId: true, timeOffTypeId: true, startDate: true, durationDays: true, status: true },
  });
  // Give back any balance the approved verification requests consumed.
  for (const r of reqs.filter((x) => x.status === 'APPROVED')) {
    const alloc = await prisma.timeOffAllocation.findFirst({
      where: { employeeId: r.employeeId, timeOffTypeId: r.timeOffTypeId, year: new Date(r.startDate).getFullYear() },
    });
    if (alloc) {
      const taken = Math.max(0, alloc.takenDays - r.durationDays);
      await prisma.timeOffAllocation.update({
        where: { id: alloc.id },
        data: { takenDays: taken, remainingDays: alloc.allocatedDays - taken },
      });
    }
  }
  removed.requests = (await prisma.timeOffRequest.deleteMany({ where: { reason: { contains: tag } } })).count;

  return removed;
}

module.exports = { run, cleanup, loadPrisma };
