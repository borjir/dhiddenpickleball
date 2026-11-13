"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  enqueueBookingEmail,
  enqueueGuestBookingEmail,
} from "@/lib/email/events";
import { notifyBookingUpdate } from "@/lib/notifications/events";
import { requireAccountManager, requireStaff } from "@/lib/staff/auth";
import { purgePaymentProofs } from "@/lib/storage/purge-proofs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/email/config";
import { manilaLocalToIso, manilaTimeRange } from "@/lib/staff/time";

const uuid = z.string().uuid();
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry.trim() : "";
}

function fail(path: string, message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`${path}?${params.toString()}`);
}

function safeStaffPath(value: string, fallback: string) {
  if (!/^\/staff(?:\/|$)/.test(value) || value.includes("\\")) return fallback;
  return value;
}

function succeed(path: string, message: string): never {
  const params = new URLSearchParams({ notice: message });
  redirect(`${path}?${params.toString()}`);
}

function rpcMessage(error: { message?: string } | null, fallback: string) {
  const message = error?.message?.trim();
  if (!message) return fallback;

  if (message.includes("Staff access is required")) {
    return "Your account no longer has staff access.";
  }

  return message.length > 220 ? fallback : message;
}

export async function reviewPaymentAction(formData: FormData) {
  const { supabase } = await requireStaff();
  const returnPath = safeStaffPath(value(formData, "returnPath"), "/staff/payments");
  const paymentId = value(formData, "paymentId");
  const decision = value(formData, "decision");
  const reason = value(formData, "reason");

  const parsed = z
    .object({
      paymentId: uuid,
      decision: z.enum(["approve", "reject"]),
      reason: optionalText(500),
    })
    .safeParse({ paymentId, decision, reason: reason || undefined });

  if (!parsed.success) {
    fail(returnPath, "Choose a valid payment and review decision.");
  }

  if (parsed.data.decision === "reject" && !parsed.data.reason) {
    fail(returnPath, "Add a reason before rejecting a payment.");
  }

  const { data: paymentTarget, error: paymentTargetError } = await supabase
    .from("payments")
    .select("booking_id, group_id")
    .eq("id", parsed.data.paymentId)
    .maybeSingle();

  if (paymentTargetError || !paymentTarget) {
    fail(returnPath, "That payment could not be found.");
  }

  const { error } = await supabase.rpc("staff_review_payment", {
    p_payment_id: parsed.data.paymentId,
    p_decision: parsed.data.decision,
    p_reason: parsed.data.reason,
  });

  if (error) {
    fail(returnPath, rpcMessage(error, "The payment could not be reviewed."));
  }

  await enqueueBookingEmail(
    supabase,
    parsed.data.decision === "approve"
      ? "payment_approved"
      : "payment_rejected",
    {
      bookingId: paymentTarget.booking_id,
      groupId: paymentTarget.group_id,
    },
  );

  revalidatePath("/staff", "layout");
  revalidatePath("/staff/payments");
  succeed(
    returnPath,
    parsed.data.decision === "approve"
      ? "Payment verified and marked paid."
      : "Payment proof rejected and the note saved.",
  );
}

export async function recordPaymentAction(formData: FormData) {
  const { supabase } = await requireStaff();
  const returnPath = safeStaffPath(value(formData, "returnPath"), "/staff/payments");
  const bookingId = value(formData, "bookingId");
  const groupId = value(formData, "groupId");
  const method = value(formData, "method") || "cash";
  const reference = value(formData, "reference");

  const parsed = z
    .object({
      bookingId: z.string().uuid().optional().or(z.literal("")),
      groupId: z.string().uuid().optional().or(z.literal("")),
      method: z.enum(["cash", "gcash", "maya", "bank_transfer"]),
      reference: optionalText(120),
    })
    .safeParse({
      bookingId: bookingId || undefined,
      groupId: groupId || undefined,
      method,
      reference: reference || undefined,
    });

  if (
    !parsed.success ||
    Boolean(parsed.data.bookingId) === Boolean(parsed.data.groupId)
  ) {
    fail(returnPath, "Choose one booking or reservation group.");
  }

  const { error } = await supabase.rpc("staff_record_payment", {
    p_booking_id: parsed.data.bookingId || null,
    p_group_id: parsed.data.groupId || null,
    p_method: parsed.data.method,
    p_reference: parsed.data.reference,
  });

  if (error) {
    fail(returnPath, rpcMessage(error, "The payment could not be recorded."));
  }

  await enqueueBookingEmail(supabase, "payment_approved", {
    bookingId: parsed.data.bookingId || null,
    groupId: parsed.data.groupId || null,
  });

  revalidatePath("/staff", "layout");
  revalidatePath("/staff/bookings");
  revalidatePath("/staff/payments");
  succeed(returnPath, "Payment recorded as paid.");
}

