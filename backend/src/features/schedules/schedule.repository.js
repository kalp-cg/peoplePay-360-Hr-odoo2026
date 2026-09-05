const prisma = require('../../config/database');

class ScheduleRepository {
  async findAll() {
    return prisma.workingSchedule.findMany({
      include: {
        scheduleDays: {
          orderBy: { dayOfWeek: 'asc' },
        },
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async findById(id) {
    return prisma.workingSchedule.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        scheduleDays: {
          orderBy: { dayOfWeek: 'asc' },
        },
        employees: {
          select: { id: true, employeeId: true, name: true, department: true },
        },
      },
    });
  }

  async create(name, scheduleType, days) {
    return prisma.workingSchedule.create({
      data: {
        name,
        scheduleType: scheduleType || 'STANDARD',
        weeklyHours: days.reduce((acc, d) => acc + (d.dailyHours || 0), 0),
        scheduleDays: {
          create: days.map((d) => ({
            dayOfWeek: parseInt(d.dayOfWeek, 10),
            startTime: d.startTime,
            endTime: d.endTime,
            breakHours: parseFloat(d.breakHours || 1.0),
            dailyHours: parseFloat(d.dailyHours || 8.0),
          })),
        },
      },
      include: {
        scheduleDays: true,
      },
    });
  }

  async update(id, name, scheduleType, days) {
    const numId = parseInt(id, 10);

    return prisma.$transaction(async (tx) => {
      if (days && days.length > 0) {
        // Delete old days and recreate
        await tx.scheduleDay.deleteMany({ where: { scheduleId: numId } });
        const totalWeekly = days.reduce((acc, d) => acc + (d.dailyHours || 0), 0);

        return tx.workingSchedule.update({
          where: { id: numId },
          data: {
            name: name || undefined,
            scheduleType: scheduleType || undefined,
            weeklyHours: totalWeekly,
            scheduleDays: {
              create: days.map((d) => ({
                dayOfWeek: parseInt(d.dayOfWeek, 10),
                startTime: d.startTime,
                endTime: d.endTime,
                breakHours: parseFloat(d.breakHours || 1.0),
                dailyHours: parseFloat(d.dailyHours || 8.0),
              })),
            },
          },
          include: {
            scheduleDays: true,
          },
        });
      }

      return tx.workingSchedule.update({
        where: { id: numId },
        data: {
          name: name || undefined,
          scheduleType: scheduleType || undefined,
        },
        include: {
          scheduleDays: true,
        },
      });
    });
  }
}

module.exports = new ScheduleRepository();
