const payslipRepository = require('./payslip.repository');
const auditService = require('../audit/audit.service');
const logger = require('../../utils/logger');
const mailer = require('../../utils/mailer');

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

    if (user && user.role === 'EMPLOYEE' && user.employeeId !== payslip.employeeId) {
      throw { statusCode: 403, message: 'Access denied. You can only view your own payslips.', code: 'FORBIDDEN' };
    }

    return payslip;
  }

  async sendPayslipEmail(id, user) {
    const payslip = await this.getPayslipById(id, user);

    logger.info(`Dispatching real payslip email to ${payslip.employee.email} for ${payslip.payslipNumber}`);
    const emailResult = await mailer.sendPayslipEmail(payslip);
    const updated = await payslipRepository.updateSentStatus(id);

    if (user && user.id) {
      await auditService.log({
        userId: user.id,
        action: 'PAYSLIP_EMAILED',
        entityName: 'Payslip',
        entityId: String(id),
        previousValue: null,
        newValue: JSON.stringify({ 
          sentTo: payslip.employee.email, 
          payslipNumber: payslip.payslipNumber, 
          messageId: emailResult.messageId 
        }),
      });
    }

    return { 
      message: `Payslip ${payslip.payslipNumber} successfully emailed to ${payslip.employee.email}.`, 
      sentAt: updated.sentAt,
      messageId: emailResult.messageId 
    };
  }

  async bulkSendPayslips(payrunId, user) {
    const payslips = await payslipRepository.findAll({ payrunId });
    let successCount = 0;
    for (const p of payslips) {
      try {
        const fullSlip = await this.getPayslipById(p.id, user);
        await mailer.sendPayslipEmail(fullSlip);
        await payslipRepository.updateSentStatus(p.id);
        successCount++;
      } catch (err) {
        logger.error(`Failed to send email for payslip #${p.id}: ${err.message}`);
      }
    }

    if (user && user.id) {
      await auditService.log({
        userId: user.id,
        action: 'BULK_PAYSLIPS_EMAILED',
        entityName: 'Payrun',
        entityId: String(payrunId),
        previousValue: null,
        newValue: JSON.stringify({ dispatchedCount: successCount, totalCount: payslips.length }),
      });
    }

    return { message: `Successfully emailed ${successCount} payslips to employees.`, count: successCount };
  }
}

module.exports = new PayslipService();