export async function updateBookingStatusAction(formData: FormData) {
  const { supabase } = await requireStaff();
  const returnPath = safeStaffPath(value(formData, "returnPath"), "/staff/bookings");
  const targetType = value(formData, "targetType");
  const targetId = value(formData, "targetId");
  const status = value(formData, "status");
  const reason = value(formData, "reason");

  const parsed = z
    .object({
      targetType: z.enum(["booking", "group"]),
      targetId: uuid,
      status: z.enum(["confirmed", "cancelled", "completed", "no_show"]),
      reason: optionalText(500),
    })
    .safeParse({
      targetType,
      targetId,
      status,
      reason: reason || undefined,
    });

  if (!parsed.success) {
    fail(returnPath, "Choose a valid booking status.");
  }

  if (parsed.data.status === "cancelled" && !parsed.data.reason) {
    fail(returnPath, "Add a reason before cancelling.");
  }

  const { error } =
    parsed.data.targetType === "group"
      ? await supabase.rpc("staff_update_group_status", {
          p_group_id: parsed.data.targetId,
          p_status: parsed.data.status,
          p_reason: parsed.data.reason,
        })
      : await supabase.rpc("staff_update_booking_status", {
          p_booking_id: parsed.data.targetId,
          p_status: parsed.data.status,
          p_reason: parsed.data.reason,
        });

  if (error) {
    fail(returnPath, rpcMessage(error, "The booking status could not be changed."));
  }

  const target =
    parsed.data.targetType === "group"
      ? { groupId: parsed.data.targetId }
      : { bookingId: parsed.data.targetId };

  if (parsed.data.status === "cancelled") {
    await enqueueBookingEmail(supabase, "booking_cancelled", target);
  } else {
    await notifyBookingUpdate(
      supabase,
      parsed.data.status === "confirmed"
        ? "booking_confirmed"
        : parsed.data.status === "completed"
          ? "booking_completed"
          : "booking_no_show",
      target,
    );
  }

  const labels = {
    confirmed: "Booking confirmed.",
    cancelled: "Booking cancelled and the court time released.",
    completed: "Booking marked completed.",
    no_show: "Booking marked as a no-show.",
  } as const;

  revalidatePath("/staff", "layout");
  revalidatePath("/staff/bookings");
  succeed(returnPath, labels[parsed.data.status]);
}

