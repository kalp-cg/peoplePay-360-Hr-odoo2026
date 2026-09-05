const scheduleService = require('./schedule.service');
const { sendSuccess, sendError } = require('../../utils/response');

class ScheduleController {
  async getAll(req, res, next) {
    try {
      const schedules = await scheduleService.getAllSchedules();
      return sendSuccess(res, schedules);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const schedule = await scheduleService.getScheduleById(req.params.id);
      return sendSuccess(res, schedule);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { name, scheduleType, days } = req.body;
      if (!name || !days || !Array.isArray(days)) {
        return sendError(res, 'Schedule name and days array are required.', 400, 'MISSING_FIELDS');
      }
      const created = await scheduleService.createSchedule(req.body, req.user);
      return sendSuccess(res, created, 201, 'Working schedule created successfully.');
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const updated = await scheduleService.updateSchedule(req.params.id, req.body, req.user);
      return sendSuccess(res, updated, 200, 'Working schedule updated successfully.');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ScheduleController();
