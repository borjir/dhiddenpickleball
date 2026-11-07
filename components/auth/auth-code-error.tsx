"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";

const messages: Record<string, { title: string; body: string }> = {
  provider: {
    title: "Sign-in was cancelled or refused",
    body: "Nothing was changed. Try the staff sign-in again with your email and password.",
  },
  missing_code: {
    title: "This link is incomplete",
    body: "It did not include a sign-in code. Open the newest link from your email, or request a fresh one.",
  },
  expired: {
    title: "This link has expired",
    body: "Confirmation and reset links are single-use. Request a new email and open it in this browser.",
  },
  exchange_failed: {
    title: "We couldn't complete sign-in",
    body: "The link may have already been used or opened in a different browser. Request a new one and try again.",
  },
  config: {
    title: "Sign-in is not connected in this environment",
    body: "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local, then restart the app.",
  },
  unknown: {
    title: "That link did not work",
    body: "Start again from the staff sign-in page. If it keeps failing, contact the club owner to check the staff account.",
  },
};

export function AuthCodeError() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") ?? "unknown";
  const message = messages[reason] ?? messages.unknown;

  return (
    <div className="space-y-5">
      <Alert variant="warning" title={message.title} role="alert">
        <p>{message.body}</p>
      </Alert>

      <Link href="/staff-access" className={buttonClasses({ className: "w-full" })}>
        Go to staff sign in
      </Link>

      <p className="text-center text-sm text-muted">
        Need a new link?{" "}
        <Link
          href="/staff-access/forgot-password"
          className="font-semibold text-accent-ink underline-offset-4 hover:underline"
        >
          Reset your password
        </Link>
      </p>
    </div>
  );
}