export async function createWalkInAction(formData: FormData) {
  const { supabase } = await requireStaff();
  const returnPath = safeStaffPath(value(formData, "returnPath"), "/staff/bookings/new");
  const fullName = value(formData, "fullName").trim();
  const mobile = value(formData, "mobile").trim();
  const email = value(formData, "email").trim().toLowerCase();
  const courtId = value(formData, "courtId");
  const date = value(formData, "date");
  const time = value(formData, "time");
  const duration = value(formData, "duration");
  const collected = value(formData, "collected") === "yes";
  const method = value(formData, "method") || "cash";
  const reference = value(formData, "reference");
  const notes = value(formData, "notes");
  const startsAt = manilaLocalToIso(date, time);

  const parsed = z
    .object({
      fullName: z
        .string()
        .min(2, "Enter the guest's full name.")
        .max(100, "Keep the name under 100 characters."),
      mobile: z
        .string()
        .refine(
          (candidate) => /^(?:\+?63|0)9\d{9}$/.test(candidate.replace(/[\s()-]/g, "")),
          "Enter a valid Philippine mobile number, for example 0917 123 4567.",
        ),
      email: z
        .union([z.literal(""), z.string().email("Enter a valid email address.")])
        .optional(),
      courtId: uuid,
      startsAt: z.string().datetime(),
      duration: z.coerce.number().int().min(60).max(1020),
      collected: z.boolean(),
      method: z.enum(["cash", "gcash", "maya", "bank_transfer"]),
      reference: optionalText(120),
      notes: optionalText(500),
    })
    .safeParse({
      fullName,
      mobile,
      email: email || "",
      courtId,
      startsAt,
      duration,
      collected,
      method,
      reference: reference || undefined,
      notes: notes || undefined,
    });

  if (!parsed.success || !startsAt) {
    fail(returnPath, "Check the guest name, mobile number, court, date, and time.");
  }

  if (parsed.data.duration % 60 !== 0) {
    fail(returnPath, "Choose a whole number of hours.");
  }

  const { data, error } = await supabase.rpc("staff_create_walk_in_booking", {
    p_full_name: parsed.data.fullName,
    p_mobile: parsed.data.mobile,
    p_court_id: parsed.data.courtId,
    p_starts_at: parsed.data.startsAt,
    p_duration_minutes: parsed.data.duration,
    p_collected: parsed.data.collected,
    p_method: parsed.data.method,
    p_reference: parsed.data.reference,
    p_notes: parsed.data.notes,
    p_email: parsed.data.email || null,
  });

  if (error) {
    fail(returnPath, rpcMessage(error, "The walk-in booking could not be created."));
  }

  const booking = Array.isArray(data) ? data[0] : data;

  if (!booking?.reference) {
    fail(returnPath, "The walk-in was created, but its reference was not returned.");
  }

  if (booking.id) {
    await enqueueGuestBookingEmail("court_booking_received", {
      bookingId: booking.id,
    });
  }

  revalidatePath("/staff", "layout");
  revalidatePath("/staff/bookings");
  redirect(`/staff/bookings/${encodeURIComponent(booking.reference)}?notice=Walk-in booking created.`);
}

export async function createOpenPlaySessionAction(formData: FormData) {
  const { supabase } = await requireStaff();
  const returnPath = "/staff/open-play";
  const date = value(formData, "date");
  const time = value(formData, "time");
  const endTime = value(formData, "endTime");
  const level = value(formData, "level");
  const capacity = value(formData, "capacity");
  const amount = value(formData, "amount");
  const range = manilaTimeRange(date, time, endTime);

  const parsed = z
    .object({
      startsAt: z.string().datetime(),
      duration: z.number().int().min(15).max(1440),
      level: z.enum(["beginner", "intermediate", "advanced"]),
      capacity: z.coerce.number().int().min(1).max(100),
      amount: z.coerce.number().min(0).max(100000),
    })
    .safeParse({
      startsAt: range?.startsAt,
      duration: range?.minutes,
      level,
      capacity,
      amount,
    });

  if (!parsed.success) {
    fail(
      returnPath,
      "Check the session date, start and end times, capacity, and price.",
    );
  }

  const { error } = await supabase.from("open_play_sessions").insert({
    starts_at: parsed.data.startsAt,
    duration_minutes: parsed.data.duration,
    skill_level: parsed.data.level,
    capacity: parsed.data.capacity,
    amount_php: parsed.data.amount,
  });

  if (error) {
    fail(
      returnPath,
      error.code === "23505"
        ? "A session already exists at that time and level."
        : "The session could not be created.",
    );
  }

  revalidatePath("/staff", "layout");
  revalidatePath("/staff/open-play");
  succeed(returnPath, "Open-play session created.");
}

