import type { ReactNode } from "react";
import Link from "next/link";
import { CloseIcon } from "@/components/ui/icons";

/** Compact modal-style frame used by the court and open-play flows. */
export function FlowFrame({
  children,
  closeHref,
  label,
}: {
  children: ReactNode;
  closeHref: string;
  label: string;
}) {
  return (
    <main className="min-h-svh bg-page sm:flex sm:items-center sm:justify-center sm:bg-brand-navy/80 sm:p-5">
      <div className="flex min-h-svh w-full flex-col bg-page sm:min-h-0 sm:max-h-[94vh] sm:max-w-5xl sm:overflow-hidden sm:rounded-3xl sm:border sm:border-line sm:shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-surface px-5 py-3">
          <p className="text-eyebrow font-bold uppercase text-accent-ink">
            {label}
          </p>
          <Link
            href={closeHref}
            aria-label="Close"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-line bg-surface text-heading transition-colors hover:border-brand-blue/50 hover:bg-brand-blue-soft/60"
          >
            <CloseIcon className="size-4" />
          </Link>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </main>
  );
}
