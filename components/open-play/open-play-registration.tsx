"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  registerForOpenPlay,
  type OpenPlayRegistrationResult,
} from "@/app/open-play/actions";
import { PaymentProofForm } from "@/components/account/payment-proof-form";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { PaymentInstructions } from "@/components/ui/payment-instructions";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  WalletIcon,
} from "@/components/ui/icons";
import {
  formatBookingDate,
  formatBookingTimeRange,
  formatPeso,
  paymentStatusMeta,
  type PaymentStatus,
} from "@/lib/bookings";
import {
  isOpenPlaySessionFull,
  openPlayLevelLabel,
  openPlaySpotsRemaining,
  type OpenPlaySession,
} from "@/lib/open-play";
import { PAYMENT_DETAILS } from "@/lib/payment";

type Viewer = {
  email: string;
  fullName: string;
  verified: boolean;
};

type RegistrationState =
  | { status: "idle" }
  | OpenPlayRegistrationResult;

function formatPaymentWindow(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function OpenPlayRegistration({
  session,
  viewer,
  existingReference,
  isPast,
  signInNext,
}: {
  session: OpenPlaySession;
  viewer: Viewer | null;
  existingReference: string | null;
  isPast: boolean;
  signInNext?: string;
}) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<RegistrationState>({ status: "idle" });
  const [registration, setRegistration] = useState<
    Extract<OpenPlayRegistrationResult, { status: "success" }>["registration"] | null
  >(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [paymentSeconds, setPaymentSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!registration || paymentStatus !== "unpaid") return;

    const deadline = Date.parse(registration.createdAt) + 15 * 60 * 1000;
    if (!Number.isFinite(deadline)) return;

    const tick = () =>
      setPaymentSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    const initialTick = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);

    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(timer);
    };
  }, [paymentStatus, registration]);

  const full = isOpenPlaySessionFull(session);
  const remaining = openPlaySpotsRemaining(session);
  const signInHref = `/sign-in?next=${encodeURIComponent(
    signInNext ?? `/open-play/${session.id}`,
  )}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!termsAccepted) {
      setState({
        status: "error",
        code: "invalid",
        message: "Accept the booking terms before reserving a place.",
      });
      return;
    }

    setPending(true);
    setState({ status: "idle" });

    const result = await registerForOpenPlay({
      sessionId: session.id,
      termsAccepted,
    });

    setPending(false);

    if (result.status === "success") {
      setRegistration(result.registration);
      setPaymentStatus(result.registration.paymentStatus);
      setState(result);
      return;
    }

    setState(result);
  }

  if (registration && paymentStatus) {
    const payment = paymentStatusMeta(paymentStatus);

    return (
      <div id="reserve" className="space-y-5">
        <Alert
          variant="success"
          eyebrow="Place reserved"
          title="Your open-play place is confirmed"
        >
          <p>
            {formatBookingDate(registration.startsAt)} ·{" "}
            {formatBookingTimeRange(registration.startsAt, registration.endsAt)}{" "}
            · {openPlayLevelLabel(session.skillLevel)}. Keep reference{" "}
            <strong>{registration.reference}</strong>. Send your GCash proof
            within the 15-minute payment window.
          </p>
        </Alert>

        {paymentStatus === "unpaid" ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-blue/35 bg-brand-blue-soft/35 p-4">
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-accent-ink">
                Payment window
              </p>
              <p className="mt-1 text-sm text-muted">
                {paymentSeconds === 0
                  ? "The 15-minute window has ended. Contact the club before sending payment."
                  : "Send your GCash proof within 15 minutes of reserving."}
              </p>
            </div>
            <p
              role="timer"
              aria-live="polite"
              className="font-mono text-2xl font-bold tabular-nums text-heading"
            >
              {paymentSeconds === null
                ? "15:00"
                : paymentSeconds === 0
                  ? "Ended"
                  : formatPaymentWindow(paymentSeconds)}
            </p>
          </div>
        ) : null}

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-eyebrow font-bold uppercase text-accent-ink">
                Your place
              </p>
              <h2 className="mt-1 font-display text-xl font-bold text-heading">
                {openPlayLevelLabel(session.skillLevel)} open play
              </h2>
            </div>
            <Badge variant={payment.variant} dot>
              {payment.label}
            </Badge>
          </div>
          <dl className="mt-4 divide-y divide-line text-sm">
            <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0">
              <dt className="text-muted">Reference</dt>
              <dd className="font-mono text-xs font-semibold text-heading">
                {registration.reference}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-muted">Date</dt>
              <dd className="text-right font-semibold text-heading">
                {formatBookingDate(registration.startsAt)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-muted">Time</dt>
              <dd className="text-right font-semibold text-heading">
                {formatBookingTimeRange(
                  registration.startsAt,
                  registration.endsAt,
                )}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-muted">Amount</dt>
              <dd className="text-right font-semibold text-heading">
                {formatPeso(registration.amountPhp)}
              </dd>
            </div>
          </dl>
          <Link
            href={`/account/bookings/${encodeURIComponent(
              registration.reference,
            )}`}
            className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent-ink"
          >
            View this booking
            <ArrowRightIcon className="size-4" />
          </Link>
        </section>

        {paymentStatus === "awaiting_verification" ? (
          <Alert
            variant="info"
            eyebrow="Proof submitted"
            title="Payment is awaiting staff verification"
          >
            <p>
              The club still needs to check the actual GCash transfer before the
              payment is marked paid.
            </p>
          </Alert>
        ) : (
          <>
            <PaymentInstructions
              amountLabel={formatPeso(registration.amountPhp)}
              reference={registration.reference}
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
                  : "Pay the exact amount, keep the reference with the transfer, and upload your GCash screenshot before the session starts."
              }
            />

            <PaymentProofForm
              bookingId={registration.id}
              reference={registration.reference}
              timingNote="within the 15-minute payment window"
              onSubmitted={() => setPaymentStatus("awaiting_verification")}
            />
          </>
        )}
      </div>
    );
  }

  if (existingReference) {
    return (
      <div id="reserve" className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <span className="grid size-11 place-items-center rounded-full bg-success-soft text-success">
          <CheckCircleIcon className="size-5" />
        </span>
        <h2 className="mt-3 font-display text-xl font-bold text-heading">
          You already have a place
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          This account is registered for this session. Open the booking to see
          its payment status and upload proof.
        </p>
        <Link
          href={`/account/bookings/${encodeURIComponent(existingReference)}`}
          className={buttonClasses({ className: "mt-4 w-full" })}
        >
          View my booking
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    );
  }

  if (session.status !== "scheduled" || isPast) {
    return (
      <div id="reserve">
        <Alert
          variant="warning"
          eyebrow={session.status === "cancelled" ? "Cancelled" : "Session ended"}
          title={
            session.status === "cancelled"
              ? "This open-play session was cancelled"
              : "This session is no longer open"
          }
        >
          <p>
            Contact the club if you need help finding another session or checking
            a payment.
          </p>
        </Alert>
      </div>
    );
  }

  if (full) {
    return (
      <div id="reserve" className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <Badge variant="danger" dot>
          Full
        </Badge>
        <h2 className="mt-3 font-display text-xl font-bold text-heading">
          This session is full
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          All {session.capacity} places are taken. Choose another session from
          the open-play schedule. No waitlist is available.
        </p>
        <Link
          href="/open-play"
          className={buttonClasses({ variant: "secondary", className: "mt-4 w-full" })}
        >
          See other sessions
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div id="reserve" className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-eyebrow font-bold uppercase text-accent-ink">
            Reserve a place
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-heading">
            {openPlayLevelLabel(session.skillLevel)} open play
          </h2>
        </div>
        <Badge variant="success" dot>
          {remaining} left
        </Badge>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-muted">
        One place per player. The place is reserved immediately; payment remains
        separate until staff verify the transfer.
      </p>

      <dl className="mt-4 divide-y divide-line text-sm">
        <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0">
          <dt className="flex items-center gap-2 text-muted">
            <ClockIcon className="size-4 text-brand-lime" />
            Session
          </dt>
          <dd className="text-right font-semibold text-heading">
            {formatBookingTimeRange(session.startsAt, session.endsAt)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="flex items-center gap-2 text-muted">
            <WalletIcon className="size-4 text-brand-lime" />
            Price
          </dt>
          <dd className="text-right font-semibold text-heading">
            {formatPeso(session.amountPhp)} per player
          </dd>
        </div>
      </dl>

      {state.status === "error" ? (
        <Alert
          variant="error"
          className="mt-4"
          role="alert"
          eyebrow="Not reserved"
          title="We could not reserve your place"
        >
          <p>{state.message}</p>
          {state.code === "session-expired" ? (
            <p className="mt-2">
              <Link
                href={signInHref}
                className="font-semibold text-accent-ink underline-offset-4 hover:underline"
              >
                Sign in again
              </Link>{" "}
              to continue.
            </p>
          ) : null}
          {state.code === "session-full" ? (
            <p className="mt-2">
              <Link
                href="/open-play"
                className="font-semibold text-accent-ink underline-offset-4 hover:underline"
              >
                See other sessions
              </Link>
              .
            </p>
          ) : null}
          {state.code === "already-registered" ? (
            <p className="mt-2">
              <Link
                href="/account"
                className="font-semibold text-accent-ink underline-offset-4 hover:underline"
              >
                Open your account
              </Link>{" "}
              to see the booking.
            </p>
          ) : null}
        </Alert>
      ) : null}

      {!viewer ? (
        <div className="mt-4 rounded-xl border border-line bg-page/50 p-4">
          <p className="text-sm leading-relaxed text-muted">
            Sign in with a verified email to reserve a place. You will come back
            to this session.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link href={signInHref} className={buttonClasses({ className: "w-full" })}>
              Sign in to reserve
              <ArrowRightIcon className="size-4" />
            </Link>
            <Link
              href={`/sign-up?next=${encodeURIComponent(`/open-play/${session.id}`)}`}
              className={buttonClasses({
                variant: "secondary",
                className: "w-full",
              })}
            >
              Create an account
            </Link>
          </div>
        </div>
      ) : null}

      {viewer && !viewer.verified ? (
        <Alert
          variant="warning"
          className="mt-4"
          eyebrow="Email not verified"
          title="Verify your email before reserving"
        >
          <p>
            Check your inbox for the confirmation link, then return to this
            session. Signed in as {viewer.email}.
          </p>
        </Alert>
      ) : null}

      {viewer?.verified ? (
        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          <p className="rounded-lg border border-line bg-page/50 px-3.5 py-2.5 text-caption leading-relaxed text-muted">
            Reserving as{" "}
            <strong className="text-heading">
              {viewer.fullName.trim() || viewer.email}
            </strong>
            . Your account name and email are used for the club roster.
          </p>

          <label className="flex items-start gap-3 text-sm leading-relaxed text-ink/80">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded border-line text-brand-blue focus:ring-brand-blue/20"
            />
            <span>
              I accept the{" "}
              <Link
                href="/policies/booking"
                className="font-semibold text-accent-ink underline-offset-4 hover:underline"
              >
                booking policy
              </Link>{" "}
              and{" "}
              <Link
                href="/policies/payments"
                className="font-semibold text-accent-ink underline-offset-4 hover:underline"
              >
                payment policy
              </Link>
              .
            </span>
          </label>

          <Button
            type="submit"
            loading={pending}
            disabled={pending || !termsAccepted}
            className="w-full"
          >
            {pending ? "Reserving place" : "Reserve my place"}
            <ArrowRightIcon className="size-4" />
          </Button>
          <p className="text-caption leading-relaxed text-muted">
            The reservation is confirmed immediately. Pay by GCash and send proof
            before the session starts; the payment stays awaiting staff
            verification.
          </p>
        </form>
      ) : null}
    </div>
  );
}
