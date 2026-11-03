import Image from "next/image";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export interface PaymentInstructionsProps {
  amountLabel: string;
  reference: string;
  methodLabel: string;
  note?: ReactNode;
  /** Supplied payment QR artwork. Omit to fall back to the labeled placeholder. */
  qrSrc?: string;
  qrAlt?: string;
  /**
   * Marks the image as a stand-in. The overlay band breaks the code so it
   * cannot be scanned, and the caption tells the payer not to send money.
   */
  qrSample?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * Payment instruction shell. When no QR artwork is supplied the block falls
 * back to an explicit placeholder. No real wallet identifier is bundled.
 */
export function PaymentInstructions({
  amountLabel,
  reference,
  methodLabel,
  note,
  qrSrc,
  qrAlt,
  qrSample = false,
  className,
  children,
}: PaymentInstructionsProps) {
  return (
    <section
      aria-label="Payment instructions"
      className={cn(
        "overflow-hidden rounded-lg border border-line bg-surface shadow-card",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-page/70 px-5 py-4">
        <div>
          <p className="text-eyebrow font-bold uppercase text-accent-ink">
            Payment
          </p>
          <h2 className="mt-1 text-heading font-semibold text-heading">
            Complete the request
          </h2>
        </div>
        <Badge variant="yellow">Sample</Badge>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-[11rem_1fr]">
        {qrSrc ? (
          <figure className="m-0">
            <div className="relative overflow-hidden rounded-md border border-line bg-surface">
              <Image
                src={qrSrc}
                alt={qrAlt ?? "Payment QR code"}
                width={1080}
                height={1980}
                sizes="11rem"
                className="h-auto w-full"
              />
              {qrSample ? (
                <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-y border-brand-yellow/60 bg-brand-navy/90 px-1.5 py-1.5 text-center text-[0.5625rem] font-bold uppercase leading-tight tracking-[0.1em] text-brand-yellow">
                  Sample
                  <span aria-hidden="true"> · </span>
                  do not pay
                </p>
              ) : null}
            </div>
            <figcaption className="mt-1.5 text-[0.6875rem] leading-snug text-muted">
              {qrSample
                ? "Stand-in image. The club's real GCash code has not been supplied."
                : "Scan with the GCash app."}
            </figcaption>
          </figure>
        ) : (
          <div
            role="img"
            aria-label="Placeholder for the club's official payment QR code"
            className="grid aspect-square place-items-center rounded-md border-2 border-dashed border-line-strong bg-page p-3 text-center"
          >
            <div>
              <svg
                aria-hidden="true"
                viewBox="0 0 48 48"
                fill="none"
                className="mx-auto size-10 text-line-strong"
              >
                <rect x="4" y="4" width="14" height="14" stroke="currentColor" strokeWidth="2" />
                <rect x="30" y="4" width="14" height="14" stroke="currentColor" strokeWidth="2" />
                <rect x="4" y="30" width="14" height="14" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M30 30h4v4h-4zM38 30h6v6h-6zM30 38h6v6h-6zM40 40h4v4h-4z"
                  fill="currentColor"
                />
              </svg>
              <p className="mt-2 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted">
                QR placeholder
              </p>
              <p className="mt-1 text-[0.6875rem] leading-snug text-muted">
                Official code not supplied
              </p>
            </div>
          </div>
        )}

        <div className="min-w-0">
          <dl className="divide-y divide-line">
            <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0">
              <dt className="text-sm text-muted">Amount</dt>
              <dd className="text-right text-sm font-semibold text-ink">
                {amountLabel}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-sm text-muted">Method</dt>
              <dd className="text-right text-sm font-semibold text-ink">
                {methodLabel}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-sm text-muted">Reference</dt>
              <dd className="text-right font-mono text-xs font-semibold text-heading">
                {reference}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-caption leading-relaxed text-muted">
            Include the reference in the payment note. A payment is not paid
            until staff verifies the actual transfer.
          </p>
          {note ? (
            <p className="mt-2 text-caption leading-relaxed text-muted">
              {note}
            </p>
          ) : null}
        </div>
      </div>

      {children ? (
        <div className="border-t border-line bg-page/40 px-5 py-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}
