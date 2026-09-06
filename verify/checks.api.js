/**
 * Live API checks - requires the backend (and optionally the Vite dev server) to be running.
 * Requirement ids in each check map to the PeoplePay360 problem statement
 * (A1..A7 = HR backend/config, B1..B9 = operational frontend flows, RBAC = section 3).
 */
const { section, check, warn, assert, assertEqual, assertClose } = require('./runner');

// Seeded demo passwords, keyed by role. Emails are discovered at runtime.
const ROLE_PASSWORDS = {
  ADMIN: 'Admin@123',
  HR_MANAGER: 'HR@123',
  HR_PAYROLL_MANAGER: 'PayrollMgr@123',
  HR_PAYROLL_USER: 'Payroll@123',
  EMPLOYEE: 'Rahul@123',
};

const FALLBACK_EMAILS = {
  ADMIN: 'admin@peoplepay360.com',
  HR_MANAGER: 'hrmanager@peoplepay360.com',
  HR_PAYROLL_MANAGER: 'payrollmgr@peoplepay360.com',
  HR_PAYROLL_USER: 'payrolluser@peoplepay360.com',
  EMPLOYEE: 'rahul@peoplepay360.com',
};

const TAG = '[VERIFY]';

/**
 * RBAC expectations straight out of section 3 of the problem statement.
 * `allow` lists the roles that must get a non-403; every other role must get 403.
 */
