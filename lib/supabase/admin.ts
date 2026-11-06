import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Server-only Supabase client. The service-role key bypasses RLS, so this
 * module must never be imported from a client component.
 */
export function createAdminClient() {
  const env = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!env || !serviceRoleKey) return null;

  return createClient(env.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
