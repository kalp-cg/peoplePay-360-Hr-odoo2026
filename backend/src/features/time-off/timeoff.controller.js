const timeOffService = require('./timeoff.service');
const { sendSuccess, sendError } = require('../../utils/response');

class TimeOffController {
  async getTypes(req, res, next) {
    try {
      const types = await timeOffService.getTypes();
      return sendSuccess(res, types);
    } catch (err) {
      next(err);
    }
  }

  async createType(req, res, next) {
    try {
      const created = await timeOffService.createType(req.body);
      return sendSuccess(res, created, 201, 'Time off type created.');
    } catch (err) {
      next(err);
    }
  }

  async getAllocations(req, res, next) {
    try {
      const allocations = await timeOffService.getAllocations(req.query, req.user);
      return sendSuccess(res, allocations);
    } catch (err) {
      next(err);
    }
  }

  async createAllocation(req, res, next) {
    try {
      const { employeeId, timeOffTypeId, allocatedDays } = req.body;
      if (!employeeId || !timeOffTypeId || !allocatedDays) {
        return sendError(res, 'employeeId, timeOffTypeId, and allocatedDays are required.', 400, 'MISSING_FIELDS');
      }
      const created = await timeOffService.createAllocation(req.body, req.user);
      return sendSuccess(res, created, 201, 'Allocation created successfully.');
    } catch (err) {
      next(err);
    }
  }

  async getRequests(req, res, next) {
    try {
      const requests = await timeOffService.getRequests(req.query, req.user);
      return sendSuccess(res, requests);
    } catch (err) {
      next(err);
    }
  }

  async submitRequest(req, res, next) {
    try {
      const { timeOffTypeId, startDate, endDate, durationDays } = req.body;
      if (!timeOffTypeId || !startDate || !endDate) {
        return sendError(res, 'timeOffTypeId, startDate, and endDate are required.', 400, 'MISSING_FIELDS');
      }
      const created = await timeOffService.submitRequest(req.body, req.user);
      return sendSuccess(res, created, 201, 'Time off request submitted.');
    } catch (err) {
      next(err);
    }
  }

  async approveRequest(req, res, next) {
    try {
      const approved = await timeOffService.approveRequest(req.params.id, req.user);
      return sendSuccess(res, approved, 200, 'Time off request approved successfully.');
    } catch (err) {
      next(err);
    }
  }

  async rejectRequest(req, res, next) {
    try {
      const rejected = await timeOffService.rejectRequest(req.params.id, req.body.rejectionReason, req.user);
      return sendSuccess(res, rejected, 200, 'Time off request rejected.');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TimeOffController();
