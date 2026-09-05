const employeeService = require('./employee.service');
const { sendSuccess, sendError } = require('../../utils/response');

class EmployeeController {
  async getAll(req, res, next) {
    try {
      const employees = await employeeService.getAllEmployees(req.query, req.user);
      return sendSuccess(res, employees);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const employee = await employeeService.getEmployeeById(req.params.id, req.user);
      return sendSuccess(res, employee);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { employeeId, name, email, departmentId, jobPositionId, joiningDate } = req.body;
      if (!employeeId || !name || !email || !departmentId || !jobPositionId || !joiningDate) {
        return sendError(res, 'employeeId, name, email, departmentId, jobPositionId, and joiningDate are required.', 400, 'MISSING_FIELDS');
      }
      const created = await employeeService.createEmployee(req.body, req.user);
      return sendSuccess(res, created, 201, 'Employee created successfully.');
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const updated = await employeeService.updateEmployee(req.params.id, req.body, req.user);
      return sendSuccess(res, updated, 200, 'Employee updated successfully.');
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await employeeService.deleteEmployee(req.params.id, req.user);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async createProfileRequest(req, res, next) {
    try {
      const profileRequestService = require('./profile-request.service');
      const created = await profileRequestService.createRequest(req.body, req.user);
      return sendSuccess(res, created, 201, 'Profile change request submitted for HR approval.');
    } catch (err) {
      next(err);
    }
  }

  async getProfileRequests(req, res, next) {
    try {
      const profileRequestService = require('./profile-request.service');
      const requests = await profileRequestService.getAllRequests(req.query, req.user);
      return sendSuccess(res, requests);
    } catch (err) {
      next(err);
    }
  }

  async approveProfileRequest(req, res, next) {
    try {
      const profileRequestService = require('./profile-request.service');
      const approved = await profileRequestService.approveRequest(req.params.requestId, req.user);
      return sendSuccess(res, approved, 200, 'Profile change request approved and employee record updated.');
    } catch (err) {
      next(err);
    }
  }

  async rejectProfileRequest(req, res, next) {
    try {
      const profileRequestService = require('./profile-request.service');
      const rejected = await profileRequestService.rejectRequest(req.params.requestId, req.body.reason, req.user);
      return sendSuccess(res, rejected, 200, 'Profile change request rejected.');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EmployeeController();
