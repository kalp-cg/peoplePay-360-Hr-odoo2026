const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('Testing End-to-End Payslip Email Dispatch via API...');

  // 1. Admin Login
  const adminLogin = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@peoplepay360.com', password: 'Admin@123' });

  const adminToken = adminLogin.data.data?.token || adminLogin.data.token;
  if (!adminToken) throw new Error('Admin login failed');
  console.log('✓ Admin authenticated successfully.');

  // 2. Call POST /api/payslips/187/send
  console.log('Triggering POST /api/payslips/187/send...');
  const sendRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payslips/187/send',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('Send Status:', sendRes.status);
  console.log('Send Data:', sendRes.data);

  if (sendRes.status !== 200 || !sendRes.data.success) {
    throw new Error('API Email send failed: ' + JSON.stringify(sendRes.data));
  }
  console.log('✓ Payslip Email dispatched via API with Message ID:', sendRes.data.data?.messageId);

  // 3. Kalp Patel Login Test
  console.log('\nTesting Employee Login as Kalp Patel...');
  const kalpLogin = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'kalppatel1209@gmail.com', password: 'Kalp@123' });

  const kalpToken = kalpLogin.data.data?.token || kalpLogin.data.token;
  if (!kalpToken) throw new Error('Kalp Patel login failed: ' + JSON.stringify(kalpLogin.data));
  console.log(`✓ Kalp Patel logged in successfully! Role: ${kalpLogin.data.data?.user?.role}`);

  // 4. Kalp Patel downloads own PDF payslip
  const pdfRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payslips/187/pdf',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${kalpToken}` }
  });

  if (pdfRes.status !== 200 || pdfRes.headers['content-type'] !== 'application/pdf') {
    throw new Error('PDF download failed for Kalp Patel: ' + pdfRes.status);
  }
  console.log('✓ Kalp Patel verified PDF payslip download successfully (Content-Type: application/pdf)!');

  console.log('\n================================================================');
  console.log('  ALL API EMAIL & SELF-SERVICE VERIFICATIONS PASSED 100%!       ');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
