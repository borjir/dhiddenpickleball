import { CLUB } from "@/lib/club";
import {
  bookingStatusMeta,
  formatBookingDate,
  formatBookingTimeRange,
  formatPeso,
  paymentStatusMeta,
  type BookingStatus,
  type PaymentStatus,
} from "@/lib/bookings";
import { openPlayLevelLabel, type OpenPlaySkillLevel } from "@/lib/open-play";
import { siteUrl } from "./config";
import type { EmailContent, PlayerEmailEvent } from "./types";

export type EmailItem = {
  startsAt: string;
  endsAt: string;
  amountPhp: number;
  courtName: string;
};

export type PlayerEmailContext = {
  reference: string;
  playerName: string;
  playerEmail: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  amountPhp: number;
  holdExpiresAt: string | null;
  cancellationReason: string | null;
  rejectionReason: string | null;
  items: EmailItem[];
  isOpenPlay: boolean;
  openPlayLevel: OpenPlaySkillLevel | null;
  isGroup: boolean;
  accountUrl: string;
};

export type StaffEmailContext = {
  reference: string;
  playerName: string;
  playerEmail: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  amountPhp: number;
  startsAt: string | null;
  endsAt: string | null;
  courtName: string;
  openPlayLevel: OpenPlaySkillLevel | null;
  cancellationReason: string | null;
  bookingUrl: string;
  paymentUrl: string;
};

export type SessionFullContext = {
  sessionId: string;
  startsAt: string;
  durationMinutes: number;
  level: OpenPlaySkillLevel;
  capacity: number;
  registered: number;
  amountPhp: number;
  staffUrl: string;
};