export async function updateOpenPlaySessionAction(formData: FormData) {
  const { supabase } = await requireStaff();
  const sessionId = value(formData, "sessionId");
  const returnPath = `/staff/open-play/${sessionId}`;
  const date = value(formData, "date");
  const time = value(formData, "time");
  const endTime = value(formData, "endTime");
  const level = value(formData, "level");
  const capacity = value(formData, "capacity");
  const amount = value(formData, "amount");
  const status = value(formData, "status");
  const reason = value(formData, "reason");
  const range = manilaTimeRange(date, time, endTime);

  const parsed = z
    .object({
      sessionId: uuid,
      startsAt: z.string().datetime(),
      duration: z.number().int().min(15).max(1440),
      level: z.enum(["beginner", "intermediate", "advanced"]),
      capacity: z.coerce.number().int().min(1).max(100),
      amount: z.coerce.number().min(0).max(100000),
      status: z.enum(["scheduled", "cancelled", "completed"]),
      reason: optionalText(500),
    })
    .safeParse({
      sessionId,
      startsAt: range?.startsAt,
      duration: range?.minutes,
      level,
      capacity,
      amount,
      status,
      reason: reason || undefined,
    });

  if (!parsed.success) {
    fail(returnPath, "Check the session details and try again.");
  }

  const { data: activeRegistrations } = await supabase
    .from("open_play_registrations")
    .select("booking_id")
    .eq("session_id", parsed.data.sessionId)
    .in("status", ["registered", "attended"]);

  const { data: previousSession } = await supabase
    .from("open_play_sessions")
    .select("starts_at, duration_minutes, skill_level, capacity, amount_php")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();

  if (parsed.data.status === "cancelled") {
    if (!parsed.data.reason) {
      fail(returnPath, "Add a reason before cancelling this session.");
    }

    const { error } = await supabase.rpc("staff_cancel_open_play_session", {
      p_session_id: parsed.data.sessionId,
      p_reason: parsed.data.reason,
    });

    if (error) {
      fail(returnPath, rpcMessage(error, "The session could not be cancelled."));
    }

    for (const registration of activeRegistrations ?? []) {
      if (registration.booking_id) {
        await enqueueBookingEmail(supabase, "booking_cancelled", {
          bookingId: registration.booking_id,
        });
      }
    }

    revalidatePath("/staff", "layout");
    revalidatePath("/staff/open-play");
    succeed(returnPath, "Session cancelled and registered guests notified by email where they gave one.");
  }

  const { error } = await supabase
    .from("open_play_sessions")
    .update({
      starts_at: parsed.data.startsAt,
      duration_minutes: parsed.data.duration,
      skill_level: parsed.data.level,
      capacity: parsed.data.capacity,
      amount_php: parsed.data.amount,
      status: parsed.data.status,
    })
    .eq("id", parsed.data.sessionId);

  if (error) {
    fail(
      returnPath,
      error.code === "23505"
        ? "Another session already uses that time and level."
        : "The session could not be updated.",
    );
  }

  const detailsChanged =
    previousSession !== null &&
    (new Date(previousSession.starts_at).getTime() !==
      new Date(parsed.data.startsAt).getTime() ||
      previousSession.duration_minutes !== parsed.data.duration ||
      previousSession.skill_level !== parsed.data.level ||
      previousSession.capacity !== parsed.data.capacity ||
      Number(previousSession.amount_php) !== parsed.data.amount);

  if (detailsChanged) {
    for (const registration of activeRegistrations ?? []) {
      if (registration.booking_id) {
        await enqueueBookingEmail(supabase, "open_play_updated", {
          bookingId: registration.booking_id,
        });
      }
    }
  }

  revalidatePath("/staff", "layout");
  revalidatePath("/staff/open-play");
  succeed(returnPath, "Session details saved.");
}

