import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { DetailRow } from "@/components/account/detail-row";
import { PaymentProofForm } from "@/components/account/payment-proof-form";
import { ConfigNotice } from "@/components/auth/config-notice";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { PaymentInstructions } from "@/components/ui/payment-instructions";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/ui/icons";
import {
  bookingCourtName,
  bookingPaymentDescription,
  bookingStatusMeta,
  formatBookingDate,
  formatBookingTimeRange,
  formatDateTime,
  formatPeso,
  isHoldExpired,
  isOpenPlayBooking,
  isUpcomingBooking,
  paymentStatusMeta,
  type AccountBooking,
} from "@/lib/bookings";
import { CLUB } from "@/lib/club";
import { PAYMENT_DETAILS } from "@/lib/payment";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type PaymentRecord = {
  id: string;
  method: "gcash" | "maya" | "bank_transfer" | "cash" | "test";
  status: string;
  amount_php: number;
  transaction_reference: string | null;
  proof_path: string | null;
  submitted_at: string | null;
  rejection_reason: string | null;
};

type BookingDetail = AccountBooking & {
  confirmed_at: string | null;
  source: "online" | "walk_in" | "staff";
};

type BookingPageProps = {
  params: Promise<{ reference: string }>;
};

export async function generateMetadata({
  params,
}: BookingPageProps): Promise<Metadata> {
  const { reference } = await params;

  return {
    title: `Booking ${reference.toUpperCase()}`,
    description: "View a booking on your D-Hidden account.",
    robots: { index: false, follow: false },
  };
}

function BookingStatusNotice({ booking }: { booking: BookingDetail }) {
  const openPlay = isOpenPlayBooking(booking);

  switch (booking.status) {
    case "pending":
      return (
        <Alert
          variant="warning"
          className="mt-6"
          eyebrow="Action needed"
          title="This booking is not confirmed yet"
        >
          <p>
            The slot is held until{" "}
            <strong>{formatDateTime(booking.hold_expires_at)}</strong>. Pay and
            submit proof in that window. If the hold has already expired,
            contact the club before sending anything.
          </p>
        </Alert>
      );
    case "confirmed":
      return (
        <Alert
          variant="success"
          className="mt-6"
          eyebrow="Confirmed"
          title={openPlay ? "Your place is reserved" : "Your court is reserved"}
        >
          <p>
            Arrive a few minutes before your start time.{" "}
            {booking.payment_status === "paid"
              ? "Your payment has been verified."
              : "The payment status is shown below."}
          </p>
        </Alert>
      );
    case "cancelled":
      return (
        <Alert
          variant="warning"
          className="mt-6"
          eyebrow="Cancelled"
          title="This booking was cancelled"
        >
          <p>
            {formatDateTime(booking.cancelled_at)}
            {booking.cancellation_reason
              ? ` — ${booking.cancellation_reason}`
              : "."}{" "}
            Contact the club if you have a question about a refund or a new
            time.
          </p>
        </Alert>
      );
    case "completed":
      return (
        <Alert
          variant="info"
          className="mt-6"
          eyebrow="Completed"
          title={openPlay ? "This session has passed" : "This court time has passed"}
        >
          <p>Thanks for playing at D-Hidden. This booking is kept for your history.</p>
        </Alert>
      );
    case "no_show":
      return (
        <Alert
          variant="warning"
          className="mt-6"
          eyebrow="No-show"
          title="This booking was recorded as a no-show"
        >
          <p>
            Contact the club if you believe this is incorrect. No-show and late
            arrival rules are in the booking policy.
          </p>
        </Alert>
      );
  }
}

function NotFoundLike() {
  return (
    <AccountShell>
      <div className="mt-8 max-w-2xl">
        <Link
          href="/account"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent-ink"
        >
          <ArrowLeftIcon className="size-4" />
          Back to account
        </Link>
        <Alert
          variant="warning"
          className="mt-4"
          eyebrow="Booking not available"
          title="We could not load this booking"
        >
          <p>
            Refresh the page and try again. If it keeps failing, contact the
            club with your booking reference.
          </p>
        </Alert>
      </div>
    </AccountShell>
  );
}

