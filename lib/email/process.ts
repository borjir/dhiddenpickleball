import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  type BookingStatus,
  type PaymentStatus,
} from "@/lib/bookings";
import type { OpenPlaySkillLevel } from "@/lib/open-play";
import {
  siteUrl,
  staffNotificationRecipients,
  isEmailConfigured,
  isEmailEventEnabled,
  emailDailyLimit,
  emailMonthlyLimit,
} from "./config";
import { sendEmail } from "./provider";
import {
  renderPlayerEmail,
  renderSessionFullEmail,
  renderStaffEmail,
  type EmailItem,
  type PlayerEmailContext,
  type StaffEmailContext,
} from "./templates";
import type {
  EmailContent,
  EmailOutboxRow,
  EmailProcessResult,
  PlayerEmailEvent,
} from "./types";

type Person = { full_name: string | null; email: string | null };

type BookingRecord = {
  id: string;
  reference: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  amount_php: number | string;
  hold_expires_at: string | null;
  cancellation_reason: string | null;
  group_id: string | null;
  customer: Person | null;
  service: { code: string; name: string } | null;
  court_reservations: Array<{ court: { name: string } | null }> | null;
  open_play_registrations: Array<{
    session: { skill_level: OpenPlaySkillLevel } | null;
  }> | null;
};

type GroupRecord = {
  id: string;
  reference: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  amount_php: number | string;
  hold_expires_at: string | null;
  cancellation_reason: string | null;
  customer: Person | null;
  bookings: Array<{
    starts_at: string;
    ends_at: string;
    amount_php: number | string;
    court_reservations: Array<{ court: { name: string } | null }> | null;
  }>;
};

type PaymentRecord = {
  rejection_reason: string | null;
  method: string | null;
};

type LoadedEmail = {
  to: string[];
  content: EmailContent;
};

type LoadedSkip = { skip: string };

function isStaffEvent(row: EmailOutboxRow) {
  return row.audience === "staff";
}

function paymentTarget(row: EmailOutboxRow) {
  return row.group_id
    ? { column: "group_id" as const, id: row.group_id }
    : { column: "booking_id" as const, id: row.booking_id };
}

async function loadLatestPayment(
  admin: SupabaseClient,
  row: EmailOutboxRow,
): Promise<PaymentRecord | null> {
  const target = paymentTarget(row);
  if (!target.id) return null;

  const { data } = await admin
    .from("payments")
    .select("rejection_reason, method")
    .eq(target.column, target.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as PaymentRecord | null) ?? null;
}

function bookingItems(
  rows: Array<{
    starts_at: string;
    ends_at: string;
    amount_php: number | string;
    court_reservations: Array<{ court: { name: string } | null }> | null;
  }>,
): EmailItem[] {
  return rows
    .slice()
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    )
    .map((item) => ({
      startsAt: item.starts_at,
      endsAt: item.ends_at,
      amountPhp: Number(item.amount_php),
      courtName: item.court_reservations?.[0]?.court?.name ?? "Court",
    }));
}

function lookupUrl(reference: string) {
  return `${siteUrl()}/lookup?reference=${encodeURIComponent(reference)}`;
}

function staffBookingUrl(reference: string) {
  return `${siteUrl()}/staff/bookings/${encodeURIComponent(reference)}`;
}

