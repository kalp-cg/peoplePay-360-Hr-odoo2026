const payrollRepository = require('./payroll.repository');
const payrollEngine = require('./payroll.engine');
const payrollValidator = require('./payroll.validator');
const auditService = require('../audit/audit.service');
const prisma = require('../../config/database');

class PayrollService {
  async getAllPayruns(query) {
    return payrollRepository.findAll(query);
  }

  async getPayrunById(id) {
    const payrun = await payrollRepository.findById(id);
    if (!payrun) {
      throw { statusCode: 404, message: 'Payrun not found.', code: 'PAYRUN_NOT_FOUND' };
    }
    return payrun;
  }

  async getEligibleEmployees(salaryStructureId, periodStart, periodEnd) {
    if (!salaryStructureId || !periodStart || !periodEnd) {
      throw { statusCode: 400, message: 'salaryStructureId, periodStart, and periodEnd are required.', code: 'MISSING_FIELDS' };
    }
    return payrollRepository.findEligibleEmployees(salaryStructureId, periodStart, periodEnd);
  }

  async createPayrun(data, user) {
    const { name, salaryStructureId, periodStart, periodEnd, employeeIds } = data;
    if (!name || !salaryStructureId || !periodStart || !periodEnd || !employeeIds || employeeIds.length === 0) {
      throw { statusCode: 400, message: 'Payrun name, salary structure, period dates, and at least one selected employee are required.', code: 'MISSING_FIELDS' };
    }

    const payrun = await payrollRepository.createPayrun({
      name,
      salaryStructureId,
      periodStart,
      periodEnd,
      employeeIds,
      userId: user.id,
    });

    await auditService.log({
      userId: user.id,
      action: 'PAYRUN_CREATED',
      entityName: 'Payrun',
      entityId: String(payrun.id),
      previousValue: null,
      newValue: JSON.stringify({ name: payrun.name, employeesCount: employeeIds.length }),
    });

    return payrun;
  }

  /**
   * CRITICAL WORKFLOW: Compute Payrun
   * PRD Section 16 & Section 37:
   * Uses PostgreSQL Transaction with rollback on error.
   */
  async computePayrun(payrunId, user) {
    const pId = parseInt(payrunId, 10);
    const payrun = await payrollRepository.findById(pId);
    if (!payrun) {
      throw { statusCode: 404, message: 'Payrun not found.', code: 'PAYRUN_NOT_FOUND' };
    }

    if (payrun.status === 'PAID') {
      throw { statusCode: 400, message: 'Cannot recompute a finalized and paid payrun.', code: 'ALREADY_PAID' };
    }

    const salaryRules = payrun.salaryStructure.salaryRules;
    const periodStart = new Date(payrun.periodStart);
    const periodEnd = new Date(payrun.periodEnd);

    // Compute standard working days in month (Mon-Fri)
    let totalWorkingDays = 0;
    const cur = new Date(periodStart);
    while (cur <= periodEnd) {
      const day = cur.getDay();
      if (day >= 1 && day <= 5) totalWorkingDays++;
      cur.setDate(cur.getDate() + 1);
    }
    if (totalWorkingDays === 0) totalWorkingDays = 22; // fallback

    return prisma.$transaction(async (tx) => {
      let payrunGross = 0;
      let payrunDeductions = 0;
      let payrunNet = 0;

      for (const payslip of payrun.payslips) {
        const empId = payslip.employeeId;

        // 1. Fetch attendance records for this period
        const attendances = await tx.attendance.findMany({
          where: {
            employeeId: empId,
            date: { gte: periodStart, lte: periodEnd },
          },
        });

        const presentDays = attendances.filter((a) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'OVERTIME').length || totalWorkingDays;
        const absentDays = attendances.filter((a) => a.status === 'ABSENT').length;
        const overtimeHours = attendances.reduce((sum, a) => sum + (a.status === 'OVERTIME' ? Math.max(0, a.workedHours - 8) : 0), 0);

        // 2. Fetch approved time off requests for this period
        const approvedLeaves = await tx.timeOffRequest.findMany({
          where: {
            employeeId: empId,
            status: 'APPROVED',
            startDate: { lte: periodEnd },
            endDate: { gte: periodStart },
          },
          include: { timeOffType: true },
        });

        let paidLeaveDays = 0;
        let unpaidLeaveDays = 0;
        for (const l of approvedLeaves) {
          if (l.timeOffType.isPaid) {
            paidLeaveDays += l.durationDays;
          } else {
            unpaidLeaveDays += l.durationDays;
          }
        }

        // 3. Find contract applicable for period
        const applicableContract = await tx.contract.findFirst({
          where: {
            employeeId: empId,
            salaryStructureId: payrun.salaryStructureId,
            startDate: { lte: periodEnd },
            OR: [
              { endDate: { gte: periodStart } },
              { endDate: null },
            ],
          },
          orderBy: { startDate: 'desc' },
        });

        if (!applicableContract) {
          continue; // Will be flagged by validator
        }

        // 4. Deterministic salary engine computation
        const calculation = payrollEngine.computePayslip({
          employee: payslip.employee,
          contract: applicableContract,
          salaryRules,
          attendanceSummary: { presentDays, absentDays, overtimeHours },
          leaveSummary: { paidLeaveDays, unpaidLeaveDays },
          totalPeriodDays: totalWorkingDays,
        });

        payrunGross += calculation.grossSalary;
        payrunDeductions += calculation.totalDeductions;
        payrunNet += calculation.netSalary;

        // 5. Delete previous payslip lines if any and recreate
        await tx.payslipLine.deleteMany({ where: { payslipId: payslip.id } });

        await tx.payslip.update({
          where: { id: payslip.id },
          data: {
            contractId: applicableContract.id,
            workingDays: calculation.workingDays,
            presentDays: calculation.presentDays,
            leaveDays: calculation.leaveDays,
            absentDays: calculation.absentDays,
            overtimeHours: calculation.overtimeHours,
            grossSalary: calculation.grossSalary,
            totalDeductions: calculation.totalDeductions,
            netSalary: calculation.netSalary,
            status: 'COMPUTED',
            payslipLines: {
              create: calculation.payslipLines.map((line) => ({
                salaryRuleId: line.salaryRuleId,
                code: line.code,
                name: line.name,
                category: line.category,
                sequence: line.sequence,
                amount: line.amount,
              })),
            },
          },
        });
      }

      // Update payrun status and totals
      await tx.payrun.update({
        where: { id: pId },
        data: {
          totalGross: Math.round(payrunGross * 100) / 100,
          totalDeductions: Math.round(payrunDeductions * 100) / 100,
          totalNet: Math.round(payrunNet * 100) / 100,
          status: 'COMPUTED',
        },
      });

      // 6. Run Validation
      const updatedPayrun = await tx.payrun.findUnique({
        where: { id: pId },
        include: {
          payslips: {
            include: {
              employee: true,
              contract: true,
              payslipLines: true,
            },
          },
        },
      });

      const { warnings, hasCriticalErrors } = payrollValidator.validatePayrun(updatedPayrun);

      // Recreate warnings in DB
      await tx.payrollWarning.deleteMany({ where: { payrunId: pId } });
      if (warnings.length > 0) {
        await tx.payrollWarning.createMany({
          data: warnings.map((w) => ({
            payrunId: pId,
            employeeId: w.employeeId || null,
            type: w.type,
            severity: w.severity,
            message: w.message,
          })),
        });
      }

      const finalStatus = hasCriticalErrors ? 'WARNING' : 'COMPUTED';
      const result = await tx.payrun.update({
        where: { id: pId },
        data: { status: finalStatus },
        include: {
          salaryStructure: true,
          payslips: {
            include: {
              employee: true,
              payslipLines: { orderBy: { sequence: 'asc' } },
            },
          },
          warnings: true,
        },
      });

      await auditService.log({
        userId: user.id,
        action: 'PAYRUN_COMPUTED',
        entityName: 'Payrun',
        entityId: String(pId),
        previousValue: JSON.stringify({ status: payrun.status }),
        newValue: JSON.stringify({ status: finalStatus, totalNet: payrunNet, warningsCount: warnings.length }),
      });

      return result;
    });
  }

