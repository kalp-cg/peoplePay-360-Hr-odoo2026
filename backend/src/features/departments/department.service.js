const prisma = require('../../config/database');

class DepartmentService {
  async getAll() {
    return prisma.department.findMany({
      include: {
        jobPositions: true,
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getJobPositions(departmentId) {
    const where = {};
    if (departmentId) where.departmentId = parseInt(departmentId, 10);
    return prisma.jobPosition.findMany({
      where,
      include: {
        department: true,
      },
      orderBy: { title: 'asc' },
    });
  }

  async create(data) {
    return prisma.department.create({
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
        description: data.description || null,
      },
    });
  }

  async createJobPosition(data) {
    return prisma.jobPosition.create({
      data: {
        title: data.title,
        departmentId: parseInt(data.departmentId, 10),
      },
    });
  }
}

module.exports = new DepartmentService();