type ShellInput = {
  eyebrow: string;
  title: string;
  intro: string;
  detailRows: Array<{ label: string; value: string }>;
  note?: string;
  ctaLabel: string;
  ctaUrl: string;
  closing?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function displayName(value: string) {
  return value.trim() || "Player";
}

function serviceName(context: {
  isOpenPlay: boolean;
  openPlayLevel: OpenPlaySkillLevel | null;
}) {
  if (!context.isOpenPlay) return "Court rental";
  return context.openPlayLevel
    ? `${openPlayLevelLabel(context.openPlayLevel)} open play`
    : "Open play";
}

function whenHtml(items: EmailItem[]) {
  if (items.length === 0) return "Time to be confirmed";
  if (items.length === 1) {
    return `${escapeHtml(formatBookingDate(items[0].startsAt))} · ${escapeHtml(
      formatBookingTimeRange(items[0].startsAt, items[0].endsAt),
    )} <span style="color:#65728a;">· Asia/Manila</span>`;
  }

  return `<div style="margin-top:4px;">${items
    .map(
      (item) =>
        `<div style="padding:5px 0;border-top:1px solid #e4e9f0;">${escapeHtml(
          formatBookingDate(item.startsAt),
        )} · ${escapeHtml(
          formatBookingTimeRange(item.startsAt, item.endsAt),
        )} · ${escapeHtml(item.courtName)}</div>`,
    )
    .join("")}</div>`;
}

function detailsTable(rows: Array<{ label: string; value: string }>) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:22px 0 0;">${rows
    .map(
      (row, index) =>
        `<tr><td style="padding:10px 0;border-top:${
          index === 0 ? "0" : "1px solid #e4e9f0"
        };color:#65728a;font-size:13px;line-height:20px;vertical-align:top;width:38%;">${escapeHtml(
          row.label,
        )}</td><td style="padding:10px 0;border-top:${
          index === 0 ? "0" : "1px solid #e4e9f0"
        };color:#12233f;font-size:14px;line-height:21px;font-weight:600;vertical-align:top;">${
          row.value
        }</td></tr>`,
    )
    .join("")}</table>`;
}

function emailShell(input: ShellInput) {
  const logoUrl = `${siteUrl()}/icon.png`;
  const website = siteUrl();

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f2f5ec;color:#12233f;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f5ec;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #dfe6ee;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:#123b78;padding:22px 26px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:12px;"><img src="${logoUrl}" width="48" height="48" alt="${escapeHtml(
                      "D-Hidden Pickleball Court & Bistro logo",
                    )}" style="display:block;border-radius:12px;" /></td>
                    <td style="color:#ffffff;font-size:17px;line-height:21px;font-weight:700;">D-Hidden Pickleball<br /><span style="font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:#c9d8ef;">Court &amp; Bistro</span></td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 26px 8px;">
                <p style="margin:0 0 8px;color:#52718f;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;">${escapeHtml(
                  input.eyebrow,
                )}</p>
                <h1 style="margin:0;color:#0d2e60;font-size:28px;line-height:34px;font-weight:800;">${escapeHtml(
                  input.title,
                )}</h1>
                <p style="margin:14px 0 0;color:#3e5068;font-size:15px;line-height:24px;">${escapeHtml(
                  input.intro,
                )}</p>
                ${detailsTable(input.detailRows)}
                ${
                  input.note
                    ? `<div style="margin:22px 0 0;padding:14px 16px;background:#f6f9f1;border-left:4px solid #8fbd45;border-radius:4px;color:#3e5068;font-size:13px;line-height:21px;">${escapeHtml(
                        input.note,
                      )}</div>`
                    : ""
                }
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
                  <tr>
                    <td style="border-radius:8px;background:#123b78;">
                      <a href="${escapeHtml(
                        input.ctaUrl,
                      )}" style="display:inline-block;padding:13px 20px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(
                        input.ctaLabel,
                      )}</a>
                    </td>
                  </tr>
                </table>
                ${
                  input.closing
                    ? `<p style="margin:22px 0 0;color:#65728a;font-size:13px;line-height:21px;">${escapeHtml(
                        input.closing,
                      )}</p>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding:24px 26px 28px;">
                <div style="border-top:1px solid #e4e9f0;padding-top:18px;color:#65728a;font-size:12px;line-height:19px;">
                  <strong style="color:#3e5068;">${escapeHtml(
                    "D-Hidden Pickleball Court & Bistro",
                  )}</strong><br />
                  ${escapeHtml(CLUB.addressFull)}<br />
                  ${escapeHtml(CLUB.phoneDisplay)} · <a href="mailto:${escapeHtml(
                    CLUB.email,
                  )}" style="color:#315f9b;">${escapeHtml(CLUB.email)}</a><br />
                  <a href="${escapeHtml(
                    website,
                  )}" style="color:#315f9b;text-decoration:none;">${escapeHtml(
                    website.replace(/^https?:\/\//, ""),
                  )}</a>
                </div>
                <p style="margin:16px 0 0;color:#8793a6;font-size:11px;line-height:18px;">This is a transactional message about your booking. Please do not reply to an unmonitored mailbox; use the club contact above.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function playerCopy(event: PlayerEmailEvent, context: PlayerEmailContext) {
  const name = displayName(context.playerName);
  const service = serviceName(context);
  const hold = context.holdExpiresAt
    ? new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Manila",
      }).format(new Date(context.holdExpiresAt))
    : null;

  switch (event) {
    case "court_booking_received": {
      const isConfirmed = context.status === "confirmed";
      return {
        subject: `Booking received — ${context.reference}`,
        eyebrow: "Booking received",
        title: isConfirmed ? "Your court is booked" : "Your court is on hold",
        intro:
          context.paymentStatus === "paid"
            ? `Hi ${name}, your court time is confirmed and the payment is recorded.`
            : isConfirmed
              ? `Hi ${name}, your court time is confirmed. The payment is still unpaid; settle it with the club or upload GCash proof from your booking page.`
              : `Hi ${name}, we are holding your court time for 15 minutes. Pay the exact amount by GCash and upload your proof before the hold ends.`,
        note: hold
          ? `Hold ends ${hold} (Asia/Manila). If payment proof is not submitted in time, the slot may be released.`
          : context.paymentStatus === "paid"
            ? "Your booking is confirmed and the payment is recorded."
            : "Your booking is confirmed. Staff verify the actual transfer separately.",
        ctaLabel: context.paymentStatus === "paid" ? "View booking" : "View booking and pay",
        closing: "Keep your reference with the GCash transfer. Staff review proofs manually.",
      };
    }
    case "open_play_reserved":
      return {
        subject: `Open-play place reserved — ${context.reference}`,
        eyebrow: "Place reserved",
        title: "Your open-play place is reserved",
        intro: `Hi ${name}, your place in ${service.toLowerCase()} is reserved. Pay by GCash and upload your proof before the session starts.`,
        note: "Your place is reserved now, but the payment stays separate until staff verify the actual transfer.",
        ctaLabel: "View booking and pay",
        closing: "One place is held per player. Keep your reference with the transfer.",
      };
    case "payment_proof_received":
      return {
        subject: `Payment proof received — ${context.reference}`,
        eyebrow: "Proof received",
        title: "We received your payment proof",
        intro: `Hi ${name}, your proof is recorded. Club staff will check the actual GCash transfer next.`,
        note: "This email does not mark the payment as paid. The booking page will update after staff verification.",
        ctaLabel: "View booking",
        closing: "If the proof is unreadable or does not match the transfer, staff will contact you with the next step.",
      };
    case "payment_approved":
      return {
        subject: `Payment verified — ${context.reference}`,
        eyebrow: "Payment verified",
        title: "Your payment is verified",
        intro: `Hi ${name}, club staff verified the GCash transfer for ${service.toLowerCase()}.`,
        note: "This is a payment confirmation, not a tax receipt. Keep your booking reference for your records.",
        ctaLabel: "View booking",
        closing: "Arrive a few minutes before your start time. Contact the club if you need to change the booking.",
      };
    case "payment_rejected":
      return {
        subject: `Payment proof needs attention — ${context.reference}`,
        eyebrow: "Action needed",
        title: "We could not verify your payment proof",
        intro: `Hi ${name}, the club could not match the submitted proof to the incoming payment.`,
        note: context.rejectionReason
          ? `Staff note: ${context.rejectionReason}`
          : "Contact the club with your reference and proof before sending another payment.",
        ctaLabel: "Review your booking",
        closing: "Do not send a second payment until the club confirms the next step.",
      };
    case "booking_cancelled":
      return {
        subject: `Booking cancelled — ${context.reference}`,
        eyebrow: "Booking cancelled",
        title: "Your booking was cancelled",
        intro: `Hi ${name}, this ${service.toLowerCase()} booking has been cancelled.`,
        note: context.cancellationReason
          ? `Reason: ${context.cancellationReason}`
          : "Contact the club if you have a question about this cancellation.",
        ctaLabel: "View booking",
        closing: "Refund or rebooking options depend on the club's cancellation policy and the timing of the change.",
      };
    case "open_play_updated":
      return {
        subject: `Open-play details changed — ${context.reference}`,
        eyebrow: "Session updated",
        title: "Your open-play session changed",
        intro: `Hi ${name}, the club updated the details of ${service.toLowerCase()}. Check the latest time, level, and price below.`,
        note: "If the new details do not work for you, contact the club before the session starts.",
        ctaLabel: "View booking",
        closing: "Your place remains reserved unless the club contacts you separately.",
      };
    case "booking_reminder":
      return {
        subject: `Reminder: your booking is coming up — ${context.reference}`,
        eyebrow: "Coming up",
        title: "Your booking is coming up",
        intro: `Hi ${name}, this is a reminder for your ${service.toLowerCase()} booking in about 24 hours.`,
        note:
          context.paymentStatus === "paid"
            ? "Your payment is verified. Arrive a few minutes early and bring your booking reference."
            : `Payment status: ${paymentStatusMeta(context.paymentStatus).label}. Settle any balance before you arrive.`,
        ctaLabel: "View booking",
        closing: "Need to change or cancel? Contact the club at least 24 hours before the first start time.",
      };
  }
}

