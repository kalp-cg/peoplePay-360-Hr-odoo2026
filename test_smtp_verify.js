const path = require('path');
const nodemailer = require(path.join(__dirname, 'backend/node_modules/nodemailer'));
require(path.join(__dirname, 'backend/node_modules/dotenv')).config({ path: path.join(__dirname, 'backend/.env') });

async function verifySmtp() {
  console.log('Testing SMTP with USER:', process.env.SMTP_USER);
  const user = process.env.SMTP_USER;
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: user,
      pass: pass,
    },
  });

  try {
    await transporter.verify();
    console.log('✓ SMTP Connection Verified successfully!');
    return true;
  } catch (err) {
    console.error('Failed on 465, trying 587 TLS:', err.message);
    const transporter587 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user, pass },
    });
    await transporter587.verify();
    console.log('✓ SMTP Connection Verified successfully on port 587!');
    return true;
  }
}

verifySmtp().catch((err) => {
  console.error('Verification failed completely:', err);
  process.exit(1);
});
