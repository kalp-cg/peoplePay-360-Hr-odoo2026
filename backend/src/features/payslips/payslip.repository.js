const prisma = require('../../config/database');

class PayslipRepository {
  async findAll({ employeeId, payrunId, status }) {
    const where = {};
    if (employeeId) where.employeeId = parseInt(employeeId, 10);
    if (payrunId) where.payrunId = parseInt(payrunId, 10);
    if (status) where.status = status;

    return prisma.payslip.findMany({
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
        payrun: {
          select: { id: true, name: true, periodStart: true, periodEnd: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id) {
    const numId = parseInt(id, 10);
    return prisma.payslip.findUnique({
      where: { id: numId },
      include: {
        employee: {
          include: {
            department: true,
            jobPosition: true,
          },
        },
        contract: true,
        payrun: {
          include: {
            salaryStructure: true,
          },
        },
        payslipLines: {
          orderBy: { sequence: 'asc' },
        },
      },
    });
  }

  async updateSentStatus(id) {
    return prisma.payslip.update({
      where: { id: parseInt(id, 10) },
      data: { sentAt: new Date() },
    });
  }
}

module.exports = new PayslipRepository();
