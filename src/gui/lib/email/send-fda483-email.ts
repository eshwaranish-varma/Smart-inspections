import nodemailer from "nodemailer";

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendFda483ToFirmEmail(params: {
  to: string;
  firmName: string;
  inspectionTitle: string;
  docxBuffer: Buffer;
  filename?: string;
}) {
  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@smartinspections.local";

  await transporter.sendMail({
    from: `"Smart Inspections" <${from}>`,
    to: params.to,
    subject: `Form FDA 483 — ${params.inspectionTitle}`,
    text: `Please find attached the Form FDA 483 for ${params.firmName} (${params.inspectionTitle}).`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <p>Please find attached the <strong>Form FDA 483</strong> for <strong>${escapeHtml(params.firmName)}</strong>.</p>
        <p style="color:#6b7280;font-size:13px;">Inspection: ${escapeHtml(params.inspectionTitle)}</p>
      </div>
    `,
    attachments: [
      {
        filename: params.filename || "FDA_483.docx",
        content: params.docxBuffer,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    ],
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