const RBAC_MATRIX = [
  { req: 'RBAC', label: 'Payruns list', method: 'GET', path: '/api/payruns',
    allow: ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'] },
  { req: 'RBAC', label: 'Salary rules read', method: 'GET', path: '/api/salary/rules',
    allow: ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'] },
  { req: 'RBAC', label: 'Salary rule create (payroll manager only)', method: 'POST', path: '/api/salary/rules',
    allow: ['ADMIN', 'HR_PAYROLL_MANAGER'], body: {} },
  { req: 'RBAC', label: 'Salary structure create', method: 'POST', path: '/api/salary/structures',
    allow: ['ADMIN', 'HR_PAYROLL_MANAGER'], body: {} },
  { req: 'RBAC', label: 'User administration', method: 'GET', path: '/api/users',
    allow: ['ADMIN'] },
  { req: 'RBAC', label: 'Employee create', method: 'POST', path: '/api/employees',
    allow: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'], body: {} },
  { req: 'RBAC', label: 'Contract create', method: 'POST', path: '/api/contracts',
    allow: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'], body: {} },
  { req: 'RBAC', label: 'Attendance correction', method: 'PUT', path: '/api/attendance/999999',
    allow: ['ADMIN', 'HR_MANAGER'], body: {} },
  { req: 'RBAC', label: 'Time off approval', method: 'PATCH', path: '/api/time-off/requests/999999/approve',
    allow: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'] },
  { req: 'RBAC', label: 'Time off allocation create', method: 'POST', path: '/api/time-off/allocations',
    allow: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'], body: {} },
  { req: 'RBAC', label: 'Working schedule create', method: 'POST', path: '/api/schedules',
    allow: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'], body: {} },
];

async function run(api, opts = {}) {
  const readonly = Boolean(opts.readonly);
  const ctx = { tokens: {}, ids: {} };

  // ------------------------------------------------------------------ AUTH
  section('API / Authentication & session');

  await check('AUTH', 'Health endpoint reports UP', async () => {
    const res = await api.request('GET', '/api/health');
    assertEqual(res.status, 200, 'status');
    assertEqual(res.body.status, 'UP', 'health.status');
    return res.body.platform;
  });

  await check('AUTH', 'Admin can log in and receives a JWT', async () => {
    const data = await api.ok('POST', '/api/auth/login', {
      body: { email: FALLBACK_EMAILS.ADMIN, password: ROLE_PASSWORDS.ADMIN },
    });
    assert(data && data.token, 'No token in login response');
    ctx.tokens.ADMIN = data.token;
    return 'role=' + (data.user && data.user.role);
  });

  await check('AUTH', 'Wrong password is rejected with 401', async () => {
    const res = await api.request('POST', '/api/auth/login', {
      body: { email: FALLBACK_EMAILS.ADMIN, password: 'definitely-not-the-password' },
    });
    assertEqual(res.status, 401, 'status for bad credentials');
    return 'HTTP 401';
  });

  await check('AUTH', 'Protected route rejects an unauthenticated request', async () => {
    const res = await api.request('GET', '/api/employees');
    assert(res.status === 401 || res.status === 403, 'expected 401/403, got ' + res.status);
    return 'HTTP ' + res.status;
  });

  await check('AUTH', 'Protected route rejects a forged token', async () => {
    const res = await api.request('GET', '/api/employees', { token: 'not.a.real.jwt' });
    assert(res.status === 401 || res.status === 403, 'expected 401/403, got ' + res.status);
    return 'HTTP ' + res.status;
  });

  await check('AUTH', 'All five roles from section 3 can authenticate', async () => {
    // Discover a real account per role rather than trusting hardcoded emails.
    const emails = Object.assign({}, FALLBACK_EMAILS);
    try {
      const users = api.rows(await api.ok('GET', '/api/users?limit=200', { token: ctx.tokens.ADMIN }));
      for (const role of Object.keys(ROLE_PASSWORDS)) {
        const hit = users.find((u) => u.role === role);
        if (hit) emails[role] = hit.email;
      }
    } catch (_) { /* fall back to seeded emails */ }

    const failed = [];
    for (const role of Object.keys(ROLE_PASSWORDS)) {
      const res = await api.request('POST', '/api/auth/login', {
        body: { email: emails[role], password: ROLE_PASSWORDS[role] },
      });
      if (res.status === 200 && res.body && res.body.data && res.body.data.token) {
        ctx.tokens[role] = res.body.data.token;
        if (res.body.data.user) ctx.ids[role + '_employeeId'] = res.body.data.user.employeeId;
      } else {
        failed.push(role + ' (' + emails[role] + ' -> HTTP ' + res.status + ')');
      }
    }
    assert(failed.length === 0, 'Could not authenticate: ' + failed.join(', '));
    return Object.keys(ctx.tokens).join(', ');
  });

  await check('AUTH', '/api/auth/me returns the caller identity', async () => {
    const me = await api.ok('GET', '/api/auth/me', { token: ctx.tokens.ADMIN });
    assert(me && me.email, 'No identity returned');
    return me.role + ' ' + me.email;
  });

  // ------------------------------------------------------------------ RBAC
  section('API / Role-based access control (problem statement section 3)');

  for (const rule of RBAC_MATRIX) {
    await check(rule.req, rule.label + ' - allowed for ' + rule.allow.join('/'), async () => {
      const problems = [];
      for (const role of Object.keys(ROLE_PASSWORDS)) {
        const token = ctx.tokens[role];
        if (!token) continue;
        const res = await api.request(rule.method, rule.path, { token, body: rule.body });
        const denied = res.status === 403;
        const shouldAllow = rule.allow.indexOf(role) !== -1;
        if (shouldAllow && denied) problems.push(role + ' wrongly BLOCKED (403)');
        if (!shouldAllow && !denied) problems.push(role + ' wrongly ALLOWED (HTTP ' + res.status + ')');
      }
      assert(problems.length === 0, problems.join('; '));
      return 'matrix verified for 5 roles';
    });
  }

  // ------------------------------------------------------- A1 / B1 / B2 EMPLOYEES
  section('API / A1-A2, B1-B2  Employee master + related records');

  await check('A1', 'Employee list returns a pagination envelope', async () => {
    const payload = await api.ok('GET', '/api/employees?page=1&limit=10', { token: ctx.tokens.ADMIN });
    assert(Array.isArray(payload.data), 'payload.data is not an array (pagination envelope expected)');
    assert(typeof payload.total === 'number', 'payload.total missing');
    assert(typeof payload.totalPages === 'number', 'payload.totalPages missing');
    assert(payload.data.length <= 10, 'limit=10 not honoured, got ' + payload.data.length);
    ctx.ids.sampleEmployeeId = payload.data[0] && payload.data[0].id;
    return payload.total + ' employees, ' + payload.totalPages + ' pages';
  });

  await check('A1', 'Employee search filter narrows the result set', async () => {
    const all = await api.ok('GET', '/api/employees?limit=1', { token: ctx.tokens.ADMIN });
    const filtered = await api.ok('GET', '/api/employees?limit=1&search=zzzznotarealname', { token: ctx.tokens.ADMIN });
    assert(filtered.total < all.total, 'search did not reduce total (' + filtered.total + ' vs ' + all.total + ')');
    return all.total + ' -> ' + filtered.total;
  });

  await check('B2', 'Employee form exposes smart-button counts for related records', async () => {
    const emp = await api.ok('GET', '/api/employees/' + ctx.ids.sampleEmployeeId, { token: ctx.tokens.ADMIN });
    assert(emp.smartButtons, 'smartButtons missing from employee detail');
    const keys = Object.keys(emp.smartButtons);
    for (const need of ['contracts', 'attendance']) {
      assert(keys.some((k) => k.toLowerCase().indexOf(need) !== -1), 'smart button for ' + need + ' missing (have: ' + keys.join(',') + ')');
    }
    return keys.join(', ');
  });

  await check('RBAC', 'EMPLOYEE role only sees their own employee record', async () => {
    const payload = await api.ok('GET', '/api/employees', { token: ctx.tokens.EMPLOYEE });
    const list = api.rows(payload);
    assertEqual(list.length, 1, 'employee saw ' + list.length + ' records');
    const self = ctx.ids.EMPLOYEE_employeeId;
    if (self) assertEqual(list[0].id, self, 'employee sees a record that is not their own');
    return 'scoped to 1 record';
  });

  await check('A1', 'Departments and job positions are configured', async () => {
    const depts = api.rows(await api.ok('GET', '/api/departments', { token: ctx.tokens.ADMIN }));
    const positions = api.rows(await api.ok('GET', '/api/departments/positions', { token: ctx.tokens.ADMIN }));
    assert(depts.length > 0, 'no departments configured');
    assert(positions.length > 0, 'no job positions configured');
    return depts.length + ' departments, ' + positions.length + ' positions';
  });

  // ------------------------------------------------------------------ A2 CONTRACTS
  section('API / A2  Contracts (period-based selection is the core payroll rule)');

  await check('A2', 'Contract list returns dates, wage and status', async () => {
    const payload = await api.ok('GET', '/api/contracts?limit=5', { token: ctx.tokens.ADMIN });
    const list = api.rows(payload);
    assert(list.length > 0, 'no contracts found');
    const c = list[0];
    for (const f of ['startDate', 'wage', 'status', 'employeeId']) {
      assert(c[f] !== undefined, 'contract field missing: ' + f);
    }
    ctx.ids.contractEmployeeId = c.employeeId;
    return list.length + ' contracts, sample wage=' + c.wage;
  });

  await check('A2', 'lookup-applicable returns the contract valid for a given date', async () => {
    const empId = ctx.ids.contractEmployeeId;
    const today = new Date().toISOString().slice(0, 10);
    const contract = await api.ok(
      'GET',
      '/api/contracts/lookup-applicable?employeeId=' + empId + '&date=' + today,
      { token: ctx.tokens.ADMIN }
    );
    assert(contract && contract.id, 'no applicable contract resolved for employee ' + empId);
    const now = new Date();
    assert(new Date(contract.startDate) <= now, 'resolved contract starts in the future');
    if (contract.endDate) {
      assert(new Date(contract.endDate) >= now, 'resolved contract already ended on ' + contract.endDate);
    }
    return 'contract #' + contract.id + ' wage=' + contract.wage;
  });

  await check('A2', 'A date before any contract resolves to nothing (no silent fallback)', async () => {
    const empId = ctx.ids.contractEmployeeId;
    const res = await api.request('GET', '/api/contracts/lookup-applicable?employeeId=' + empId + '&date=1990-01-01', {
      token: ctx.tokens.ADMIN,
    });
    const data = res.body && res.body.data;
    assert(!data || !data.id, 'a contract was returned for 1990-01-01 - period filtering is not applied');
    return 'null as expected';
  });

  // ------------------------------------------------------------------ A3 SCHEDULES
  section('API / A3  Working schedules');

  await check('A3', 'Weekly hours are derived from the day pattern, not stored blindly', async () => {
    const list = api.rows(await api.ok('GET', '/api/schedules', { token: ctx.tokens.ADMIN }));
    assert(list.length > 0, 'no working schedules configured');
    const withDays = list.find((s) => Array.isArray(s.scheduleDays) && s.scheduleDays.length > 0) || list[0];
    const detail = await api.ok('GET', '/api/schedules/' + withDays.id, { token: ctx.tokens.ADMIN });
    const days = detail.scheduleDays || [];
    assert(days.length > 0, 'schedule ' + detail.name + ' has no day rows');
    const toHours = (t) => {
      const parts = String(t).split(':').map(Number);
      return parts[0] + (parts[1] || 0) / 60;
    };
    const computed = days.reduce(
      (sum, d) => sum + Math.max(0, toHours(d.endTime) - toHours(d.startTime) - (d.breakHours || 0)),
      0
    );
    assertClose(detail.weeklyHours, computed, 'weeklyHours for "' + detail.name + '"', 0.2);
    return detail.name + ' = ' + detail.weeklyHours + 'h from ' + days.length + ' days';
  });

  // ------------------------------------------------------------------ B3 ATTENDANCE
  section('API / B3  Attendance');

  await check('B3', 'Attendance list returns check-in, check-out, worked hours and status', async () => {
    const payload = await api.ok('GET', '/api/attendance?limit=10', { token: ctx.tokens.ADMIN });
    const list = api.rows(payload);
    assert(list.length > 0, 'no attendance records found - seed data may be missing');
    const r = list[0];
    for (const f of ['checkIn', 'date', 'status']) {
      assert(r[f] !== undefined, 'attendance field missing: ' + f);
    }
    assert('workedHours' in r, 'workedHours missing on attendance record');
    return list.length + ' records, sample status=' + r.status;
  });

  await check('B3', 'Worked hours are consistent with check-in/check-out', async () => {
    const list = api.rows(await api.ok('GET', '/api/attendance?limit=50', { token: ctx.tokens.ADMIN }));
    const complete = list.filter((r) => r.checkIn && r.checkOut && r.workedHours != null);
    assert(complete.length > 0, 'no completed attendance records to verify');
    const bad = complete.filter((r) => {
      const span = (new Date(r.checkOut) - new Date(r.checkIn)) / 3600000;
      // workedHours may deduct a configured break, so it must be <= span and non-negative
      return r.workedHours < 0 || r.workedHours > span + 0.02;
    });
    assert(bad.length === 0, bad.length + ' records have workedHours greater than the check-in/out span (e.g. #' + (bad[0] && bad[0].id) + ')');
    return complete.length + ' completed records consistent';
  });

  await check('B3', 'Attendance policy drives status classification', async () => {
    const policy = await api.ok('GET', '/api/attendance/policy', { token: ctx.tokens.ADMIN });
    assert(policy, 'no attendance policy configured');
    for (const f of ['fullDayHours', 'gracePeriodMins', 'overtimeThreshold']) {
      assert(policy[f] != null, 'policy field missing: ' + f);
    }
    return 'full day ' + policy.fullDayHours + 'h, grace ' + policy.gracePeriodMins + 'min, OT >' + policy.overtimeThreshold + 'h';
  });

  await check('B3', 'Check-in status widget responds for an employee', async () => {
    const st = await api.ok('GET', '/api/attendance/current-status', { token: ctx.tokens.EMPLOYEE });
    assertEqual(typeof st.checkedIn, 'boolean', 'checkedIn type');
    return 'checkedIn=' + st.checkedIn;
  });

  await check('RBAC', 'EMPLOYEE role only sees their own attendance', async () => {
    const list = api.rows(await api.ok('GET', '/api/attendance?limit=50', { token: ctx.tokens.EMPLOYEE }));
    const self = ctx.ids.EMPLOYEE_employeeId;
    if (!self) throw warn('employeeId not present on the login payload; scope not verified');
    const foreign = list.filter((r) => r.employeeId !== self);
    assert(foreign.length === 0, foreign.length + ' attendance rows belong to other employees');
    return list.length + ' rows, all own';
  });

  // ------------------------------------------------------------- A4 / B4 TIME OFF
  section('API / A4, B4  Time off types, allocations and the balance rule');

  await check('A4', 'Time off types define units, allocation and payroll flags', async () => {
    const types = api.rows(await api.ok('GET', '/api/time-off/types', { token: ctx.tokens.ADMIN }));
    assert(types.length > 0, 'no time off types configured');
    const t = types[0];
    assert('allocationRequired' in t, 'allocationRequired flag missing on time off type');
    ctx.ids.allocType = types.find((x) => x.allocationRequired) || t;
    return types.length + ' types (' + types.map((x) => x.name).join(', ') + ')';
  });

  await check('A4', 'Allocations report allocated / taken / remaining', async () => {
    const payload = await api.ok('GET', '/api/time-off/allocations?limit=25', { token: ctx.tokens.ADMIN });
    const list = api.rows(payload);
    assert(list.length > 0, 'no leave allocations found');
    const a = list[0];
    for (const f of ['allocatedDays', 'takenDays', 'remainingDays', 'year']) {
      assert(a[f] != null, 'allocation field missing: ' + f);
    }
    return list.length + ' allocations';
  });

  await check('A4', 'remainingDays always equals allocatedDays - takenDays', async () => {
    const list = api.rows(await api.ok('GET', '/api/time-off/allocations?limit=200', { token: ctx.tokens.ADMIN }));
    const broken = list.filter((a) => Math.abs(a.remainingDays - (a.allocatedDays - a.takenDays)) > 0.01);
    assert(broken.length === 0,
      broken.length + ' allocations are out of balance, e.g. #' + (broken[0] && broken[0].id) +
      ' allocated=' + (broken[0] && broken[0].allocatedDays) +
      ' taken=' + (broken[0] && broken[0].takenDays) +
      ' remaining=' + (broken[0] && broken[0].remainingDays));
    return list.length + ' allocations balanced';
  });

  await check('B4', 'Request list shows employee, type, dates, duration and status', async () => {
    const payload = await api.ok('GET', '/api/time-off/requests?limit=10', { token: ctx.tokens.ADMIN });
    const list = api.rows(payload);
    assert(list.length > 0, 'no time off requests found');
    const r = list[0];
    for (const f of ['employee', 'timeOffType', 'startDate', 'endDate', 'durationDays', 'status']) {
      assert(r[f] != null, 'request field missing: ' + f);
    }
    return list.length + ' requests';
  });

  if (!readonly) {
    await check('B4', 'Approving a request consumes the allocation balance (atomic)', async () => {
      const type = ctx.ids.allocType;
      assert(type && type.allocationRequired, 'no allocation-backed leave type available to test');
      const empId = ctx.ids.sampleEmployeeId;
      const year = new Date().getFullYear();

      // One allocation per (employee, type, year) exists by schema, so reuse it and
      // measure the delta rather than creating a second one.
      const listAllocations = async () =>
        api.rows(await api.ok('GET', '/api/time-off/allocations?employeeId=' + empId + '&year=' + year,
          { token: ctx.tokens.ADMIN }));

      let alloc = (await listAllocations()).find((a) => a.timeOffTypeId === type.id);
      if (!alloc) {
        alloc = await api.ok('POST', '/api/time-off/allocations', {
          token: ctx.tokens.ADMIN,
          body: { employeeId: empId, timeOffTypeId: type.id, allocatedDays: 5, year },
        });
      }
      ctx.ids.verifyAllocationId = alloc.id;
      const before = { taken: alloc.takenDays, remaining: alloc.remainingDays };
      assert(before.remaining >= 2,
        'employee ' + empId + ' has only ' + before.remaining + ' days left on ' + type.name + ' - cannot test consumption');

      const req = await api.ok('POST', '/api/time-off/requests', {
        token: ctx.tokens.ADMIN,
        body: {
          employeeId: empId,
          timeOffTypeId: type.id,
          startDate: year + '-12-20',
          endDate: year + '-12-21',
          durationDays: 2,
          reason: TAG + ' balance consumption check',
        },
      });
      ctx.ids.verifyRequestId = req.id;
      assertEqual(req.status, 'PENDING', 'new request status');

      await api.ok('PATCH', '/api/time-off/requests/' + req.id + '/approve', { token: ctx.tokens.ADMIN });

      const after = (await listAllocations()).find((a) => a.id === alloc.id);
      assert(after, 'allocation disappeared after approval');
      assertClose(after.takenDays, before.taken + 2, 'takenDays after approving a 2-day request');
      assertClose(after.remainingDays, before.remaining - 2, 'remainingDays after approving a 2-day request');
      return 'taken ' + before.taken + ' -> ' + after.takenDays + ', remaining ' + before.remaining + ' -> ' + after.remainingDays;
    });

    await check('B4', 'A request beyond the remaining balance is refused', async () => {
      const type = ctx.ids.allocType;
      const empId = ctx.ids.sampleEmployeeId;
      const year = new Date().getFullYear();
      const res = await api.request('POST', '/api/time-off/requests', {
        token: ctx.tokens.ADMIN,
        body: {
          employeeId: empId,
          timeOffTypeId: type.id,
          startDate: year + '-12-22',
          endDate: year + '-12-31',
          durationDays: 9999,
          reason: TAG + ' overdraw check',
        },
      });
      assertEqual(res.status, 400, 'status for over-allocation request');
      assert(/balance/i.test(res.body && res.body.message), 'error message does not mention balance: ' + (res.body && res.body.message));
      return 'HTTP 400 ' + (res.body && res.body.code);
    });

    await check('B4', 'A rejected request does not consume balance', async () => {
      const type = ctx.ids.allocType;
      const empId = ctx.ids.sampleEmployeeId;
      const year = new Date().getFullYear();
      const before = api.rows(
        await api.ok('GET', '/api/time-off/allocations?employeeId=' + empId + '&year=' + year, { token: ctx.tokens.ADMIN })
      ).find((a) => a.id === ctx.ids.verifyAllocationId);

      const req = await api.ok('POST', '/api/time-off/requests', {
        token: ctx.tokens.ADMIN,
        body: {
          employeeId: empId, timeOffTypeId: type.id,
          startDate: year + '-12-23', endDate: year + '-12-23', durationDays: 1,
          reason: TAG + ' rejection check',
        },
      });
      ctx.ids.verifyRejectedRequestId = req.id;
      await api.ok('PATCH', '/api/time-off/requests/' + req.id + '/reject', {
        token: ctx.tokens.ADMIN, body: { rejectionReason: TAG + ' automated' },
      });

      const after = api.rows(
        await api.ok('GET', '/api/time-off/allocations?employeeId=' + empId + '&year=' + year, { token: ctx.tokens.ADMIN })
      ).find((a) => a.id === ctx.ids.verifyAllocationId);
      assertClose(after.takenDays, before.takenDays, 'takenDays must not change on rejection');
      return 'balance unchanged at ' + after.remainingDays + ' days';
    });
  }

  // ------------------------------------------------------------ A5 / A6 SALARY CONFIG
  section('API / A5-A6  Salary structures and rules');

  await check('A5', 'Salary structures expose their ordered rule set', async () => {
    const structures = api.rows(await api.ok('GET', '/api/salary/structures', { token: ctx.tokens.ADMIN }));
    assert(structures.length > 0, 'no salary structures configured');
    const withRules = structures.find((s) => (s.salaryRules || []).length > 0);
    assert(withRules, 'no structure has any salary rules attached');
    ctx.ids.structureId = withRules.id;
    ctx.ids.structureRules = withRules.salaryRules;
    return structures.length + ' structures, "' + withRules.name + '" has ' + withRules.salaryRules.length + ' rules';
  });

  await check('A6', 'Rules are sequenced and cover every salary category', async () => {
    const rules = ctx.ids.structureRules.slice().sort((a, b) => a.sequence - b.sequence);
    const seqs = rules.map((r) => r.sequence);
    assert(new Set(seqs).size === seqs.length, 'duplicate sequence numbers: ' + seqs.join(','));
    const cats = new Set(rules.map((r) => r.category));
    for (const need of ['BASIC', 'ALLOWANCE', 'DEDUCTION', 'NET']) {
      assert(cats.has(need), 'no rule in category ' + need + ' (have: ' + [...cats].join(',') + ')');
    }
    return rules.length + ' rules, seq ' + seqs[0] + '..' + seqs[seqs.length - 1] + ', categories: ' + [...cats].join('/');
  });

  await check('A6', 'Rule formulas only reference codes defined earlier in the sequence', async () => {
    const rules = ctx.ids.structureRules.slice().sort((a, b) => a.sequence - b.sequence);
    const known = new Set(['WAGE', 'BASE_WAGE', 'CONTRACT_WAGE', 'EFFECTIVE_WAGE', 'WORKED_DAYS',
      'TOTAL_DAYS', 'PAID_LEAVES', 'UNPAID_LEAVES', 'OVERTIME_HOURS', 'ATTENDANCE_RATIO',
      'Math', 'min', 'max', 'round']);
    const problems = [];
    for (const rule of rules) {
      const expr = String(rule.valueExpression || '');
      const idents = expr.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
      for (const id of idents) {
        if (!known.has(id)) problems.push(rule.code + ' (seq ' + rule.sequence + ') references undefined "' + id + '"');
      }
      known.add(rule.code);
    }
    assert(problems.length === 0, 'Forward references would evaluate to 0:\n       - ' + problems.join('\n       - '));
    return rules.length + ' expressions resolve in order';
  });

  // ------------------------------------------------------------- B5-B8 PAYROLL E2E
  section('API / B5-B8  Payrun wizard, computation, validation, payment, PDF');

  await check('B5', 'Step 2 of the wizard lists eligible employees for the period', async () => {
    const period = periodForLastMonth();
    const list = api.rows(await api.ok(
      'GET',
      '/api/payruns/eligible-employees?salaryStructureId=' + ctx.ids.structureId +
      '&periodStart=' + period.start + '&periodEnd=' + period.end,
      { token: ctx.tokens.HR_PAYROLL_MANAGER }
    ));
    assert(list.length > 0, 'no eligible employees for ' + period.start + '..' + period.end);
    ctx.ids.period = period;
    ctx.ids.eligible = list;
    return list.length + ' eligible for ' + period.start + ' -> ' + period.end;
  });

  if (!readonly) {
    await check('B5', 'Create payrun contains exactly the selected employees', async () => {
      const period = ctx.ids.period;
      const picked = ctx.ids.eligible.slice(0, 2).map((e) => e.id);
      const payrun = await api.ok('POST', '/api/payruns', {
        token: ctx.tokens.HR_PAYROLL_MANAGER,
        body: {
          name: TAG + ' Automated Verification ' + Date.now(),
          salaryStructureId: ctx.ids.structureId,
          periodStart: period.start,
          periodEnd: period.end,
          employeeIds: picked,
        },
      });
      assert(payrun && payrun.id, 'payrun not created');
      ctx.ids.payrunId = payrun.id;
      ctx.ids.pickedEmployeeIds = picked;
      assertEqual(payrun.status, 'DRAFT', 'new payrun status');
      return 'payrun #' + payrun.id + ' with ' + picked.length + ' employees';
    });

    await check('B7', 'Compute generates payslips whose lines follow the rule sequence', async () => {
      await api.ok('POST', '/api/payruns/' + ctx.ids.payrunId + '/compute', { token: ctx.tokens.HR_PAYROLL_MANAGER });
      const payrun = await api.ok('GET', '/api/payruns/' + ctx.ids.payrunId, { token: ctx.tokens.HR_PAYROLL_MANAGER });
      assertEqual(payrun.status, 'COMPUTED', 'payrun status after compute');
      assertEqual(payrun.payslips.length, ctx.ids.pickedEmployeeIds.length, 'payslip count');

      const slip = payrun.payslips[0];
      ctx.ids.payslipId = slip.id;
      const lines = (slip.payslipLines || []).slice().sort((a, b) => a.sequence - b.sequence);
      assert(lines.length > 0, 'payslip has no computed lines');
      const nonZero = lines.filter((l) => Number(l.amount) !== 0);
      assert(nonZero.length > 0, 'every payslip line computed to 0 - the rule engine did not evaluate');
      return lines.length + ' lines, ' + nonZero.length + ' non-zero';
    });

    await check('B7', 'Payslip totals reconcile: gross - deductions = net', async () => {
      const slip = await api.ok('GET', '/api/payslips/' + ctx.ids.payslipId, { token: ctx.tokens.HR_PAYROLL_MANAGER });
      const lines = slip.payslipLines || [];
      const sumOf = (cat) => lines.filter((l) => l.category === cat).reduce((s, l) => s + Number(l.amount), 0);
      const earnings = sumOf('BASIC') + sumOf('ALLOWANCE');
      const deductions = sumOf('DEDUCTION');

      assertClose(slip.totalDeductions, deductions, 'totalDeductions vs sum of DEDUCTION lines');
      assertClose(slip.netSalary, slip.grossSalary - slip.totalDeductions, 'net = gross - deductions');
      if (Math.abs(slip.grossSalary - earnings) > 1) {
        throw warn('grossSalary (' + slip.grossSalary + ') differs from BASIC+ALLOWANCE lines (' + earnings +
          ') - check whether a GROSS rule intentionally overrides the sum');
      }
      assert(slip.netSalary > 0, 'net salary is not positive: ' + slip.netSalary);
      return 'gross ' + slip.grossSalary + ' - ded ' + slip.totalDeductions + ' = net ' + slip.netSalary;
    });

    await check('B7', 'Computation uses the period-applicable contract', async () => {
      const slip = await api.ok('GET', '/api/payslips/' + ctx.ids.payslipId, { token: ctx.tokens.HR_PAYROLL_MANAGER });
      assert(slip.contract || slip.contractId, 'payslip is not linked to a contract');
      const contractId = slip.contractId || slip.contract.id;
      const applicable = await api.ok(
        'GET', '/api/contracts/lookup-applicable?employeeId=' + slip.employeeId + '&date=' + ctx.ids.period.start,
        { token: ctx.tokens.ADMIN }
      );
      assert(applicable && applicable.id, 'no applicable contract resolvable for the payslip employee');
      assertEqual(contractId, applicable.id, 'payslip contract does not match the period-applicable contract');
      return 'contract #' + contractId + ' matches lookup for ' + ctx.ids.period.start;
    });

    await check('B6', 'Validate surfaces warnings and moves the payrun to VALIDATED', async () => {
      const res = await api.request('POST', '/api/payruns/' + ctx.ids.payrunId + '/validate', {
        token: ctx.tokens.HR_PAYROLL_MANAGER,
      });
      assert(res.status >= 200 && res.status < 300,
        'validate returned HTTP ' + res.status + ': ' + (res.text || '').slice(0, 200));
      const payrun = await api.ok('GET', '/api/payruns/' + ctx.ids.payrunId, { token: ctx.tokens.HR_PAYROLL_MANAGER });
      assertEqual(payrun.status, 'VALIDATED', 'payrun status after validate');
      assert(Array.isArray(payrun.warnings), 'payrun.warnings is not an array - warning surface is missing');
      return 'VALIDATED with ' + payrun.warnings.length + ' warning(s)';
    });

    await check('B6', 'Duplicate payslips are detected before finalisation', async () => {
      const payrun = await api.ok('GET', '/api/payruns/' + ctx.ids.payrunId, { token: ctx.tokens.HR_PAYROLL_MANAGER });
      const ids = payrun.payslips.map((p) => p.employeeId);
      assertEqual(new Set(ids).size, ids.length, 'the payrun itself contains duplicate employee payslips');
      const dupWarning = (payrun.warnings || []).some((w) => w.type === 'DUPLICATE_PAYSLIP');
      assert(!dupWarning, 'a duplicate-payslip warning was raised on a clean payrun');
      return 'no duplicates across ' + ids.length + ' payslips';
    });

    await check('B6', 'Mark paid finalises the batch and its payslips', async () => {
      await api.ok('POST', '/api/payruns/' + ctx.ids.payrunId + '/mark-paid', { token: ctx.tokens.HR_PAYROLL_MANAGER });
      const payrun = await api.ok('GET', '/api/payruns/' + ctx.ids.payrunId, { token: ctx.tokens.HR_PAYROLL_MANAGER });
      assertEqual(payrun.status, 'PAID', 'payrun status after mark-paid');
      const unpaid = payrun.payslips.filter((p) => p.status !== 'PAID');
      assert(unpaid.length === 0, unpaid.length + ' payslips still not marked PAID');
      return 'payrun + ' + payrun.payslips.length + ' payslips PAID';
    });

    await check('B6', 'A finalised payrun is preserved as history (not recomputable)', async () => {
      const res = await api.request('POST', '/api/payruns/' + ctx.ids.payrunId + '/compute', {
        token: ctx.tokens.HR_PAYROLL_MANAGER,
      });
      if (res.status >= 200 && res.status < 300) {
        throw warn('a PAID payrun accepted a re-compute (HTTP ' + res.status + ') - historical batches should be immutable');
      }
      return 'blocked with HTTP ' + res.status;
    });
  }

  await check('B8', 'Payslip PDF is generated as a real PDF document', async () => {
    let payslipId = ctx.ids.payslipId;
    if (!payslipId) {
      const list = api.rows(await api.ok('GET', '/api/payslips?limit=1', { token: ctx.tokens.HR_PAYROLL_MANAGER }));
      assert(list.length > 0, 'no payslips exist to print');
      payslipId = list[0].id;
    }
    const res = await api.request('GET', '/api/payslips/' + payslipId + '/pdf', {
      token: ctx.tokens.HR_PAYROLL_MANAGER, raw: true,
    });
    assertEqual(res.status, 200, 'PDF status');
    const head = res.buffer.slice(0, 5).toString('latin1');
    assert(head === '%PDF-', 'response is not a PDF (starts with "' + head + '")');
    assert(res.buffer.length > 1000, 'PDF is suspiciously small: ' + res.buffer.length + ' bytes');
    return Math.round(res.buffer.length / 1024) + ' KB';
  });

  await check('B8', 'Bulk payslip email is wired end to end', async () => {
    if (!ctx.ids.payrunId) throw warn('no payrun created in this run (readonly mode) - bulk send not exercised');
    const res = await api.request('POST', '/api/payslips/bulk-send', {
      token: ctx.tokens.HR_PAYROLL_MANAGER,
      body: { payrunId: ctx.ids.payrunId },
    });
    if (res.status >= 200 && res.status < 300) {
      const data = (res.body && res.body.data) || {};
      const message = (res.body && res.body.message) || JSON.stringify(data);
      const expected = (await api.ok('GET', '/api/payruns/' + ctx.ids.payrunId,
        { token: ctx.tokens.HR_PAYROLL_MANAGER })).payslips.length;
      // A 200 alone proves nothing: the service catches per-payslip send errors.
      if (typeof data.count !== 'number') {
        throw warn('bulk-send returned 200 but no dispatched count, so a silent failure cannot be ruled out: ' + message);
      }
      if (data.count === 0) {
        throw warn('bulk-send reported success but delivered 0 of ' + expected +
          ' payslips - SMTP is almost certainly unconfigured and the UI still shows a success toast');
      }
      if (data.count < expected) {
        throw warn('bulk-send delivered only ' + data.count + ' of ' + expected + ' payslips');
      }
      return data.count + '/' + expected + ' payslips emailed';
    }
    const msg = (res.body && res.body.message) || res.text || '';
    if (/auth|credential|smtp|econn|getaddrinfo|invalid login|missing/i.test(msg)) {
      throw warn('SMTP is not configured, so bulk email fails at demo time: ' + msg.slice(0, 160));
    }
    throw new Error('bulk-send failed with HTTP ' + res.status + ': ' + msg.slice(0, 200));
  });

  await check('RBAC', 'EMPLOYEE role only sees their own payslips', async () => {
    const list = api.rows(await api.ok('GET', '/api/payslips?limit=50', { token: ctx.tokens.EMPLOYEE }));
    const self = ctx.ids.EMPLOYEE_employeeId;
    if (!self) throw warn('employeeId not present on the login payload; scope not verified');
    const foreign = list.filter((p) => p.employeeId !== self);
    assert(foreign.length === 0, foreign.length + ' payslips belong to other employees - salary data is leaking');
    return list.length + ' payslips, all own';
  });

  // ------------------------------------------------------------------ A7 / B9 DASHBOARD
  section('API / A7, B9  Payroll dashboard');

  await check('B9', 'Dashboard returns all required KPI cards', async () => {
    const d = await api.ok('GET', '/api/dashboard', { token: ctx.tokens.HR_PAYROLL_MANAGER });
    assert(d.kpis, 'kpis block missing');
    const keys = Object.keys(d.kpis).map((k) => k.toLowerCase());
    const need = [
      ['net salary paid', ['totalnet', 'netsalary', 'netpaid']],
      ['payslips generated', ['payslip']],
      ['average salary', ['average', 'avg']],
      ['approved time off', ['timeoff', 'leave']],
      ['attendance health', ['attendance']],
    ];
    const missing = need.filter((n) => !keys.some((k) => n[1].some((frag) => k.indexOf(frag) !== -1))).map((n) => n[0]);
    assert(missing.length === 0, 'KPI missing: ' + missing.join(', ') + ' (have: ' + Object.keys(d.kpis).join(', ') + ')');
    return Object.keys(d.kpis).length + ' KPIs';
  });

  await check('B9', 'Dashboard exposes charts, department breakdown and alerts', async () => {
    const d = await api.ok('GET', '/api/dashboard', { token: ctx.tokens.HR_PAYROLL_MANAGER });
    const json = JSON.stringify(d).toLowerCase();
    const need = ['department', 'trend', 'attendance'];
    const missing = need.filter((n) => json.indexOf(n) === -1);
    assert(missing.length === 0, 'dashboard payload has no ' + missing.join('/') + ' section');
    assert(d.alerts || d.warnings || d.operationalAlerts, 'no operational alerts block on the dashboard');
    return Object.keys(d).join(', ');
  });

  await check('A7', 'Dashboard values are live, not static', async () => {
    const d = await api.ok('GET', '/api/dashboard', { token: ctx.tokens.HR_PAYROLL_MANAGER });
    const nums = JSON.stringify(d).match(/:\s*(\d+(?:\.\d+)?)/g) || [];
    const nonZero = nums.filter((n) => parseFloat(n.slice(1)) > 0);
    assert(nonZero.length > 5, 'dashboard is almost entirely zeros - aggregation is probably not reading real records');
    return nonZero.length + ' non-zero aggregates';
  });

  await check('A7', 'Department filter actually changes the aggregation', async () => {
    const depts = api.rows(await api.ok('GET', '/api/departments', { token: ctx.tokens.ADMIN }));
    assert(depts.length > 1, 'need at least 2 departments to prove the filter works');
    const all = await api.ok('GET', '/api/dashboard', { token: ctx.tokens.HR_PAYROLL_MANAGER });
    const one = await api.ok('GET', '/api/dashboard?departmentId=' + depts[0].id, { token: ctx.tokens.HR_PAYROLL_MANAGER });
    assert(JSON.stringify(all) !== JSON.stringify(one),
      'filtering by department ' + depts[0].name + ' returned an identical payload - the filter is ignored');
    return 'filtered by ' + depts[0].name;
  });

  await check('A7', 'Period filter actually changes the aggregation', async () => {
    const recent = await api.ok('GET', '/api/dashboard?period=' + ctx.ids.period.periodKey, { token: ctx.tokens.HR_PAYROLL_MANAGER });
    const ancient = await api.ok('GET', '/api/dashboard?period=1999-01', { token: ctx.tokens.HR_PAYROLL_MANAGER });
    assert(JSON.stringify(recent) !== JSON.stringify(ancient), 'period filter is ignored - 1999-01 returns the same data');
    return 'period filtering active';
  });

  await check('A7', 'Employee type filter actually changes the aggregation', async () => {
    const all = await api.ok('GET', '/api/dashboard', { token: ctx.tokens.HR_PAYROLL_MANAGER });
    const typed = await api.ok('GET', '/api/dashboard?employeeType=CONTRACTOR', { token: ctx.tokens.HR_PAYROLL_MANAGER });
    if (JSON.stringify(all) === JSON.stringify(typed)) {
      throw warn('employeeType=CONTRACTOR returned the same payload as unfiltered - either the filter is ignored or no CONTRACTOR employees are seeded');
    }
    return 'employeeType filtering active';
  });

  await check('ROBUST', 'Invalid filter values return a clean 4xx, not a 500 with internals', async () => {
    const probes = [
      ['GET', '/api/dashboard?employeeType=NOT_A_REAL_TYPE'],
      ['GET', '/api/employees?status=NOT_A_REAL_STATUS'],
      ['GET', '/api/employees/not-a-number'],
    ];
    const bad = [];
    for (const p of probes) {
      const res = await api.request(p[0], p[1], { token: ctx.tokens.ADMIN });
      const body = (res.text || '');
      if (res.status >= 500) bad.push(p[1] + ' -> HTTP ' + res.status);
      if (/prisma\.|node_modules|[A-Za-z]:\\\\|\/home\//.test(body)) {
        bad.push(p[1] + ' leaks server internals in the response body');
      }
    }
    assert(bad.length === 0,
      'Bad input is not handled gracefully - the UI will show a raw stack trace:\n       - ' + bad.join('\n       - '));
    return probes.length + ' malformed requests handled cleanly';
  });

  await check('ROBUST', 'Duplicate allocation is refused with a clean 4xx', async () => {
    if (readonly) throw warn('skipped in --readonly mode');
    const type = ctx.ids.allocType;
    const empId = ctx.ids.sampleEmployeeId;
    const year = new Date().getFullYear();
    // The schema has @@unique([employeeId, timeOffTypeId, year]); a second create must not 500.
    const res = await api.request('POST', '/api/time-off/allocations', {
      token: ctx.tokens.ADMIN,
      body: { employeeId: empId, timeOffTypeId: type.id, allocatedDays: 1, year },
    });
    assert(res.status < 500,
      'duplicate allocation returned HTTP ' + res.status + ': ' + (res.text || '').slice(0, 160));
    assert(!/prisma\.|node_modules|[A-Za-z]:\\\\/.test(res.text || ''),
      'duplicate allocation leaks a raw Prisma error to the client');
    return 'HTTP ' + res.status;
  });

  await check('B9', 'Employee self-service portal returns own payslips and balances', async () => {
    const p = await api.ok('GET', '/api/dashboard/employee-portal', { token: ctx.tokens.EMPLOYEE });
    const json = JSON.stringify(p).toLowerCase();
    for (const need of ['payslip', 'leave', 'attendance']) {
      assert(json.indexOf(need) !== -1, 'employee portal has no ' + need + ' section');
    }
    return Object.keys(p).join(', ');
  });

  // ------------------------------------------------------------------ AUDIT
  section('API / Audit trail');

  await check('AUDIT', 'Audit log records write operations', async () => {
    const payload = await api.ok('GET', '/api/audit-logs?limit=20', { token: ctx.tokens.ADMIN });
    const list = api.rows(payload);
    assert(list.length > 0, 'audit log is empty');
    const l = list[0];
    for (const f of ['action', 'entityName']) {
      assert(l[f] != null, 'audit field missing: ' + f);
    }
    assert(l.timestamp || l.createdAt, 'audit entry has no timestamp');
    return list.length + ' entries, latest: ' + l.action;
  });

  if (!readonly) {
    await check('AUDIT', 'A payroll action this run is present in the audit trail', async () => {
      const list = api.rows(await api.ok('GET', '/api/audit-logs?limit=100', { token: ctx.tokens.ADMIN }));
      const at = (l) => new Date(l.timestamp || l.createdAt).getTime();
      const recent = list.filter((l) => Date.now() - at(l) < 15 * 60 * 1000);
      assert(recent.length > 0, 'no audit entries written in the last 15 minutes despite this run creating a payrun');
      return recent.length + ' entries in the last 15 minutes';
    });
  }

  return ctx;
}

/** Previous calendar month, which is the period most likely to have contracts + attendance. */
function periodForLastMonth() {
  const now = new Date();
  const y = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const m = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth(); // 1-based previous month
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, '0');
  return {
    start: y + '-' + mm + '-01',
    end: y + '-' + mm + '-' + String(last).padStart(2, '0'),
    periodKey: y + '-' + mm,
  };
}

module.exports = { run, ROLE_PASSWORDS, FALLBACK_EMAILS, TAG };
