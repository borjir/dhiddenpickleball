import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { PaymentProofForm } from "@/components/account/payment-proof-form";
import { ConfigNotice } from "@/components/auth/config-notice";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { PaymentInstructions } from "@/components/ui/payment-instructions";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/ui/icons";
import {
  bookingPaymentDescription,
  bookingStatusMeta,
  formatBookingDate,
  formatBookingTimeRange,
  formatDateTime,
  formatPeso,
  isHoldExpired,
  isUpcomingRange,
  paymentStatusMeta,
  type BookingStatus,
  type PaymentStatus,
} from "@/lib/bookings";
import { CLUB } from "@/lib/club";
import { PAYMENT_DETAILS } from "@/lib/payment";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type GroupRecord = {
  id: string;
  reference: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  amount_php: number;
  hold_expires_at: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
};

type GroupBooking = {
  id: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  amount_php: number;
  status: BookingStatus;
  court_reservations: Array<{ court: { name: string; slug: string } | null }> | null;
};

type PaymentRecord = {
  id: string;
  amount_php: number;
  transaction_reference: string | null;
  proof_path: string | null;
  submitted_at: string | null;
  rejection_reason: string | null;
};

type GroupPageProps = {
  params: Promise<{ reference: string }>;
};

export async function generateMetadata({
  params,
}: GroupPageProps): Promise<Metadata> {
  const { reference } = await params;

  return {
    title: `Reservation ${reference.toUpperCase()}`,
    description: "View a grouped court reservation on your D-Hidden account.",
    robots: { index: false, follow: false },
  };
}

function GroupSkeleton() {
  return (
    <AccountShell>
      <div className="mt-8 space-y-4" aria-hidden="true">
        <div className="skeleton h-4 w-28 rounded" />
        <div className="skeleton h-12 w-72 max-w-full rounded-lg" />
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="skeleton h-96 rounded-2xl" />
          <div className="space-y-5">
            <div className="skeleton h-56 rounded-2xl" />
            <div className="skeleton h-56 rounded-2xl" />
          </div>
        </div>
      </div>
    </AccountShell>
  );
}

export default function GroupBookingPage({ params }: GroupPageProps) {
  return (
    <Suspense fallback={<GroupSkeleton />}>
      <GroupPanel params={params} />
    </Suspense>
  );
}

