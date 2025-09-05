const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendVerificationEmail(to, code) {
  await transporter.sendMail({
    from: `"SkillLink" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify your email",
    html: `<p>Your verification code is: <b>${code}</b></p><p>It expires in 10 minutes.</p>`
  });
}

module.exports = { sendVerificationEmail };
