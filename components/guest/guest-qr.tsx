"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import {
  formatMobileDisplay,
  guestQrPayload,
  normalizeMobile,
} from "@/lib/guest";

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function GuestQrCode({
  reference,
  mobile,
  fullName,
  autoDownload = false,
  compact = false,
}: {
  reference: string;
  mobile: string;
  fullName?: string;
  /** Download once when the payment/proof step first appears. */
  autoDownload?: boolean;
  compact?: boolean;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState<"reference" | "mobile" | null>(null);
  const downloadedRef = useRef(false);
  const normalizedMobile = normalizeMobile(mobile) ?? mobile.replace(/\D/g, "");
  const payload = guestQrPayload(reference, mobile);
  const fileBase = `play4serve-${reference}`;

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(payload, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0f2f5c", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [payload]);

  useEffect(() => {
    if (!autoDownload || !dataUrl || downloadedRef.current) return;

    downloadedRef.current = true;
    downloadDataUrl(dataUrl, `${fileBase}-qr.png`);
  }, [autoDownload, dataUrl, fileBase]);

  async function copy(value: string, field: "reference" | "mobile") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <section
      aria-labelledby="guest-qr-heading"
      className={
        compact
          ? "rounded-2xl border border-line bg-surface p-5"
          : "rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-7"
      }
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-eyebrow font-bold uppercase text-accent-ink">
            Your booking pass
          </p>
          <h2
            id="guest-qr-heading"
            className="mt-1 font-display text-xl font-bold text-heading"
          >
            Save this QR code
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            Show or upload this code at the club, or use it to check your status
            later. It is linked to this booking and your mobile number.
          </p>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <dt className="text-muted">Reference</dt>
              <dd className="font-mono text-base font-bold tracking-wide text-heading">
                {reference}
              </dd>
              <button
                type="button"
                onClick={() => copy(reference, "reference")}
                className="rounded-md px-2 py-1 text-caption font-semibold text-accent-ink hover:bg-brand-blue-soft"
              >
                {copied === "reference" ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <dt className="text-muted">Mobile</dt>
              <dd className="font-semibold text-heading">
                {formatMobileDisplay(normalizedMobile)}
              </dd>
              <button
                type="button"
                onClick={() =>
                  copy(formatMobileDisplay(normalizedMobile), "mobile")
                }
                className="rounded-md px-2 py-1 text-caption font-semibold text-accent-ink hover:bg-brand-blue-soft"
              >
                {copied === "mobile" ? "Copied" : "Copy"}
              </button>
            </div>
            {fullName ? (
              <div className="flex flex-wrap items-center gap-2">
                <dt className="text-muted">Name</dt>
                <dd className="font-semibold text-heading">{fullName}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-3">
          <div className="grid size-40 place-items-center rounded-xl border border-line bg-white p-2">
            {dataUrl ? (
              // The QR is generated locally as a data URL; next/image would add
              // no value for a fixed-size code.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dataUrl}
                alt={`QR code for booking ${reference}`}
                width={144}
                height={144}
                className="size-36"
              />
            ) : error ? (
              <p className="px-2 text-center text-caption text-muted">
                QR code unavailable
              </p>
            ) : (
              <p className="px-2 text-center text-caption text-muted">
                Generating QR code…
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!dataUrl}
            onClick={() =>
              dataUrl && downloadDataUrl(dataUrl, `${fileBase}-qr.png`)
            }
          >
            Download QR code
          </Button>
        </div>
      </div>

      <p className="mt-5 rounded-xl border border-brand-blue/15 bg-brand-blue-soft/50 px-4 py-3 text-caption leading-relaxed text-ink/80">
        Keep this code and your reference. Anyone with the code or the reference
        plus your mobile number can view this booking, so share it only with
        people you trust.
      </p>
    </section>
  );
}
