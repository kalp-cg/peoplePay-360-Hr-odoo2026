const contractService = require('./contract.service');
const { sendSuccess, sendError } = require('../../utils/response');

class ContractController {
  async getAll(req, res, next) {
    try {
      const contracts = await contractService.getAllContracts(req.query, req.user);
      return sendSuccess(res, contracts);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const contract = await contractService.getContractById(req.params.id);
      return sendSuccess(res, contract);
    } catch (err) {
      next(err);
    }
  }

  async lookupApplicable(req, res, next) {
    try {
      const { employeeId, date, periodStart, periodEnd } = req.query;
      if (!employeeId) {
        return sendError(res, 'employeeId is required', 400);
      }
      const pStart = periodStart || date || new Date().toISOString().split('T')[0];
      const pEnd = periodEnd || date || new Date().toISOString().split('T')[0];
      const contract = await contractService.findApplicableContract(employeeId, pStart, pEnd);
      return sendSuccess(res, contract);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { employeeId, startDate, wage, salaryStructureId } = req.body;
      if (!employeeId || !startDate || wage === undefined || !salaryStructureId) {
        return sendError(res, 'employeeId, startDate, wage, and salaryStructureId are required.', 400, 'MISSING_FIELDS');
      }
      const created = await contractService.createContract(req.body, req.user);
      return sendSuccess(res, created, 201, 'Contract created successfully.');
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const updated = await contractService.updateContract(req.params.id, req.body, req.user);
      return sendSuccess(res, updated, 200, 'Contract updated successfully.');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ContractController();
