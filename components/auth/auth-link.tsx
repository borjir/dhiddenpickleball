"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/cn";

/**
 * Header account entry point. It starts as "Sign in" so the server-rendered
 * header does not depend on a session, then upgrades to "My account" once the
 * browser client confirms a session. The proxy keeps the cookies fresh.
 */
export function AuthLink({
  solid,
  className,
  onNavigate,
}: {
  solid: boolean;
  className?: string;
  onNavigate?: () => void;
}) {
  const [signedIn, setSignedIn] = useState(false);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) return;

    let active = true;
    let unsubscribe: (() => void) | undefined;

    try {
      const supabase = createClient();

      void (async () => {
        try {
          const result = await supabase.auth.getClaims();
          if (active) setSignedIn(Boolean(result?.data?.claims));
        } catch {
          // Keep the default signed-out label if the check fails.
        }
      })();

      const { data } = supabase.auth.onAuthStateChange(
        (_event: AuthChangeEvent, session: Session | null) => {
          setSignedIn(Boolean(session));
        },
      );

      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      // Missing configuration is handled by the auth pages themselves.
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [configured]);

  return (
    <Link
      href={signedIn ? "/account" : "/sign-in"}
      onClick={onNavigate}
      className={cn(
        "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition-colors duration-200",
        solid
          ? "text-ink/75 hover:bg-brand-blue-soft/70 hover:text-heading"
          : "text-white/80 hover:bg-white/10 hover:text-white",
        className,
      )}
    >
      {signedIn ? "My account" : "Sign in"}
    </Link>
  );
}
