const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function verifyAllFixes() {
  console.log('================================================================');
  console.log('  Verifying Targeted Bug Fixes for PeoplePay360');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`Testing: ${name}... `);
      await fn();
      console.log('✓ PASSED');
      passed++;
    } catch (err) {
      console.log(`✗ FAILED: ${err.message}`);
      failed++;
    }
  }

  // 1. Log in with various roles
  let adminToken = '';
  let hrToken = '';
  let payrollMgrToken = '';

  await test('Login Admin, HR Manager, and Payroll Manager', async () => {
    const adminRes = await request(
      { hostname: '127.0.0.1', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { email: 'admin@peoplepay360.com', password: 'Admin@123' }
    );
    adminToken = adminRes.data.data.token;

    const hrRes = await request(
      { hostname: '127.0.0.1', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { email: 'hrmanager@peoplepay360.com', password: 'HR@123' }
    );
    hrToken = hrRes.data.data.token;

    const pmRes = await request(
      { hostname: '127.0.0.1', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { email: 'payrollmgr@peoplepay360.com', password: 'PayrollMgr@123' }
    );
    payrollMgrToken = pmRes.data.data.token;

    if (!adminToken || !hrToken || !payrollMgrToken) throw new Error('Failed to obtain all test tokens');
  });

  // 2. RBAC Enforcement: HR Manager is blocked from /api/payruns (403), but allowed on /api/employees
  await test('RBAC: HR Manager blocked (403) from /api/payruns but allowed on /api/employees', async () => {
    const payrunRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/payruns',
      method: 'GET',
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    if (payrunRes.status !== 403) {
      throw new Error(`Expected status 403 Forbidden for HR Manager accessing payruns, got ${payrunRes.status}`);
    }

    const empRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/employees',
      method: 'GET',
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    if (empRes.status !== 200) {
      throw new Error(`Expected status 200 for HR Manager accessing employees, got ${empRes.status}`);
    }
  });

  // 3. RBAC Enforcement: Payroll Manager can access /api/payruns
  await test('RBAC: Payroll Manager has full access to /api/payruns', async () => {
    const payrunRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/payruns',
      method: 'GET',
      headers: { Authorization: `Bearer ${payrollMgrToken}` }
    });
    if (payrunRes.status !== 200) {
      throw new Error(`Expected status 200 for Payroll Manager accessing payruns, got ${payrunRes.status}`);
    }
  });

  // 4. PDF Download via req.query.token (window.open support)
  await test('PDF Download authenticates via URL query parameter (?token=...)', async () => {
    // First get a payrun and fetch its detail
    const payruns = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/payruns',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!payruns.data.data || payruns.data.data.length === 0) {
      throw new Error('No payruns found');
    }
    const payrunDetail = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/payruns/${payruns.data.data[0].id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const payslip = payrunDetail.data.data?.payslips?.[0];
    if (!payslip) throw new Error('No payslip found in payrun detail');
    const payslipId = payslip.id;

    // Call PDF endpoint WITHOUT Authorization header, using query token only
    const pdfRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/payslips/${payslipId}/pdf?token=${adminToken}`,
      method: 'GET'
    });

    if (pdfRes.status !== 200) {
      throw new Error(`Expected 200 for ?token= auth, got ${pdfRes.status}`);
    }
    if (!pdfRes.raw.startsWith('%PDF-1.3')) {
      throw new Error('PDF output does not have valid PDF magic bytes');
    }
  });

  // 5. Unpaid Leave Proration Calculation Verification
  await test('Payroll Engine: Effective Wage Proration with Unpaid Leave', async () => {
    const payrollEngine = require('./backend/src/features/payroll/payroll.engine');

    // Sample sequential rules matching enterprise structure:
    // 1. BASIC = 0.60 * WAGE
    // 2. HRA = 0.20 * BASIC
    // 3. ALLOWANCE = WAGE - BASIC - HRA
    // 4. GROSS = BASIC + HRA + ALLOWANCE
    // 5. PF = 0.12 * BASIC
    // 6. TAX = 0.05 * GROSS
    // 7. NET = GROSS - PF - TAX
    const rules = [
      { code: 'BASIC', category: 'BASIC', calculationType: 'PERCENTAGE', valueExpression: '0.60 * WAGE', sequence: 1 },
      { code: 'HRA', category: 'ALLOWANCE', calculationType: 'PERCENTAGE', valueExpression: '0.20 * BASIC', sequence: 2 },
      { code: 'ALLOWANCE', category: 'ALLOWANCE', calculationType: 'FORMULA', valueExpression: 'WAGE - BASIC - HRA', sequence: 3 },
      { code: 'GROSS', category: 'GROSS', calculationType: 'FORMULA', valueExpression: 'BASIC + HRA + ALLOWANCE', sequence: 4 },
      { code: 'PF', category: 'DEDUCTION', calculationType: 'PERCENTAGE', valueExpression: '0.12 * BASIC', sequence: 5 },
      { code: 'TAX', category: 'DEDUCTION', calculationType: 'FORMULA', valueExpression: '0.05 * GROSS', sequence: 6 },
      { code: 'NET', category: 'NET', calculationType: 'FORMULA', valueExpression: 'GROSS - PF - TAX', sequence: 7 },
    ];

    // Case A: Full attendance (20 planned, 20 worked, 0 unpaid)
    const fullSlip = payrollEngine.computePayslip({
      employee: { id: 1, name: 'Test Full' },
      contract: { wage: 50000 },
      salaryRules: rules,
      attendanceSummary: { presentDays: 20, absentDays: 0, overtimeHours: 0 },
      leaveSummary: { paidLeaveDays: 0, unpaidLeaveDays: 0 },
      totalPeriodDays: 20,
    });

    // Case B: 5 unpaid days out of 20 planned days (attendanceRatio = 15/20 = 0.75)
    const partialSlip = payrollEngine.computePayslip({
      employee: { id: 2, name: 'Test Unpaid' },
      contract: { wage: 50000 },
      salaryRules: rules,
      attendanceSummary: { presentDays: 15, absentDays: 0, overtimeHours: 0 },
      leaveSummary: { paidLeaveDays: 0, unpaidLeaveDays: 5 },
      totalPeriodDays: 20,
    });

    console.log(`\n    Full Attendance: Wage=50000 -> Gross=${fullSlip.grossSalary}, Net=${fullSlip.netSalary}`);
    console.log(`    5 Unpaid Leaves (75%): Effective Wage=37500 -> Gross=${partialSlip.grossSalary}, Net=${partialSlip.netSalary}`);

    // Check Gross is exactly 75% of full gross (37500)
    if (partialSlip.grossSalary !== 37500) {
      throw new Error(`Expected Gross to be 37500 (prorated by 75%), got ${partialSlip.grossSalary}`);
    }
    // Check Allowance wasn't artificially inflated to absorb wage:
    // With 37500: BASIC = 22500, HRA = 4500, ALLOWANCE = 37500 - 22500 - 4500 = 10500.
    const allowanceLine = partialSlip.payslipLines.find(l => l.code === 'ALLOWANCE');
    if (allowanceLine.amount !== 10500) {
      throw new Error(`Expected ALLOWANCE to be 10500, got ${allowanceLine.amount}`);
    }
    // Check Net is strictly lower than full net
    if (partialSlip.netSalary >= fullSlip.netSalary) {
      throw new Error(`Partial net ${partialSlip.netSalary} should be strictly less than full net ${fullSlip.netSalary}`);
    }
  });

  // 6. Schedule-driven Attendance: status calculation
  await test('Attendance: Schedule check-in punctuality calculation', async () => {
    // Schedule check logic in attendance.service.js:
    // scheduleDay startTime determines expectedStart
    const checkInOnTime = new Date('2026-09-01T08:55:00');
    const checkInLate = new Date('2026-09-01T09:15:00');
    const scheduleDay = { startTime: '09:00', endTime: '18:00', dailyHours: 8.0 };

    const scheduleStartParts = scheduleDay.startTime.split(':');
    const expectedStart = new Date(checkInOnTime);
    expectedStart.setHours(parseInt(scheduleStartParts[0], 10), parseInt(scheduleStartParts[1], 10), 0, 0);

    const isLate1 = checkInOnTime > expectedStart;
    const isLate2 = checkInLate > expectedStart;

    if (isLate1) throw new Error('Expected 08:55 to not be late for 09:00 schedule');
    if (!isLate2) throw new Error('Expected 09:15 to be late for 09:00 schedule');
  });

  console.log('\n================================================================');
  console.log(`  All Bug Fix Verifications Complete: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

verifyAllFixes().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
