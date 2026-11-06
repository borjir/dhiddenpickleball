"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Browser Supabase client. `createBrowserClient` already reuses one instance,
 * but keeping the guard here makes the configuration error explicit.
 */
export function createClient() {
  const env = getSupabaseEnv();

  if (!env) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.",
    );
  }

  browserClient ??= createBrowserClient(env.url, env.publishableKey);
  return browserClient;
}
