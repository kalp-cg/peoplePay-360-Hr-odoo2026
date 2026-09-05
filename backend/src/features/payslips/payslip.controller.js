const payslipService = require('./payslip.service');
const { generatePayslipPDF } = require('./payslip.pdf');
const { sendSuccess } = require('../../utils/response');

class PayslipController {
  async getAll(req, res, next) {
    try {
      const payslips = await payslipService.getAllPayslips(req.query, req.user);
      return sendSuccess(res, payslips);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const payslip = await payslipService.getPayslipById(req.params.id, req.user);
      return sendSuccess(res, payslip);
    } catch (err) {
      next(err);
    }
  }

  async getPDF(req, res, next) {
    try {
      const payslip = await payslipService.getPayslipById(req.params.id, req.user);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${payslip.payslipNumber}.pdf"`);

      generatePayslipPDF(
        payslip,
        (chunk) => res.write(chunk),
        () => res.end()
      );
    } catch (err) {
      next(err);
    }
  }

  async sendEmail(req, res, next) {
    try {
      const result = await payslipService.sendPayslipEmail(req.params.id, req.user);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async bulkSend(req, res, next) {
    try {
      const { payrunId } = req.body;
      const result = await payslipService.bulkSendPayslips(payrunId, req.user);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PayslipController();
