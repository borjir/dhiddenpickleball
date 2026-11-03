import { cn } from "@/lib/cn";

/**
 * Temporary wordmark used until the official logo file is supplied.
 * This is not a logo proposal; docs/DESIGN_BRIEF.md tracks the missing asset.
 */
export function LogoPlaceholder({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      role="img"
      aria-label="Temporary logo placeholder for Hidden Pickleball Court & Bistro"
      className={cn("inline-flex items-center gap-2.5", className)}
    >
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-md border border-dashed border-brand-navy/35 bg-brand-lime-soft"
      >
        <svg viewBox="0 0 24 24" fill="none" className="size-5">
          <circle
            cx="12"
            cy="12"
            r="8.5"
            stroke="currentColor"
            strokeWidth="1.75"
            className="text-brand-navy"
          />
          <circle cx="9.5" cy="9.5" r="1.1" fill="currentColor" className="text-brand-navy/45" />
          <circle cx="14.5" cy="9.5" r="1.1" fill="currentColor" className="text-brand-navy/45" />
          <circle cx="9.5" cy="14.5" r="1.1" fill="currentColor" className="text-brand-navy/45" />
          <circle cx="14.5" cy="14.5" r="1.1" fill="currentColor" className="text-brand-navy/45" />
        </svg>
      </span>
      {compact ? null : (
        <span aria-hidden="true" className="flex flex-col leading-none">
          <span className="font-display text-[0.95rem] font-extrabold tracking-[0.16em] text-brand-navy">
            HIDDEN
          </span>
          <span className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted">
            Court &amp; Bistro
          </span>
          <span className="mt-1 text-[0.5rem] font-bold uppercase tracking-[0.14em] text-brand-blue/70">
            Logo placeholder
          </span>
        </span>
      )}
    </span>
  );
}
