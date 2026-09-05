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

async function run() {
  console.log('=== VERIFYING REAL-TIME ATTENDANCE & CHECK-IN / CHECK-OUT FLOW ===\n');

  // 1. Log in Admin
  console.log('1. Logging in as Admin...');
  const adminLogin = await postJson(`${API_BASE}/auth/login`, {
    email: 'admin@peoplepay360.com',
    password: 'Admin@123',
  });
  const adminToken = adminLogin.token;

  // 2. Log in Rahul Sharma (Employee)
  console.log('2. Logging in as Rahul Sharma (Employee)...');
  const rahulLogin = await postJson(`${API_BASE}/auth/login`, {
    email: 'rahul@peoplepay360.com',
    password: 'Rahul@123',
  });
  const rahulToken = rahulLogin.token;

  // 3. Rahul Sharma punches CHECK IN
  console.log('\n3. Rahul Sharma checks in...');
  const checkInRes = await postJson(`${API_BASE}/attendance/quick-toggle`, { action: 'CHECK_IN' }, rahulToken);
  console.log('   Check-in successful! Record:', {
    id: checkInRes.id,
    employeeId: checkInRes.employeeId,
    checkIn: checkInRes.checkIn,
    checkOut: checkInRes.checkOut,
    status: checkInRes.status
  });

  // Verify Rahul Sharma status
  const rahulStatus = await getJson(`${API_BASE}/attendance/current-status`, rahulToken);
  console.log('   Rahul status:', { checkedIn: rahulStatus.checkedIn, elapsedHours: rahulStatus.elapsedHours });
  if (!rahulStatus.checkedIn) throw new Error('Rahul should be checked in!');

  // 4. Admin checks `/attendance` with search
  console.log('\n4. Admin querying `/attendance?search=Rahul Sharma`...');
  const adminAttSearch = await getJson(`${API_BASE}/attendance?search=Rahul+Sharma`, adminToken);
  console.log(`   Admin found ${adminAttSearch.length} record(s) matching "Rahul Sharma"!`);
  if (adminAttSearch.length === 0) {
    throw new Error('Admin must find Rahul Sharma in attendance records!');
  }
  const foundRec = adminAttSearch[0];
  console.log('   Found record details:', {
    id: foundRec.id,
    name: foundRec.employee?.name,
    code: foundRec.employee?.employeeId,
    checkIn: foundRec.checkIn,
    checkOut: foundRec.checkOut,
    status: foundRec.status
  });

  // 5. Rahul Sharma punches CHECK OUT
  console.log('\n5. Rahul Sharma checks out (ends shift)...');
  const checkOutRes = await postJson(`${API_BASE}/attendance/quick-toggle`, { action: 'CHECK_OUT' }, rahulToken);
  console.log('   Check-out completed. Worked hours:', checkOutRes?.workedHours, 'Status:', checkOutRes?.status);

  const rahulStatusAfterOut = await getJson(`${API_BASE}/attendance/current-status`, rahulToken);
  console.log('   Rahul status after checkout:', {
    checkedIn: rahulStatusAfterOut.checkedIn,
    hasCheckedOutToday: rahulStatusAfterOut.hasCheckedOutToday,
    workedHours: rahulStatusAfterOut.workedHours
  });
  if (rahulStatusAfterOut.checkedIn) throw new Error('Rahul should be checked out!');

  // 6. Rahul Sharma checks in AGAIN (secondary check-in):
  // Must count from 0!
  console.log('\n6. Rahul Sharma starts a NEW check-in (re-check in)...');
  const reCheckInRes = await postJson(`${API_BASE}/attendance/quick-toggle`, { action: 'CHECK_IN' }, rahulToken);
  console.log('   Re-check in recorded. Record:', {
    id: reCheckInRes.id,
    checkIn: reCheckInRes.checkIn,
    checkOut: reCheckInRes.checkOut,
    workedHours: reCheckInRes.workedHours
  });

  const rahulReCheckStatus = await getJson(`${API_BASE}/attendance/current-status`, rahulToken);
  console.log('   Rahul status after re-check in:', {
    checkedIn: rahulReCheckStatus.checkedIn,
    elapsedHours: rahulReCheckStatus.elapsedHours,
    workedHours: rahulReCheckStatus.workedHours
  });
  if (!rahulReCheckStatus.checkedIn) throw new Error('Rahul should be checked in again!');
  if (rahulReCheckStatus.elapsedHours > 0.05) {
    throw new Error('Timer should count fresh from 0 upon re-check in!');
  }
  console.log('   >>> SUCCESS: Shift timer started fresh from 0 (elapsed hours: ' + rahulReCheckStatus.elapsedHours + ')!');

  // 7. Clean check-out to leave state clean
  await postJson(`${API_BASE}/attendance/quick-toggle`, { action: 'CHECK_OUT' }, rahulToken);
  console.log('\nFinal checkout completed.');
  console.log('=== ALL REAL-TIME ATTENDANCE TESTS PASSED PERFECTLY! ===');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Failed:', err.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
