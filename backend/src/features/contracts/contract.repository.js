const prisma = require('../../config/database');
const { paginate, paginateResult } = require('../../utils/paginate');

class ContractRepository {
  async findAll({ employeeId, status, subordinateIds, page, limit } = {}) {
    const where = {};
    if (employeeId) where.employeeId = parseInt(employeeId, 10);
    if (status) where.status = status;
    if (subordinateIds && Array.isArray(subordinateIds)) {
      where.employeeId = { in: subordinateIds.length > 0 ? subordinateIds : [-1] };
    }

    const { page: p, limit: l, skip } = paginate({ page, limit: limit || 25 });

    const [data, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              email: true,
              department: { select: { id: true, name: true } },
              jobPosition: { select: { id: true, title: true } },
            },
          },
          salaryStructure: {
            select: { id: true, name: true, active: true },
          },
        },
        orderBy: { startDate: 'desc' },
        skip,
        take: l,
      }),
      prisma.contract.count({ where }),
    ]);

    return paginateResult(data, total, p, l);
  }

  async findById(id) {
    return prisma.contract.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        employee: {
          include: {
            department: true,
            jobPosition: true,
          },
        },
        salaryStructure: {
          include: {
            salaryRules: {
              orderBy: { sequence: 'asc' },
            },
          },
        },
      },
    });
  }

  /**
   * CRITICAL BUSINESS RULE (PRD Section 7 & Section 30 Rule 1):
   * Payroll must use the contract applicable to the selected payroll period.
   * start_date <= periodEnd AND (end_date >= periodStart OR end_date IS NULL)
   */
  async findApplicableContract(employeeId, periodStart, periodEnd) {
    const pStart = new Date(periodStart);
    const pEnd = new Date(periodEnd);

    return prisma.contract.findFirst({
      where: {
        employeeId: parseInt(employeeId, 10),
        status: { in: ['ACTIVE', 'EXPIRED'] }, // Allow expired if period matches historical date
        startDate: { lte: pEnd },
        OR: [
          { endDate: { gte: pStart } },
          { endDate: null },
        ],
      },
      include: {
        salaryStructure: {
          include: {
            salaryRules: {
              where: { active: true },
              orderBy: { sequence: 'asc' },
            },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async create(data) {
    return prisma.contract.create({
      data: {
        employeeId: parseInt(data.employeeId, 10),
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        wage: parseFloat(data.wage),
        salaryStructureId: parseInt(data.salaryStructureId, 10),
        status: data.status || 'ACTIVE',
        notes: data.notes || null,
      },
      include: {
        employee: true,
        salaryStructure: true,
      },
    });
  }

  async update(id, data) {
    const updateData = {};
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.wage !== undefined) updateData.wage = parseFloat(data.wage);
    if (data.salaryStructureId !== undefined) updateData.salaryStructureId = parseInt(data.salaryStructureId, 10);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return prisma.contract.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
      include: {
        employee: true,
        salaryStructure: true,
      },
    });
  }
}

module.exports = new ContractRepository();
