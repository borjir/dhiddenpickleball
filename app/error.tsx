"use client";

import { Button } from "@/components/ui/button";

/**
 * Replaces Next's built-in "This page couldn't load" screen. The usual cause
 * is a tab that stayed open across a deploy: its submit is sent with a server
 * action id the new build no longer recognises, so the whole page is replaced.
 * A reload moves the tab onto the current build without losing saved work.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-page px-5 py-16">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-raised sm:p-8">
        <p className="text-eyebrow font-bold uppercase text-accent-ink">
          Court reservations
        </p>
        <h1 className="mt-2 text-heading font-semibold text-heading">
          This page needs a reload
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The site was updated while this page was open, so the last request
          could not be completed. Reloading runs the current version — court
          times you already picked stay saved.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Button onClick={() => window.location.reload()}>Reload page</Button>
          <Button variant="secondary" onClick={reset}>
            Try again
          </Button>
        </div>
        {error.digest ? (
          <p className="mt-5 text-caption text-muted">
            Reference for the club: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
