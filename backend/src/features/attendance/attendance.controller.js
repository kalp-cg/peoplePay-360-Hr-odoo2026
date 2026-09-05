const attendanceService = require('./attendance.service');
const { sendSuccess, sendError } = require('../../utils/response');

class AttendanceController {
  async getAll(req, res, next) {
    try {
      const records = await attendanceService.getAttendance(req.query, req.user);
      return sendSuccess(res, records);
    } catch (err) {
      next(err);
    }
  }

  async record(req, res, next) {
    try {
      const record = await attendanceService.recordAttendance(req.body, req.user);
      return sendSuccess(res, record, 201, 'Attendance recorded.');
    } catch (err) {
      next(err);
    }
  }

  async correct(req, res, next) {
    try {
      const updated = await attendanceService.correctAttendance(req.params.id, req.body, req.user);
      return sendSuccess(res, updated, 200, 'Attendance corrected successfully.');
    } catch (err) {
      next(err);
    }
  }

  async getCurrentStatus(req, res, next) {
    try {
      const status = await attendanceService.getCurrentStatus(req.user);
      return sendSuccess(res, status);
    } catch (err) {
      next(err);
    }
  }

  async quickToggle(req, res, next) {
    try {
      const record = await attendanceService.quickToggle(req.user, req.body?.action);
      const isCheckedIn = Boolean(record.checkIn && !record.checkOut);
      return sendSuccess(res, {
        ...record,
        checkedIn: isCheckedIn,
        actionTaken: isCheckedIn ? 'CHECKED_IN' : 'CHECKED_OUT',
      }, 200, isCheckedIn ? 'Checked in successfully.' : 'Checked out of office successfully.');
    } catch (err) {
      next(err);
    }
  }

  async getPolicy(req, res, next) {
    try {
      const policy = await attendanceService.getPolicy();
      return sendSuccess(res, policy);
    } catch (err) {
      next(err);
    }
  }

  async updatePolicy(req, res, next) {
    try {
      const updated = await attendanceService.updatePolicy(req.body, req.user);
      return sendSuccess(res, updated, 200, 'Attendance policy updated successfully.');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AttendanceController();