async function GroupPanel({ params }: GroupPageProps) {
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
        `/account/bookings/group/${reference}`,
      )}&notice=session-expired`,
    );
  }

  const normalizedReference = reference.trim().toUpperCase();
  const { data: groupData, error: groupError } = await supabase
    .from("booking_groups")
    .select(
      "id, reference, status, payment_status, amount_php, hold_expires_at, confirmed_at, cancelled_at, cancellation_reason, created_at",
    )
    .eq("reference", normalizedReference)
    .eq("player_id", user.id)
    .maybeSingle();

  if (groupError) {
    return (
      <AccountShell>
        <div className="mt-8 max-w-2xl">
          <Alert
            variant="warning"
            eyebrow="Reservation not loaded"
            title="We could not load this reservation"
          >
            Refresh the page and try again, or contact the club with your
            reference.
          </Alert>
        </div>
      </AccountShell>
    );
  }

  if (!groupData) notFound();

  const group = groupData as GroupRecord;
  const { data: bookingRows } = await supabase
    .from("bookings")
    .select(
      "id, starts_at, ends_at, duration_minutes, amount_php, status, court_reservations(court:courts(name, slug))",
    )
    .eq("group_id", group.id)
    .order("starts_at", { ascending: true });

  const bookings = (bookingRows ?? []) as unknown as GroupBooking[];
  const { data: paymentRow } = await supabase
    .from("payments")
    .select(
      "id, amount_php, transaction_reference, proof_path, submitted_at, rejection_reason",
    )
    .eq("group_id", group.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestPayment = paymentRow as PaymentRecord | null;
  let proofUrl: string | null = null;

  if (latestPayment?.proof_path) {
    const { data: signedProof } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(latestPayment.proof_path, 600);
    proofUrl = signedProof?.signedUrl ?? null;
  }

  const status = bookingStatusMeta(group.status);
  const payment = paymentStatusMeta(group.payment_status);
  const holdExpired = isHoldExpired(group);
  const paymentClosed = [
    "awaiting_verification",
    "paid",
    "rejected",
    "refund_pending",
    "partially_refunded",
    "refunded",
  ].includes(group.payment_status);
  const allUpcoming = bookings.every((booking) =>
    isUpcomingRange(booking.starts_at, booking.status),
  );
  const canSubmitProof =
    allUpcoming && !holdExpired && !paymentClosed && group.status !== "cancelled";

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
              Grouped reservation
            </p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-0.03em] text-heading sm:text-5xl">
              {bookings.length} court {bookings.length === 1 ? "time" : "times"}
            </h1>
            <p className="mt-2 font-mono text-sm font-semibold tracking-[0.08em] text-muted">
              {group.reference}
            </p>
          </div>
          <Badge variant={status.variant} dot className="text-sm">
            {status.label}
          </Badge>
        </div>

        {group.status === "cancelled" ? (
          <Alert
            variant="warning"
            className="mt-6"
            eyebrow="Cancelled"
            title="This reservation was cancelled"
          >
            {formatDateTime(group.cancelled_at)}
            {group.cancellation_reason ? ` — ${group.cancellation_reason}` : "."}{" "}
            Contact the club if you have a question about a refund or a new time.
          </Alert>
        ) : group.status === "pending" ? (
          <Alert
            variant="warning"
            className="mt-6"
            eyebrow="Action needed"
            title="This reservation is on hold"
          >
            Your court times are held until{" "}
            <strong>{formatDateTime(group.hold_expires_at)}</strong>. Pay and
            submit one proof for the full total in that window.
          </Alert>
        ) : (
          <Alert
            variant="success"
            className="mt-6"
            eyebrow="Confirmed"
            title="Your court times are reserved"
          >
            Arrive a few minutes before each start time. The payment status is
            shown below.
          </Alert>
        )}

        <div className="mt-7 grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-heading">
                  Your court times
                </h2>
                <p className="mt-1 text-sm text-muted">
                  One reference and one payment cover this whole reservation.
                </p>
              </div>
              <p className="font-display text-2xl font-bold text-heading">
                {formatPeso(group.amount_php)}
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {bookings.map((booking) => {
                const courtName =
                  booking.court_reservations?.[0]?.court?.name ?? "Court";
                return (
                  <div
                    key={booking.id}
                    className="rounded-xl border border-line bg-page/50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-heading">
                          {formatBookingDate(booking.starts_at)}
                        </p>
                        <p className="mt-0.5 text-sm text-muted">
                          {formatBookingTimeRange(
                            booking.starts_at,
                            booking.ends_at,
                          )}{" "}
                          · {courtName}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-heading">
                        {formatPeso(booking.amount_php)}
                      </span>
                    </div>
                    <p className="mt-2 border-t border-line pt-2 text-caption text-muted">
                      {booking.duration_minutes} minutes
                    </p>
                  </div>
                );
              })}
            </div>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-page/50 p-4">
                <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                  Reserved
                </dt>
                <dd className="mt-1 text-sm font-semibold text-ink">
                  {formatDateTime(group.created_at)}
                </dd>
              </div>
              <div className="rounded-xl border border-line bg-page/50 p-4">
                <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                  {group.status === "pending" ? "Hold ends" : "Slot status"}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-ink">
                  {group.status === "pending"
                    ? formatDateTime(group.hold_expires_at)
                    : group.status === "cancelled"
                      ? "Cancelled"
                      : "Confirmed"}
                </dd>
              </div>
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
                    Reservation total
                  </h2>
                </div>
                <Badge variant={payment.variant} dot>
                  {payment.label}
                </Badge>
              </div>
              <p className="mt-4 font-display text-3xl font-extrabold tracking-[-0.03em] text-heading">
                {formatPeso(group.amount_php)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {bookingPaymentDescription(group.payment_status)}
              </p>
              <p className="mt-4 border-t border-line pt-4 text-caption leading-relaxed text-muted">
                Club staff verify the actual incoming transfer. This page never
                marks a payment as paid automatically.{" "}
                <Link
                  href="/policies/payments"
                  className="font-semibold text-accent-ink underline decoration-brand-blue/40 underline-offset-2 hover:text-brand-blue-strong"
                >
                  Read the payment policy
                </Link>
                .
              </p>
            </section>

            {canSubmitProof ? (
              <>
                <PaymentInstructions
                  amountLabel={formatPeso(group.amount_php)}
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
                      : "Pay the exact total, keep the group reference with the transfer, and upload one screenshot before the hold ends."
                  }
                />
                <PaymentProofForm
                  groupId={group.id}
                  reference={group.reference}
                />
              </>
            ) : null}

            {latestPayment && !canSubmitProof ? (
              <section className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-7">
                <p className="text-eyebrow font-bold uppercase text-accent-ink">
                  Payment proof
                </p>
                <h2 className="mt-1 font-display text-xl font-bold text-heading">
                  {group.payment_status === "paid"
                    ? "Payment verified"
                    : group.payment_status === "rejected"
                      ? "Proof not accepted"
                      : "Proof submitted"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {group.payment_status === "paid"
                    ? "Staff have confirmed the incoming transfer."
                    : group.payment_status === "rejected"
                      ? (latestPayment.rejection_reason ??
                        "Contact the club for the next step.")
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
                Cancel or move this reservation
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Contact the club at least 24 hours before the first court time.
                Self-service changes are not available.
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
                Read the booking and cancellation policy
                <ArrowRightIcon className="size-4" />
              </Link>
            </section>
          </div>
        </div>
      </div>
    </AccountShell>
  );
}
