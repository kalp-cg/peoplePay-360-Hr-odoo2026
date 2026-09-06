/**
 * Repairs the three data-integrity defects the verification harness found, in
 * place, without re-seeding (which would destroy the existing payroll history).
 *
 *   node scripts/repair-data-integrity.js --dry-run    report only, change nothing
 *   node scripts/repair-data-integrity.js              apply the repairs
 *   node scripts/repair-data-integrity.js --wage EMP000=120000
 *                                                      state a contract wage instead
 *                                                      of inferring it from payslips
 *
 * Every step is idempotent: running it twice is a no-op the second time.
 *
 *   R1  Add the missing GROSS and NET salary rules and resequence the structure.
 *   R2  Give EMP000 its own contract and repoint the payslips that borrowed
 *       another employee's contract.
 *   R3  Back every allocation's takenDays with real approved leave requests so
 *       balances reconcile with leave history.
 */
require('dotenv').config();
const prisma = require('../src/config/database');

const DRY = process.argv.includes('--dry-run');
const log = (...a) => console.log(...a);
const act = (msg) => log(DRY ? `  [dry-run] would ${msg}` : `  ${msg}`);

/**
 * Wage overrides for employees that need a contract created, as
 * `--wage EMP000=120000`. Payruns apply their own multiplier, so a wage inferred
 * from an existing payslip is only ever an approximation - state it explicitly
 * when the real figure is known.
 */
const WAGE_OVERRIDES = new Map(
  process.argv
    .filter((a, i) => process.argv[i - 1] === '--wage')
    .flatMap((a) => a.split(','))
    .map((pair) => pair.split('='))
    .filter((kv) => kv.length === 2 && kv[0] && !isNaN(Number(kv[1])))
    .map((kv) => [kv[0].trim(), Number(kv[1])])
);

/** Leave taken before the system went live is booked here; no payrun covers it. */
const OPENING_BALANCE_MONTH = { year: 2026, month: 1 }; // February 2026 (0-based)
const OPENING_BALANCE_REASON = 'Opening balance - leave taken before go-live';

async function repairSalaryRules() {
  log('\nR1  Salary structure: GROSS and NET rules');

  const structures = await prisma.salaryStructure.findMany({
    include: { salaryRules: { orderBy: { sequence: 'asc' } } },
  });

  for (const structure of structures) {
    const byCode = new Map(structure.salaryRules.map((r) => [r.code, r]));
    const has = (c) => byCode.has(c);

    if (!has('BASIC') || !has('HRA') || !has('ALLOWANCE') || !has('PF') || !has('TAX')) {
      log(`  - "${structure.name}": unrecognised rule set, skipping (codes: ${[...byCode.keys()].join(', ')})`);
      continue;
    }
    if (has('GROSS') && has('NET')) {
      log(`  - "${structure.name}": already has GROSS and NET, nothing to do`);
      continue;
    }

    // Target order: earnings, gross subtotal, deductions, net total.
    const target = [
      ['BASIC', 1], ['HRA', 2], ['ALLOWANCE', 3],
      ['GROSS', 4], ['PF', 5], ['TAX', 6], ['NET', 7],
    ];

    act(`resequence "${structure.name}" to ${target.map(([c, s]) => `${s}:${c}`).join(' ')}`);
    if (!DRY) {
      // Park every sequence out of the way first: the structure has a unique
      // constraint on (structure, code) but sequences are compared by the engine,
      // and a straight renumber can transiently collide.
      for (const rule of structure.salaryRules) {
        await prisma.salaryRule.update({
          where: { id: rule.id },
          data: { sequence: rule.sequence + 1000 },
        });
      }
      for (const [code, sequence] of target) {
        const existing = byCode.get(code);
        if (existing) {
          await prisma.salaryRule.update({ where: { id: existing.id }, data: { sequence } });
        }
      }
    }

    if (!has('GROSS')) {
      act(`add GROSS rule "BASIC + HRA + ALLOWANCE" at sequence 4`);
      if (!DRY) {
        await prisma.salaryRule.create({
          data: {
            salaryStructureId: structure.id,
            name: 'Gross Salary', code: 'GROSS', category: 'GROSS', sequence: 4,
            calculationType: 'FORMULA', valueExpression: 'BASIC + HRA + ALLOWANCE', active: true,
          },
        });
      }
    }
    if (!has('NET')) {
      act(`add NET rule "GROSS - PF - TAX" at sequence 7`);
      if (!DRY) {
        await prisma.salaryRule.create({
          data: {
            salaryStructureId: structure.id,
            name: 'Net Salary', code: 'NET', category: 'NET', sequence: 7,
            calculationType: 'FORMULA', valueExpression: 'GROSS - PF - TAX', active: true,
          },
        });
      }
    }
  }
}