async function loadBookingEmail(
  admin: SupabaseClient,
  row: EmailOutboxRow,
): Promise<LoadedEmail | LoadedSkip> {
  if (row.group_id) {
    const { data, error } = await admin
      .from("booking_groups")
      .select(
        `id, reference, status, payment_status, amount_php, hold_expires_at,
         cancellation_reason,
         customer:customers!booking_groups_customer_id_fkey(full_name, email),
         bookings!bookings_group_id_fkey(
           starts_at, ends_at, amount_php,
           court_reservations(court:courts(name))
         )`,
      )
      .eq("id", row.group_id)
      .maybeSingle();

    if (error || !data) {
      return { skip: "Reservation data is no longer available." };
    }

    const group = data as unknown as GroupRecord;
    const latestPayment = await loadLatestPayment(admin, row);
    const items = bookingItems(group.bookings ?? []);
    const context: PlayerEmailContext = {
      reference: group.reference,
      playerName: group.customer?.full_name ?? "",
      playerEmail: group.customer?.email ?? "",
      status: group.status,
      paymentStatus: group.payment_status,
      amountPhp: Number(group.amount_php),
      holdExpiresAt: group.hold_expires_at,
      cancellationReason: group.cancellation_reason,
      rejectionReason: latestPayment?.rejection_reason ?? null,
      items,
      isOpenPlay: false,
      openPlayLevel: null,
      isGroup: true,
      accountUrl: lookupUrl(group.reference),
    };

    if (isStaffEvent(row)) {
      const to = staffNotificationRecipients();
      if (to.length === 0) {
        return { skip: "No staff notification recipients are configured." };
      }

      const staffContext: StaffEmailContext = {
        reference: group.reference,
        playerName: context.playerName,
        playerEmail: context.playerEmail,
        status: group.status,
        paymentStatus: group.payment_status,
        amountPhp: context.amountPhp,
        startsAt: items[0]?.startsAt ?? null,
        endsAt: items[0]?.endsAt ?? null,
        courtName: items[0]?.courtName ?? "Court",
        openPlayLevel: null,
        cancellationReason: group.cancellation_reason,
        bookingUrl: staffBookingUrl(group.reference),
        paymentUrl: `${siteUrl()}/staff/payments`,
      };

      return {
        to,
        content: renderStaffEmail(
          row.event as
            | "staff_new_booking"
            | "staff_payment_proof"
            | "staff_booking_cancelled",
          staffContext,
        ),
      };
    }

    if (!context.playerEmail) {
      return { skip: "The customer has no email address." };
    }

    return {
      to: [context.playerEmail],
      content: renderPlayerEmail(
        row.event as PlayerEmailEvent,
        context,
      ),
    };
  }

  if (!row.booking_id) {
    return { skip: "The email event has no booking target." };
  }

  const { data, error } = await admin
    .from("bookings")
    .select(
      `id, reference, starts_at, ends_at, status, payment_status, amount_php,
       hold_expires_at, cancellation_reason, group_id,
       customer:customers!bookings_customer_id_fkey(full_name, email),
       service:services!bookings_service_id_fkey(code, name),
       court_reservations(court:courts(name)),
       open_play_registrations(session:open_play_sessions(skill_level))`,
    )
    .eq("id", row.booking_id)
    .maybeSingle();

  if (error || !data) {
    return { skip: "Booking data is no longer available." };
  }

  const booking = data as unknown as BookingRecord;
  const latestPayment = await loadLatestPayment(admin, row);
  const isOpenPlay =
    booking.service?.code === "open_play" ||
    Boolean(booking.open_play_registrations?.length);
  const openPlayLevel =
    booking.open_play_registrations?.[0]?.session?.skill_level ?? null;
  const items: EmailItem[] = [
    {
      startsAt: booking.starts_at,
      endsAt: booking.ends_at,
      amountPhp: Number(booking.amount_php),
      courtName: isOpenPlay
        ? "Open play"
        : (booking.court_reservations?.[0]?.court?.name ?? "Court"),
    },
  ];
  const context: PlayerEmailContext = {
    reference: booking.reference,
    playerName: booking.customer?.full_name ?? "",
    playerEmail: booking.customer?.email ?? "",
    status: booking.status,
    paymentStatus: booking.payment_status,
    amountPhp: Number(booking.amount_php),
    holdExpiresAt: booking.hold_expires_at,
    cancellationReason: booking.cancellation_reason,
    rejectionReason: latestPayment?.rejection_reason ?? null,
    items,
    isOpenPlay,
    openPlayLevel,
    isGroup: false,
    accountUrl: lookupUrl(booking.reference),
  };

  if (isStaffEvent(row)) {
    const to = staffNotificationRecipients();
    if (to.length === 0) {
      return { skip: "No staff notification recipients are configured." };
    }

    const staffContext: StaffEmailContext = {
      reference: booking.reference,
      playerName: context.playerName,
      playerEmail: context.playerEmail,
      status: booking.status,
      paymentStatus: booking.payment_status,
      amountPhp: context.amountPhp,
      startsAt: booking.starts_at,
      endsAt: booking.ends_at,
      courtName: isOpenPlay
        ? "Open play"
        : (booking.court_reservations?.[0]?.court?.name ?? "Court"),
      openPlayLevel,
      cancellationReason: booking.cancellation_reason,
      bookingUrl: staffBookingUrl(booking.reference),
      paymentUrl: `${siteUrl()}/staff/payments`,
    };

    return {
      to,
      content: renderStaffEmail(
        row.event as
          | "staff_new_booking"
          | "staff_payment_proof"
          | "staff_booking_cancelled",
        staffContext,
      ),
    };
  }

  if (!context.playerEmail) {
    return { skip: "The customer has no email address." };
  }

  return {
    to: [context.playerEmail],
    content: renderPlayerEmail(row.event as PlayerEmailEvent, context),
  };
}

async function loadSessionFullEmail(
  admin: SupabaseClient,
  row: EmailOutboxRow,
): Promise<LoadedEmail | LoadedSkip> {
  const to = staffNotificationRecipients();
  if (to.length === 0) {
    return { skip: "No staff notification recipients are configured." };
  }
  if (!row.session_id) {
    return { skip: "The session-full alert has no session target." };
  }

  const { data, error } = await admin
    .from("open_play_sessions")
    .select(
      "id, starts_at, duration_minutes, skill_level, capacity, amount_php",
    )
    .eq("id", row.session_id)
    .maybeSingle();

  if (error || !data) {
    return { skip: "Session data is no longer available." };
  }

  const session = data as unknown as {
    id: string;
    starts_at: string;
    duration_minutes: number;
    skill_level: OpenPlaySkillLevel;
    capacity: number;
    amount_php: number | string;
  };
  const { count } = await admin
    .from("open_play_registrations")
    .select("*", { count: "exact", head: true })
    .eq("session_id", session.id)
    .in("status", ["registered", "attended"]);

  return {
    to,
    content: renderSessionFullEmail({
      sessionId: session.id,
      startsAt: session.starts_at,
      durationMinutes: session.duration_minutes,
      level: session.skill_level,
      capacity: session.capacity,
      registered: count ?? 0,
      amountPhp: Number(session.amount_php),
      staffUrl: `${siteUrl()}/staff/open-play/${session.id}`,
    }),
  };
}

