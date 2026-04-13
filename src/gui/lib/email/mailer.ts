import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(
  toEmail: string,
  firstName: string,
  code: string
) {
  const expiresMinutes = 15;

  await transporter.sendMail({
    from: `"Smart Inspections | FDA" <${process.env.EMAIL_FROM}>`,
    to: toEmail,
    subject: "Verify Your Smart Inspections Account — FDA",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 0; }
          .container { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
          .header { background: #0D1B3E; padding: 28px 32px; }
          .header h1 { color: #fff; margin: 0; font-size: 22px; }
          .header p { color: #02A8BD; margin: 4px 0 0; font-size: 13px; }
          .body { padding: 32px; }
          .code-box { background: #f0f9ff; border: 2px solid #028090; border-radius: 8px; text-align: center; padding: 20px; margin: 24px 0; }
          .code { font-size: 42px; font-weight: bold; letter-spacing: 10px; color: #0D1B3E; font-family: 'Courier New', monospace; }
          .expires { color: #64748b; font-size: 13px; margin-top: 8px; }
          .footer { background: #f4f7fa; padding: 20px 32px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Smart Inspections</h1>
            <p>AI-Assisted FDA Inspection Documentation</p>
          </div>
          <div class="body">
            <p>Hello <strong>${firstName}</strong>,</p>
            <p>Thank you for registering with Smart Inspections. Use the verification code below to activate your account:</p>
            <div class="code-box">
              <div class="code">${code}</div>
              <div class="expires">Expires in ${expiresMinutes} minutes</div>
            </div>
            <p>If you did not request this code, please disregard this email.</p>
            <p>— The Smart Inspections Team<br/><em>Powered by Precise Software Solutions &amp; George Mason University DAEN Program</em></p>
          </div>
          <div class="footer">
            This is an automated message. Do not reply to this email.<br/>
            For support, contact your system administrator.
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

