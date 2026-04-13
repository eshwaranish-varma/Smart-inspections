import { NextRequest, NextResponse } from "next/server";

export const AUTH_COOKIE_NAME = "auth_token";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

function getSecureCookieFlag() {
  return process.env.NODE_ENV === "production";
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: getSecureCookieFlag(),
    sameSite: "strict",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: getSecureCookieFlag(),
    sameSite: "strict",
    maxAge: 0,
    expires: new Date(0),
    path: "/",
  });
}

export function getSessionToken(request: NextRequest): string | undefined {
  return request.cookies.get(AUTH_COOKIE_NAME)?.value;
}