export async function updateOpenPlayRegistrationAction(formData: FormData) {
  const { supabase } = await requireStaff();
  const returnPath = safeStaffPath(value(formData, "returnPath"), "/staff/open-play");
  const registrationId = value(formData, "registrationId");
  const status = value(formData, "status");

  const parsed = z
    .object({
      registrationId: uuid,
      status: z.enum(["registered", "cancelled", "attended", "no_show"]),
    })
    .safeParse({ registrationId, status });

  if (!parsed.success) {
    fail(returnPath, "Choose a valid attendance status.");
  }

  const { data: registrationTarget } = await supabase
    .from("open_play_registrations")
    .select("booking_id, status")
    .eq("id", parsed.data.registrationId)
    .maybeSingle();

  const { error } = await supabase.rpc("staff_update_open_play_registration", {
    p_registration_id: parsed.data.registrationId,
    p_status: parsed.data.status,
  });

  if (error) {
    fail(returnPath, rpcMessage(error, "The guest's attendance could not be updated."));
  }

  if (
    parsed.data.status === "cancelled" &&
    registrationTarget?.status !== "cancelled" &&
    registrationTarget?.booking_id
  ) {
    await enqueueBookingEmail(supabase, "booking_cancelled", {
      bookingId: registrationTarget.booking_id,
    });
  } else if (
    (parsed.data.status === "attended" ||
      parsed.data.status === "no_show") &&
    registrationTarget?.booking_id
  ) {
    await notifyBookingUpdate(
      supabase,
      parsed.data.status === "attended"
        ? "attendance_confirmed"
        : "attendance_no_show",
      { bookingId: registrationTarget.booking_id },
    );
  }

  revalidatePath("/staff", "layout");
  revalidatePath("/staff/open-play");
  succeed(returnPath, "Player attendance updated.");
}

export async function createCourtClosureAction(formData: FormData) {
  const { supabase, staff } = await requireStaff();
  const returnPath = "/staff/courts";
  const courtId = value(formData, "courtId");
  const date = value(formData, "date");
  const startTime = value(formData, "startTime");
  const endTime = value(formData, "endTime");
  const reason = value(formData, "reason");
  const startsAt = manilaLocalToIso(date, startTime);
  const endsAt = manilaLocalToIso(
    date,
    endTime,
    Boolean(startTime && endTime && endTime <= startTime),
  );

  const parsed = z
    .object({
      courtId: z.string().uuid().optional().or(z.literal("all")),
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime(),
      reason: z.string().trim().min(3).max(300),
    })
    .safeParse({
      courtId: courtId || "all",
      startsAt,
      endsAt,
      reason,
    });

  if (!parsed.success || !startsAt || !endsAt) {
    fail(returnPath, "Check the date, start time, end time, and reason.");
  }

  if (new Date(parsed.data.endsAt) <= new Date(parsed.data.startsAt)) {
    fail(returnPath, "The block must end after it starts.");
  }

  const { error } = await supabase.from("court_closures").insert({
    court_id: parsed.data.courtId === "all" ? null : parsed.data.courtId,
    starts_at: parsed.data.startsAt,
    ends_at: parsed.data.endsAt,
    reason: parsed.data.reason,
    created_by: staff.id,
  });

  if (error) {
    fail(returnPath, "The court block could not be saved.");
  }

  revalidatePath("/staff/courts");
  revalidatePath("/staff", "layout");
  succeed(returnPath, "Court block saved.");
}

export async function deleteCourtClosureAction(formData: FormData) {
  const { supabase } = await requireStaff();
  const returnPath = "/staff/courts";
  const closureId = value(formData, "closureId");

  if (!uuid.safeParse(closureId).success) {
    fail(returnPath, "That court block could not be identified.");
  }

  const { error } = await supabase
    .from("court_closures")
    .delete()
    .eq("id", closureId);

  if (error) {
    fail(returnPath, "The court block could not be removed.");
  }

  revalidatePath("/staff/courts");
  revalidatePath("/staff", "layout");
  succeed(returnPath, "Court block removed.");
}

// Service rates and operating hours -----------------------------------------
//
// Availability, amount calculation, and booking creation all read
// `service_rates` and `court_operating_hours` at call time, so editing these two
// tables takes effect immediately without a deploy or a function change.

