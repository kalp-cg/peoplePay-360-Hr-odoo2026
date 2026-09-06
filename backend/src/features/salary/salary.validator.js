/**
 * Validation for salary rules.
 *
 * A rule's `code` becomes a variable name inside the formula evaluator, and its
 * `valueExpression` is evaluated as an arithmetic expression over the codes that
 * ran before it. That makes two things unsafe to accept blindly:
 *
 *   - a code that is not a valid identifier. "HRA-TS" reads as "HRA minus TS"
 *     inside a formula, so `BASIC + HRA + ALLOWANCE + HRA-TS` silently evaluated
 *     to 0 and produced payslips with a zero gross and net.
 *   - an expression referencing a code that does not exist yet, which quietly
 *     contributes nothing rather than failing.
 *
 * Both are caught here, at save time, with a message that names the problem.
 */
const prisma = require('../../config/database');

/** Variables the payroll engine puts in scope before any rule runs. */
const CONTEXT_VARIABLES = [
  'WAGE', 'BASE_WAGE', 'CONTRACT_WAGE', 'EFFECTIVE_WAGE',
  'WORKED_DAYS', 'TOTAL_DAYS', 'PAID_LEAVES', 'UNPAID_LEAVES',
  'OVERTIME_HOURS', 'ATTENDANCE_RATIO',
];

/** Helpers a formula may legitimately call. */
const ALLOWED_HELPERS = ['Math', 'min', 'max', 'round', 'abs', 'floor', 'ceil'];

const VALID_CODE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const VALID_CATEGORIES = ['BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET'];
const VALID_CALC_TYPES = ['FIXED', 'PERCENTAGE', 'FORMULA'];

function fail(message, code = 'INVALID_SALARY_RULE') {
  throw { statusCode: 400, message, code };
}

/**
 * @param {Object} data       incoming rule payload
 * @param {Object} [existing] the rule being updated, when this is an update
 */
async function validateRule(data, existing = null) {
  const structureId = parseInt(data.salaryStructureId ?? existing?.salaryStructureId, 10);
  if (!structureId) fail('A salary structure must be selected for this rule.', 'MISSING_STRUCTURE');

  const code = (data.code ?? existing?.code ?? '').trim();
  const name = (data.name ?? existing?.name ?? '').trim();
  const category = data.category ?? existing?.category;
  const calculationType = data.calculationType ?? existing?.calculationType;
  const expression = String(data.valueExpression ?? existing?.valueExpression ?? '').trim();
  const sequence = parseInt(data.sequence ?? existing?.sequence, 10);

  if (!name) fail('Rule name is required.', 'MISSING_FIELDS');

  if (!code) fail('Rule code is required.', 'MISSING_FIELDS');
  if (!VALID_CODE.test(code)) {
    fail(
      `Rule code "${code}" is not valid. Codes are used as variables inside salary formulas, ` +
      'so they may contain only letters, digits and underscores, and cannot start with a digit. ' +
      `Try "${code.replace(/[^A-Za-z0-9_]/g, '_').replace(/^([0-9])/, '_$1')}" instead.`,
      'INVALID_RULE_CODE'
    );
  }
  if (CONTEXT_VARIABLES.includes(code)) {
    fail(`Rule code "${code}" is reserved by the payroll engine. Choose a different code.`, 'RESERVED_RULE_CODE');
  }

  if (!VALID_CATEGORIES.includes(category)) {
    fail(`Category must be one of: ${VALID_CATEGORIES.join(', ')}.`, 'INVALID_CATEGORY');
  }
  if (!VALID_CALC_TYPES.includes(calculationType)) {
    fail(`Calculation type must be one of: ${VALID_CALC_TYPES.join(', ')}.`, 'INVALID_CALC_TYPE');
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    fail('Sequence must be a whole number of 1 or more.', 'INVALID_SEQUENCE');
  }
  if (!expression) fail('A value or formula is required.', 'MISSING_FIELDS');

  const siblings = await prisma.salaryRule.findMany({
    where: { salaryStructureId: structureId, ...(existing ? { id: { not: existing.id } } : {}) },
    select: { id: true, code: true, sequence: true },
  });

  const clash = siblings.find((r) => r.code === code);
  if (clash) fail(`Another rule in this structure already uses the code "${code}".`, 'DUPLICATE_RULE_CODE');

  const seqClash = siblings.find((r) => r.sequence === sequence);
  if (seqClash) {
    fail(
      `Sequence ${sequence} is already used by rule "${seqClash.code}". ` +
      'Rules execute in sequence order, so each rule needs its own position.',
      'DUPLICATE_SEQUENCE'
    );
  }

  // Only codes that execute strictly before this rule are in scope.
  const available = new Set([
    ...CONTEXT_VARIABLES,
    ...ALLOWED_HELPERS,
    ...siblings.filter((r) => r.sequence < sequence).map((r) => r.code),
  ]);

  const identifiers = expression.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
  const unknown = [...new Set(identifiers.filter((id) => !available.has(id)))];
  if (unknown.length) {
    const laterRules = siblings.filter((r) => r.sequence >= sequence).map((r) => r.code);
    const orderingHint = unknown.filter((u) => laterRules.includes(u));
    fail(
      `The formula references ${unknown.map((u) => `"${u}"`).join(', ')}, which ` +
      (orderingHint.length
        ? `run at or after sequence ${sequence}. A rule can only use values calculated before it.`
        : 'is not a known rule code or payroll variable. ' +
          `Available here: ${[...available].sort().join(', ')}.`),
      'UNKNOWN_RULE_REFERENCE'
    );
  }

  // Finally make sure it is arithmetically valid with every variable bound to 1.
  try {
    const keys = [...available].filter((k) => !ALLOWED_HELPERS.includes(k));
    // eslint-disable-next-line no-new-func
    const probe = new Function(...keys, `return (${expression});`);
    const result = probe(...keys.map(() => 1));
    if (typeof result !== 'number' || !isFinite(result)) {
      fail('The formula does not produce a number.', 'INVALID_EXPRESSION');
    }
  } catch (err) {
    if (err.statusCode) throw err;
    fail(`The formula could not be evaluated: ${err.message}`, 'INVALID_EXPRESSION');
  }

  return { structureId, code, name, category, calculationType, expression, sequence };
}

module.exports = { validateRule, CONTEXT_VARIABLES, VALID_CODE };
