const payrollService = require('./payroll.service');
const { sendSuccess, sendError } = require('../../utils/response');

class PayrollController {
  async getAll(req, res, next) {
    try {
      const payruns = await payrollService.getAllPayruns(req.query);
      return sendSuccess(res, payruns);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const payrun = await payrollService.getPayrunById(req.params.id);
      return sendSuccess(res, payrun);
    } catch (err) {
      next(err);
    }
  }

  async getEligibleEmployees(req, res, next) {
    try {
      const { salaryStructureId, periodStart, periodEnd } = req.query;
      const employees = await payrollService.getEligibleEmployees(salaryStructureId, periodStart, periodEnd);
      return sendSuccess(res, employees);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const created = await payrollService.createPayrun(req.body, req.user);
      return sendSuccess(res, created, 201, 'Payrun created successfully.');
    } catch (err) {
      next(err);
    }
  }

  async compute(req, res, next) {
    try {
      const computed = await payrollService.computePayrun(req.params.id, req.user);
      return sendSuccess(res, computed, 200, 'Payrun computed successfully.');
    } catch (err) {
      next(err);
    }
  }

  async submitForReview(req, res, next) {
    try {
      const submitted = await payrollService.submitForReview(req.params.id, req.user);
      return sendSuccess(res, submitted, 200, 'Payrun submitted for manager review.');
    } catch (err) {
      next(err);
    }
  }

  async validate(req, res, next) {
    try {
      const validated = await payrollService.validatePayrun(req.params.id, req.user);
      return sendSuccess(res, validated, 200, 'Payrun validated successfully.');
    } catch (err) {
      next(err);
    }
  }

  async markPaid(req, res, next) {
    try {
      const paid = await payrollService.markPaid(req.params.id, req.user);
      return sendSuccess(res, paid, 200, 'Payrun marked as PAID successfully.');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PayrollController();
