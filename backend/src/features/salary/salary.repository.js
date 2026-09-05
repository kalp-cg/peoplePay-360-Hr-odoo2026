const prisma = require('../../config/database');

class SalaryRepository {
  async getStructures() {
    return prisma.salaryStructure.findMany({
      include: {
        salaryRules: {
          orderBy: { sequence: 'asc' },
        },
        _count: {
          select: { contracts: true, payruns: true },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async getStructureById(id) {
    return prisma.salaryStructure.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        salaryRules: {
          orderBy: { sequence: 'asc' },
        },
        contracts: {
          include: { employee: true },
        },
      },
    });
  }

  async createStructure(data) {
    return prisma.salaryStructure.create({
      data: {
        name: data.name,
        description: data.description || null,
        active: data.active !== undefined ? data.active : true,
      },
    });
  }

  async updateStructure(id, data) {
    return prisma.salaryStructure.update({
      where: { id: parseInt(id, 10) },
      data,
    });
  }

  async getRules({ salaryStructureId }) {
    const where = {};
    if (salaryStructureId) where.salaryStructureId = parseInt(salaryStructureId, 10);

    return prisma.salaryRule.findMany({
      where,
      include: {
        salaryStructure: { select: { id: true, name: true } },
      },
      orderBy: { sequence: 'asc' },
    });
  }

  async getRuleById(id) {
    return prisma.salaryRule.findUnique({
      where: { id: parseInt(id, 10) },
    });
  }

  async createRule(data) {
    return prisma.salaryRule.create({
      data: {
        salaryStructureId: parseInt(data.salaryStructureId, 10),
        name: data.name,
        code: data.code.toUpperCase(),
        category: data.category,
        sequence: parseInt(data.sequence, 10),
        calculationType: data.calculationType || 'FORMULA',
        valueExpression: data.valueExpression,
        active: data.active !== undefined ? data.active : true,
      },
    });
  }

  async updateRule(id, data) {
    const updateData = {};
    if (data.name) updateData.name = data.name;
    if (data.code) updateData.code = data.code.toUpperCase();
    if (data.category) updateData.category = data.category;
    if (data.sequence !== undefined) updateData.sequence = parseInt(data.sequence, 10);
    if (data.calculationType) updateData.calculationType = data.calculationType;
    if (data.valueExpression) updateData.valueExpression = data.valueExpression;
    if (data.active !== undefined) updateData.active = data.active;

    return prisma.salaryRule.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
    });
  }
}

module.exports = new SalaryRepository();
