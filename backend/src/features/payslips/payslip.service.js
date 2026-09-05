const payslipRepository = require('./payslip.repository');
const auditService = require('../audit/audit.service');
const logger = require('../../utils/logger');

class PayslipService {
  async getAllPayslips(query, user) {
    if (user.role === 'EMPLOYEE' && user.employeeId) {
      query.employeeId = user.employeeId;
    }
    return payslipRepository.findAll(query);
  }

  async getPayslipById(id, user) {
    const payslip = await payslipRepository.findById(id);
    if (!payslip) {
      throw { statusCode: 404, message: 'Payslip not found.', code: 'PAYSLIP_NOT_FOUND' };
    }

    if (user.role === 'EMPLOYEE' && user.employeeId !== payslip.employeeId) {
      throw { statusCode: 403, message: 'Access denied. You can only view your own payslips.', code: 'FORBIDDEN' };
    }

    return payslip;
  }

  async sendPayslipEmail(id, user) {
    const payslip = await this.getPayslipById(id, user);

    // Simulate sending email to employee
    logger.info(`Dispatching payslip email to ${payslip.employee.email} for ${payslip.payslipNumber}`);
    const updated = await payslipRepository.updateSentStatus(id);

    await auditService.log({
      userId: user.id,
      action: 'PAYSLIP_EMAILED',
      entityName: 'Payslip',
      entityId: String(id),
      previousValue: null,
      newValue: JSON.stringify({ sentTo: payslip.employee.email, payslipNumber: payslip.payslipNumber }),
    });

    return { message: `Payslip ${payslip.payslipNumber} successfully emailed to ${payslip.employee.email}.`, sentAt: updated.sentAt };
  }

  async bulkSendPayslips(payrunId, user) {
    const payslips = await payslipRepository.findAll({ payrunId });
    for (const p of payslips) {
      await payslipRepository.updateSentStatus(p.id);
    }

    await auditService.log({
      userId: user.id,
      action: 'BULK_PAYSLIPS_EMAILED',
      entityName: 'Payrun',
      entityId: String(payrunId),
      previousValue: null,
      newValue: JSON.stringify({ dispatchedCount: payslips.length }),
    });

    return { message: `Successfully emailed ${payslips.length} payslips to employees.`, count: payslips.length };
  }
}

module.exports = new PayslipService();
