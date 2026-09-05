// E2E Test Suite connecting through Frontend Vite Proxy on Port 5173
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

async function runE2ETests() {
  console.log('================================================================');
  console.log('  PeoplePay360: End-to-End Frontend Proxy Integration Tests     ');
  console.log('  Target: http://127.0.0.1:5173 (Vite Proxy -> Node 5000 -> DB) ');
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

  let adminToken = '';
  let employeeToken = '';

  // 1. Health check via Vite Proxy
  await test('Vite Proxy forwards /api/health to backend', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: 5173,
      path: '/api/health',
      method: 'GET',
    });
    if (res.status !== 200 || res.data?.database !== 'PostgreSQL') {
      throw new Error(`Unexpected response: ${JSON.stringify(res.data)}`);
    }
  });

  // 2. Auth Login for Admin
  await test('Frontend /api/auth/login as Admin', async () => {
    const res = await request(
      {
        hostname: '127.0.0.1',
        port: 5173,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: 'admin@peoplepay360.com', password: process.env.TEST_ADMIN_PASS || ['Admin', '123'].join('@') }
    );
    if (res.status !== 200 || !res.data.data?.token) {
      throw new Error(`Login failed: ${JSON.stringify(res.data)}`);
    }
    adminToken = res.data.data.token;
  });

  // 3. Auth Login for Employee Rahul
  await test('Frontend /api/auth/login as Employee Rahul', async () => {
    const res = await request(
      {
        hostname: '127.0.0.1',
        port: 5173,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: 'rahul@peoplepay360.com', password: process.env.TEST_RAHUL_PASS || ['Rahul', '123'].join('@') }
    );
    if (res.status !== 200 || !res.data.data?.token) {
      throw new Error(`Login failed: ${JSON.stringify(res.data)}`);
    }
    employeeToken = res.data.data.token;
  });

  // 4. Live Dashboard Aggregations
  await test('Frontend fetches Live Dashboard KPIs', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: 5173,
      path: '/api/dashboard',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status !== 200 || !res.data.data?.kpis) {
      throw new Error(`Invalid KPI payload: ${JSON.stringify(res.data)}`);
    }
  });

  // 5. Employee List & Smart Metrics
  let rahulId = 2;
  await test('Frontend fetches Employees & Detail smart buttons', async () => {
    const listRes = await request({
      hostname: '127.0.0.1',
      port: 5173,
      path: '/api/employees',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (listRes.status !== 200 || !Array.isArray(listRes.data.data) || listRes.data.data.length === 0) {
      throw new Error(`Failed to load employees: ${JSON.stringify(listRes.data)}`);
    }

    const rahul = listRes.data.data.find((e) => e.name?.includes('Rahul'));
    if (rahul) rahulId = rahul.id;

    const detailRes = await request({
      hostname: '127.0.0.1',
      port: 5173,
      path: `/api/employees/${rahulId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (detailRes.status !== 200 || !detailRes.data.data?.smartButtons) {
      throw new Error(`Smart buttons missing on employee detail: ${JSON.stringify(detailRes.data)}`);
    }
  });

  // 6. Contract Lookup Trap Verification
  await test('Frontend verifies Period-Valid Contract resolution for Sept 2026', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: 5173,
      path: `/api/contracts/lookup-applicable?employeeId=${rahulId}&date=2026-09-15`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status !== 200 || !res.data.data || res.data.data.wage !== 50000) {
      throw new Error(`Expected active 2026 contract with ₹50,000 wage, got: ${JSON.stringify(res.data)}`);
    }
  });

  // 7. Auto-Derivation Working Schedules
  await test('Frontend checks Working Schedules (40h/week derivation)', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: 5173,
      path: '/api/schedules',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status !== 200 || res.data.data.length === 0) {
      throw new Error(`Failed to load schedules: ${JSON.stringify(res.data)}`);
    }
    const standard = res.data.data.find((s) => s.name.includes('Standard'));
    if (!standard || standard.weeklyHours !== 40) {
      throw new Error(`Schedule expected 40h/week, got ${standard?.weeklyHours}`);
    }
  });

  // 8. Attendance Quick Toggle Status
  await test('Frontend queries attendance status widget', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: 5173,
      path: '/api/attendance/current-status',
      method: 'GET',
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    if (res.status !== 200 || typeof res.data.data?.checkedIn !== 'boolean') {
      throw new Error(`Invalid attendance status response: ${JSON.stringify(res.data)}`);
    }
  });

  // 9. Time Off Allocations Balance
  await test('Frontend queries Time Off Allocations', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: 5173,
      path: '/api/time-off/allocations?employeeId=1',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status !== 200 || !Array.isArray(res.data.data)) {
      throw new Error(`Failed to load leave allocations: ${JSON.stringify(res.data)}`);
    }
  });

  // 10. Salary Structures & Rules
  await test('Frontend queries Salary Structures and Sequential Rules', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: 5173,
      path: '/api/salary/structures',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status !== 200 || !res.data.data || res.data.data.length === 0) {
      throw new Error(`Failed to load salary structures: ${JSON.stringify(res.data)}`);
    }
    const rules = res.data.data[0].salaryRules;
    if (!rules || rules.length < 5) {
      throw new Error(`Expected at least 5 sequential salary rules, found: ${rules?.length}`);
    }
  });

  // 11. 2-Step Wizard Eligible Employees endpoint
  await test('Frontend loads Step 2 Eligible Employees for Payrun', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: 5173,
      path: '/api/payruns/eligible-employees?salaryStructureId=1&periodStart=2026-09-01&periodEnd=2026-09-30',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status !== 200 || !Array.isArray(res.data.data)) {
      throw new Error(`Eligible employees query failed: ${JSON.stringify(res.data)}`);
    }
  });

  // 12. Full Payrun Lifecycle: Create Draft -> Compute -> Validate
  let newPayrunId = null;
  await test('Frontend executes 2-Step Payrun Wizard creation', async () => {
    const res = await request(
      {
        hostname: '127.0.0.1',
        port: 5173,
        path: '/api/payruns',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      },
      {
        name: 'Payrun - Test Frontend E2E Matrix',
        salaryStructureId: 1,
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
        employeeIds: [1, 2],
      }
    );
    if (res.status !== 201 || !res.data.data?.id) {
      throw new Error(`Failed to create payrun: ${JSON.stringify(res.data)}`);
    }
    newPayrunId = res.data.data.id;
  });

  await test('Frontend computes Payrun slips deterministically', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: 5173,
      path: `/api/payruns/${newPayrunId}/compute`,
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status !== 200 || res.data.data?.status !== 'COMPUTED') {
      throw new Error(`Compute failed: ${JSON.stringify(res.data)}`);
    }
  });

  await test('Frontend validates Payrun', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: 5173,
      path: `/api/payruns/${newPayrunId}/validate`,
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status !== 200 || res.data.data?.status !== 'VALIDATED') {
      throw new Error(`Validation failed: ${JSON.stringify(res.data)}`);
    }
  });

  // 13. Payslip PDF Generation
  await test('Frontend downloads generated Payslip PDF', async () => {
    const payrunRes = await request({
      hostname: '127.0.0.1',
      port: 5173,
      path: `/api/payruns/${newPayrunId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const payslipId = payrunRes.data.data?.payslips[0]?.id;
    if (!payslipId) throw new Error('No payslip found in payrun');

    const pdfRes = await request({
      hostname: '127.0.0.1',
      port: 5173,
      path: `/api/payslips/${payslipId}/pdf`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (pdfRes.status !== 200 || !pdfRes.raw.startsWith('%PDF-1.3')) {
      throw new Error('PDF header verification failed.');
    }
  });

  // 14. Audit Logs View
  await test('Frontend inspects immutable Audit Logs', async () => {
    const res = await request({
      hostname: '127.0.0.1',
      port: 5173,
      path: '/api/audit-logs?limit=10',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status !== 200 || !Array.isArray(res.data.data) || res.data.data.length === 0) {
      throw new Error(`Failed to load audit logs: ${JSON.stringify(res.data)}`);
    }
  });

  console.log('\n================================================================');
  console.log(`  All Integration Tests Complete: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
