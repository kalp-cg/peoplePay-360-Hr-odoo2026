/**
 * PeoplePay360 Deterministic Salary Rule Calculation Engine
 *
 * Evaluates salary rules sequentially (1 to N) using real employee data,
 * period-specific contracts, attendance records, and approved leaves.
 *
 * CRITICAL RULE: AI DOES NOT calculate salaries. This engine is 100% deterministic.
 */

class PayrollEngine {
  /**
   * Safe algebraic expression evaluator with a scoped context dictionary.
   */
  evaluateExpression(expression, context, ruleCode) {
    if (typeof expression === 'number') return expression;
    if (!expression || typeof expression !== 'string') return 0;

    const trimmed = expression.trim();
    // Check if simple numeric
    if (!isNaN(Number(trimmed))) {
      return Number(trimmed);
    }

    const label = ruleCode ? `Salary rule "${ruleCode}"` : 'A salary rule';

    let result;
    try {
      // Build function with explicit context variable names
      const keys = Object.keys(context);
      const values = Object.values(context);
      // Create safe sanitized evaluation function
      const fn = new Function(...keys, `return (${trimmed});`);
      result = fn(...values);
    } catch (err) {
      // Swallowing this used to return 0, which quietly produced payslips with a
      // zero gross and net instead of stopping the run. Payroll must never guess.
      throw {
        statusCode: 400,
        code: 'RULE_EXPRESSION_FAILED',
        message:
          `${label} could not be calculated. Its formula "${trimmed}" is invalid: ${err.message}. ` +
          'Correct the rule in Salary Rules and compute again.',
      };
    }

    if (typeof result !== 'number' || !isFinite(result)) {
      throw {
        statusCode: 400,
        code: 'RULE_EXPRESSION_FAILED',
        message:
          `${label} produced a non-numeric result from the formula "${trimmed}". ` +
          'Correct the rule in Salary Rules and compute again.',
      };
    }

    return Math.round(result * 100) / 100;
  }

  /**
   * Calculate payslip lines for a single employee in a payroll period.
   *
   * @param {Object} employee - Employee record
   * @param {Object} contract - Applicable contract for the period
   * @param {Array} salaryRules - Active salary rules ordered by sequence asc
   * @param {Object} attendanceSummary - { workedDays, presentDays, lateDays, absentDays, overtimeHours }
   * @param {Object} leaveSummary - { paidLeaveDays, unpaidLeaveDays }
   * @param {number} totalPeriodDays - Standard working days in the period (e.g. 22)
   */
  computePayslip({
    employee,
    contract,
    salaryRules,
    attendanceSummary = {},
    leaveSummary = {},
    totalPeriodDays = 22,
  }) {
    if (!contract || !contract.wage) {
      throw new Error(`Employee ${employee.name} (${employee.employeeId}) has no valid contract or wage.`);
    }

    const wage = contract.wage;
    const workedDays = attendanceSummary.presentDays || totalPeriodDays;
    const unpaidLeaves = leaveSummary.unpaidLeaveDays || 0;
    const paidLeaves = leaveSummary.paidLeaveDays || 0;
    const overtimeHours = attendanceSummary.overtimeHours || 0;

    // Attendance prorate ratio if unpaid leave was taken
    const effectiveWorkingDays = Math.max(0, totalPeriodDays - unpaidLeaves);
    const attendanceRatio = totalPeriodDays > 0 ? effectiveWorkingDays / totalPeriodDays : 1.0;
    const effectiveWage = Math.round(wage * attendanceRatio * 100) / 100;

    // Initial accumulator context dictionary for rules
    const context = {
      WAGE: effectiveWage,
      BASE_WAGE: wage,
      CONTRACT_WAGE: wage,
      EFFECTIVE_WAGE: effectiveWage,
      WORKED_DAYS: workedDays,
      TOTAL_DAYS: totalPeriodDays,
      PAID_LEAVES: paidLeaves,
      UNPAID_LEAVES: unpaidLeaves,
      OVERTIME_HOURS: overtimeHours,
      ATTENDANCE_RATIO: attendanceRatio,
    };

    const payslipLines = [];
    let grossSalary = 0;
    let totalDeductions = 0;
    let netSalary = 0;

    // Execute rules in strict ascending sequence
    for (const rule of salaryRules) {
      let amount = 0;

      if (rule.calculationType === 'FIXED') {
        amount = this.evaluateExpression(rule.valueExpression, context, rule.code);
        // If fixed amount basic and unpaid leave exists, scale proportionally
        if (rule.code === 'BASIC' && unpaidLeaves > 0) {
          amount = Math.round(amount * attendanceRatio * 100) / 100;
        }
      } else if (rule.calculationType === 'PERCENTAGE') {
        // e.g. "0.20 * BASIC" or pure percentage expression
        amount = this.evaluateExpression(rule.valueExpression, context, rule.code);
      } else if (rule.calculationType === 'FORMULA') {
        amount = this.evaluateExpression(rule.valueExpression, context, rule.code);
      }

      // Store in context accumulator for subsequent rules
      context[rule.code] = amount;

      // Classify line
      if (rule.category === 'GROSS') {
        grossSalary = amount;
      } else if (rule.category === 'DEDUCTION') {
        totalDeductions += amount;
      } else if (rule.category === 'NET') {
        netSalary = amount;
      }

      payslipLines.push({
        salaryRuleId: rule.id,
        code: rule.code,
        name: rule.name,
        category: rule.category,
        sequence: rule.sequence,
        amount: Math.round(amount * 100) / 100,
      });
    }

    // Fallback if GROSS or NET rule wasn't explicitly defined in the structure
    if (!grossSalary) {
      grossSalary = payslipLines
        .filter((l) => l.category === 'BASIC' || l.category === 'ALLOWANCE')
        .reduce((sum, l) => sum + l.amount, 0);
    }

    if (!netSalary) {
      netSalary = Math.max(0, grossSalary - totalDeductions);
    }

    return {
      workingDays: totalPeriodDays,
      presentDays: workedDays,
      leaveDays: paidLeaves + unpaidLeaves,
      absentDays: attendanceSummary.absentDays || 0,
      overtimeHours,
      grossSalary: Math.round(grossSalary * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100,
      payslipLines,
    };
  }
}

module.exports = new PayrollEngine();
