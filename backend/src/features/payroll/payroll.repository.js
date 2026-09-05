const prisma = require('../../config/database');

class PayrollRepository {
  async findAll({ status, year }) {
    const where = {};
    if (status) where.status = status;

    return prisma.payrun.findMany({
      where,
      include: {
        salaryStructure: { select: { id: true, name: true } },
        processedBy: { select: { id: true, name: true, email: true } },
        _count: {
          select: { payslips: true, warnings: true },
        },
      },
      orderBy: { periodStart: 'desc' },
    });
  }

  async findById(id) {
    const numId = parseInt(id, 10);
    return prisma.payrun.findUnique({
      where: { id: numId },
      include: {
        salaryStructure: {
          include: {
            salaryRules: {
              where: { active: true },
              orderBy: { sequence: 'asc' },
            },
          },
        },
        processedBy: { select: { id: true, name: true, email: true } },
        payslips: {
          include: {
            employee: {
              include: {
                department: true,
                jobPosition: true,
              },
            },
            contract: true,
            payslipLines: {
              orderBy: { sequence: 'asc' },
            },
          },
          orderBy: { employeeId: 'asc' },
        },
        warnings: {
          include: {
            employee: { select: { id: true, employeeId: true, name: true } },
          },
          orderBy: { severity: 'asc' },
        },
      },
    });
  }

  /**
   * Wizard Step 2: Find eligible active employees with applicable contracts for this structure & period.
   */
  async findEligibleEmployees(salaryStructureId, periodStart, periodEnd) {
    const pStart = new Date(periodStart);
    const pEnd = new Date(periodEnd);
    const structId = parseInt(salaryStructureId, 10);

    // Find all active contracts that match this salary structure and period
    const contracts = await prisma.contract.findMany({
      where: {
        salaryStructureId: structId,
        status: 'ACTIVE',
        startDate: { lte: pEnd },
        OR: [
          { endDate: { gte: pStart } },
          { endDate: null },
        ],
      },
      include: {
        employee: {
          include: {
            department: true,
            jobPosition: true,
          },
        },
      },
      orderBy: { employee: { employeeId: 'asc' } },
    });

    // Deduplicate employees (in case multiple contracts exist)
    const empMap = new Map();
    for (const c of contracts) {
      if (!empMap.has(c.employeeId)) {
        empMap.set(c.employeeId, {
          ...c.employee,
          applicableContract: c,
        });
      }
    }

    return Array.from(empMap.values());
  }

  async createPayrun({ name, salaryStructureId, periodStart, periodEnd, employeeIds, userId }) {
    const pStart = new Date(periodStart);
    const pEnd = new Date(periodEnd);
    const structId = parseInt(salaryStructureId, 10);

    return prisma.$transaction(async (tx) => {
      const payrun = await tx.payrun.create({
        data: {
          name,
          salaryStructureId: structId,
          periodStart: pStart,
          periodEnd: pEnd,
          status: 'DRAFT',
          processedById: userId || null,
        },
      });

      // For each explicitly selected employee, create an initial DRAFT payslip record
      let index = 1;
      for (const empId of employeeIds) {
        const numericEmpId = parseInt(empId, 10);
        // Query applicable contract for period (ACTIVE or historically EXPIRED)
        const contract = await tx.contract.findFirst({
          where: {
            employeeId: numericEmpId,
            salaryStructureId: structId,
            status: { in: ['ACTIVE', 'EXPIRED'] },
            startDate: { lte: pEnd },
            OR: [
              { endDate: { gte: pStart } },
              { endDate: null },
            ],
          },
          orderBy: { startDate: 'desc' },
        });

        const payslipNum = `PS-${pStart.getFullYear()}-${String(pStart.getMonth() + 1).padStart(2, '0')}-PR${payrun.id}-${String(index++).padStart(3, '0')}`;

        if (contract) {
          await tx.payslip.create({
            data: {
              payslipNumber: payslipNum,
              payrunId: payrun.id,
              employeeId: numericEmpId,
              contractId: contract.id,
              status: 'DRAFT',
            },
          });
        } else {
          // Employee was selected but lacks an applicable contract for this period/structure
          const emp = await tx.employee.findUnique({ where: { id: numericEmpId } });
          await tx.payrollWarning.create({
            data: {
              payrunId: payrun.id,
              employeeId: numericEmpId,
              type: 'MISSING_CONTRACT',
              severity: 'CRITICAL',
              message: `Employee ${emp?.name || numericEmpId} (${emp?.employeeId || ''}) has no applicable contract for ${pStart.toISOString().slice(0, 7)}.`,
            },
          });
        }
      }

      return payrun;
    }, { maxWait: 20000, timeout: 60000 });
  }
}

module.exports = new PayrollRepository();