export async function updateServiceRateAction(formData: FormData) {
  const { supabase } = await requireStaff();
  const returnPath = "/staff/courts";
  const rateId = value(formData, "rateId");
  const amount = Number(value(formData, "amount").replace(/,/g, ""));

  const parsed = z
    .object({
      rateId: uuid,
      amount: z.number().min(0).max(100000),
    })
    .safeParse({ rateId, amount });

  if (!parsed.success) {
    fail(returnPath, "Enter a rate between 0 and 100,000 pesos.");
  }

  const { error } = await supabase
    .from("service_rates")
    .update({ amount_php: parsed.data.amount })
    .eq("id", parsed.data.rateId);

  if (error) {
    fail(returnPath, "The rate could not be saved.");
  }

  revalidatePath("/staff/courts");
  revalidatePath("/book");
  revalidatePath("/");
  succeed(returnPath, "Rate updated. New bookings use the new price.");
}

/**
 * Runs the same storage cleanup the cron endpoint performs. It deletes only the
 * proofs of cancelled bookings, rejected payments and voided records; every
 * other screenshot is kept permanently.
 */
export async function purgeProofsAction() {
  await requireStaff();

  const result = await purgePaymentProofs();

  if (!result.ok) {
    fail("/staff/reports", result.error);
  }

  revalidatePath("/staff/reports");
  succeed("/staff/reports", result.message);
}

function minutesFromTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59) return null;

  const total = hours * 60 + minutes;
  return total >= 0 && total <= 1440 ? total : null;
}

export async function updateCourtHoursAction(formData: FormData) {
  const { supabase } = await requireStaff();
  const returnPath = "/staff/courts";
  const courtId = value(formData, "courtId");
  const dayOfWeek = Number(value(formData, "dayOfWeek"));
  const isClosed = value(formData, "isClosed") === "on";
  const opens = minutesFromTime(value(formData, "opensAt"));
  const closes = minutesFromTime(value(formData, "closesAt"));

  const parsed = z
    .object({
      courtId: uuid,
      dayOfWeek: z.number().int().min(0).max(6),
    })
    .safeParse({ courtId, dayOfWeek });

  if (!parsed.success) {
    fail(returnPath, "Choose a court and a day.");
  }

  if (!isClosed && (opens === null || closes === null || opens >= closes)) {
    fail(returnPath, "Opening time must be earlier than closing time.");
  }

  const { error } = await supabase.from("court_operating_hours").upsert(
    {
      court_id: parsed.data.courtId,
      day_of_week: parsed.data.dayOfWeek,
      opens_at_minute: isClosed ? 0 : opens!,
      closes_at_minute: isClosed ? 0 : closes!,
      is_closed: isClosed,
    },
    { onConflict: "court_id,day_of_week" },
  );

  if (error) {
    fail(returnPath, "The operating hours could not be saved.");
  }

  revalidatePath("/staff/courts");
  revalidatePath("/book");
  succeed(returnPath, "Operating hours updated.");
}

// Account management ---------------------------------------------------------

export async function inviteStaffAccountAction(formData: FormData) {
  const { staff } = await requireAccountManager();
  const returnPath = "/staff/accounts";
  const email = value(formData, "email").toLowerCase();
  const fullName = value(formData, "fullName");

  const parsed = z
    .object({
      email: z.string().email(),
      fullName: z.string().trim().min(2).max(120),
    })
    .safeParse({ email, fullName });

  if (!parsed.success) {
    fail(returnPath, "Enter a full name and a valid email address.");
  }

  if (parsed.data.email === staff.email.toLowerCase()) {
    fail(returnPath, "That is your own account.");
  }

  const admin = createAdminClient();
  if (!admin) {
    fail(returnPath, "Account management needs SUPABASE_SERVICE_ROLE_KEY on the server.");
  }

  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: { full_name: parsed.data.fullName },
      redirectTo: `${siteUrl()}/auth/callback?next=/staff-access/reset-password`,
    },
  );

  if (error || !invited?.user) {
    const message = error?.message?.toLowerCase() ?? "";

    if (message.includes("already")) {
      fail(returnPath, "That email already has an account. Reset its password instead.");
    }

    if (message.includes("rate") || message.includes("limit")) {
      fail(
        returnPath,
        "The invitation email was rate-limited. Wait an hour or create the user in the Supabase dashboard.",
      );
    }

    fail(returnPath, "The invitation could not be sent.");
  }

  const { error: promoteError } = await admin
    .from("profiles")
    .update({ role: "staff", full_name: parsed.data.fullName })
    .eq("id", invited.user.id);

  if (promoteError) {
    fail(
      returnPath,
      "The invitation was sent, but staff access could not be granted. Set the role in SQL.",
    );
  }

  revalidatePath("/staff/accounts");
  succeed(
    returnPath,
    `Invitation sent to ${parsed.data.email}. They set their own password from the email.`,
  );
}

