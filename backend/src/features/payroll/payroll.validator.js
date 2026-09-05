/**
 * PeoplePay360 Payroll Validation Engine
 *
 * Validates payroll data integrity before a payrun can be validated or marked as paid.
 * Populates warnings and returns critical validation failure status.
 */

class PayrollValidator {
  /**
   * Validate a payrun and its employee payslips.
   *
   * @param {Object} payrun - Payrun record with payslips and employees
   * @returns {Array} warnings - List of warnings { employeeId, type, severity, message }
   */
  validatePayrun(payrun) {
    const warnings = [];
    const seenEmployeeIds = new Set();

    if (!payrun.payslips || payrun.payslips.length === 0) {
      warnings.push({
        payrunId: payrun.id,
        type: 'EMPTY_PAYRUN',
        severity: 'CRITICAL',
        message: 'Payrun contains no employee payslips to process.',
      });
      return { warnings, hasCriticalErrors: true };
    }

    for (const payslip of payrun.payslips) {
      const emp = payslip.employee;

      // 1. Duplicate Payslip Check
      if (seenEmployeeIds.has(payslip.employeeId)) {
        warnings.push({
          payrunId: payrun.id,
          employeeId: payslip.employeeId,
          type: 'DUPLICATE_PAYSLIP',
          severity: 'CRITICAL',
          message: `Duplicate payslip detected for employee ${emp?.name || payslip.employeeId}.`,
        });
      }
      seenEmployeeIds.add(payslip.employeeId);

      // 2. Missing Contract or Inactive Contract Check
      if (!payslip.contract) {
        warnings.push({
          payrunId: payrun.id,
          employeeId: payslip.employeeId,
          type: 'MISSING_CONTRACT',
          severity: 'CRITICAL',
          message: `Employee ${emp?.name || payslip.employeeId} has no applicable contract for period ${payrun.periodStart.toISOString().slice(0, 7)}.`,
        });
      }

      // 3. Missing Bank Details (Warning, Non-blocking or Warning flag)
      if (!emp?.bankAccountNumber || !emp?.bankIfscCode) {
        warnings.push({
          payrunId: payrun.id,
          employeeId: payslip.employeeId,
          type: 'MISSING_BANK_DETAILS',
          severity: 'WARNING',
          message: `Employee ${emp?.name || payslip.employeeId} is missing bank account details or IFSC code.`,
        });
      }

      // 4. Net Salary Calculation Health
      if (payslip.netSalary <= 0) {
        warnings.push({
          payrunId: payrun.id,
          employeeId: payslip.employeeId,
          type: 'NEGATIVE_OR_ZERO_NET',
          severity: 'CRITICAL',
          message: `Employee ${emp?.name || payslip.employeeId} has a non-positive net salary (₹${payslip.netSalary}).`,
        });
      }

      // 5. Empty Payslip Lines Check
      if (!payslip.payslipLines || payslip.payslipLines.length === 0) {
        warnings.push({
          payrunId: payrun.id,
          employeeId: payslip.employeeId,
          type: 'NO_PAYSLIP_LINES',
          severity: 'CRITICAL',
          message: `No itemized salary rule lines generated for ${emp?.name || payslip.employeeId}.`,
        });
      }
    }

    const hasCriticalErrors = warnings.some((w) => w.severity === 'CRITICAL');
    return { warnings, hasCriticalErrors };
  }
}

module.exports = new PayrollValidator();
