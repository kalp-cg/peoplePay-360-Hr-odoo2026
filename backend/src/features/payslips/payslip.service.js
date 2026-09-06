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
    // Fail fast rather than looping over every payslip to produce the same error.
    mailer.assertConfigured();

    const payslips = await payslipRepository.findAll({ payrunId });
    if (!payslips.length) {
      throw { statusCode: 400, message: 'This payrun has no payslips to send.', code: 'EMPTY_PAYRUN' };
    }

    const failures = [];
    let successCount = 0;

    for (const p of payslips) {
      try {
        const fullSlip = await this.getPayslipById(p.id, user);
        await mailer.sendPayslipEmail(fullSlip);
        await payslipRepository.updateSentStatus(p.id);
        successCount++;
      } catch (err) {
        const reason = err && err.message ? err.message : String(err);
        logger.error(`Failed to send email for payslip #${p.id}: ${reason}`);
        failures.push({ payslipId: p.id, employee: p.employee && p.employee.name, reason });
      }
    }

    if (user && user.id) {
      await auditService.log({
        userId: user.id,
        action: 'BULK_PAYSLIPS_EMAILED',
        entityName: 'Payrun',
        entityId: String(payrunId),
        previousValue: null,
        newValue: JSON.stringify({
          dispatchedCount: successCount,
          failedCount: failures.length,
          totalCount: payslips.length,
        }),
      });
    }

    // Reporting HTTP 200 after delivering nothing shows the user a success toast
    // for an email run that never happened, so surface it as a real failure.
    if (successCount === 0) {
      throw {
        statusCode: 502,
        code: 'EMAIL_DISPATCH_FAILED',
        message: `Could not email any of the ${payslips.length} payslips. First error: ${
          failures[0] ? failures[0].reason : 'unknown'
        }`,
      };
    }

    const message =
      failures.length === 0
        ? `Successfully emailed all ${successCount} payslips to employees.`
        : `Emailed ${successCount} of ${payslips.length} payslips. ${failures.length} failed - see the audit log for details.`;

    return { message, count: successCount, failed: failures.length, total: payslips.length, failures };
  }
}

module.exports = new PayslipService();
