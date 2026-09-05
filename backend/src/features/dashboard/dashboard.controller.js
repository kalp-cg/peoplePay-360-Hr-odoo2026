const dashboardService = require('./dashboard.service');
const { sendSuccess } = require('../../utils/response');

class DashboardController {
  async getDashboard(req, res, next) {
    try {
      const data = await dashboardService.getDashboardData(req.query, req.user);
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getEmployeePortal(req, res, next) {
    try {
      const data = await dashboardService.getEmployeePortalData(req.user);
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DashboardController();
