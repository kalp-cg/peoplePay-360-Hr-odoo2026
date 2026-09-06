const prisma = require('../../config/database');
const { paginate, paginateResult } = require('../../utils/paginate');

class AttendanceRepository {
  async findAll({ employeeId, startDate, endDate, status, search, subordinateIds, page, limit } = {}) {
    const where = {};
    if (employeeId) where.employeeId = parseInt(employeeId, 10);
    if (status) where.status = status;
    if (subordinateIds && Array.isArray(subordinateIds)) {
      where.employeeId = { in: subordinateIds.length > 0 ? subordinateIds : [-1] };
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { employee: { name: { contains: q, mode: 'insensitive' } } },
        { employee: { employeeId: { contains: q, mode: 'insensitive' } } },
        { employee: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const { page: p, limit: l, skip } = paginate({ page, limit });

    const [data, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              email: true,
              department: { select: { id: true, name: true } },
            },
          },
          correctedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        skip,
        take: l,
      }),
      prisma.attendance.count({ where }),
    ]);

    return paginateResult(data, total, p, l);
  }

  async findOpenRecord(employeeId) {
    return prisma.attendance.findFirst({
      where: {
        employeeId: parseInt(employeeId, 10),
        checkOut: null,
      },
      orderBy: { id: 'desc' },
    });
  }

  async findLatestRecord(employeeId) {
    return prisma.attendance.findFirst({
      where: {
        employeeId: parseInt(employeeId, 10),
      },
      orderBy: { id: 'desc' },
    });
  }

  async findByEmployeeAndDate(employeeId, date) {
    const d = new Date(date);
    const startOfDay = new Date(d);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(d);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return prisma.attendance.findFirst({
      where: {
        employeeId: parseInt(employeeId, 10),
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { id: 'desc' },
    });
  }

  async findById(id) {
    return prisma.attendance.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        employee: true,
        correctedBy: true,
      },
    });
  }

  async create(data) {
    return prisma.attendance.create({
      data: {
        employeeId: parseInt(data.employeeId, 10),
        date: new Date(data.date),
        checkIn: data.checkIn ? new Date(data.checkIn) : null,
        checkOut: data.checkOut ? new Date(data.checkOut) : null,
        breakHours: parseFloat(data.breakHours || 1.0),
        workedHours: parseFloat(data.workedHours || 0.0),
        status: data.status || 'PRESENT',
        correctionReason: data.correctionReason || null,
        correctedById: data.correctedById || null,
      },
      include: {
        employee: true,
      },
    });
  }

  async update(id, data) {
    const numId = parseInt(id, 10);
    const updateData = {};
    if (data.checkIn !== undefined) updateData.checkIn = data.checkIn ? new Date(data.checkIn) : null;
    if (data.checkOut !== undefined) updateData.checkOut = data.checkOut ? new Date(data.checkOut) : null;
    if (data.breakHours !== undefined) updateData.breakHours = parseFloat(data.breakHours);
    if (data.workedHours !== undefined) updateData.workedHours = parseFloat(data.workedHours);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.correctionReason !== undefined) updateData.correctionReason = data.correctionReason;
    if (data.correctedById !== undefined) updateData.correctedById = data.correctedById;

    return prisma.attendance.update({
      where: { id: numId },
      data: updateData,
      include: {
        employee: true,
        correctedBy: true,
      },
    });
  }

  async getActivePolicy() {
    let policy = await prisma.attendancePolicy.findFirst({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
    if (!policy) {
      policy = await prisma.attendancePolicy.create({
        data: {
          name: 'Standard Enterprise Policy',
          fullDayHours: 7.0,
          halfDayHours: 4.0,
          gracePeriodMins: 15,
          overtimeThreshold: 9.0,
          breakDeductionHours: 1.0,
          maxShiftHoursCap: 14.0,
          isActive: true,
        },
      });
    }
    return policy;
  }

  async updatePolicy(data) {
    const active = await this.getActivePolicy();
    const updatePayload = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.fullDayHours !== undefined) updatePayload.fullDayHours = parseFloat(data.fullDayHours);
    if (data.halfDayHours !== undefined) updatePayload.halfDayHours = parseFloat(data.halfDayHours);
    if (data.gracePeriodMins !== undefined) updatePayload.gracePeriodMins = parseInt(data.gracePeriodMins, 10);
    if (data.overtimeThreshold !== undefined) updatePayload.overtimeThreshold = parseFloat(data.overtimeThreshold);
    if (data.breakDeductionHours !== undefined) updatePayload.breakDeductionHours = parseFloat(data.breakDeductionHours);
    if (data.maxShiftHoursCap !== undefined) updatePayload.maxShiftHoursCap = parseFloat(data.maxShiftHoursCap);
    if (data.isActive !== undefined) updatePayload.isActive = Boolean(data.isActive);

    return prisma.attendancePolicy.update({
      where: { id: active.id },
      data: updatePayload,
    });
  }
}

module.exports = new AttendanceRepository();

