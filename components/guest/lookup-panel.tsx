"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import jsQR from "jsqr";
import {
  lookupGuestRecord,
  refreshGuestRecord,
  type LookupResult,
} from "@/app/lookup/actions";
import { GuestQrCode } from "@/components/guest/guest-qr";
import { PaymentProofForm } from "@/components/payment/payment-proof-form";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, PhoneInput } from "@/components/ui/field";
import { StatusPair } from "@/components/ui/status-pair";
import {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  formatBookingDate,
  formatBookingTimeRange,
  formatDateTime,
  formatPeso,
  isUpcomingRange,
} from "@/lib/bookings";
import {
  formatMobileDisplay,
  normalizeMobile,
  parseGuestQrPayload,
} from "@/lib/guest";
import { revealTarget } from "@/lib/scroll";

const MAX_QR_BYTES = 8 * 1024 * 1024;
const MAX_DECODE_EDGE = 1200;

async function decodeQrImage(file: File): Promise<string | null> {
  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  try {
    const scale = Math.min(
      1,
      MAX_DECODE_EDGE / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;

    context.drawImage(bitmap, 0, 0, width, height);
    const image = context.getImageData(0, 0, width, height);
    const code = jsQR(image.data, width, height, {
      inversionAttempts: "attemptBoth",
    });

    return code?.data?.trim() || null;
  } finally {
    bitmap.close();
  }
}

export function LookupPanel({ initialReference = "" }: { initialReference?: string }) {
  const [reference, setReference] = useState(initialReference.toUpperCase());
  const [mobile, setMobile] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [pending, setPending] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [resetCount, setResetCount] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const revealedReference = useRef<string | null>(null);
  const didAutoLookup = useRef(false);
  const record = result?.status === "ok" ? result.record : null;

  const runLookup = useCallback(
    async (nextReference: string, nextMobile: string, token: string) => {
      setMobile(formatMobileDisplay(nextMobile));
      setPending(true);
      setResult(null);

      try {
        const response = await lookupGuestRecord({
          reference: nextReference,
          mobile: nextMobile,
          turnstileToken: token,
        });
        setResult(response);
      } catch {
        setResult({
          status: "error",
          message: "The lookup could not be completed. Try again in a moment.",
        });
      } finally {
        // A Turnstile token is redeemed even when the lookup finds nothing.
        setTurnstileToken(null);
        setTurnstileReset((count) => count + 1);
        setPending(false);
      }
    },
    [],
  );

  // Confirmation links include the mobile in the URL fragment, which never
  // reaches the server. Fill both fields, then let the guest pass the security
  // check once and press the button; auto-submitting would eat a one-use token
  // before the widget is ready.
  useEffect(() => {
    if (didAutoLookup.current || !initialReference) return;

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const mobileFromLink = normalizeMobile(params.get("mobile") ?? "");

    if (!mobileFromLink) return;

    didAutoLookup.current = true;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    const timer = window.setTimeout(() => {
      setMobile(formatMobileDisplay(mobileFromLink));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialReference]);

  // The status renders below the form, so bring it into view the first time a
  // reference opens. Later polls and proof uploads keep the reader in place.
  useEffect(() => {
    if (!record || revealedReference.current === record.reference) return;

    revealedReference.current = record.reference;
    revealTarget(resultRef.current, { block: "start" });
  }, [record]);

  // A failed lookup reports below the form too; never leave it off-screen.
  useEffect(() => {
    if (result?.status !== "error") return;

    revealTarget(document.getElementById("lookup-error"));
  }, [result]);

  // "Check another booking" reopens the form and returns to its first field.
  useEffect(() => {
    if (resetCount === 0) return;

    revealTarget(document.getElementById("lookup-form"), {
      focus: false,
      block: "start",
    });
    document.getElementById("lookup-reference")?.focus({ preventScroll: true });
  }, [resetCount]);

  // Keep an open status page current when staff verify or update a booking.
  useEffect(() => {
    if (!record) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;

      void refreshGuestRecord({
        reference: record.reference,
        mobile: record.mobile,
      })
        .then((response) => {
          if (response.status === "ok") setResult(response);
        })
        .catch(() => {
          // Keep the last visible status; the next interval can retry.
        });
    }, 45_000);

    return () => window.clearInterval(timer);
  }, [record]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!turnstileToken) {
      setResult({
        status: "error",
        message: "Complete the security check, then try the lookup again.",
      });
      revealTarget(document.getElementById("lookup-turnstile"));
      return;
    }

    await runLookup(reference, mobile, turnstileToken);
  }

  function checkAnotherBooking() {
    setResult(null);
    setReference("");
    setMobile("");
    revealedReference.current = null;
    setResetCount((count) => count + 1);
  }

  async function handleQrUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size === 0 || file.size > MAX_QR_BYTES) {
      setResult({
        status: "error",
        message: "Choose a QR screenshot smaller than 8 MB.",
      });
      return;
    }

    setScanning(true);

    try {
      const text = await decodeQrImage(file);

      if (!text) {
        setResult({
          status: "error",
          message:
            "No QR code was found in that image. Upload a clear screenshot of the booking QR code, or type the reference and mobile number instead.",
        });
        return;
      }

      const payload = parseGuestQrPayload(text);

      if (!payload) {
        setResult({
          status: "error",
          message:
            "That QR code is not a D-Hidden booking pass. Use the QR code from your booking confirmation, or type the reference and mobile number.",
        });
        return;
      }

      setReference(payload.reference);

      if (turnstileToken) {
        await runLookup(payload.reference, payload.mobile, turnstileToken);
      } else {
        setMobile(formatMobileDisplay(payload.mobile));
      }
    } finally {
      setScanning(false);
    }
  }

  const status = record ? BOOKING_STATUS[record.status] : null;
  const payment = record ? PAYMENT_STATUS[record.paymentStatus] : null;
  const canUploadProof =
    record &&
    ["unpaid", "awaiting_proof", "rejected"].includes(record.paymentStatus);

  return (
    <div className="space-y-6">
      {record ? (
        <section
          ref={resultRef}
          id="lookup-result"
          tabIndex={-1}
          className="flex scroll-mt-24 flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-card focus:outline-none sm:px-5"
        >
          <div className="min-w-0">
            <p className="text-caption text-muted">Showing booking</p>
            <p className="truncate font-mono text-sm font-bold tracking-[0.06em] text-heading">
              {record.reference}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={checkAnotherBooking}
          >
            Check another booking
          </Button>
        </section>
      ) : (
        <section
          id="lookup-form"
          className="scroll-mt-24 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-7"
        >
          <div className="rounded-xl border border-dashed border-line-strong bg-page/50 p-4">
            <Field
              id="lookup-qr"
              label="Upload your QR code"
              hint="A screenshot or photo of the QR from your confirmation is fine."
            >
              <input
                ref={qrInputRef}
                id="lookup-qr"
                type="file"
                accept="image/*"
                onChange={handleQrUpload}
                className="block w-full cursor-pointer rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-brand-blue-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-heading hover:border-line-strong focus:border-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-blue/15"
              />
            </Field>
            {scanning ? (
              <p className="mt-2 text-caption text-muted" role="status">
                Reading QR code…
              </p>
            ) : null}
          </div>

          <div className="my-5 flex items-center gap-3 text-caption text-muted">
            <span className="h-px flex-1 bg-line" />
            or enter the details
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="lookup-reference" label="Booking reference" required>
                <Input
                  id="lookup-reference"
                  name="reference"
                  autoComplete="off"
                  autoCapitalize="characters"
                  maxLength={40}
                  placeholder="HP-XXXXXX"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  required
                />
              </Field>

              <Field
                id="lookup-mobile"
                label="Mobile number"
                required
                hint="The number used when the booking was made."
              >
                <PhoneInput
                  id="lookup-mobile"
                  name="mobile"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={30}
                  placeholder="917 123 4567"
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value)}
                  required
                />
              </Field>
            </div>

            <div
              id="lookup-turnstile"
              className="scroll-mt-24 rounded-xl border border-line bg-page/40 p-3"
            >
              <p className="mb-2 text-caption font-semibold text-muted">
                Quick security check — keeps booking details private.
              </p>
              <TurnstileWidget
                action="lookup"
                onToken={setTurnstileToken}
                resetSignal={turnstileReset}
              />
            </div>

            <Button type="submit" loading={pending} disabled={pending}>
              {pending ? "Checking booking" : "Check booking status"}
            </Button>
          </form>
        </section>
      )}

      {result?.status === "error" ? (
        <Alert
          id="lookup-error"
          tabIndex={-1}
          variant="error"
          role="alert"
          eyebrow="Booking not found"
          title="We could not open that booking"
          className="focus:outline-none"
        >
          <p>{result.message}</p>
        </Alert>
      ) : null}

      {record && status && payment ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={record.isOpenPlay ? "lime" : "blue"}>
                {record.isOpenPlay ? "Open play" : "Court booking"}
              </Badge>
              <span className="text-caption text-muted">Booking reference</span>
            </div>
            <h2 className="mt-2 font-mono text-2xl font-bold tracking-[0.08em] text-heading">
              {record.reference}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {record.fullName} · {formatMobileDisplay(record.mobile)}
            </p>

            <StatusPair
              booking={status}
              payment={payment}
              className="mt-5"
            />

            <p className="mt-4 text-sm text-muted">
              Total{" "}
              <span className="font-semibold text-heading">
                {formatPeso(record.amountPhp)}
              </span>
              {record.isOpenPlay
                ? ` · ${record.openPlayLevel ?? "Open play"} level`
                : ` · ${record.items.length} court ${record.items.length === 1 ? "time" : "times"}`}
            </p>

            {record.status === "pending" &&
            record.paymentStatus === "unpaid" &&
            record.holdExpiresAt ? (
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Payment hold ends {formatDateTime(record.holdExpiresAt)}. Send
                your GCash proof before then.
              </p>
            ) : null}

            {record.cancellationReason ? (
              <p className="mt-4 rounded-xl border border-line bg-page/60 px-4 py-3 text-sm text-muted">
                Cancellation reason: {record.cancellationReason}
              </p>
            ) : null}

            {record.payment?.rejectionReason ? (
              <p className="mt-4 rounded-xl border border-danger/30 bg-danger-soft/40 px-4 py-3 text-sm text-danger">
                Payment proof rejected: {record.payment.rejectionReason}
              </p>
            ) : null}

            <ul className="mt-5 space-y-2 border-t border-line pt-4">
              {record.items.map((item, index) => (
                <li
                  key={`${item.startsAt}-${index}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm"
                >
                  <span className="text-heading">
                    {formatBookingDate(item.startsAt)} ·{" "}
                    {formatBookingTimeRange(item.startsAt, item.endsAt)}
                  </span>
                  <span className="text-muted">{item.courtName}</span>
                  <span className="font-semibold text-heading">
                    {formatPeso(item.amountPhp)}
                  </span>
                </li>
              ))}
            </ul>

          </section>

          <GuestQrCode
            reference={record.reference}
            mobile={record.mobile}
            fullName={record.fullName}
            compact
          />

          {canUploadProof &&
          record.items.some((item) =>
            isUpcomingRange(item.startsAt, record.status),
          ) ? (
            <PaymentProofForm
              reference={record.reference}
              mobile={record.mobile}
              timingNote={
                record.isOpenPlay
                  ? "before the session starts"
                  : "before the hold ends"
              }
              onSubmitted={() => {
                void refreshGuestRecord({
                  reference: record.reference,
                  mobile: record.mobile,
                }).then((response) => {
                  if (response.status === "ok") setResult(response);
                });
              }}
            />
          ) : null}

          <p className="text-caption leading-relaxed text-muted">
            Need to change or cancel?{" "}
            <Link
              href="/visit"
              className="font-semibold text-accent-ink underline underline-offset-2"
            >
              Contact the club
            </Link>{" "}
            with your reference.
          </p>
        </div>
      ) : null}
    </div>
  );
}
