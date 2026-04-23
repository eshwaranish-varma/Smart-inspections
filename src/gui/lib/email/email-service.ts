import nodemailer from "nodemailer";
import { OTP_EXPIRATION_MINUTES } from "@/lib/auth/otp";

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

export async function sendOtpEmail(params: {
  email: string;
  firstName?: string | null;
  code: string;
}) {
  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@smartinspections.local";
  const greetingName = params.firstName?.trim() || "there";

  await transporter.sendMail({
    from: `"Smart Inspections" <${from}>`,
    to: params.email,
    subject: "Smart Inspections Email Verification",
    text: `Hello ${greetingName},\n\nYour verification code is:\n\n${params.code}\n\nThis code expires in ${OTP_EXPIRATION_MINUTES} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <p>Hello ${greetingName},</p>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 16px 0; color: #0D1B3E;">${params.code}</div>
        <p>This code expires in ${OTP_EXPIRATION_MINUTES} minutes.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(params: {
  email: string;
  firstName?: string | null;
  code: string;
}) {
  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@smartinspections.local";
  const greetingName = params.firstName?.trim() || "there";

  await transporter.sendMail({
    from: `"Smart Inspections" <${from}>`,
    to: params.email,
    subject: "Smart Inspections Password Reset Code",
    text: `Hello ${greetingName},\n\nUse this code to reset your Smart Inspections password:\n\n${params.code}\n\nThis code expires in ${OTP_EXPIRATION_MINUTES} minutes. If you did not request this reset, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <p>Hello ${greetingName},</p>
        <p>Use this code to reset your Smart Inspections password:</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 16px 0; color: #0D1B3E;">${params.code}</div>
        <p>This code expires in ${OTP_EXPIRATION_MINUTES} minutes.</p>
        <p>If you did not request this reset, you can ignore this email.</p>
      </div>
    `,
  });
}