async function complete(
  admin: SupabaseClient,
  row: EmailOutboxRow,
  status: "sent" | "failed" | "skipped",
  providerMessageId: string | null,
  error: string | null,
) {
  const { error: completeError } = await admin.rpc(
    "complete_email_delivery",
    {
      p_id: row.id,
      p_status: status,
      p_provider_message_id: providerMessageId,
      p_error: error,
    },
  );

  if (completeError) {
    console.error(
      `[email] Could not record delivery for ${row.id}:`,
      completeError.message,
    );
  }
}

/** Never send a stale confirmation or reminder after an outage. */
const MAX_EMAIL_AGE_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
}

function startOfUtcMonth() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
}

/**
 * Count delivered outbox rows since a UTC boundary; null means it failed.
 * Current enabled events have one guest recipient per row. If staff alerts are
 * re-enabled, include their recipient count so the quota guard stays accurate.
 */
async function sentSince(admin: SupabaseClient, since: string) {
  const { count, error } = await admin
    .from("email_outbox")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("sent_at", since);

  if (error) {
    console.error("[email] Could not read sent email count:", error.message);
    return null;
  }

  return count ?? 0;
}

/**
 * Drain a small batch of the email outbox. The route and server actions call
 * this; it is safe to run concurrently because claim_email_outbox uses
 * FOR UPDATE SKIP LOCKED.
 *
 * Both caps protect the Resend free plan. Rows left over stay queued for the
 * next day, subject to the age cutoff above.
 */
export async function processEmailOutbox(
  limit = 25,
): Promise<EmailProcessResult> {
  const result: EmailProcessResult = {
    claimed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    queued: 0,
    providerConfigured: isEmailConfigured(),
  };

  if (!result.providerConfigured) return result;

  const admin = createAdminClient();
  if (!admin) return result;

  const [deliveredToday, deliveredThisMonth] = await Promise.all([
    sentSince(admin, startOfUtcDay()),
    sentSince(admin, startOfUtcMonth()),
  ]);

  if (deliveredToday === null || deliveredThisMonth === null) return result;

  const remaining = Math.max(
    Math.min(
      emailDailyLimit() - deliveredToday,
      emailMonthlyLimit() - deliveredThisMonth,
    ),
    0,
  );
  if (remaining === 0) return result;

  const { data, error } = await admin.rpc("claim_email_outbox", {
    p_limit: Math.min(limit, remaining),
  });

  if (error) {
    console.error("[email] Could not claim outbox rows:", error.message);
    return result;
  }

  const rows = (data ?? []) as EmailOutboxRow[];
  result.claimed = rows.length;

  for (const row of rows) {
    try {
      const age = Date.now() - new Date(row.created_at).getTime();

      if (!Number.isFinite(age) || age > MAX_EMAIL_AGE_MS) {
        await complete(
          admin,
          row,
          "skipped",
          null,
          "Email expired before it could be delivered.",
        );
        result.skipped += 1;
        continue;
      }

      if (!isEmailEventEnabled(row.event)) {
        await complete(
          admin,
          row,
          "skipped",
          null,
          "This email event is intentionally not sent.",
        );
        result.skipped += 1;
        continue;
      }

      const loaded =
        row.event === "staff_session_full"
          ? await loadSessionFullEmail(admin, row)
          : await loadBookingEmail(admin, row);

      if ("skip" in loaded) {
        await complete(admin, row, "skipped", null, loaded.skip);
        result.skipped += 1;
        continue;
      }

      const delivered = await sendEmail({
        to: loaded.to,
        subject: loaded.content.subject,
        html: loaded.content.html,
        text: loaded.content.text,
        idempotencyKey: row.dedupe_key,
      });

      if (delivered.status === "sent") {
        await complete(
          admin,
          row,
          "sent",
          delivered.providerMessageId,
          null,
        );
        result.sent += 1;
      } else {
        await complete(admin, row, "failed", null, delivered.error);
        result.failed += 1;
      }
    } catch (error) {
      await complete(
        admin,
        row,
        "failed",
        null,
        error instanceof Error ? error.message : "Email processing failed.",
      );
      result.failed += 1;
    }
  }

  result.queued = Math.max(
    result.claimed - result.sent - result.failed - result.skipped,
    0,
  );

  return result;
}