export function renderPlayerEmail(
  event: PlayerEmailEvent,
  context: PlayerEmailContext,
): EmailContent {
  const copy = playerCopy(event, context);
  const amountLabel =
    context.paymentStatus === "paid" ? "Amount paid" : "Amount due";
  const detailRows = [
    { label: "Reference", value: escapeHtml(context.reference) },
    {
      label: "Service",
      value: escapeHtml(serviceName(context)),
    },
    { label: "When", value: whenHtml(context.items) },
    {
      label: "Booking status",
      value: escapeHtml(bookingStatusMeta(context.status).label),
    },
    {
      label: "Payment",
      value: escapeHtml(paymentStatusMeta(context.paymentStatus).label),
    },
    { label: amountLabel, value: escapeHtml(formatPeso(context.amountPhp)) },
  ];

  if (context.items.length === 1) {
    detailRows.splice(3, 0, {
      label: "Court",
      value: escapeHtml(context.items[0].courtName || "Court"),
    });
  }

  const html = emailShell({
    ...copy,
    detailRows,
    ctaUrl: context.accountUrl,
  });
  const text = [
    copy.title,
    "",
    copy.intro,
    "",
    ...detailRows.map(
      (row) => `${row.label}: ${row.value.replace(/<[^>]+>/g, " ")}`,
    ),
    "",
    copy.note ?? "",
    "",
    `${copy.ctaLabel}: ${context.accountUrl}`,
    "",
    copy.closing ?? "",
    "",
    "D-Hidden Pickleball Court & Bistro",
    CLUB.addressFull,
    `${CLUB.phoneDisplay} · ${CLUB.email}`,
    "",
    "This is a transactional message about your booking.",
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n");

  return { subject: copy.subject, html, text };
}

export function renderStaffEmail(
  event: "staff_new_booking" | "staff_payment_proof" | "staff_booking_cancelled",
  context: StaffEmailContext,
): EmailContent {
  const service = context.openPlayLevel
    ? `${openPlayLevelLabel(context.openPlayLevel)} open play`
    : context.courtName || "Court booking";
  const when =
    context.startsAt && context.endsAt
      ? `${formatBookingDate(context.startsAt)} · ${formatBookingTimeRange(
          context.startsAt,
          context.endsAt,
        )} · Asia/Manila`
      : "Time to be confirmed";

  const copy =
    event === "staff_new_booking"
      ? {
          subject: `New booking — ${context.reference}`,
          eyebrow: "New booking",
          title: "A new booking needs attention",
          intro: `${context.playerName || "A player"} just booked ${service.toLowerCase()}.`,
          ctaLabel: "Open staff booking",
          ctaUrl: context.bookingUrl,
        }
      : event === "staff_payment_proof"
        ? {
            subject: `Payment proof to review — ${context.reference}`,
            eyebrow: "Payment review",
            title: "A payment proof is waiting",
            intro: `${context.playerName || "A player"} submitted proof for ${context.reference}. Check the actual transfer before approving.`,
            ctaLabel: "Open payment queue",
            ctaUrl: context.paymentUrl,
          }
        : {
            subject: `Booking cancelled — ${context.reference}`,
            eyebrow: "Booking cancelled",
            title: "A booking was cancelled",
            intro: `${context.playerName || "A player"} had a booking cancelled.`,
            ctaLabel: "Open staff booking",
            ctaUrl: context.bookingUrl,
          };

  const detailRows = [
    { label: "Reference", value: escapeHtml(context.reference) },
    { label: "Player", value: escapeHtml(context.playerName || "Player") },
    {
      label: "Player email",
      value: escapeHtml(context.playerEmail || "Not available"),
    },
    { label: "Service", value: escapeHtml(service) },
    { label: "When", value: escapeHtml(when) },
    {
      label: "Booking status",
      value: escapeHtml(bookingStatusMeta(context.status).label),
    },
    {
      label: "Payment",
      value: escapeHtml(paymentStatusMeta(context.paymentStatus).label),
    },
    { label: "Amount", value: escapeHtml(formatPeso(context.amountPhp)) },
  ];

  if (context.cancellationReason) {
    detailRows.push({
      label: "Cancellation reason",
      value: escapeHtml(context.cancellationReason),
    });
  }

  const html = emailShell({
    ...copy,
    detailRows,
    note: "Staff-only operational alert. Do not forward customer contact details.",
  });
  const text = [
    copy.title,
    "",
    copy.intro,
    "",
    ...detailRows.map((row) => `${row.label}: ${row.value}`),
    "",
    `${copy.ctaLabel}: ${copy.ctaUrl}`,
    "",
    "D-Hidden Pickleball Court & Bistro",
  ].join("\n");

  return { subject: copy.subject, html, text };
}

export function renderSessionFullEmail(context: SessionFullContext): EmailContent {
  const level = openPlayLevelLabel(context.level);
  const when = `${formatBookingDate(context.startsAt)} · ${formatBookingTimeRange(
    context.startsAt,
    new Date(
      new Date(context.startsAt).getTime() + context.durationMinutes * 60000,
    ).toISOString(),
  )} · Asia/Manila`;

  const detailRows = [
    { label: "Session", value: escapeHtml(`${level} open play`) },
    { label: "When", value: escapeHtml(when) },
    {
      label: "Places",
      value: `${context.registered} registered / ${context.capacity} capacity`,
    },
    { label: "Price", value: escapeHtml(formatPeso(context.amountPhp)) },
  ];
  const html = emailShell({
    eyebrow: "Session full",
    title: "An open-play session is full",
    intro: "The last place has been taken. Check the roster and payment queue before the session.",
    detailRows,
    note: "This alert is sent once per session.",
    ctaLabel: "Open staff session",
    ctaUrl: context.staffUrl,
  });
  const text = [
    "An open-play session is full",
    "",
    ...detailRows.map((row) => `${row.label}: ${row.value}`),
    "",
    `Open staff session: ${context.staffUrl}`,
    "",
    "D-Hidden Pickleball Court & Bistro",
  ].join("\n");

  return {
    subject: `Open-play session full — ${when}`,
    html,
    text,
  };
}
