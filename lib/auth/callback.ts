import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/redirect";

const otpTypes = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
] as const;

type OtpType = (typeof otpTypes)[number];

function isOtpType(value: string): value is OtpType {
  return (otpTypes as readonly string[]).includes(value);
}

function errorRedirect(origin: string, reason: string) {
  const url = new URL("/auth/auth-code-error", origin);
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

/**
 * Single handler for OAuth, email confirmation, and password recovery.
 *
 * Supports the PKCE `code` exchange used by the browser client and the
 * `token_hash` form used when an email template points straight at this app.
 * Any failure redirects to a friendly page instead of exposing provider text.
 */
export async function handleAuthCallback(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const typeParam = url.searchParams.get("type");
  const nextParam = url.searchParams.get("next");

  const next = nextParam
    ? safeNextPath(nextParam)
    : typeParam === "recovery"
      ? "/staff-access/reset-password"
      : "/staff";

  if (url.searchParams.get("error")) {
    return errorRedirect(origin, "provider");
  }

  if (!code && !tokenHash) {
    return errorRedirect(origin, "missing_code");
  }

  try {
    const supabase = await createClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        return errorRedirect(
          origin,
          error.code === "otp_expired" ? "expired" : "exchange_failed",
        );
      }

      return NextResponse.redirect(new URL(next, origin));
    }

    if (tokenHash && typeParam && isOtpType(typeParam)) {
      const { error } = await supabase.auth.verifyOtp({
        type: typeParam,
        token_hash: tokenHash,
      });

      if (error) {
        return errorRedirect(
          origin,
          error.code === "otp_expired" ? "expired" : "exchange_failed",
        );
      }

      return NextResponse.redirect(new URL(next, origin));
    }

    return errorRedirect(origin, "missing_code");
  } catch {
    // Most often this is missing Supabase environment configuration.
    return errorRedirect(origin, "config");
  }
}
