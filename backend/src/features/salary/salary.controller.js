const salaryService = require('./salary.service');
const { sendSuccess, sendError } = require('../../utils/response');

class SalaryController {
  async getStructures(req, res, next) {
    try {
      const structures = await salaryService.getStructures();
      return sendSuccess(res, structures);
    } catch (err) {
      next(err);
    }
  }

  async getStructureById(req, res, next) {
    try {
      const structure = await salaryService.getStructureById(req.params.id);
      return sendSuccess(res, structure);
    } catch (err) {
      next(err);
    }
  }

  async createStructure(req, res, next) {
    try {
      if (!req.body.name) {
        return sendError(res, 'Structure name is required.', 400, 'MISSING_FIELDS');
      }
      const created = await salaryService.createStructure(req.body, req.user);
      return sendSuccess(res, created, 201, 'Salary structure created.');
    } catch (err) {
      next(err);
    }
  }

  async updateStructure(req, res, next) {
    try {
      const updated = await salaryService.updateStructure(req.params.id, req.body, req.user);
      return sendSuccess(res, updated, 200, 'Salary structure updated.');
    } catch (err) {
      next(err);
    }
  }

  async getRules(req, res, next) {
    try {
      const rules = await salaryService.getRules(req.query);
      return sendSuccess(res, rules);
    } catch (err) {
      next(err);
    }
  }

  async createRule(req, res, next) {
    try {
      const { salaryStructureId, name, code, category, sequence, valueExpression } = req.body;
      if (!salaryStructureId || !name || !code || !category || sequence === undefined || !valueExpression) {
        return sendError(res, 'salaryStructureId, name, code, category, sequence, and valueExpression are required.', 400, 'MISSING_FIELDS');
      }
      const created = await salaryService.createRule(req.body, req.user);
      return sendSuccess(res, created, 201, 'Salary rule created.');
    } catch (err) {
      next(err);
    }
  }

  async updateRule(req, res, next) {
    try {
      const updated = await salaryService.updateRule(req.params.id, req.body, req.user);
      return sendSuccess(res, updated, 200, 'Salary rule updated.');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SalaryController();
