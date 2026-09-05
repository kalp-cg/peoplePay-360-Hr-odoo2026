/**
 * Test script to verify the two-button Check In / Check Out synchronization
 * and backend handling of explicit CHECK_IN / CHECK_OUT actions.
 */
const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed, raw: body });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('Testing Attendance Sync and Two-Option Actions...');

  // 1. Login as Employee (Rahul Sharma)
  const loginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'rahul@peoplepay360.com', password: 'Rahul@123' });

  const token = loginRes.data.data?.token || loginRes.data.token;
  if (loginRes.status !== 200 || !token) {
    throw new Error('Employee login failed: ' + JSON.stringify(loginRes.data));
  }
  console.log('✓ Rahul Sharma logged in successfully.');

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. Check current attendance status
  const curStatus1 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/attendance/current-status',
    method: 'GET',
    headers: authHeaders
  });
  console.log('Current status:', curStatus1.data);

  // 3. Test explicit CHECK_IN action
  console.log('Testing explicit action: CHECK_IN...');
  const checkInRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/attendance/quick-toggle',
    method: 'POST',
    headers: authHeaders
  }, { action: 'CHECK_IN' });
  const checkInState = checkInRes.data.data?.checkedIn ?? checkInRes.data?.checkedIn;
  console.log('CHECK_IN response status:', checkInRes.status, 'checkedIn:', checkInState);

  if (checkInRes.status !== 200 || checkInState !== true) {
    throw new Error('Explicit CHECK_IN failed: ' + JSON.stringify(checkInRes.data));
  }
  console.log('✓ Explicit CHECK_IN succeeded. checkedIn = true');

  // Verify status reflects checked in
  const curStatus2 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/attendance/current-status',
    method: 'GET',
    headers: authHeaders
  });
  const curCheckedIn2 = curStatus2.data.data?.checkedIn ?? curStatus2.data?.checkedIn;
  if (!curCheckedIn2) {
    throw new Error('Status not reflecting checked in!');
  }
  console.log('✓ Current status confirms employee is checked in.');

  // 4. Test explicit CHECK_OUT action
  console.log('Testing explicit action: CHECK_OUT...');
  const checkOutRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/attendance/quick-toggle',
    method: 'POST',
    headers: authHeaders
  }, { action: 'CHECK_OUT' });
  const checkOutState = checkOutRes.data.data?.checkedIn ?? checkOutRes.data?.checkedIn;
  console.log('CHECK_OUT response status:', checkOutRes.status, 'checkedIn:', checkOutState);

  if (checkOutRes.status !== 200 || checkOutState !== false) {
    throw new Error('Explicit CHECK_OUT failed: ' + JSON.stringify(checkOutRes.data));
  }
  console.log('✓ Explicit CHECK_OUT succeeded. checkedIn = false');

  // Verify status reflects checked out
  const curStatus3 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/attendance/current-status',
    method: 'GET',
    headers: authHeaders
  });
  const curCheckedIn3 = curStatus3.data.data?.checkedIn ?? curStatus3.data?.checkedIn;
  if (curCheckedIn3) {
    throw new Error('Status not reflecting checked out!');
  }
  console.log('✓ Current status confirms employee is checked out (out of office).');

  // 5. Also test Admin user (EMP000 / fallback)
  console.log('Testing Admin user fallback quick-toggle...');
  const adminLogin = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@peoplepay360.com', password: 'Admin@123' });

  const adminToken = adminLogin.data.data?.token || adminLogin.data.token;
  const adminHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  };

  const adminCheckIn = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/attendance/quick-toggle',
    method: 'POST',
    headers: adminHeaders
  }, { action: 'CHECK_IN' });

  const adminCheckInState = adminCheckIn.data.data?.checkedIn ?? adminCheckIn.data?.checkedIn;
  if (adminCheckIn.status !== 200 || adminCheckInState !== true) {
    throw new Error('Admin CHECK_IN failed: ' + JSON.stringify(adminCheckIn.data));
  }
  console.log('✓ Admin explicit CHECK_IN succeeded.');

  const adminCheckOut = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/attendance/quick-toggle',
    method: 'POST',
    headers: adminHeaders
  }, { action: 'CHECK_OUT' });

  const adminCheckOutState = adminCheckOut.data.data?.checkedIn ?? adminCheckOut.data?.checkedIn;
  if (adminCheckOut.status !== 200 || adminCheckOutState !== false) {
    throw new Error('Admin CHECK_OUT failed: ' + JSON.stringify(adminCheckOut.data));
  }
  console.log('✓ Admin explicit CHECK_OUT succeeded.');

  console.log('\n=============================================================');
  console.log('  ALL ATTENDANCE SYNC AND TWO-OPTION TESTS PASSED PERFECTLY!');
  console.log('=============================================================');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
