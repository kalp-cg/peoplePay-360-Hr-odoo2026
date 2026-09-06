/**
 * Role hierarchy, exactly as defined in section 3 of the problem statement.
 *
 * The roles are cumulative: each one inherits everything the role below it can
 * do and adds to it.
 *
 *   EMPLOYEE            own records only
 *   HR_MANAGER          + full CRUD on Employees, Attendance, Contracts,
 *                         Working Schedules and Time Off; approves leave
 *   HR_PAYROLL_USER     + create/read/update Payruns and Payslips;
 *                         read-only Salary Structures and Rules
 *   HR_PAYROLL_MANAGER  + full CRUD on Payruns, Payslips, Salary Structures
 *                         and Salary Rules
 *   ADMIN               + user management and everything else
 *
 * Routes must express permissions with `atLeast(...)` rather than hand-listing
 * roles. Hand-written lists are how HR_PAYROLL_USER ended up without the HR
 * Manager permissions the specification grants it.
 */
const ROLE_ORDER = ['EMPLOYEE', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'];

const RANK = ROLE_ORDER.reduce((acc, role, i) => {
  acc[role] = i;
  return acc;
}, {});

/** Every role at or above `role`, ready to spread into authorize(). */
function atLeast(role) {
  const floor = RANK[role];
  if (floor === undefined) throw new Error(`Unknown role: ${role}`);
  return ROLE_ORDER.slice(floor);
}

/** True when `role` sits at or above `minimum` in the hierarchy. */
function hasAtLeast(role, minimum) {
  return RANK[role] !== undefined && RANK[role] >= RANK[minimum];
}

module.exports = { ROLE_ORDER, RANK, atLeast, hasAtLeast };
