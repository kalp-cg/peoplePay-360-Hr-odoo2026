const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_BASE = 'http://127.0.0.1:5000/api';

async function postJson(url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data.data !== undefined ? data.data : data;
}

async function getJson(url, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'GET', headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data.data !== undefined ? data.data : data;
}

async function testIsolation() {
  console.log('=== TESTING STRICT ROLE & ATTENDANCE ISOLATION ===\n');

  // Clean any open test attendances for Admin (EMP000) and Rahul (EMP001) first
  const adminEmp = await prisma.employee.findUnique({ where: { employeeId: 'EMP000' } });
  const rahulEmp = await prisma.employee.findUnique({ where: { employeeId: 'EMP001' } });

  if (adminEmp) {
    await prisma.attendance.deleteMany({ where: { employeeId: adminEmp.id } });
  }
  if (rahulEmp) {
    await prisma.attendance.deleteMany({ where: { employeeId: rahulEmp.id } });
  }

  // Step 1: Login as Admin
  console.log('1. Logging in as Admin (admin@peoplepay360.com)...');
  const adminLoginRes = await postJson(`${API_BASE}/auth/login`, {
    email: 'admin@peoplepay360.com',
    password: 'Admin@123',
  });
  const adminToken = adminLoginRes.token;
  const adminUser = adminLoginRes.user;
  console.log(`   Admin logged in. UserID: ${adminUser.id}, EmpID: ${adminUser.employeeId}, Role: ${adminUser.role}`);

  // Step 2: Check Admin initial status
  console.log('2. Checking Admin initial attendance status...');
  const adminStatus1 = await getJson(`${API_BASE}/attendance/current-status`, adminToken);
  console.log('   Admin Status before punch:', {
    checkedIn: adminStatus1.checkedIn,
    status: adminStatus1.status,
    elapsedHours: adminStatus1.elapsedHours,
  });
  if (adminStatus1.checkedIn) {
    throw new Error('Admin should NOT be checked in initially!');
  }

  // Step 3: Admin punches Check In
  console.log('3. Admin punching CHECK IN...');
  const adminCheckInRes = await postJson(
    `${API_BASE}/attendance/quick-toggle`,
    { action: 'CHECK_IN' },
    adminToken
  );
  console.log('   Admin punched in. Record ID:', adminCheckInRes?.id, 'EmpID:', adminCheckInRes?.employeeId);

  const adminStatus2 = await getJson(`${API_BASE}/attendance/current-status`, adminToken);
  console.log('   Admin Status after punch:', {
    checkedIn: adminStatus2.checkedIn,
    status: adminStatus2.status,
    elapsedHours: adminStatus2.elapsedHours,
  });
  if (!adminStatus2.checkedIn) {
    throw new Error('Admin should be CHECKED IN!');
  }

  // Step 4: Login as Rahul Sharma (EMPLOYEE)
  console.log('\n4. Logging in as Employee Rahul Sharma (rahul@peoplepay360.com)...');
  const rahulLoginRes = await postJson(`${API_BASE}/auth/login`, {
    email: 'rahul@peoplepay360.com',
    password: 'Rahul@123',
  });
  const rahulToken = rahulLoginRes.token;
  const rahulUser = rahulLoginRes.user;
  console.log(`   Rahul logged in. UserID: ${rahulUser.id}, EmpID: ${rahulUser.employeeId}, Role: ${rahulUser.role}`);

  // Step 5: Check Rahul Sharma status - MUST NOT BE CHECKED IN!
  console.log('5. Checking Rahul Sharma attendance status (MUST BE ISOLATED FROM ADMIN)...');
  const rahulStatus1 = await getJson(`${API_BASE}/attendance/current-status`, rahulToken);
  console.log('   Rahul Status while Admin is checked in:', {
    checkedIn: rahulStatus1.checkedIn,
    status: rahulStatus1.status,
    elapsedHours: rahulStatus1.elapsedHours,
  });

  const rahulPortalRes = await getJson(`${API_BASE}/dashboard/employee-portal`, rahulToken);
  console.log('   Rahul Portal attStatus:', {
    checkedIn: rahulPortalRes.attStatus?.checkedIn,
    elapsedHours: rahulPortalRes.attStatus?.elapsedHours,
  });

  if (rahulStatus1.checkedIn || rahulPortalRes.attStatus?.checkedIn) {
    throw new Error('FAIL: Rahul Sharma is showing Admin check-in! Isolation broken!');
  }
  console.log('   >>> SUCCESS: Rahul Sharma is NOT checked in! Completely isolated from Admin!');

  // Step 6: Rahul Sharma punches Check In
  console.log('\n6. Rahul Sharma punching CHECK IN...');
  const rahulCheckInRes = await postJson(
    `${API_BASE}/attendance/quick-toggle`,
    { action: 'CHECK_IN' },
    rahulToken
  );
  console.log('   Rahul punched in. Record ID:', rahulCheckInRes?.id, 'EmpID:', rahulCheckInRes?.employeeId);

  // Step 7: Check Rahul Status after punch
  const rahulStatus2 = await getJson(`${API_BASE}/attendance/current-status`, rahulToken);
  console.log('   Rahul Status after punch:', {
    checkedIn: rahulStatus2.checkedIn,
    status: rahulStatus2.status,
  });
  if (!rahulStatus2.checkedIn) {
    throw new Error('Rahul should be checked in now!');
  }

  // Step 8: Verify both attendances in Database
  console.log('\n7. Verifying DB records for both users:');
  const adminRecs = await prisma.attendance.findMany({ where: { employeeId: adminEmp.id } });
  const rahulRecs = await prisma.attendance.findMany({ where: { employeeId: rahulEmp.id } });
  console.log(`   Admin Attendance Count: ${adminRecs.length}, Record EmpID: ${adminRecs[0]?.employeeId}`);
  console.log(`   Rahul Attendance Count: ${rahulRecs.length}, Record EmpID: ${rahulRecs[0]?.employeeId}`);

  if (adminRecs[0]?.employeeId === rahulRecs[0]?.employeeId) {
    throw new Error('FAIL: Both records belong to the same employee!');
  }

  // Step 9: Clean up / Check out both to leave system clean
  await postJson(
    `${API_BASE}/attendance/quick-toggle`,
    { action: 'CHECK_OUT' },
    adminToken
  );
  await postJson(
    `${API_BASE}/attendance/quick-toggle`,
    { action: 'CHECK_OUT' },
    rahulToken
  );
  console.log('\nBoth users checked out cleanly.');
  console.log('=== ALL ATTENDANCE & ROLE ISOLATION TESTS PASSED PERFECTLY! ===');
}

testIsolation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Failed:', err?.response?.data || err.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