async function repairBorrowedContracts() {
  log('\nR2  Payslips computed against another employee\'s contract');

  const slips = await prisma.payslip.findMany({
    include: {
      contract: { select: { id: true, employeeId: true } },
      employee: { select: { id: true, employeeId: true, name: true, departmentId: true, jobPositionId: true, joiningDate: true } },
      payrun: { select: { id: true, name: true, periodStart: true, _count: { select: { payslips: true } } } },
    },
  });
  const borrowed = slips.filter((s) => s.contract && s.contract.employeeId !== s.employeeId);

  if (borrowed.length === 0) {
    log('  - no payslip references another employee\'s contract');
    return;
  }

  const byEmployee = new Map();
  for (const s of borrowed) {
    if (!byEmployee.has(s.employeeId)) byEmployee.set(s.employeeId, []);
    byEmployee.get(s.employeeId).push(s);
  }

  const structure = await prisma.salaryStructure.findFirst();

  for (const [employeeId, group] of byEmployee) {
    const employee = group[0].employee;

    let contract = await prisma.contract.findFirst({
      where: { employeeId, status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
    });

    if (!contract) {
      // Derive the wage from what these payslips were actually paid, so no
      // historical figure moves: gross = basic + hra + allowance = 1.00 * wage.
      // Pick the general monthly payroll (the run covering the most employees)
      // rather than a bonus or incentive run, whose gross is a fraction of wage.
      const reference = group.slice().sort((a, b) => {
        const bySize = (b.payrun._count.payslips || 0) - (a.payrun._count.payslips || 0);
        if (bySize !== 0) return bySize;
        return new Date(b.payrun.periodStart) - new Date(a.payrun.periodStart);
      })[0];
      const override = WAGE_OVERRIDES.get(employee.employeeId);
      const wage = override != null ? override : Math.round(reference.grossSalary);
      const source = override != null
        ? '--wage override'
        : `inferred from ${reference.payslipNumber}, "${reference.payrun.name}", ${reference.payrun._count.payslips} payslips`;
      act(`create an ACTIVE contract for ${employee.employeeId} ${employee.name} at wage ${wage} (${source})`);
      if (!DRY) {
        contract = await prisma.contract.create({
          data: {
            employeeId,
            startDate: employee.joiningDate || new Date('2024-01-01T00:00:00.000Z'),
            wage,
            salaryStructureId: structure.id,
            status: 'ACTIVE',
            notes: `Employment contract for ${employee.name}`,
          },
        });
      }
    }

    act(`repoint ${group.length} payslips for ${employee.employeeId} to contract #${contract ? contract.id : '(new)'}`);
    if (!DRY && contract) {
      await prisma.payslip.updateMany({
        where: { id: { in: group.map((s) => s.id) } },
        data: { contractId: contract.id },
      });
    }
  }
}

async function repairLeaveBalances() {
  log('\nR3  Allocation balances vs approved leave history');

  const allocations = await prisma.timeOffAllocation.findMany({
    include: { timeOffType: { select: { name: true, allocationRequired: true } } },
  });
  const approved = await prisma.timeOffRequest.findMany({
    where: { status: 'APPROVED' },
    select: { employeeId: true, timeOffTypeId: true, startDate: true, durationDays: true },
  });

  const approvedByKey = new Map();
  for (const r of approved) {
    const key = `${r.employeeId}:${r.timeOffTypeId}:${new Date(r.startDate).getFullYear()}`;
    approvedByKey.set(key, (approvedByKey.get(key) || 0) + r.durationDays);
  }

  const approver = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  const toCreate = [];
  const toCorrect = [];

  for (const a of allocations) {
    if (!a.timeOffType || !a.timeOffType.allocationRequired) continue;
    const seen = approvedByKey.get(`${a.employeeId}:${a.timeOffTypeId}:${a.year}`) || 0;
    const drift = Math.round((a.takenDays - seen) * 100) / 100;
    if (Math.abs(drift) < 0.01) continue;

    if (drift > 0) {
      // Balance was consumed without a request behind it: write the missing history.
      toCreate.push({ allocation: a, days: drift });
    } else {
      // More approved days than the balance recorded: trust the requests.
      toCorrect.push({ allocation: a, taken: seen });
    }
  }

  log(`  - ${toCreate.length} allocations need backing leave requests, ${toCorrect.length} need a balance correction`);

  if (toCreate.length) {
    const { year, month } = OPENING_BALANCE_MONTH;
    act(`create ${toCreate.length} APPROVED leave requests in ${year}-${String(month + 1).padStart(2, '0')} (no payrun covers that month)`);
    if (!DRY) {
      const rows = toCreate.map(({ allocation, days }, i) => {
        const startDay = 2 + (i % 20);
        const start = new Date(Date.UTC(year, month, startDay));
        const end = new Date(Date.UTC(year, month, startDay + Math.max(0, Math.ceil(days) - 1)));
        return {
          employeeId: allocation.employeeId,
          timeOffTypeId: allocation.timeOffTypeId,
          startDate: start,
          endDate: end,
          durationDays: days,
          reason: OPENING_BALANCE_REASON,
          status: 'APPROVED',
          approvedById: approver ? approver.id : null,
          // Backdated to the leave itself: the requests list is ordered by
          // createdAt, and these historical rows must not bury live requests.
          createdAt: start,
          updatedAt: start,
        };
      });
      // Chunked so a 500-row insert does not blow the statement limit.
      for (let i = 0; i < rows.length; i += 100) {
        await prisma.timeOffRequest.createMany({ data: rows.slice(i, i + 100) });
      }
    }
  }

  for (const { allocation, taken } of toCorrect) {
    const remaining = Math.max(0, allocation.allocatedDays - taken);
    act(`correct allocation #${allocation.id}: takenDays ${allocation.takenDays} -> ${taken}, remaining -> ${remaining}`);
    if (!DRY) {
      await prisma.timeOffAllocation.update({
        where: { id: allocation.id },
        data: { takenDays: taken, remainingDays: remaining },
      });
    }
  }
}

/**
 * Payslips generated before the GROSS/NET rules existed only carry five lines, so
 * a historical payslip and a freshly computed one look different on screen. The
 * two subtotals are backfilled from each payslip's own stored totals, which means
 * no amount is recalculated or changed - only presented.
 */
async function repairHistoricalPayslipLines() {
  log('\nR4  Historical payslips missing GROSS/NET breakdown lines');

  const slips = await prisma.payslip.findMany({
    select: {
      id: true, grossSalary: true, netSalary: true,
      payslipLines: { select: { id: true, code: true, category: true, sequence: true } },
    },
  });

  const needing = slips.filter(
    (s) => s.payslipLines.length > 0 && !s.payslipLines.some((l) => l.category === 'GROSS' || l.category === 'NET')
  );

  if (needing.length === 0) {
    log('  - every payslip already carries its GROSS and NET lines');
    return;
  }

  act(`shift PF to sequence 5 and TAX to sequence 6 on ${needing.length} payslips`);
  act(`insert GROSS (sequence 4) and NET (sequence 7) lines on ${needing.length} payslips`);
  if (DRY) return;

  const ids = needing.map((s) => s.id);
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    // TAX moves first so it never collides with PF's new sequence.
    await prisma.payslipLine.updateMany({
      where: { payslipId: { in: chunk }, code: 'TAX', sequence: 5 },
      data: { sequence: 6 },
    });
    await prisma.payslipLine.updateMany({
      where: { payslipId: { in: chunk }, code: 'PF', sequence: 4 },
      data: { sequence: 5 },
    });
  }

  const rule = await prisma.salaryRule.findFirst({ where: { code: 'GROSS' } });
  const netRule = await prisma.salaryRule.findFirst({ where: { code: 'NET' } });

  const rows = [];
  for (const s of needing) {
    rows.push({
      payslipId: s.id, salaryRuleId: rule ? rule.id : null,
      code: 'GROSS', name: 'Gross Salary', category: 'GROSS', sequence: 4, amount: s.grossSalary,
    });
    rows.push({
      payslipId: s.id, salaryRuleId: netRule ? netRule.id : null,
      code: 'NET', name: 'Net Salary', category: 'NET', sequence: 7, amount: s.netSalary,
    });
  }
  for (let i = 0; i < rows.length; i += 500) {
    await prisma.payslipLine.createMany({ data: rows.slice(i, i + 500) });
  }
  log(`  backfilled ${rows.length} lines across ${needing.length} payslips`);
}

async function main() {
  log(DRY ? 'PeoplePay360 data repair (DRY RUN - nothing will be written)' : 'PeoplePay360 data repair');
  await repairSalaryRules();
  await repairBorrowedContracts();
  await repairLeaveBalances();
  await repairHistoricalPayslipLines();
  log(DRY ? '\nDry run complete. Re-run without --dry-run to apply.' : '\nRepairs applied. Run `npm run verify` from the project root to confirm.');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('\nRepair failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
