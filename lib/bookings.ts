import type { BadgeVariant } from "@/components/ui/badge";
import {
  openPlayLevelLabel,
  type OpenPlaySkillLevel,
} from "@/lib/open-play";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type PaymentStatus =
  | "unpaid"
  | "awaiting_proof"
  | "awaiting_verification"
  | "paid"
  | "rejected"
  | "refund_pending"
  | "partially_refunded"
  | "refunded";

export type BookingGroupSummary = {
  id: string;
  reference: string;
  amount_php: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  hold_expires_at: string | null;
};

export type AccountBooking = {
  id: string;
  reference: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  amount_php: number;
  hold_expires_at: string | null;
  created_at?: string;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  group_id?: string | null;
  booking_group?: BookingGroupSummary | null;
  service?: { name: string; code?: string } | null;
  court_reservations?: Array<{
    court: { name: string; slug: string } | null;
  }> | null;
  open_play_registrations?: Array<{
    session: { skill_level: OpenPlaySkillLevel } | null;
  }> | null;
};

/** One available start time returned by public court availability. */
export type AvailabilitySlot = {
  courtId: string;
  courtName: string;
  courtSlug: string;
  startsAt: string;
  endsAt: string;
  startMinute: number;
  amountPhp: number;
};

/** The booking row returned after a successful create request. */
export type BookingConfirmation = {
  id: string;
  reference: string;
  courtName: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  amountPhp: number;
  holdExpiresAt: string | null;
};

/** One court/date range inside a grouped reservation. */
export type BookingGroupItem = {
  id: string;
  courtId: string;
  courtName: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  amountPhp: number;
};

/** The customer-facing group returned after holding several ranges. */
export type BookingGroupConfirmation = {
  id: string;
  reference: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  amountPhp: number;
  holdExpiresAt: string | null;
  items: BookingGroupItem[];
};

export const BOOKING_STATUS: Record<
  BookingStatus,
  { label: string; variant: BadgeVariant }
> = {
  pending: { label: "Pending", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "neutral" },
  completed: { label: "Completed", variant: "info" },
  no_show: { label: "No-show", variant: "danger" },
};

export const PAYMENT_STATUS: Record<
  PaymentStatus,
  { label: string; variant: BadgeVariant }
> = {
  unpaid: { label: "Unpaid", variant: "warning" },
  awaiting_proof: { label: "Awaiting proof", variant: "warning" },
  awaiting_verification: {
    label: "Awaiting verification",
    variant: "info",
  },
  paid: { label: "Paid", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  refund_pending: { label: "Refund pending", variant: "warning" },
  partially_refunded: { label: "Partly refunded", variant: "info" },
  refunded: { label: "Refunded", variant: "success" },
};

export function bookingStatusMeta(status: BookingStatus): {
  label: string;
  variant: BadgeVariant;
} {
  return (
    BOOKING_STATUS[status] ?? { label: status, variant: "neutral" }
  );
}

export function paymentStatusMeta(status: PaymentStatus): {
  label: string;
  variant: BadgeVariant;
} {
  return (
    PAYMENT_STATUS[status] ?? { label: status, variant: "neutral" }
  );
}

export function formatPeso(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatBookingDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

export function formatBookingTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";

  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(date);
}

export function formatBookingTimeRange(startsAt: string, endsAt: string) {
  return `${formatBookingTime(startsAt)} – ${formatBookingTime(endsAt)}`;
}

/** Formats a local minute-of-day value, e.g. 1020 -> "5:00 PM". */
export function formatMinuteLabel(minutes: number) {
  const hours = Math.floor(minutes / 60) % 24;
  const rest = minutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour}:${String(rest).padStart(2, "0")} ${period}`;
}

/** Returns the Asia/Manila calendar date for a timestamp as YYYY-MM-DD. */
export function manilaDateId(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(date);
}

export function isOpenPlayBooking(booking: AccountBooking) {
  return (
    booking.service?.code === "open_play" ||
    Boolean(booking.open_play_registrations?.length)
  );
}

export function bookingCourtName(booking: AccountBooking) {
  const openPlay = booking.open_play_registrations?.[0]?.session;

  if (openPlay?.skill_level) {
    return `${openPlayLevelLabel(openPlay.skill_level)} open play`;
  }

  return (
    booking.court_reservations?.[0]?.court?.name ??
    booking.service?.name ??
    "Court to be assigned"
  );
}

export function isUpcomingBooking(
  booking: AccountBooking,
  now = Date.now(),
) {
  return isUpcomingRange(booking.starts_at, booking.status, now);
}

export function isUpcomingRange(
  starts_at: string,
  status: BookingStatus,
  now = Date.now(),
) {
  const startsAt = new Date(starts_at).getTime();
  if (Number.isNaN(startsAt)) return false;

  return startsAt >= now && (status === "pending" || status === "confirmed");
}

export function isHoldExpired(
  booking: Pick<AccountBooking, "status" | "hold_expires_at">,
  now = Date.now(),
) {
  if (booking.status !== "pending" || !booking.hold_expires_at) return false;

  const expiresAt = new Date(booking.hold_expires_at).getTime();
  return !Number.isNaN(expiresAt) && expiresAt <= now;
}

export function bookingPaymentDescription(status: PaymentStatus) {
  switch (status) {
    case "unpaid":
      return "No payment is recorded yet.";
    case "awaiting_proof":
      return "Payment proof has not been submitted yet.";
    case "awaiting_verification":
      return "Proof has been submitted. Staff are checking the actual transfer.";
    case "paid":
      return "Staff have verified the payment.";
    case "rejected":
      return "The payment proof was not accepted. Contact the club for the next step.";
    case "refund_pending":
      return "A refund is being processed. Contact the club for its status.";
    case "partially_refunded":
      return "Part of the payment has been refunded.";
    case "refunded":
      return "The payment has been refunded.";
  }
}
