const nodemailer = require('nodemailer');

const host = process.env.EMAIL_HOST;
const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;
const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

const transportOptions = {
  host,
  port,
  secure: port === 465,
  auth: user && pass ? { user, pass } : undefined,
};

const transporter = nodemailer.createTransport(transportOptions);

async function sendEmail({ to, subject, text, html }) {
  if (!host || !user || !pass || !from) {
    console.warn('SMTP email configuration is incomplete. Skipping email send.');
    return;
  }

  const mailOptions = {
    from,
    to,
    subject,
    text,
    html,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = {
  sendEmail,
};
