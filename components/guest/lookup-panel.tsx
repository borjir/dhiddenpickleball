"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import {
  lookupGuestRecord,
  type LookupResult,
} from "@/app/lookup/actions";
import { GuestQrCode } from "@/components/guest/guest-qr";
import { PaymentProofForm } from "@/components/payment/payment-proof-form";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  formatBookingDate,
  formatBookingTimeRange,
  formatDateTime,
  formatPeso,
  isUpcomingRange,
} from "@/lib/bookings";
import { formatMobileDisplay, parseGuestQrPayload } from "@/lib/guest";

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
  const qrInputRef = useRef<HTMLInputElement>(null);

  async function runLookup(nextReference: string, nextMobile: string) {
    setPending(true);
    setResult(null);

    try {
      const response = await lookupGuestRecord({
        reference: nextReference,
        mobile: nextMobile,
      });
      setResult(response);
    } catch {
      setResult({
        status: "error",
        message: "The lookup could not be completed. Try again in a moment.",
      });
    } finally {
      setPending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runLookup(reference, mobile);
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
      setMobile(formatMobileDisplay(payload.mobile));
      await runLookup(payload.reference, payload.mobile);
    } finally {
      setScanning(false);
    }
  }

  const record = result?.status === "ok" ? result.record : null;
  const status = record ? BOOKING_STATUS[record.status] : null;
  const payment = record ? PAYMENT_STATUS[record.paymentStatus] : null;
  const canUploadProof =
    record &&
    ["unpaid", "awaiting_proof", "rejected"].includes(record.paymentStatus);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-7">
        <p className="text-eyebrow font-bold uppercase text-accent-ink">
          No account needed
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold text-heading">
          Find your booking
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Upload the QR code from your booking pass, or enter the reference and
          the mobile number you booked with.
        </p>

        <div className="mt-5 rounded-xl border border-dashed border-line-strong bg-page/50 p-4">
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
              <Input
                id="lookup-mobile"
                name="mobile"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={30}
                placeholder="0917 123 4567"
                value={mobile}
                onChange={(event) => setMobile(event.target.value)}
                required
              />
            </Field>
          </div>

          <Button type="submit" loading={pending} disabled={pending}>
            {pending ? "Checking booking" : "Check booking status"}
          </Button>
        </form>
      </section>

      {result?.status === "error" ? (
        <Alert
          variant="error"
          role="alert"
          eyebrow="Booking not found"
          title="We could not open that booking"
        >
          <p>{result.message}</p>
        </Alert>
      ) : null}

      {record && status && payment ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-eyebrow font-bold uppercase text-accent-ink">
                  {record.kind === "group"
                    ? "Court reservation"
                    : record.isOpenPlay
                      ? "Open-play place"
                      : "Court booking"}
                </p>
                <h2 className="mt-1 font-mono text-2xl font-bold tracking-[0.08em] text-heading">
                  {record.reference}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {record.fullName} · {formatMobileDisplay(record.mobile)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={status.variant} dot>
                  {status.label}
                </Badge>
                <Badge variant={payment.variant} dot>
                  {payment.label}
                </Badge>
              </div>
            </div>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-page/50 p-4">
                <dt className="text-caption uppercase tracking-[0.12em] text-muted">
                  Amount
                </dt>
                <dd className="mt-1 font-display text-xl font-bold text-heading">
                  {formatPeso(record.amountPhp)}
                </dd>
              </div>
              <div className="rounded-xl border border-line bg-page/50 p-4">
                <dt className="text-caption uppercase tracking-[0.12em] text-muted">
                  Booked
                </dt>
                <dd className="mt-1 text-sm font-semibold text-heading">
                  {formatDateTime(record.createdAt)}
                </dd>
              </div>
            </dl>

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

            {record.isOpenPlay ? (
              <p className="mt-4 text-sm text-muted">
                Open-play level:{" "}
                <span className="font-semibold text-heading">
                  {record.openPlayLevel ?? "—"}
                </span>
              </p>
            ) : null}
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
              onSubmitted={() => void runLookup(record.reference, record.mobile)}
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
