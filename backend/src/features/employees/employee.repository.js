const prisma = require('../../config/database');
const { paginate, paginateResult } = require('../../utils/paginate');

class EmployeeRepository {
  async findAll({ search, departmentId, status, employeeType, managerId, subordinateIds, page, limit } = {}) {
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (departmentId) where.departmentId = parseInt(departmentId, 10);
    if (status) where.status = status;
    if (employeeType) where.employeeType = employeeType;
    if (managerId) where.managerId = parseInt(managerId, 10);
    if (subordinateIds && Array.isArray(subordinateIds)) {
      where.id = { in: subordinateIds.length > 0 ? subordinateIds : [-1] };
    }

    const { page: p, limit: l, skip } = paginate({ page, limit });

    const [data, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: {
          department: true,
          jobPosition: true,
          manager: {
            select: { id: true, name: true, employeeId: true },
          },
          workingSchedule: {
            select: { id: true, name: true, weeklyHours: true },
          },
          _count: {
            select: {
              contracts: true,
              attendance: true,
              payslips: true,
              timeOffRequests: true,
            },
          },
        },
        orderBy: { employeeId: 'asc' },
        skip,
        take: l,
      }),
      prisma.employee.count({ where }),
    ]);

    return paginateResult(data, total, p, l);
  }

  async findById(id) {
    const numId = parseInt(id, 10);
    return prisma.employee.findUnique({
      where: { id: numId },
      include: {
        department: true,
        jobPosition: true,
        manager: {
          select: { id: true, name: true, employeeId: true },
        },
        workingSchedule: {
          include: {
            scheduleDays: {
              orderBy: { dayOfWeek: 'asc' },
            },
          },
        },
        contracts: {
          include: {
            salaryStructure: true,
          },
          orderBy: { startDate: 'desc' },
        },
        timeOffAllocations: {
          include: {
            timeOffType: true,
          },
        },
        timeOffRequests: {
          include: {
            timeOffType: true,
          },
          orderBy: { startDate: 'desc' },
          take: 10,
        },
        attendance: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        payslips: {
          include: {
            payrun: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async findByEmployeeId(employeeId) {
    return prisma.employee.findUnique({
      where: { employeeId },
    });
  }

  async create(data) {
    return prisma.employee.create({
      data: {
        employeeId: data.employeeId,
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone || null,
        departmentId: parseInt(data.departmentId, 10),
        jobPositionId: parseInt(data.jobPositionId, 10),
        managerId: data.managerId ? parseInt(data.managerId, 10) : null,
        employeeType: data.employeeType || 'FULL_TIME',
        joiningDate: new Date(data.joiningDate),
        status: data.status || 'ACTIVE',
        workingScheduleId: data.workingScheduleId ? parseInt(data.workingScheduleId, 10) : null,
        bankAccountNumber: data.bankAccountNumber || null,
        bankName: data.bankName || null,
        bankIfscCode: data.bankIfscCode || null,
        panNumber: data.panNumber || null,
      },
      include: {
        department: true,
        jobPosition: true,
      },
    });
  }

  async update(id, data) {
    const numId = parseInt(id, 10);
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email.toLowerCase();
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.departmentId !== undefined) updateData.departmentId = parseInt(data.departmentId, 10);
    if (data.jobPositionId !== undefined) updateData.jobPositionId = parseInt(data.jobPositionId, 10);
    if (data.managerId !== undefined) updateData.managerId = data.managerId ? parseInt(data.managerId, 10) : null;
    if (data.employeeType !== undefined) updateData.employeeType = data.employeeType;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.workingScheduleId !== undefined) updateData.workingScheduleId = data.workingScheduleId ? parseInt(data.workingScheduleId, 10) : null;
    if (data.bankAccountNumber !== undefined) updateData.bankAccountNumber = data.bankAccountNumber;
    if (data.bankName !== undefined) updateData.bankName = data.bankName;
    if (data.bankIfscCode !== undefined) updateData.bankIfscCode = data.bankIfscCode;
    if (data.panNumber !== undefined) updateData.panNumber = data.panNumber;

    return prisma.employee.update({
      where: { id: numId },
      data: updateData,
      include: {
        department: true,
        jobPosition: true,
      },
    });
  }

  async delete(id) {
    const numId = parseInt(id, 10);
    return prisma.employee.delete({
      where: { id: numId },
    });
  }
}

module.exports = new EmployeeRepository();
