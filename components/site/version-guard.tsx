"use client";

import { useEffect, useState } from "react";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

/**
 * A tab can stay open across a deploy. Next cannot run a server action whose
 * id came from the replaced build, so a guest who submits from such a tab gets
 * an error page instead of a booking. The page carries the build it was
 * rendered from; this compares it with the build the Worker is serving and
 * offers a reload before anyone taps a button.
 */
export function VersionGuard({ buildId }: { buildId: string | null }) {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    // Without a stamped build there is nothing to compare.
    if (!buildId) return;

    let cancelled = false;

    async function check() {
      try {
        const response = await fetch("/api/version", { cache: "no-store" });
        if (!response.ok) return;

        const data = (await response.json()) as { buildId?: string | null };
        if (!cancelled && data.buildId && data.buildId !== buildId) {
          setStale(true);
        }
      } catch {
        // A failed check is not a reason to interrupt the guest.
      }
    }

    function checkWhenVisible() {
      if (document.visibilityState === "visible") void check();
    }

    void check();
    const timer = window.setInterval(checkWhenVisible, CHECK_INTERVAL_MS);
    // Coming back to a tab is the usual way a stale page gets used again.
    document.addEventListener("visibilitychange", checkWhenVisible);
    window.addEventListener("focus", checkWhenVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", checkWhenVisible);
      window.removeEventListener("focus", checkWhenVisible);
    };
  }, [buildId]);

  if (!stale) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-line bg-elevated px-4 py-3 shadow-raised"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-2.5">
        <p className="text-sm font-medium text-ink">
          This page was open before the site was updated. Reload to keep booking.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-9 items-center rounded-lg bg-brand-blue px-3.5 text-sm font-semibold text-white shadow-card transition-colors duration-200 hover:bg-brand-blue-strong"
        >
          Reload page
        </button>
      </div>
    </div>
  );
}
