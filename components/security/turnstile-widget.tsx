"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// The site key is public by design. The env override keeps staging separate;
// the fallback lets the production widget keep working if the build env is
// missing the value.
const SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
  "0x4AAAAAAF54oP0dhgASYym3";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: "light" | "dark" | "auto";
      size: "normal" | "compact" | "flexible";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstile() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as
      | HTMLScriptElement
      | null;

    if (existing) {
      if (window.turnstile) {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("load")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("load")), {
      once: true,
    });
    document.head.appendChild(script);
  }).catch((error) => {
    scriptPromise = null;
    throw error;
  });

  return scriptPromise;
}

function documentTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/**
 * Renders a Turnstile widget for one form. The token is single-use, so a form
 * that stays open after a failed submit must increment `resetSignal` to load a
 * fresh challenge before the next attempt.
 */
export function TurnstileWidget({
  action,
  onToken,
  resetSignal = 0,
  className,
}: {
  action: string;
  onToken: (token: string | null) => void;
  resetSignal?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const lastResetRef = useRef(resetSignal);
  const [failed, setFailed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    const read = () => setTheme(documentTheme());
    const timer = window.setTimeout(read, 0);
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadTurnstile()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        setFailed(false);

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          action,
          theme,
          size: "flexible",
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => {
            onTokenRef.current(null);
            setFailed(true);
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      const widgetId = widgetIdRef.current;
      widgetIdRef.current = null;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [action, theme]);

  useEffect(() => {
    if (resetSignal === lastResetRef.current) return;
    lastResetRef.current = resetSignal;
    onTokenRef.current(null);
    if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
  }, [resetSignal]);

  return (
    <div className={cn("min-w-0", className)}>
      <div ref={containerRef} />
      {failed ? (
        <p className="mt-2 text-caption leading-relaxed text-danger" role="status">
          The security check could not load. Refresh the page or allow
          challenges.cloudflare.com, then try again.
        </p>
      ) : null}
    </div>
  );
}
