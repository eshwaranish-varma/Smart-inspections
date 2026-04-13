const OTP_TTL_MS = 5 * 60 * 1000;

// Kept at 6 digits to remain compatible with the existing verification UI.
export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getOtpExpiration(): Date {
  return new Date(Date.now() + OTP_TTL_MS);
}

export function isOtpExpired(value: Date | string | null | undefined): boolean {
  if (!value) return true;
  const expiresAt = value instanceof Date ? value : new Date(value);
  return Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now();
}

export const OTP_EXPIRATION_MINUTES = 5;
