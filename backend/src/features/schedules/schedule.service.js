const scheduleRepository = require('./schedule.repository');
const auditService = require('../audit/audit.service');

function computeHours(startTime, endTime, breakHours = 1.0) {
  if (!startTime || !endTime) return 8.0;
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  const startDec = sH + sM / 60;
  const endDec = eH + eM / 60;
  const rawHours = endDec - startDec;
  return Math.max(0, Math.round((rawHours - breakHours) * 100) / 100);
}

class ScheduleService {
  async getAllSchedules() {
    return scheduleRepository.findAll();
  }

  async getScheduleById(id) {
    const sched = await scheduleRepository.findById(id);
    if (!sched) {
      throw { statusCode: 404, message: 'Working schedule not found.', code: 'SCHEDULE_NOT_FOUND' };
    }
    return sched;
  }

  async createSchedule({ name, scheduleType, days = [] }, user) {
    // Automatically calculate daily hours for each day
    const processedDays = days.map((d) => {
      const dailyHours = computeHours(d.startTime, d.endTime, d.breakHours);
      return {
        ...d,
        dailyHours,
      };
    });

    const created = await scheduleRepository.create(name, scheduleType, processedDays);

    await auditService.log({
      userId: user.id,
      action: 'SCHEDULE_CREATED',
      entityName: 'WorkingSchedule',
      entityId: String(created.id),
      previousValue: null,
      newValue: JSON.stringify({ name: created.name, weeklyHours: created.weeklyHours }),
    });

    return created;
  }

  async updateSchedule(id, { name, scheduleType, days }, user) {
    const current = await scheduleRepository.findById(id);
    if (!current) {
      throw { statusCode: 404, message: 'Working schedule not found.', code: 'SCHEDULE_NOT_FOUND' };
    }

    let processedDays = undefined;
    if (days && days.length > 0) {
      processedDays = days.map((d) => ({
        ...d,
        dailyHours: computeHours(d.startTime, d.endTime, d.breakHours),
      }));
    }

    const updated = await scheduleRepository.update(id, name, scheduleType, processedDays);

    await auditService.log({
      userId: user.id,
      action: 'SCHEDULE_UPDATED',
      entityName: 'WorkingSchedule',
      entityId: String(id),
      previousValue: JSON.stringify({ weeklyHours: current.weeklyHours }),
      newValue: JSON.stringify({ weeklyHours: updated.weeklyHours }),
    });

    return updated;
  }
}

module.exports = new ScheduleService();
