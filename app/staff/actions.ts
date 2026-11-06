"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { enqueueBookingEmail } from "@/lib/email/events";
import { requireStaff } from "@/lib/staff/auth";
import { manilaLocalToIso } from "@/lib/staff/time";

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

  if (parsed.data.status === "cancelled") {
    await enqueueBookingEmail(
      supabase,
      "booking_cancelled",
      parsed.data.targetType === "group"
        ? { groupId: parsed.data.targetId }
        : { bookingId: parsed.data.targetId },
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
  const email = value(formData, "email").toLowerCase();
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
      email: z.string().email("Enter the player's account email."),
      courtId: uuid,
      startsAt: z.string().datetime(),
      duration: z.coerce.number().int().min(60).max(1020),
      collected: z.boolean(),
      method: z.enum(["cash", "gcash", "maya", "bank_transfer"]),
      reference: optionalText(120),
      notes: optionalText(500),
    })
    .safeParse({
      email,
      courtId,
      startsAt,
      duration,
      collected,
      method,
      reference: reference || undefined,
      notes: notes || undefined,
    });

  if (!parsed.success || !startsAt) {
    fail(returnPath, "Check the player email, court, date, and time.");
  }

  if (parsed.data.duration % 60 !== 0) {
    fail(returnPath, "Choose a whole number of hours.");
  }

  const { data: player, error: playerError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .ilike("email", parsed.data.email)
    .limit(1)
    .maybeSingle();

  if (playerError || !player) {
    fail(returnPath, "No player account matched that email.");
  }

  const { data, error } = await supabase.rpc("staff_create_walk_in_booking", {
    p_player_id: player.id,
    p_court_id: parsed.data.courtId,
    p_starts_at: parsed.data.startsAt,
    p_duration_minutes: parsed.data.duration,
    p_collected: parsed.data.collected,
    p_method: parsed.data.method,
    p_reference: parsed.data.reference,
    p_notes: parsed.data.notes,
  });

  if (error) {
    fail(returnPath, rpcMessage(error, "The walk-in booking could not be created."));
  }

  const booking = Array.isArray(data) ? data[0] : data;

  if (!booking?.reference) {
    fail(returnPath, "The walk-in was created, but its reference was not returned.");
  }

  if (booking.id) {
    await enqueueBookingEmail(supabase, "court_booking_received", {
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
  const duration = value(formData, "duration");
  const level = value(formData, "level");
  const capacity = value(formData, "capacity");
  const amount = value(formData, "amount");
  const startsAt = manilaLocalToIso(date, time);

  const parsed = z
    .object({
      startsAt: z.string().datetime(),
      duration: z.coerce.number().int().refine((n) => [60, 90, 120].includes(n)),
      level: z.enum(["beginner", "intermediate", "advanced"]),
      capacity: z.coerce.number().int().min(1).max(100),
      amount: z.coerce.number().min(0).max(100000),
    })
    .safeParse({ startsAt, duration, level, capacity, amount });

  if (!parsed.success || !startsAt) {
    fail(returnPath, "Check the session date, time, capacity, and price.");
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
  const duration = value(formData, "duration");
  const level = value(formData, "level");
  const capacity = value(formData, "capacity");
  const amount = value(formData, "amount");
  const status = value(formData, "status");
  const reason = value(formData, "reason");
  const startsAt = manilaLocalToIso(date, time);

  const parsed = z
    .object({
      sessionId: uuid,
      startsAt: z.string().datetime(),
      duration: z.coerce.number().int().refine((n) => [60, 90, 120].includes(n)),
      level: z.enum(["beginner", "intermediate", "advanced"]),
      capacity: z.coerce.number().int().min(1).max(100),
      amount: z.coerce.number().min(0).max(100000),
      status: z.enum(["scheduled", "cancelled", "completed"]),
      reason: optionalText(500),
    })
    .safeParse({
      sessionId,
      startsAt,
      duration,
      level,
      capacity,
      amount,
      status,
      reason: reason || undefined,
    });

  if (!parsed.success || !startsAt) {
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
    succeed(returnPath, "Session cancelled and registered players notified in their accounts.");
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
    fail(returnPath, rpcMessage(error, "The player's attendance could not be updated."));
  }

  if (
    parsed.data.status === "cancelled" &&
    registrationTarget?.status !== "cancelled" &&
    registrationTarget?.booking_id
  ) {
    await enqueueBookingEmail(supabase, "booking_cancelled", {
      bookingId: registrationTarget.booking_id,
    });
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
