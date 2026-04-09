import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Read Supabase env inline (do not use getSupabaseUrl here): Edge middleware must never throw
 * if vars are missing, and must not depend on a separate helper that can get out of sync with
 * isSupabaseConfigured after HMR.
 */
function readSupabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ||
    "";
  if (!url.startsWith("https://") || !key) return null;
  return { url, key };
}

/**
 * Refresh auth cookies on each request. Call this from root `middleware.ts`.
 * If Supabase env is not set, passes through (app may use other auth only).
 * See: https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(request: NextRequest) {
  const env = readSupabaseEnv();
  if (!env) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options as CookieOptions | undefined)
        );
      },
    },
  });

  // Triggers refresh; keep logic minimal between client creation and getUser().
  await supabase.auth.getUser();

  return supabaseResponse;
}
