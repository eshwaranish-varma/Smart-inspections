import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/auth-service";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";
import { getUserById } from "@/lib/db/user-service";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  return getUserById(payload.userId);
}

export async function getCurrentUserFromRequest(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  return getUserById(payload.userId);
}
