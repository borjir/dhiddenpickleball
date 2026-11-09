import { CLUB } from "@/lib/club";
import type { EmailEvent } from "./types";

const LOCAL_SITE_URL = "http://localhost:3000";

/**
 * Current production origin. This is only a safety net for a deploy build that
 * is missing NEXT_PUBLIC_SITE_URL; it prevents guest emails from silently
 * shipping localhost links. Update it when a custom domain replaces the
 * Workers URL.
 */
const PRODUCTION_SITE_URL = "https://bookings.dhiddenpickleball.workers.dev";

/**
 * Public site origin used in email links and the email logo.
 *
 * NEXT_PUBLIC_SITE_URL is inlined at build time, so it must be present when
 * `npm run deploy` builds (see docs/DEPLOYMENT_CLOUDFLARE.md).
 */
export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const fallback =
    process.env.NODE_ENV === "production"
      ? PRODUCTION_SITE_URL
      : LOCAL_SITE_URL;

  return (configured || fallback).replace(/\/+$/, "");
}

/**
 * Verified sender mailbox, e.g. "D-Hidden Bookings <bookings@example.com>".
 * This is an email address, never the deployed site URL.
 */
export function emailFrom() {
  return process.env.EMAIL_FROM?.trim() ?? "";
}

export function emailReplyTo() {
  return process.env.EMAIL_REPLY_TO?.trim() || CLUB.email;
}

function positiveLimit(value: string | undefined, fallback: number) {
  const configured = Number(value?.trim());

  if (!Number.isFinite(configured) || configured <= 0) return fallback;

  return Math.floor(configured);
}

/**
 * Mailjet's free plan allows 200 sends per calendar day. Keep the cap explicit
 * so a retry loop or a burst of bookings cannot exhaust the account
 * unexpectedly. Raise this only on a paid plan with a higher limit.
 */
export function emailDailyLimit() {
  return positiveLimit(process.env.EMAIL_DAILY_LIMIT, 200);
}

/**
 * Mailjet's free plan allows 6,000 sends per month. This is a separate guard
 * from the daily cap because a few busy days can use the monthly allowance
 * before the month ends.
 */
export function emailMonthlyLimit() {
  return positiveLimit(process.env.EMAIL_MONTHLY_LIMIT, 6_000);
}

export function isEmailConfigured() {
  return Boolean(
    process.env.MAILJET_API_KEY?.trim() &&
      process.env.MAILJET_SECRET_KEY?.trim() &&
      emailFrom(),
  );
}

/**
 * Keep the email set deliberately small for the free plan.
 *
 * Sent: booking received, open-play reserved, payment verified, payment proof
 * rejected, booking cancelled, open-play details changed, and the 24-hour
 * reminder. These either carry the booking/pass or tell the guest that money,
 * access, or the booking itself changed.
 *
 * Suppressed: payment-proof receipt (the lookup page already shows it), and all
 * four staff alerts. Staff use the dashboard as the source of truth; emailing
 * every new booking, proof, cancellation, and full session would multiply the
 * quota by the number of staff recipients.
 */
const DISABLED_EMAIL_EVENTS = new Set<EmailEvent>([
  "payment_proof_received",
  "staff_new_booking",
  "staff_payment_proof",
  "staff_booking_cancelled",
  "staff_session_full",
]);

export function isEmailEventEnabled(event: EmailEvent) {
  return !DISABLED_EMAIL_EVENTS.has(event);
}

/** Internal recipients for staff alerts, retained for a future re-enable. */
export function staffNotificationRecipients() {
  const seen = new Set<string>();

  return (process.env.STAFF_NOTIFICATION_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
}
