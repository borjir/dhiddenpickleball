"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GuestQrCode } from "@/components/guest/guest-qr";
import { PaymentProofForm } from "@/components/payment/payment-proof-form";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { PaymentInstructions } from "@/components/ui/payment-instructions";
import { StatusPair } from "@/components/ui/status-pair";
import { ArrowRightIcon, ClockIcon, CopyIcon } from "@/components/ui/icons";
import {
  bookingStatusMeta,
  formatBookingDate,
  formatBookingTimeRange,
  formatDateTime,
  formatPeso,
  isUpcomingRange,
  paymentStatusMeta,
  type BookingGroupConfirmation,
} from "@/lib/bookings";
import { PAYMENT_DETAILS } from "@/lib/payment";

function formatHoldRemaining(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function BookingGroupConfirmation({
  group,
  onProofSubmitted,
}: {
  group: BookingGroupConfirmation & { fullName: string; mobile: string };
  onProofSubmitted: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [holdSeconds, setHoldSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (
      group.paymentStatus !== "unpaid" ||
      group.status !== "pending" ||
      !group.holdExpiresAt
    ) {
      return;
    }

    const deadline = Date.parse(group.holdExpiresAt);
    if (!Number.isFinite(deadline)) return;

    const tick = () =>
      setHoldSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));

    const initialTick = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(timer);
    };
  }, [group.holdExpiresAt, group.paymentStatus, group.status]);

  const status = bookingStatusMeta(group.status);
  const payment = paymentStatusMeta(group.paymentStatus);
  const holdExpired =
    group.status === "pending" &&
    group.paymentStatus === "unpaid" &&
    holdSeconds === 0;
  const holdLabel =
    holdSeconds === null
      ? "—"
      : holdExpired
        ? "Expired"
        : formatHoldRemaining(holdSeconds);
  const proofClosed = group.paymentStatus !== "unpaid";
  const allUpcoming = group.items.every((item) =>
    isUpcomingRange(item.startsAt, group.status),
  );
  const canSubmitProof = allUpcoming && !holdExpired && !proofClosed;

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(group.reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-6">
      <Alert
        variant={holdExpired ? "error" : proofClosed ? "success" : "success"}
        eyebrow={
          holdExpired
            ? "Hold ended"
            : proofClosed
              ? "Proof submitted"
              : "Reservation held"
        }
        title={
          holdExpired
            ? "The 15-minute hold has ended"
            : proofClosed
              ? "Your reservation is confirmed"
              : "Your court times are on hold"
        }
      >
        {holdExpired ? (
          <>
            The hold may have been released. If you already paid, contact the
            club with reference <strong>{group.reference}</strong> before sending
            anything else.
          </>
        ) : proofClosed ? (
          <>
            Your screenshot is recorded. Payment stays{" "}
            <strong>awaiting staff verification</strong> until the transfer is
            checked.
          </>
        ) : (
          <>
            Keep the reference. The hold ends at{" "}
            <strong>{formatDateTime(group.holdExpiresAt)}</strong>. Staff verify
            your payment separately.
          </>
        )}
      </Alert>

      <GuestQrCode
        reference={group.reference}
        mobile={group.mobile}
        fullName={group.fullName}
        autoDownload
      />

      <p className="text-caption leading-relaxed text-muted">
        Use the QR code, reference, and mobile number to check this booking
        later. No account needed. If you gave an email, we only use it for
        booking updates.
      </p>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <div className="relative overflow-hidden bg-brand-navy px-5 py-7 text-white sm:px-7">
          <div
            aria-hidden="true"
            className="court-grid absolute inset-0 opacity-40"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-md">
              <p className="text-eyebrow font-bold uppercase text-brand-yellow">
                Reservation reference
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h3 className="font-mono text-2xl font-bold tracking-[0.08em] text-white">
                  {group.reference}
                </h3>
                <button
                  type="button"
                  onClick={copyReference}
                  className="inline-flex size-10 items-center justify-center rounded-lg border border-white/20 text-white/80 transition-colors hover:border-white/40 hover:text-white"
                  aria-label="Copy reservation reference"
                >
                  <CopyIcon className="size-4" />
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                {group.items.length}{" "}
                {group.items.length === 1 ? "court time" : "court times"} · one
                payment for the full reservation
              </p>
              <p
                className="mt-1 text-xs font-semibold text-brand-yellow"
                role="status"
                aria-live="polite"
              >
                {copied
                  ? "Reference copied."
                  : "Use this reference when you contact the club."}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {group.paymentStatus === "unpaid" ? (
                <div className="rounded-xl border border-white/15 bg-white/[0.07] px-4 py-3 text-right">
                  <p className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-white/50">
                    {holdExpired ? "Hold ended" : "Hold expires in"}
                  </p>
                  <p
                    className={`mt-1 font-mono text-2xl font-bold tabular-nums ${
                      holdExpired ? "text-white" : "text-brand-yellow"
                    }`}
                    role="timer"
                  >
                    {holdLabel}
                  </p>
                  <p className="mt-1 text-[0.625rem] text-white/40">
                    {holdExpired ? "Slots no longer held" : "15-minute hold"}
                  </p>
                </div>
              ) : null}
              <div className="rounded-xl border border-white/15 bg-white/[0.07] px-4 py-3 text-right">
                <p className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-white/50">
                  Total
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-brand-yellow">
                  {formatPeso(group.amountPhp)}
                </p>
                <p className="mt-1 text-[0.625rem] text-white/40">
                  {group.items.length}{" "}
                  {group.items.length === 1 ? "court time" : "court times"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <StatusPair booking={status} payment={payment} />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {group.items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-line bg-page/50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-heading">
                      {formatBookingDate(item.startsAt)}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      {formatBookingTimeRange(item.startsAt, item.endsAt)}
                    </p>
                  </div>
                  <Badge variant="info">{item.courtName}</Badge>
                </div>
                <p className="mt-2 border-t border-line pt-2 text-caption text-muted">
                  {item.durationMinutes} minutes ·{" "}
                  <span className="font-semibold text-ink">
                    {formatPeso(item.amountPhp)}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          <PaymentInstructions
            amountLabel={formatPeso(group.amountPhp)}
            reference={group.reference}
            methodLabel={PAYMENT_DETAILS.methodLabel}
            title="Pay with GCash"
            badgeLabel={PAYMENT_DETAILS.isTest ? "Test" : "GCash"}
            badgeVariant={PAYMENT_DETAILS.isTest ? "warning" : "success"}
            qrSrc={PAYMENT_DETAILS.qrSrc}
            qrAlt={PAYMENT_DETAILS.qrAlt}
            qrWidth={PAYMENT_DETAILS.qrWidth}
            qrHeight={PAYMENT_DETAILS.qrHeight}
            qrCaption={
              PAYMENT_DETAILS.isTest
                ? "Project owner test account. The club's official GCash QR is still pending."
                : undefined
            }
            qrDownloadName={PAYMENT_DETAILS.qrDownloadName}
            note={
              PAYMENT_DETAILS.isTest
                ? PAYMENT_DETAILS.testNote
                : "Pay the exact total, keep the group reference with the transfer, and upload one GCash screenshot before the hold ends."
            }
          />

          {canSubmitProof ? (
            <PaymentProofForm
              reference={group.reference}
              mobile={group.mobile}
              timingNote="before the hold ends"
              onSubmitted={onProofSubmitted}
            />
          ) : null}
        </div>

        <aside className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <p className="text-eyebrow font-bold uppercase text-accent-ink">
              Reservation total
            </p>
            <p className="mt-2 font-display text-3xl font-extrabold tracking-[-0.03em] text-heading">
              {formatPeso(group.amountPhp)}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Covers all {group.items.length}{" "}
              {group.items.length === 1 ? "court time" : "court times"} in this
              reservation.
            </p>
            <div className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-caption text-muted">
              <ClockIcon className="size-4 text-accent-ink" />
              {group.items.length} court{" "}
              {group.items.length === 1 ? "time" : "times"} held together
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <h3 className="text-heading font-semibold text-heading">
              What happens next
            </h3>
            <ol className="mt-4 space-y-3">
              {[
                "Pay the exact total with GCash.",
                "Upload one screenshot before the hold ends.",
                "Staff verify the transfer. Check this booking anytime with your reference and mobile.",
              ].map((item, index) => (
                <li
                  key={item}
                  className="flex gap-3 text-sm leading-relaxed text-muted"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line bg-page text-[0.625rem] font-bold">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </section>

          <div className="flex flex-col gap-2">
            <Link
              href={`/lookup?reference=${encodeURIComponent(group.reference)}#mobile=${encodeURIComponent(group.mobile)}`}
              className={buttonClasses({ variant: "primary", className: "w-full" })}
            >
              Check reservation
              <ArrowRightIcon className="size-4" />
            </Link>
            <a
              href="/book"
              className={buttonClasses({ variant: "secondary", className: "w-full" })}
            >
              Book another time
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
