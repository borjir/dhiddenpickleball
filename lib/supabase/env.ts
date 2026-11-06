/**
 * Supabase public configuration.
 *
 * Only public values belong here. The publishable key is designed to be shipped
 * to the browser; the secret/service-role key must never be exported from a
 * NEXT_PUBLIC_* variable or imported into a client component.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

export function getSupabaseEnv(): SupabaseEnv | null {
  if (!url || !publishableKey) return null;
  if (url.includes("YOUR-PROJECT-REF") || publishableKey.includes("YOUR_KEY")) {
    return null;
  }
  return { url, publishableKey };
}

export function isSupabaseConfigured() {
  return getSupabaseEnv() !== null;
}
