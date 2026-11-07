import type { BookingStatus, PaymentStatus } from "@/lib/bookings";

/**
 * One court range or open-play place returned by the public guest lookup.
 * Customer contact details are limited to what the guest already typed; the
 * server masks the mobile for display and never returns staff-only fields.
 */
export type GuestRecordItem = {
  courtName: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  amountPhp: number;
};

export type GuestRecord = {
  kind: "group" | "booking" | "open_play";
  id: string;
  reference: string;
  fullName: string;
  mobile: string;
  mobileMasked: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  amountPhp: number;
  holdExpiresAt: string | null;
  createdAt: string;
  cancellationReason: string | null;
  isOpenPlay: boolean;
  openPlayLevel: string | null;
  items: GuestRecordItem[];
  payment: {
    status: PaymentStatus;
    submittedAt: string | null;
    rejectionReason: string | null;
  } | null;
};

const QR_PREFIX = "DHPB1";

/**
 * Normalise a Philippine mobile number the same way the database does.
 * Returns `63XXXXXXXXXX` or null. Shared by the form, the QR payload, and the
 * server actions so the lookup key stays consistent.
 */
export function normalizeMobile(input: string): string | null {
  let value = input.replace(/\D/g, "");

  if (!value) return null;

  if (value.startsWith("0063")) {
    value = value.slice(2);
  } else if (value.startsWith("630")) {
    value = `63${value.slice(3)}`;
  } else if (value.startsWith("0")) {
    value = `63${value.slice(1)}`;
  } else if (value.startsWith("9") && value.length === 10) {
    value = `63${value}`;
  } else if (!value.startsWith("63")) {
    return null;
  }

  return /^63\d{10}$/.test(value) ? value : null;
}

/** `639171234567` -> `0917 123 4567` for display and copying. */
export function formatMobileDisplay(mobile: string): string {
  const normalized = normalizeMobile(mobile);

  if (!normalized) return mobile;

  const local = `0${normalized.slice(2)}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

/** The payload written into the downloadable QR code. */
export function guestQrPayload(reference: string, mobile: string): string {
  const normalized = normalizeMobile(mobile) ?? mobile.replace(/\D/g, "");
  return `${QR_PREFIX}|${reference.trim().toUpperCase()}|${normalized}`;
}

/** Read a scanned/uploaded QR payload, with a tolerant fallback. */
export function parseGuestQrPayload(
  raw: string,
): { reference: string; mobile: string } | null {
  const text = raw.trim();
  if (!text || text.length > 500) return null;

  const parts = text.split("|").map((part) => part.trim());

  if (parts[0] === QR_PREFIX && parts.length >= 3) {
    const reference = parts[1]?.toUpperCase();
    const mobile = normalizeMobile(parts[2] ?? "");
    return reference && mobile ? { reference, mobile } : null;
  }

  // Also accept a bare "REF|MOBILE" payload from a manually produced code.
  if (parts.length === 2) {
    const reference = parts[0]?.toUpperCase();
    const mobile = normalizeMobile(parts[1] ?? "");
    return reference && mobile ? { reference, mobile } : null;
  }

  return null;
}