  /**
   * Validate Payrun
   */
  async validatePayrun(payrunId, user) {
    const pId = parseInt(payrunId, 10);
    const payrun = await payrollRepository.findById(pId);
    if (!payrun) {
      throw { statusCode: 404, message: 'Payrun not found.', code: 'PAYRUN_NOT_FOUND' };
    }

    const { warnings, hasCriticalErrors } = payrollValidator.validatePayrun(payrun);

    if (hasCriticalErrors) {
      throw {
        statusCode: 400,
        message: 'Payrun contains critical validation errors. Please resolve them before validating.',
        code: 'CRITICAL_VALIDATION_ERRORS',
        details: warnings.filter((w) => w.severity === 'CRITICAL'),
      };
    }

    const updated = await prisma.payrun.update({
      where: { id: pId },
      data: { status: 'VALIDATED' },
      include: {
        payslips: true,
        warnings: true,
      },
    });

    await auditService.log({
      userId: user.id,
      action: 'PAYRUN_VALIDATED',
      entityName: 'Payrun',
      entityId: String(pId),
      previousValue: JSON.stringify({ status: payrun.status }),
      newValue: JSON.stringify({ status: 'VALIDATED' }),
    });

    return updated;
  }

  /**
   * Mark Payrun as Paid
   * PRD Section 17 & 30 Rule 6:
   * Critical errors block payout.
   */
  async markPaid(payrunId, user) {
    const pId = parseInt(payrunId, 10);
    const payrun = await payrollRepository.findById(pId);
    if (!payrun) {
      throw { statusCode: 404, message: 'Payrun not found.', code: 'PAYRUN_NOT_FOUND' };
    }

    const criticalWarnings = payrun.warnings.filter((w) => w.severity === 'CRITICAL');
    if (criticalWarnings.length > 0) {
      throw {
        statusCode: 400,
        message: `Cannot mark payrun as paid. There are ${criticalWarnings.length} critical validation error(s) pending.`,
        code: 'CRITICAL_PAYROLL_ERRORS',
        details: criticalWarnings,
      };
    }

    return prisma.$transaction(async (tx) => {
      const now = new Date();

      // Update all payslips
      await tx.payslip.updateMany({
        where: { payrunId: pId },
        data: { status: 'PAID' },
      });

      // Update payrun
      const paidPayrun = await tx.payrun.update({
        where: { id: pId },
        data: {
          status: 'PAID',
          paidAt: now,
        },
        include: {
          payslips: {
            include: { employee: true },
          },
        },
      });

      await auditService.log({
        userId: user.id,
        action: 'PAYRUN_MARKED_PAID',
        entityName: 'Payrun',
        entityId: String(pId),
        previousValue: JSON.stringify({ status: payrun.status }),
        newValue: JSON.stringify({ status: 'PAID', paidAt: now, totalNet: paidPayrun.totalNet }),
      });

      return paidPayrun;
    });
  }
}

module.exports = new PayrollService();
