const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: parseInt(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function sendTestEmail(toEmail, fromName) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"${fromName || 'Ticketing System'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Test Email - Ticketing System',
    text: `This is a test email from the Ticketing System.\n\nIf you received this, your notification email is configured correctly.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e1e8ed; border-radius: 8px;">
        <h2 style="color: #667eea;">Ticketing System</h2>
        <p>This is a <strong>test email</strong>.</p>
        <p>If you received this, your notification email is configured correctly and ready to receive ticket updates.</p>
        <hr style="border: none; border-top: 1px solid #e1e8ed; margin: 16px 0;" />
        <p style="color: #888; font-size: 12px;">Sent from Office Ticketing System</p>
      </div>
    `,
  });
}

module.exports = { sendTestEmail };
