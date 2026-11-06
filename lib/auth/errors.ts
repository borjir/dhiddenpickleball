type AuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

const byCode: Record<string, string> = {
  invalid_credentials: "That email and password don't match. Try again.",
  email_not_confirmed:
    "Confirm your email first. Check your inbox for the verification link.",
  user_already_exists:
    "An account already uses that email. Sign in instead, or reset your password.",
  email_exists:
    "An account already uses that email. Sign in instead, or reset your password.",
  weak_password: "Choose a stronger password with at least 8 characters.",
  same_password: "Choose a password you haven't used for this account.",
  over_email_send_rate_limit:
    "Too many emails were sent recently. Wait a few minutes and try again.",
  over_request_rate_limit:
    "Too many attempts. Wait a few minutes before trying again.",
  otp_expired: "That link has expired. Request a new one.",
  flow_state_expired: "That link has expired. Start again from this page.",
  flow_state_not_found: "That link is no longer valid. Start again from this page.",
  session_not_found: "Your session ended. Sign in again.",
  provider_disabled: "That sign-in method is not enabled for this project.",
  signup_disabled: "New accounts are currently disabled. Contact the club.",
  validation_failed: "Check the details you entered and try again.",
  bad_code_verifier: "That link was opened in a different browser. Request a new one.",
};

const byMessage: Array<[RegExp, string]> = [
  [
    /fetch|network|load failed|timed out|timeout/i,
    "We couldn't reach the sign-in service. Check your connection and try again.",
  ],
  [
    /supabase is not configured/i,
    "Accounts are not connected in this environment yet. Add the Supabase keys to .env.local and restart the app.",
  ],
  [
    /invalid api key|apikey/i,
    "The Supabase key was rejected. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  ],
  [
    /email link is invalid or has expired/i,
    "That email link has expired or was already used. Request a new one.",
  ],
];

/**
 * Convert Supabase Auth errors into copy a player can act on. Unknown errors
 * fall back to a neutral sentence rather than exposing provider internals.
 */
export function authErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  if (!error) return fallback;

  const value = error as AuthErrorLike;

  if (value.code && byCode[value.code]) return byCode[value.code];

  const message = value.message ?? "";

  for (const [pattern, copy] of byMessage) {
    if (pattern.test(message)) return copy;
  }

  return fallback;
}

export function isMissingConfigError(error: unknown) {
  return /supabase is not configured/i.test(
    (error as AuthErrorLike | null)?.message ?? "",
  );
}
