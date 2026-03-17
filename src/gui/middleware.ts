import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret";

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function base64UrlToUint8Array(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function constantTimeEquals(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left[index] ^ right[index];
  }
  return result === 0;
}

async function verifySessionToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const message = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))
  );
  const providedSignature = base64UrlToUint8Array(encodedSignature);

  if (!constantTimeEquals(signature, providedSignature)) {
    return false;
  }

  const payloadText = new TextDecoder().decode(base64UrlToUint8Array(encodedPayload));
  const payload = JSON.parse(payloadText) as { exp?: number };

  if (!payload.exp) {
    return false;
  }

  return payload.exp * 1000 > Date.now();
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return redirectToLogin(req);
  }

  const isValid = await verifySessionToken(token);
  if (!isValid) {
    const response = redirectToLogin(req);
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/new-inspection/:path*",
    "/observations/:path*",
    "/library/:path*",
    "/settings/:path*",
    "/references/:path*",
    "/audit-trail/:path*",
    "/document/:path*",
  ],
};

