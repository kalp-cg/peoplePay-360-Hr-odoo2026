const aiService = require('./ai.service');
const { sendSuccess } = require('../../utils/response');

class AIController {
  async explainSalaryChange(req, res, next) {
    try {
      const result = await aiService.explainSalaryChange(req.params.employeeId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async detectAnomalies(req, res, next) {
    try {
      const anomalies = await aiService.detectAnomalies(req.query.payrunId);
      return sendSuccess(res, anomalies);
    } catch (err) {
      next(err);
    }
  }

  async queryNL(req, res, next) {
    try {
      const result = await aiService.queryNL(req.body.query);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AIController();