export async function setStaffAccessAction(formData: FormData) {
  const { staff } = await requireAccountManager();
  const returnPath = "/staff/accounts";
  const accountId = value(formData, "accountId");
  const enabled = value(formData, "enabled") === "true";

  if (!uuid.safeParse(accountId).success) {
    fail(returnPath, "That account could not be identified.");
  }

  if (accountId === staff.id && !enabled) {
    fail(returnPath, "You cannot disable your own account.");
  }

  const admin = createAdminClient();
  if (!admin) {
    fail(returnPath, "Account management needs SUPABASE_SERVICE_ROLE_KEY on the server.");
  }

  const { error } = await admin.auth.admin.updateUserById(accountId, {
    ban_duration: enabled ? "none" : "876000h",
  });

  if (error) {
    fail(returnPath, "The account access could not be changed.");
  }

  revalidatePath("/staff/accounts");
  succeed(returnPath, enabled ? "Sign-in re-enabled." : "Sign-in disabled for that account.");
}

export async function sendAccountRecoveryAction(formData: FormData) {
  await requireAccountManager();
  const returnPath = "/staff/accounts";
  const accountEmail = value(formData, "email");

  if (!z.string().email().safeParse(accountEmail).success) {
    fail(returnPath, "That account has no usable email address.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(accountEmail, {
    redirectTo: `${siteUrl()}/auth/callback?next=/staff-access/reset-password`,
  });

  if (error) {
    fail(
      returnPath,
      "The reset email could not be sent. Supabase rate-limits auth email; try again later.",
    );
  }

  succeed(returnPath, `Password reset email sent to ${accountEmail}.`);
}

// Soft void ------------------------------------------------------------------

export async function voidBookingAction(formData: FormData) {
  const { supabase } = await requireStaff();
  const returnPath = safeStaffPath(value(formData, "returnPath"), "/staff/bookings");
  const bookingId = value(formData, "bookingId");
  const reason = value(formData, "reason");

  if (!uuid.safeParse(bookingId).success) {
    fail(returnPath, "That booking could not be identified.");
  }

  if (!reason) {
    fail(returnPath, "Add a reason before voiding a booking.");
  }

  const { error } = await supabase.rpc("staff_void_booking", {
    p_booking_id: bookingId,
    p_reason: reason,
  });

  if (error) {
    fail(returnPath, rpcMessage(error, "The booking could not be voided."));
  }

  revalidatePath("/staff", "layout");
  revalidatePath("/staff/bookings");
  succeed(returnPath, "Booking voided. The record stays for the audit trail.");
}

export async function voidPaymentAction(formData: FormData) {
  const { supabase } = await requireStaff();
  const returnPath = safeStaffPath(value(formData, "returnPath"), "/staff/payments");
  const paymentId = value(formData, "paymentId");
  const reason = value(formData, "reason");

  if (!uuid.safeParse(paymentId).success) {
    fail(returnPath, "That payment could not be identified.");
  }

  if (!reason) {
    fail(returnPath, "Add a reason before voiding a payment.");
  }

  const { error } = await supabase.rpc("staff_void_payment", {
    p_payment_id: paymentId,
    p_reason: reason,
  });

  if (error) {
    fail(returnPath, rpcMessage(error, "The payment could not be voided."));
  }

  revalidatePath("/staff", "layout");
  revalidatePath("/staff/payments");
  succeed(returnPath, "Payment voided and excluded from the totals.");
}
