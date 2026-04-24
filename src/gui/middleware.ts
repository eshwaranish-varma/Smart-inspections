import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

function readSupabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ||
    "";
  if (!url.startsWith("https://") || !key) return null;
  return { url, key };
}

export async function updateSession(request: NextRequest) {
  const env = readSupabaseEnv();
  if (!env) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next();

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next();
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options ?? {})
        );
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}