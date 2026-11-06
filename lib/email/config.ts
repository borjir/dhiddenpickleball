import { CLUB } from "@/lib/club";

/** Public site origin used in email links. */
export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (configured || "http://localhost:3000").replace(/\/+$/, "");
}

/** Verified sender address, e.g. "D-Hidden Bookings <bookings@example.com>". */
export function emailFrom() {
  return process.env.EMAIL_FROM?.trim() ?? "";
}

export function emailReplyTo() {
  return process.env.EMAIL_REPLY_TO?.trim() || CLUB.email;
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && emailFrom());
}

/** Internal recipients for staff alerts. */
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
