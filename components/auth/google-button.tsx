"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/auth/google-icon";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth/errors";
import { safeNextPath } from "@/lib/auth/redirect";

/** Starts the hosted Google OAuth flow and returns to the callback route. */
export function GoogleButton({
  label = "Continue with Google",
  disabled = false,
  next = "/account",
  onError,
}: {
  label?: string;
  disabled?: boolean;
  next?: string;
  onError: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function start() {
    if (loading || disabled) return;

    setLoading(true);
    onError("");

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        safeNextPath(next),
      )}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) {
        onError(authErrorMessage(error));
        setLoading(false);
      }
      // On success the browser is redirected to Google; keep the loading state
      // so the button cannot be pressed twice.
    } catch (error) {
      onError(authErrorMessage(error));
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="md"
      className="w-full"
      onClick={start}
      loading={loading}
      disabled={disabled}
    >
      {loading ? null : <GoogleIcon />}
      {label}
    </Button>
  );
}
