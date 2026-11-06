import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Refresh the Supabase session before rendering.
 *
 * Next.js 16 renamed Middleware to Proxy. `getClaims()` verifies the token and
 * refreshes it when needed; `getSession()` must not be trusted here.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = getSupabaseEnv();

  if (!env) return response;

  try {
    const supabase = createServerClient(env.url, env.publishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });

          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        },
      },
    });

    await supabase.auth.getClaims();
  } catch {
    // Auth being unreachable must not take the public site down. The page
    // itself still checks the session where access matters.
  }

  return response;
}
