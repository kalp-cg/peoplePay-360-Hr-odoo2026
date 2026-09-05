const prisma = require('../../config/database');

class AttendanceRepository {
  async findAll({ employeeId, startDate, endDate, status }) {
    const where = {};
    if (employeeId) where.employeeId = parseInt(employeeId, 10);
    if (status) where.status = status;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    return prisma.attendance.findMany({
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
      orderBy: { date: 'desc' },
    });
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
}

module.exports = new AttendanceRepository();