function BookingSkeleton() {
  return (
    <AccountShell>
      <div className="mt-8 space-y-4" aria-hidden="true">
        <div className="skeleton h-4 w-28 rounded" />
        <div className="skeleton h-12 w-72 max-w-full rounded-lg" />
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="skeleton h-80 rounded-2xl" />
          <div className="space-y-5">
            <div className="skeleton h-56 rounded-2xl" />
            <div className="skeleton h-56 rounded-2xl" />
          </div>
        </div>
      </div>
    </AccountShell>
  );
}

export default function BookingPage({ params }: BookingPageProps) {
  return (
    <Suspense fallback={<BookingSkeleton />}>
      <BookingPanel params={params} />
    </Suspense>
  );
}

async function BookingPanel({ params }: BookingPageProps) {
  const { reference } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <AccountShell>
        <div className="mt-8">
          <ConfigNotice />
        </div>
      </AccountShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(
      `/sign-in?next=${encodeURIComponent(
        `/account/bookings/${reference}`,
      )}&notice=session-expired`,
    );
  }

  const normalizedReference = reference.trim().toUpperCase();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
        id,
        reference,
        starts_at,
        ends_at,
        duration_minutes,
        status,
        payment_status,
        amount_php,
        hold_expires_at,
        confirmed_at,
        cancelled_at,
        cancellation_reason,
        created_at,
        source,
        group_id,
        booking_group:booking_groups(reference),
        service:services(name, code),
        court_reservations(court:courts(name, slug)),
        open_play_registrations(session:open_play_sessions(skill_level))
      `,
    )
    .eq("reference", normalizedReference)
    .eq("player_id", user.id)
    .maybeSingle();

  if (error) return <NotFoundLike />;
  if (!data) notFound();

  const booking = data as unknown as BookingDetail;

  if (booking.group_id && booking.booking_group?.reference) {
    redirect(
      `/account/bookings/group/${encodeURIComponent(booking.booking_group.reference)}`,
    );
  }

  const status = bookingStatusMeta(booking.status);
  const payment = paymentStatusMeta(booking.payment_status);
  const openPlay = isOpenPlayBooking(booking);

  const { data: latestPaymentRow } = await supabase
    .from("payments")
    .select(
      "id, method, status, amount_php, transaction_reference, proof_path, submitted_at, rejection_reason",
    )
    .eq("booking_id", booking.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestPayment = latestPaymentRow as PaymentRecord | null;
  let proofUrl: string | null = null;

  if (latestPayment?.proof_path) {
    const { data: signedProof } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(latestPayment.proof_path, 600);
    proofUrl = signedProof?.signedUrl ?? null;
  }

  const holdExpired = isHoldExpired(booking);
  const paymentClosed = [
    "awaiting_verification",
    "paid",
    "rejected",
    "refund_pending",
    "partially_refunded",
    "refunded",
  ].includes(booking.payment_status);
  const canSubmitProof =
    isUpcomingBooking(booking) && !holdExpired && !paymentClosed;

  return (
    <AccountShell>
      <div className="mt-8">
        <Link
          href="/account"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent-ink transition-colors hover:text-heading"
        >
          <ArrowLeftIcon className="size-4" />
          Back to account
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-eyebrow font-bold uppercase text-accent-ink">
              Booking
            </p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-0.03em] text-heading sm:text-5xl">
              {bookingCourtName(booking)}
            </h1>
            <p className="mt-2 font-mono text-sm font-semibold tracking-[0.08em] text-muted">
              {booking.reference}
            </p>
          </div>
          <Badge variant={status.variant} dot className="text-sm">
            {status.label}
          </Badge>
        </div>

        <BookingStatusNotice booking={booking} />

        <div className="mt-7 grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-7">
            <h2 className="font-display text-xl font-bold text-heading">
              Session details
            </h2>
            <dl className="mt-4">
              <DetailRow label="Date">
                {formatBookingDate(booking.starts_at)}
              </DetailRow>
              <DetailRow label="Time">
                {formatBookingTimeRange(booking.starts_at, booking.ends_at)}
              </DetailRow>
              <DetailRow label="Duration">
                {booking.duration_minutes} minutes
              </DetailRow>
              <DetailRow label={openPlay ? "Session" : "Court"}>
                {bookingCourtName(booking)}
              </DetailRow>
              <DetailRow label="Reference">
                <span className="font-mono tracking-[0.08em]">
                  {booking.reference}
                </span>
              </DetailRow>
              <DetailRow label={openPlay ? "Registered" : "Requested"}>
                {formatDateTime(booking.created_at ?? null)}
              </DetailRow>
              {booking.confirmed_at ? (
                <DetailRow label="Confirmed">
                  {formatDateTime(booking.confirmed_at)}
                </DetailRow>
              ) : null}
              {booking.cancelled_at ? (
                <DetailRow label="Cancelled">
                  {formatDateTime(booking.cancelled_at)}
                </DetailRow>
              ) : null}
            </dl>
          </section>

          <div className="space-y-5">
            <section className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-eyebrow font-bold uppercase text-accent-ink">
                    Payment
                  </p>
                  <h2 className="mt-1 font-display text-xl font-bold text-heading">
                    Booking total
                  </h2>
                </div>
                <Badge variant={payment.variant} dot>
                  {payment.label}
                </Badge>
              </div>
              <p className="mt-4 font-display text-3xl font-extrabold tracking-[-0.03em] text-heading">
                {formatPeso(booking.amount_php)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {bookingPaymentDescription(booking.payment_status)}
              </p>
              <p className="mt-4 border-t border-line pt-4 text-caption leading-relaxed text-muted">
                Club staff verify the actual incoming transfer. This page never
                marks a payment as paid automatically.
              </p>
            </section>

            {canSubmitProof ? (
              <>
                <PaymentInstructions
                  amountLabel={formatPeso(booking.amount_php)}
                  reference={booking.reference}
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
                      : openPlay
                        ? "Pay the exact amount, keep the booking reference with the transfer, and upload your GCash screenshot before the session starts."
                        : "Pay the exact amount, keep the booking reference with the transfer, and upload your GCash screenshot before the hold ends."
                  }
                />

                <PaymentProofForm
                  bookingId={booking.id}
                  reference={booking.reference}
                  timingNote={
                    openPlay ? "before the session starts" : "before the hold ends"
                  }
                />
              </>
            ) : null}

            {latestPayment && !canSubmitProof ? (
              <section
                aria-labelledby="submitted-proof"
                className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-7"
              >
                <p className="text-eyebrow font-bold uppercase text-accent-ink">
                  Payment proof
                </p>
                <h2
                  id="submitted-proof"
                  className="mt-1 font-display text-xl font-bold text-heading"
                >
                  {booking.payment_status === "paid"
                    ? "Payment verified"
                    : booking.payment_status === "rejected"
                      ? "Proof not accepted"
                      : "Proof submitted"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {booking.payment_status === "paid"
                    ? "Staff have confirmed the incoming transfer."
                    : booking.payment_status === "rejected"
                      ? (latestPayment.rejection_reason ??
                        "Contact the club for the next step. Proof resubmission is not available in the MVP.")
                      : `Submitted ${formatDateTime(latestPayment.submitted_at)}. Staff still need to verify the actual transfer before this is marked paid.`}
                </p>
                {latestPayment.transaction_reference ? (
                  <p className="mt-3 text-caption text-muted">
                    Transaction reference:{" "}
                    <span className="font-mono text-heading">
                      {latestPayment.transaction_reference}
                    </span>
                  </p>
                ) : null}
                {proofUrl ? (
                  <a
                    href={proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent-ink"
                  >
                    View submitted proof
                    <ArrowRightIcon className="size-4" />
                  </a>
                ) : null}
              </section>
            ) : null}

            <section className="rounded-2xl border border-line bg-brand-blue-soft/50 p-6 shadow-card">
              <p className="text-eyebrow font-bold uppercase text-accent-ink">
                Changes
              </p>
              <h2 className="mt-1 font-display text-xl font-bold text-heading">
                Cancel or move this booking
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {openPlay
                  ? "Contact the club before the session starts to cancel or change your place. Self-service changes are not available."
                  : "Contact the club at least 24 hours before court time. Self-service changes are not available."}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <a
                  href={CLUB.phoneHref}
                  className={buttonClasses({
                    variant: "secondary",
                    className: "w-full",
                  })}
                >
                  Call {CLUB.phoneDisplay}
                </a>
                <a
                  href={`mailto:${CLUB.email}`}
                  className={buttonClasses({
                    variant: "secondary",
                    className: "w-full",
                  })}
                >
                  Email the club
                </a>
              </div>
              <Link
                href="/policies/booking"
                className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent-ink"
              >
                Read the booking policy
                <ArrowRightIcon className="size-4" />
              </Link>
            </section>
          </div>
        </div>
      </div>
    </AccountShell>
  );
}
