/**
 * Mirror of backend/src/middleware/roles.js.
 *
 * The roles in section 3 of the specification are cumulative, so UI gating must
 * be expressed as "this role or above" rather than a hand-written list. Listing
 * roles by hand is how the Attendance correction button ended up visible to a
 * role the API rejected with 403.
 */
export const ROLE_ORDER = ['EMPLOYEE', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'];

const RANK = ROLE_ORDER.reduce((acc, role, i) => {
  acc[role] = i;
  return acc;
}, {});

/** True when `role` sits at or above `minimum` in the hierarchy. */
export function atLeast(role, minimum) {
  return RANK[role] !== undefined && RANK[minimum] !== undefined && RANK[role] >= RANK[minimum];
}

export default { ROLE_ORDER, atLeast };
