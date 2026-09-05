const dashboardService = require('./dashboard.service');
const { sendSuccess } = require('../../utils/response');

class DashboardController {
  async getDashboard(req, res, next) {
    try {
      const data = await dashboardService.getDashboardData(req.query);
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DashboardController();
