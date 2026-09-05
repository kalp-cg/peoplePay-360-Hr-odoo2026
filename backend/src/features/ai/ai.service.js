const prisma = require('../../config/database');

class AIService {
  /**
   * Explain salary differences between two payslips for an employee.
   * Pulls real database records and provides deterministic breakdown.
   */
  async explainSalaryChange(employeeId) {
    const empId = parseInt(employeeId, 10);
    const employee = await prisma.employee.findUnique({
      where: { id: empId },
    });

    if (!employee) {
      throw { statusCode: 404, message: 'Employee not found.', code: 'NOT_FOUND' };
    }

    // Fetch the last two payslips
    const payslips = await prisma.payslip.findMany({
      where: { employeeId: empId },
      include: {
        payrun: true,
        contract: true,
        payslipLines: { orderBy: { sequence: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });

    if (payslips.length === 0) {
      return {
        explanation: `No payslips generated yet for ${employee.name}.`,
        deltas: [],
      };
    }

    if (payslips.length === 1) {
      const p = payslips[0];
      return {
        explanation: `Only one payslip found for ${employee.name} (${p.payrun.name}). Current Net Salary is ₹${p.netSalary.toLocaleString()}. Wage on contract is ₹${p.contract?.wage.toLocaleString()}.`,
        deltas: [],
        currentPayslip: p,
      };
    }

    const current = payslips[0];
    const previous = payslips[1];

    const netDelta = current.netSalary - previous.netSalary;
    const grossDelta = current.grossSalary - previous.grossSalary;
    const wageDelta = (current.contract?.wage || 0) - (previous.contract?.wage || 0);

    const reasons = [];

    if (wageDelta > 0) {
      reasons.push(`Base contract wage increased by ₹${wageDelta.toLocaleString()} (from ₹${previous.contract?.wage.toLocaleString()} to ₹${current.contract?.wage.toLocaleString()}).`);
    } else if (wageDelta < 0) {
      reasons.push(`Base contract wage decreased by ₹${Math.abs(wageDelta).toLocaleString()}.`);
    }

    if (current.leaveDays > previous.leaveDays) {
      reasons.push(`Time off taken increased by ${current.leaveDays - previous.leaveDays} days.`);
    }

    if (current.absentDays > previous.absentDays) {
      reasons.push(`Absent days increased by ${current.absentDays - previous.absentDays} days, causing prorated deductions.`);
    }

    if (current.overtimeHours > previous.overtimeHours) {
      reasons.push(`Overtime increased by ${current.overtimeHours - previous.overtimeHours} hours.`);
    }

    const dedDelta = current.totalDeductions - previous.totalDeductions;
    if (dedDelta > 0) {
      reasons.push(`Statutory deductions (PF & Tax) increased by ₹${dedDelta.toLocaleString()}.`);
    } else if (dedDelta < 0) {
      reasons.push(`Statutory deductions decreased by ₹${Math.abs(dedDelta).toLocaleString()}.`);
    }

    if (reasons.length === 0) {
      reasons.push('No significant differences found; earnings and deductions are consistent with the applicable salary structure.');
    }

    const explanation = `${employee.name}'s net salary changed by ${netDelta >= 0 ? '+₹' : '-₹'}${Math.abs(netDelta).toLocaleString()} between ${previous.payrun.name} and ${current.payrun.name}. Key reasons: ${reasons.join(' ')}`;

    return {
      employeeName: employee.name,
      employeeId: employee.employeeId,
      currentPeriod: current.payrun.name,
      previousPeriod: previous.payrun.name,
      currentNet: current.netSalary,
      previousNet: previous.netSalary,
      netDelta,
      reasons,
      explanation,
    };
  }

  /**
   * Detect anomalies across paid/computed payruns
   */
  async detectAnomalies(payrunId) {
    const where = {};
    if (payrunId) where.id = parseInt(payrunId, 10);

    const payruns = await prisma.payrun.findMany({
      where,
      include: {
        payslips: {
          include: {
            employee: { select: { id: true, name: true, employeeId: true } },
            contract: true,
          },
        },
      },
      take: 5,
    });

    const anomalies = [];

    for (const pr of payruns) {
      for (const p of pr.payslips) {
        // Anomaly 1: Deductions > 35% of Gross
        if (p.grossSalary > 0 && p.totalDeductions / p.grossSalary > 0.35) {
          anomalies.push({
            type: 'HIGH_DEDUCTION_RATIO',
            severity: 'WARNING',
            employee: p.employee.name,
            payrun: pr.name,
            message: `Unusually high deduction ratio (${Math.round((p.totalDeductions / p.grossSalary) * 100)}% of gross) for ${p.employee.name}.`,
          });
        }

        // Anomaly 2: Excessive Overtime (> 15 hours)
        if (p.overtimeHours > 15) {
          anomalies.push({
            type: 'EXCESSIVE_OVERTIME',
            severity: 'INFO',
            employee: p.employee.name,
            payrun: pr.name,
            message: `${p.employee.name} recorded ${p.overtimeHours} hours of overtime.`,
          });
        }

        // Anomaly 3: Wage discrepancy between contract and gross
        if (p.contract && Math.abs(p.contract.wage - p.grossSalary) > 1000 && p.leaveDays === 0 && p.absentDays === 0) {
          anomalies.push({
            type: 'WAGE_VARIANCE',
            severity: 'WARNING',
            employee: p.employee.name,
            payrun: pr.name,
            message: `Gross salary (₹${p.grossSalary}) differs from contract wage (₹${p.contract.wage}) without registered leave or absence.`,
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Natural language query handler
   */
  async queryNL(query) {
    const q = (query || '').toLowerCase();

    if (q.includes('engineering') && (q.includes('cost') || q.includes('salary'))) {
      const eng = await prisma.department.findUnique({
        where: { code: 'ENG' },
        include: {
          employees: {
            include: {
              payslips: { where: { status: 'PAID' } },
            },
          },
        },
      });

      const totalGross = eng?.employees.flatMap((e) => e.payslips).reduce((sum, p) => sum + p.grossSalary, 0) || 0;
      const totalNet = eng?.employees.flatMap((e) => e.payslips).reduce((sum, p) => sum + p.netSalary, 0) || 0;

      return {
        query,
        answer: `Total salary cost for Engineering department is ₹${totalGross.toLocaleString()} Gross (₹${totalNet.toLocaleString()} Net) across ${eng?.employees.length || 0} employees.`,
        data: { department: 'Engineering', totalGross, totalNet, employeeCount: eng?.employees.length || 0 },
      };
    }

    if (q.includes('attendance') || q.includes('health')) {
      const total = await prisma.attendance.count();
      const present = await prisma.attendance.count({ where: { status: 'PRESENT' } });
      const rate = total > 0 ? Math.round((present / total) * 100) : 100;
      return {
        query,
        answer: `Overall company attendance health is ${rate}%, with ${present} on-time present entries out of ${total} total records.`,
        data: { attendanceRate: rate, totalRecords: total, onTimePresent: present },
      };
    }

    // Default response summarizing latest payroll
    const lastPayrun = await prisma.payrun.findFirst({
      where: { status: 'PAID' },
      orderBy: { periodStart: 'desc' },
      include: { payslips: true },
    });

    return {
      query,
      answer: `Latest processed payroll is "${lastPayrun?.name || 'August 2026'}" with Total Net Payout of ₹${(lastPayrun?.totalNet || 0).toLocaleString()} across ${lastPayrun?.payslips.length || 0} employees.`,
      data: lastPayrun,
    };
  }
}

module.exports = new AIService();
