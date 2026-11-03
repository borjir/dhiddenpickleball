import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export interface BookingSummaryProps {
  eyebrow?: string;
  title?: string;
  court?: string;
  date?: string;
  time?: string;
  duration?: string;
  priceLabel?: string;
  priceNote?: string;
  sample?: boolean;
  className?: string;
  children?: ReactNode;
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd
        className={cn(
          "text-right text-sm font-semibold",
          value ? "text-ink" : "text-muted/70",
        )}
      >
        {value ?? "Not selected"}
      </dd>
    </div>
  );
}

/**
 * Compact, reusable booking recap. Price copy is passed in so this component
 * never invents a rate or implies that a sample amount is final.
 */
export function BookingSummary({
  eyebrow = "Booking summary",
  title = "Your selection",
  court,
  date,
  time,
  duration,
  priceLabel = "Price pending",
  priceNote = "Rates await client confirmation.",
  sample = false,
  className,
  children,
}: BookingSummaryProps) {
  return (
    <section
      aria-label="Booking summary"
      className={cn(
        "relative overflow-hidden rounded-xl border border-line bg-surface shadow-card",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue via-brand-lime to-brand-yellow opacity-80" />
      <svg
        aria-hidden="true"
        viewBox="0 0 280 120"
        fill="none"
        className="pointer-events-none absolute -right-12 -top-6 w-64 text-brand-blue opacity-[0.07]"
      >
        <rect x="16" y="16" width="248" height="88" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M16 60h248M132 16v88M148 16v88" stroke="currentColor" strokeWidth="2" />
        <circle cx="140" cy="60" r="22" stroke="currentColor" strokeWidth="2" />
      </svg>

      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-eyebrow font-bold uppercase text-accent-ink">
              {eyebrow}
            </p>
            <h2 className="mt-1.5 text-heading font-semibold text-heading">
              {title}
            </h2>
          </div>
          {sample ? <Badge variant="yellow">Sample</Badge> : null}
        </div>

        <dl className="mt-4 divide-y divide-line border-y border-line">
          <SummaryRow label="Court" value={court} />
          <SummaryRow label="Date" value={date} />
          <SummaryRow label="Time" value={time} />
          <SummaryRow label="Duration" value={duration} />
        </dl>

        <div className="mt-4 flex items-end justify-between gap-4" aria-live="polite">
          <span className="pb-1 text-sm font-semibold text-ink">Amount due</span>
          <span className="text-right font-display text-3xl font-extrabold leading-none tracking-tight text-heading">
            {priceLabel}
          </span>
        </div>
        <p className="mt-2 text-caption leading-relaxed text-muted">{priceNote}</p>

        {children ? <div className="mt-5">{children}</div> : null}
      </div>
    </section>
  );
}
