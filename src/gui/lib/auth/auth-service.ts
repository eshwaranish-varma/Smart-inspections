import { comparePassword, hashPassword } from "@/lib/auth/password";
import { generateOtpCode, getOtpExpiration } from "@/lib/auth/otp";
import { signToken, verifyToken, type JWTPayload } from "@/lib/auth/jwt";
import {
  createUser,
  findValidPasswordResetCode,
  findValidOtp,
  getUserByEmail,
  getUserById,
  markEmailVerified,
  storeOtpCode,
  storePasswordResetCode,
  updateUserPassword,
  type UserRecord,
} from "@/lib/db/user-service";
import { sendOtpEmail, sendPasswordResetEmail } from "@/lib/email/email-service";

export async function validateLoginCredentials(email: string, password: string) {
  const user = await getUserByEmail(email);
  if (!user) {
    return { status: "invalid_credentials" as const };
  }

  const passwordValid = await comparePassword(password, user.password_hash);
  if (!passwordValid) {
    return { status: "invalid_credentials" as const };
  }

  if (!user.is_verified) {
    return { status: "verification_required" as const, user };
  }

  return {
    status: "authenticated" as const,
    user,
    token: createSessionToken(user),
  };
}

export async function registerUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  fdaPosition?: string | null;
  role?: "supervisor" | "investigator";
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
  password: string;
}) {
  const passwordHash = await hashPassword(input.password);
  const code = generateOtpCode();
  const expiresAt = getOtpExpiration();

  const user = await createUser({
    ...input,
    passwordHash,
    verificationCode: code,
    verificationExpiresAt: expiresAt,
  });

  await sendOtpEmail({
    email: user.email,
    firstName: user.first_name,
    code,
  });

  return { user, code, expiresAt };
}

export async function resendVerificationOtp(user: UserRecord) {
  const code = generateOtpCode();
  const expiresAt = getOtpExpiration();
  await storeOtpCode(user.id, code, expiresAt);
  await sendOtpEmail({
    email: user.email,
    firstName: user.first_name,
    code,
  });
  return { code, expiresAt };
}

export async function verifyEmailOtp(userId: string, code: string) {
  const user = await findValidOtp(userId, code);
  if (!user) return null;
  await markEmailVerified(userId, code);
  return getUserById(userId);
}

export async function sendPasswordResetOtp(email: string) {
  const user = await getUserByEmail(email);
  if (!user) return { sent: false as const };

  const code = generateOtpCode();
  const expiresAt = getOtpExpiration();
  await storePasswordResetCode(user.id, code, expiresAt);
  await sendPasswordResetEmail({
    email: user.email,
    firstName: user.first_name,
    code,
  });

  return { sent: true as const, user, code, expiresAt };
}

export async function resetPasswordWithOtp(input: {
  email: string;
  code: string;
  password: string;
}) {
  const user = await findValidPasswordResetCode(input.email, input.code);
  if (!user) return null;

  const passwordHash = await hashPassword(input.password);
  await updateUserPassword(user.id, passwordHash, input.code);
  const updatedUser = await getUserById(user.id);

  if (!updatedUser) return null;

  return {
    user: updatedUser,
    token: createSessionToken(updatedUser),
  };
}

export function createSessionToken(
  user: Pick<
    UserRecord,
    "id" | "email" | "first_name" | "last_name" | "fda_position" | "role"
  >
) {
  return signToken({
    userId: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    fdaPosition: user.fda_position || undefined,
    role: user.role || "investigator",
  });
}

export function verifySessionToken(token: string): JWTPayload | null {
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}
