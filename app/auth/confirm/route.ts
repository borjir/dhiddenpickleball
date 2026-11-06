import { handleAuthCallback } from "@/lib/auth/callback";

/**
 * Alias for email templates that point directly at `/auth/confirm` with
 * `token_hash` and `type` instead of Supabase's `{{ .ConfirmationURL }}`.
 */
export const GET = handleAuthCallback;
