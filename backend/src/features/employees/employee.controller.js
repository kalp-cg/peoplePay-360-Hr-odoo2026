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
}

module.exports = new EmployeeController();
