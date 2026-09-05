const PDFDocument = require('pdfkit');

/**
 * Generates a professional, print-ready PDF payslip
 */
function generatePayslipPDF(payslip, dataCallback, endCallback) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  doc.on('data', dataCallback);
  doc.on('end', endCallback);

  const emp = payslip.employee;
  const payrun = payslip.payrun;
  const lines = payslip.payslipLines || [];

  const earnings = lines.filter((l) => l.category === 'BASIC' || l.category === 'ALLOWANCE' || l.category === 'GROSS');
  const deductions = lines.filter((l) => l.category === 'DEDUCTION');

  // Palette: Odoo purple #714B67 and Slate #2C3E50
  const primaryColor = '#714B67';
  const darkSlate = '#2C3E50';

  // 1. Header Banner
  doc.rect(40, 40, 515, 60).fill(primaryColor);
  doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold').text('PEOPLEPAY360', 60, 55);
  doc.fontSize(10).font('Helvetica').text('CONFIDENTIAL SALARY PAYSLIP', 60, 80);

  doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold').text(`Payslip No: ${payslip.payslipNumber}`, 350, 55, { align: 'right', width: 185 });
  doc.font('Helvetica').text(`Status: ${payslip.status}`, 350, 70, { align: 'right', width: 185 });
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 350, 85, { align: 'right', width: 185 });

  doc.moveDown(3);

  // 2. Employee & Payrun Information Block
  const startY = 120;
  doc.rect(40, startY, 515, 85).strokeColor('#E2E8F0').stroke();

  doc.fillColor(darkSlate).fontSize(9).font('Helvetica-Bold');
  doc.text('EMPLOYEE DETAILS', 50, startY + 10);
  doc.text('PAYROLL PERIOD', 320, startY + 10);

  doc.font('Helvetica').fontSize(9).fillColor('#475569');
  doc.text(`Name: ${emp.name}`, 50, startY + 28);
  doc.text(`Employee ID: ${emp.employeeId}`, 50, startY + 42);
  doc.text(`Department: ${emp.department?.name || 'General'}`, 50, startY + 56);
  doc.text(`Designation: ${emp.jobPosition?.title || 'Staff'}`, 50, startY + 70);

  const pStart = payrun?.periodStart ? new Date(payrun.periodStart).toLocaleDateString() : 'N/A';
  const pEnd = payrun?.periodEnd ? new Date(payrun.periodEnd).toLocaleDateString() : 'N/A';

  doc.text(`Period: ${pStart} - ${pEnd}`, 320, startY + 28);
  doc.text(`Payrun: ${payrun?.name || 'Standard'}`, 320, startY + 42);
  doc.text(`Bank: ${emp.bankName || 'Direct Transfer'}`, 320, startY + 56);
  doc.text(`A/C No: ${emp.bankAccountNumber || 'N/A'}`, 320, startY + 70);

  // 3. Attendance & Worked Summary
  const attY = 220;
  doc.rect(40, attY, 515, 45).fill('#F8FAFC');
  doc.fillColor(darkSlate).fontSize(8).font('Helvetica-Bold');
  doc.text('WORKING DAYS', 55, attY + 10);
  doc.text('PRESENT DAYS', 160, attY + 10);
  doc.text('LEAVE DAYS', 270, attY + 10);
  doc.text('ABSENT DAYS', 370, attY + 10);
  doc.text('OVERTIME (HRS)', 460, attY + 10);

  doc.fontSize(11).font('Helvetica').fillColor(primaryColor);
  doc.text(String(payslip.workingDays), 55, attY + 25);
  doc.text(String(payslip.presentDays), 160, attY + 25);
  doc.text(String(payslip.leaveDays), 270, attY + 25);
  doc.text(String(payslip.absentDays), 370, attY + 25);
  doc.text(String(payslip.overtimeHours), 460, attY + 25);

  // 4. Salary Breakdown Table Header
  const tableY = 285;
  doc.rect(40, tableY, 250, 22).fill('#714B67');
  doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold').text('EARNINGS & ALLOWANCES', 50, tableY + 6);
  doc.text('AMOUNT (INR)', 210, tableY + 6, { width: 70, align: 'right' });

  doc.rect(305, tableY, 250, 22).fill('#714B67');
  doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold').text('DEDUCTIONS & TAXES', 315, tableY + 6);
  doc.text('AMOUNT (INR)', 475, tableY + 6, { width: 70, align: 'right' });

  // Rows
  let curY = tableY + 28;
  const maxRows = Math.max(earnings.length, deductions.length, 1);

  for (let i = 0; i < maxRows; i++) {
    const earn = earnings[i];
    const ded = deductions[i];

    doc.fillColor('#334155').fontSize(9).font('Helvetica');
    if (earn) {
      doc.text(earn.name, 50, curY);
      doc.text(`₹${earn.amount.toLocaleString()}`, 210, curY, { width: 70, align: 'right' });
    }

    if (ded) {
      doc.text(ded.name, 315, curY);
      doc.text(`-₹${ded.amount.toLocaleString()}`, 475, curY, { width: 70, align: 'right' });
    }

    doc.moveTo(40, curY + 16).lineTo(555, curY + 16).strokeColor('#F1F5F9').stroke();
    curY += 22;
  }

  // 5. Totals Box
  curY = Math.max(curY + 15, 450);
  doc.rect(40, curY, 250, 30).fill('#F1F5F9');
  doc.fillColor(darkSlate).fontSize(9).font('Helvetica-Bold').text('TOTAL GROSS SALARY:', 50, curY + 10);
  doc.text(`₹${payslip.grossSalary.toLocaleString()}`, 190, curY + 10, { width: 90, align: 'right' });

  doc.rect(305, curY, 250, 30).fill('#F1F5F9');
  doc.fillColor(darkSlate).fontSize(9).font('Helvetica-Bold').text('TOTAL DEDUCTIONS:', 315, curY + 10);
  doc.text(`-₹${payslip.totalDeductions.toLocaleString()}`, 455, curY + 10, { width: 90, align: 'right' });

  // 6. Net Pay Banner
  const netY = curY + 45;
  doc.rect(40, netY, 515, 55).fill('#00A09D');
  doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold').text('NET PAYABLE SALARY', 60, netY + 14);
  doc.fontSize(8).font('Helvetica').text('(Gross Salary minus all statutory deductions)', 60, netY + 32);

  doc.fontSize(18).font('Helvetica-Bold').text(`₹${payslip.netSalary.toLocaleString()}`, 330, netY + 17, { width: 210, align: 'right' });

  // Footer
  doc.fontSize(7).font('Helvetica').fillColor('#94A3B8').text(
    'This document is computer generated by PeoplePay360 HR & Payroll Engine and requires no signature.',
    40,
    760,
    { align: 'center', width: 515 }
  );

  doc.end();
}

module.exports = { generatePayslipPDF };
