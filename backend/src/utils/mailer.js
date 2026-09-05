const nodemailer = require('nodemailer');
const { generatePayslipPDF } = require('../features/payslips/payslip.pdf');
const logger = require('./logger');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const user = process.env.SMTP_USER;
    const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const secure = process.env.SMTP_SECURE !== 'false';

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return transporter;
}

/**
 * Helper to generate PDF buffer from generatePayslipPDF
 */
function getPayslipPdfBuffer(payslip) {
  return new Promise((resolve, reject) => {
    try {
      const chunks = [];
      generatePayslipPDF(
        payslip,
        (chunk) => chunks.push(chunk),
        () => resolve(Buffer.concat(chunks))
      );
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Format Indian Rupee currency string
 */
function formatINR(val) {
  const num = Number(val) || 0;
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/**
 * Send an email with optional attachments
 */
async function sendMail({ to, subject, html, text, attachments = [] }) {
  const transport = getTransporter();
  const from = process.env.SMTP_FROM || `"PeoplePay360 HR & Payroll" <${process.env.SMTP_USER || 'no-reply@peoplepay360.com'}>`;

  const info = await transport.sendMail({
    from,
    to,
    subject,
    text,
    html,
    attachments,
  });

  logger.info(`[Mailer] Email successfully dispatched to ${to} | MessageID: ${info.messageId}`);
  return info;
}

/**
 * Dispatches an official payslip email with a branded HTML template and attached PDF
 */
async function sendPayslipEmail(payslip) {
  if (!payslip || !payslip.employee || !payslip.employee.email) {
    throw new Error('Invalid payslip or employee email missing');
  }

  const emp = payslip.employee;
  const payrun = payslip.payrun;
  const periodStart = payrun?.periodStart ? new Date(payrun.periodStart).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const periodEnd = payrun?.periodEnd ? new Date(payrun.periodEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const periodLabel = periodStart && periodEnd ? `${periodStart} – ${periodEnd}` : (payrun?.name || 'Current Pay Period');

  // Generate PDF buffer
  let pdfBuffer = null;
  try {
    pdfBuffer = await getPayslipPdfBuffer(payslip);
  } catch (pdfErr) {
    logger.warn(`Failed to generate PDF buffer for payslip #${payslip.id}: ${pdfErr.message}`);
  }

  const earnings = (payslip.payslipLines || []).filter(
    (l) => l.category === 'BASIC' || l.category === 'ALLOWANCE' || l.category === 'GROSS'
  );
  const deductions = (payslip.payslipLines || []).filter(
    (l) => l.category === 'DEDUCTION'
  );

  const netSalaryFormatted = formatINR(payslip.netSalary);
  const grossSalaryFormatted = formatINR(payslip.grossSalary);
  const deductionsFormatted = formatINR(payslip.totalDeductions);

  const earningsRows = earnings
    .map(
      (l) => `
      <tr>
        <td style="padding: 6px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 13px;">${l.name}</td>
        <td style="padding: 6px 12px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 600; text-align: right; font-size: 13px;">${formatINR(l.amount)}</td>
      </tr>`
    )
    .join('');

  const deductionsRows = deductions
    .map(
      (l) => `
      <tr>
        <td style="padding: 6px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 13px;">${l.name}</td>
        <td style="padding: 6px 12px; border-bottom: 1px solid #f1f5f9; color: #dc2626; font-weight: 600; text-align: right; font-size: 13px;">-${formatINR(l.amount)}</td>
      </tr>`
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payslip - ${payslip.payslipNumber}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Top Header Banner -->
    <div style="background: linear-gradient(135deg, #714B67 0%, #53364c 100%); padding: 28px 24px; color: #ffffff;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
            PeoplePay<span style="color: #5eead4;">360</span>
          </div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #99f6e4; font-weight: 600; margin-top: 2px;">
            HR & Payroll Operations
          </div>
        </div>
        <div style="text-align: right; background: rgba(255,255,255,0.12); padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2);">
          <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #cbd5e1;">Payslip Number</div>
          <div style="font-size: 13px; font-weight: 700; color: #ffffff; font-family: monospace;">${payslip.payslipNumber}</div>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div style="padding: 24px;">
      <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #0f172a; font-weight: 700;">
        Dear ${emp.name},
      </h2>
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #475569;">
        Your salary slip for the payroll cycle <strong>${periodLabel}</strong> has been computed. Below is your compensation and payout summary.
      </p>

      <!-- Payout Highlight Box -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin-bottom: 24px; text-align: center;">
        <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #166534;">
          Net Disbursed Salary
        </div>
        <div style="font-size: 30px; font-weight: 800; color: #15803d; margin: 6px 0 2px 0;">
          ${netSalaryFormatted}
        </div>
        <div style="font-size: 11px; color: #166534;">
          Bank Transfer to ${emp.bankName || 'HDFC Bank Ltd'} (A/C ending in ${String(emp.bankAccountNumber || '••••').slice(-4)})
        </div>
      </div>

      <!-- Employee Info Summary Grid -->
      <table style="width: 100%; margin-bottom: 20px; font-size: 12px; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; color: #64748b; width: 25%;">Employee ID:</td>
          <td style="padding: 4px 0; color: #0f172a; font-weight: 600; width: 25%; font-family: monospace;">${emp.employeeId}</td>
          <td style="padding: 4px 0; color: #64748b; width: 25%;">Department:</td>
          <td style="padding: 4px 0; color: #0f172a; font-weight: 600; width: 25%;">${emp.department?.name || 'General'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Designation:</td>
          <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${emp.jobPosition?.title || 'Staff'}</td>
          <td style="padding: 4px 0; color: #64748b;">Attendance:</td>
          <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${payslip.presentDays || payslip.workingDays} / ${payslip.workingDays} Days</td>
        </tr>
      </table>

      <!-- Salary Breakdown Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569;">Description</th>
            <th style="padding: 8px 12px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${earningsRows}
          <tr style="background: #f1f5f9; font-weight: 700;">
            <td style="padding: 8px 12px; color: #1e293b; font-size: 13px;">Total Gross Earnings</td>
            <td style="padding: 8px 12px; color: #1e293b; text-align: right; font-size: 13px;">${grossSalaryFormatted}</td>
          </tr>
          ${deductionsRows}
          <tr style="background: #f1f5f9; font-weight: 700;">
            <td style="padding: 8px 12px; color: #1e293b; font-size: 13px;">Total Deductions</td>
            <td style="padding: 8px 12px; color: #dc2626; text-align: right; font-size: 13px;">-${deductionsFormatted}</td>
          </tr>
          <tr style="background: #ecfdf5; font-weight: 800; border-top: 2px solid #10b981;">
            <td style="padding: 10px 12px; color: #065f46; font-size: 14px;">Net Disbursed Take-Home</td>
            <td style="padding: 10px 12px; color: #065f46; text-align: right; font-size: 15px;">${netSalaryFormatted}</td>
          </tr>
        </tbody>
      </table>

      <!-- PDF Attachment Callout -->
      <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 20px;">📎</span>
        <div style="font-size: 12px; color: #475569; line-height: 1.4;">
          Your official signed PDF payslip (<strong>${payslip.payslipNumber}.pdf</strong>) has been generated and is attached to this email for your tax filing and personal records.
        </div>
      </div>

      <p style="font-size: 12px; color: #94a3b8; line-height: 1.4; margin: 0;">
        If you have any questions regarding your salary computation or tax deductions, please reach out to your HR/Payroll department via the PeoplePay360 Self-Service Portal.
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f1f5f9; border-top: 1px solid #e2e8f0; padding: 14px 24px; text-align: center; font-size: 11px; color: #64748b;">
      <div>PeoplePay360 HR & Payroll Platform • Automated System Notification</div>
      <div style="margin-top: 2px; color: #94a3b8;">This is an electronically generated message. Please do not reply directly to this email.</div>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Dear ${emp.name},

Your salary slip for the payroll cycle ${periodLabel} has been processed.

Payslip Number: ${payslip.payslipNumber}
Gross Earnings: ${grossSalaryFormatted}
Total Deductions: -${deductionsFormatted}
Net Disbursed Salary: ${netSalaryFormatted}

The official PDF payslip is attached to this email.

Best regards,
PeoplePay360 HR & Payroll Team
  `;

  const attachments = [];
  if (pdfBuffer) {
    attachments.push({
      filename: `Payslip_${payslip.payslipNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  const subject = `Your Salary Slip for ${periodLabel} [${payslip.payslipNumber}]`;

  return sendMail({
    to: emp.email,
    subject,
    html,
    text,
    attachments,
  });
}

module.exports = {
  getTransporter,
  sendMail,
  sendPayslipEmail,
};
