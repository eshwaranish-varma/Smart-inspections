import jwt from "jsonwebtoken";
import type { Secret, SignOptions } from "jsonwebtoken";

const SECRET: Secret = process.env.JWT_SECRET || "dev-insecure-secret";
const EXPIRES: SignOptions["expiresIn"] =
  (process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) || "24h";

export interface JWTPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  fdaPosition?: string;
  role?: "supervisor" | "investigator";
}

export function signToken(payload: JWTPayload): string {
  const options: SignOptions = { expiresIn: EXPIRES };
  return jwt.sign(payload, SECRET, options);
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, SECRET) as JWTPayload;
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function safeVerifyToken(token: string): JWTPayload | null {
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

