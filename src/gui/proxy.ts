import { type NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth/session";
import { updateSession } from "./utils/supabase/middleware";

/**
 * Next.js 16+ uses `proxy.ts` at the project root (next to `app/`) instead of `middleware.ts`.
 * Do not add `src/middleware.ts` unless you also move the App Router to `src/app/`.
 *
 * Vercel may report a 404 for `/` in the request lifecycle if interception misbehaves; this
 * proxy never returns 404: public routes pass through, protected routes redirect to `/login`
 * when unauthenticated.
 */

const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/smart-inspections",
  "/merged-dashboard",
]);

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/robots.txt") return true;
  if (pathname === "/sitemap.xml") return true;
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) return true;
  return false;
}

/** App JWT and/or Supabase session cookies; avoid strict false negatives for refresh-only flows. */
function hasAuthCookie(request: NextRequest) {
  if (getSessionToken(request)) return true;
  return request.cookies.getAll().some(
    (c) =>
      (c.value?.length ?? 0) > 0 &&
      (c.name.startsWith("sb-") || c.name.toLowerCase().includes("supabase"))
  );
}

function copySetCookieFrom(from: NextResponse, to: NextResponse) {
  from.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      to.headers.append(key, value);
    }
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/_vercel")) {
    return NextResponse.next();
  }

  try {
    if (isPublicPath(pathname) || pathname.startsWith("/api")) {
      return await updateSession(request);
    }

    const res = await updateSession(request);

    if (hasAuthCookie(request)) {
      return res;
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    copySetCookieFrom(res, redirect);
    return redirect;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
