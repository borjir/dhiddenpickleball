"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  registerForOpenPlay,
  type OpenPlayRegistration as Registration,
  type OpenPlayRegistrationResult,
} from "@/app/open-play/actions";
import { GuestQrCode } from "@/components/guest/guest-qr";
import { PaymentProofForm } from "@/components/payment/payment-proof-form";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input, PhoneInput } from "@/components/ui/field";
import { PaymentInstructions } from "@/components/ui/payment-instructions";
import { Stepper } from "@/components/ui/stepper";
import { ArrowRightIcon } from "@/components/ui/icons";
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
import { revealTarget } from "@/lib/scroll";

type RegistrationState =
  | { status: "idle" }
  | OpenPlayRegistrationResult;

const registerSteps = [
  { label: "Choose session" },
  { label: "Your details" },
  { label: "Pay" },
] as const;

function formatPaymentWindow(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function OpenPlayRegistration({
  session,
  isPast,
}: {
  session: OpenPlaySession;
  isPast: boolean;
}) {
  const [values, setValues] = useState({
    fullName: "",
    phone: "",
    email: "",
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [state, setState] = useState<RegistrationState>({ status: "idle" });
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [paymentSeconds, setPaymentSeconds] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // The reserve button sits below the fields, so a rejected submit would
  // otherwise leave its message off-screen on a phone.
  useEffect(() => {
    if (state.status !== "error") return;

    const firstInvalid = formRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );

    revealTarget(firstInvalid ?? document.getElementById("open-play-error"));
  }, [state]);

  // A reserved place replaces the form, so start the guest at the details.
  useEffect(() => {
    if (!registration) return;

    revealTarget(document.getElementById("reserve"), {
      focus: false,
      block: "start",
    });
  }, [registration]);

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

    if (!turnstileToken) {
      setState({
        status: "error",
        code: "invalid",
        message: "Complete the security check below the terms, then try again.",
      });
      revealTarget(document.getElementById("open-play-turnstile"));
      return;
    }

    setPending(true);
    setState({ status: "idle" });

    const result = await registerForOpenPlay({
      sessionId: session.id,
      fullName: values.fullName,
      phone: values.phone,
      email: values.email,
      termsAccepted,
      turnstileToken,
    });

    setPending(false);

    if (result.status === "success") {
      setRegistration(result.registration);
      setPaymentStatus(result.registration.paymentStatus);
      setState(result);
      return;
    }

    // The token is single-use; refresh it before the guest retries.
    setTurnstileToken(null);
    setTurnstileReset((count) => count + 1);
    setState(result);
  }

  if (registration && paymentStatus) {
    const payment = paymentStatusMeta(paymentStatus);

    return (
      <div id="reserve" className="space-y-5">
        <Stepper steps={registerSteps} current={2} />
        <Alert
          variant="success"
          eyebrow="Place reserved"
          title="Your place is reserved"
        >
          <p>
            {formatBookingDate(registration.startsAt)} ·{" "}
            {formatBookingTimeRange(registration.startsAt, registration.endsAt)}{" "}
            · {openPlayLevelLabel(session.skillLevel)}. Keep reference{" "}
            <strong>{registration.reference}</strong> and your mobile number.
          </p>
        </Alert>

        <GuestQrCode
          reference={registration.reference}
          mobile={registration.mobile}
          fullName={registration.fullName}
          autoDownload
        />

        {registration.mobile && registration.fullName ? (
          <p className="text-caption leading-relaxed text-muted">
            You can check this place any time on the{" "}
            <Link
              href={`/lookup?reference=${encodeURIComponent(registration.reference)}#mobile=${encodeURIComponent(registration.mobile)}`}
              className="font-semibold text-accent-ink underline underline-offset-2"
            >
              booking lookup page
            </Link>{" "}
            using the reference and mobile number above.
          </p>
        ) : null}

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
              accountName={PAYMENT_DETAILS.accountName}
              accountNumber={PAYMENT_DETAILS.accountNumber}
              title="Pay with GCash"
              badgeLabel="GCash"
              badgeVariant="success"
              qrSrc={PAYMENT_DETAILS.qrSrc}
              qrAlt={PAYMENT_DETAILS.qrAlt}
              qrWidth={PAYMENT_DETAILS.qrWidth}
              qrHeight={PAYMENT_DETAILS.qrHeight}
              qrDownloadName={PAYMENT_DETAILS.qrDownloadName}
              note="Pay the exact amount, keep the reference, and upload your screenshot before the session starts."
            />

            <PaymentProofForm
              reference={registration.reference}
              mobile={registration.mobile}
              timingNote="within the 15-minute payment window"
              onSubmitted={() => setPaymentStatus("awaiting_verification")}
            />
          </>
        )}
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
      <div
        id="reserve"
        className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6"
      >
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
    <div
      id="reserve"
      className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6"
    >
      <Stepper steps={registerSteps} current={1} className="mb-5" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-heading">
          Reserve your place
        </h2>
        <Badge variant="success" dot>
          {remaining} left
        </Badge>
      </div>

      <p className="mt-1 text-sm leading-relaxed text-muted">
        No account needed. One place per player. Pay by GCash after reserving.
      </p>

      {state.status === "error" ? (
        <Alert
          id="open-play-error"
          tabIndex={-1}
          variant="error"
          className="mt-4 focus:outline-none"
          role="alert"
          eyebrow="Not reserved"
          title="We could not reserve your place"
        >
          <p>{state.message}</p>
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
                href="/lookup"
                className="font-semibold text-accent-ink underline-offset-4 hover:underline"
              >
                Check the booking
              </Link>{" "}
              with the reference and mobile number.
            </p>
          ) : null}
        </Alert>
      ) : null}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        noValidate
        className="mt-4 space-y-4"
      >
        <Field
          id="open-play-name"
          label="Full name"
          required
          error={state.status === "error" ? state.errors?.fullName : undefined}
        >
          <Input
            id="open-play-name"
            name="fullName"
            autoComplete="name"
            required
            maxLength={100}
            value={values.fullName}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                fullName: event.target.value,
              }))
            }
            invalid={Boolean(
              state.status === "error" && state.errors?.fullName,
            )}
          />
        </Field>

        <Field
          id="open-play-phone"
          label="Mobile number"
          required
          hint="Used with your reference to check your place."
          error={state.status === "error" ? state.errors?.phone : undefined}
        >
          <PhoneInput
            id="open-play-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            maxLength={30}
            placeholder="917 123 4567"
            value={values.phone}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                phone: event.target.value,
              }))
            }
            invalid={Boolean(state.status === "error" && state.errors?.phone)}
          />
        </Field>

        <Field
          id="open-play-email"
          label="Email address"
          optionalLabel
          hint="Optional. We only email booking updates and reminders."
          error={state.status === "error" ? state.errors?.email : undefined}
        >
          <Input
            id="open-play-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            value={values.email}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
            invalid={Boolean(state.status === "error" && state.errors?.email)}
          />
        </Field>

        <label className="flex items-start gap-3 text-sm leading-relaxed text-ink/80">
          <input
            type="checkbox"
            checked={termsAccepted}
            aria-invalid={
              (state.status === "error" && !termsAccepted) || undefined
            }
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

        <div
          id="open-play-turnstile"
          className="scroll-mt-24 rounded-xl border border-line bg-page/40 p-3"
        >
          <p className="mb-2 text-caption font-semibold text-muted">
            Quick security check — keeps fake registrations out.
          </p>
          <TurnstileWidget
            action="open_play"
            onToken={setTurnstileToken}
            resetSignal={turnstileReset}
          />
        </div>

        <Button
          type="submit"
          loading={pending}
          disabled={pending}
          className="w-full"
        >
          {pending ? "Reserving place" : "Reserve my place"}
          <ArrowRightIcon className="size-4" />
        </Button>
        <p className="text-caption leading-relaxed text-muted">
          Your place is reserved immediately. Pay by GCash and upload proof
          before the session starts.
        </p>
      </form>
    </div>
  );
}
