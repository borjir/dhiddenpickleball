"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { enqueueGuestBookingEmail } from "@/lib/email/events";
import { normalizeMobile } from "@/lib/guest";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  formatBookingDate,
  manilaDateId,
  type BookingStatus,
  type PaymentStatus,
} from "@/lib/bookings";
import {
  mapOpenPlaySession,
  type OpenPlaySession,
  type OpenPlaySessionRow,
} from "@/lib/open-play";

const registrationSchema = z.object({
  sessionId: z.string().uuid("Choose a session again."),
  fullName: z
    .string()
    .trim()
    .min(2, "Enter the full name for this registration.")
    .max(100, "Keep the name under 100 characters."),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => normalizeMobile(value) !== null,
      "Enter a valid Philippine mobile number, for example 0917 123 4567.",
    ),
  email: z
    .string()
    .trim()
    .max(254, "That email address is too long.")
    .refine(
      (value) => value === "" || z.email().safeParse(value).success,
      "Enter a valid email address, or leave it blank.",
    )
    .transform((value) => (value === "" ? null : value.toLowerCase())),
  termsAccepted: z.literal(true, {
    message: "Accept the booking terms before reserving a place.",
  }),
});

type BookingRow = {
  id: string;
  reference: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  amount_php: number | string;
  created_at: string;
};

export type OpenPlayRegistration = {
  id: string;
  reference: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  amountPhp: number;
  createdAt: string;
  fullName: string;
  mobile: string;
  level: string;
};

export type OpenPlayRegistrationResult =
  | {
      status: "success";
      message: string;
      registration: OpenPlayRegistration;
    }
  | {
      status: "error";
      code?: "session-full" | "already-registered" | "invalid";
      message: string;
      errors?: Record<string, string>;
    };

export type OpenPlayModalData =
  | {
      status: "ok";
      session: OpenPlaySession;
      isPast: boolean;
    }
  | { status: "error"; message: string };

export type OpenPlayScheduleGroup = {
  dateId: string;
  dateLabel: string;
  sessions: OpenPlaySession[];
};

export type OpenPlayScheduleData =
  | { status: "ok"; groups: OpenPlayScheduleGroup[] }
  | { status: "error"; message: string };

export async function getOpenPlayScheduleData(): Promise<OpenPlayScheduleData> {
  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: "Open-play registration is not connected in this environment.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_open_play_sessions");

  if (error) {
    return {
      status: "error",
      message: "The open-play schedule could not be loaded. Try again.",
    };
  }

  const sessions = (
    (Array.isArray(data) ? data : []) as OpenPlaySessionRow[]
  ).map(mapOpenPlaySession);
  const grouped = new Map<string, OpenPlaySession[]>();

  for (const session of sessions) {
    const dateId = manilaDateId(session.startsAt);
    const current = grouped.get(dateId) ?? [];
    current.push(session);
    grouped.set(dateId, current);
  }

  const groups = Array.from(grouped, ([dateId, group]) => ({
    dateId,
    dateLabel: formatBookingDate(group[0]?.startsAt ?? dateId),
    sessions: group,
  })).slice(0, 8);

  return { status: "ok", groups };
}

export async function getOpenPlayModalData(
  sessionId: string,
): Promise<OpenPlayModalData> {
  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: "Open-play registration is not connected in this environment.",
    };
  }

  const parsedId = z.string().uuid().safeParse(sessionId);

  if (!parsedId.success) {
    return { status: "error", message: "Choose a valid open-play session." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_open_play_session", {
    p_session_id: parsedId.data,
  });

  if (error) {
    return {
      status: "error",
      message: "This open-play session could not be read. Try again.",
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | OpenPlaySessionRow
    | null;

  if (!row) {
    return { status: "error", message: "This open-play session is unavailable." };
  }

  const session = mapOpenPlaySession(row);

  return {
    status: "ok",
    session,
    isPast: new Date(session.startsAt).getTime() <= Date.now(),
  };
}

export async function registerForOpenPlay(input: {
  sessionId: string;
  fullName: string;
  phone: string;
  email: string;
  termsAccepted: boolean;
}): Promise<OpenPlayRegistrationResult> {
  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: "Open-play registration is not connected in this environment.",
    };
  }

  const parsed = registrationSchema.safeParse(input);

  if (!parsed.success) {
    const errors: Record<string, string> = {};

    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !errors[field]) {
        errors[field] = issue.message;
      }
    }

    return {
      status: "error",
      code: "invalid",
      message:
        parsed.error.issues[0]?.message ??
        "Choose a session and accept the booking terms.",
      errors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "create_guest_open_play_registration",
    {
      p_session_id: parsed.data.sessionId,
      p_full_name: parsed.data.fullName,
      p_mobile: parsed.data.phone,
      p_email: parsed.data.email,
    },
  );

  if (error) {
    if (error.code === "23P01") {
      return {
        status: "error",
        code: "session-full",
        message:
          "This session just filled up. Choose another session; nothing was charged.",
      };
    }

    if (error.code === "23505") {
      return {
        status: "error",
        code: "already-registered",
        message:
          "That mobile number already has a place in this session. Check the booking status with your reference and mobile number.",
      };
    }

    if (error.code === "22023" || error.code === "55000") {
      return {
        status: "error",
        code: "invalid",
        message: error.message,
      };
    }

    return {
      status: "error",
      message:
        "Your place could not be reserved. Try again, or contact the club.",
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as BookingRow | null;

  if (!row) {
    return {
      status: "error",
      message: "The reservation was not returned. Check the booking status instead.",
    };
  }

  // Guests opt in to email by supplying an address. Do not create an outbox
  // row for a registration that has no address to deliver to.
  if (parsed.data.email) {
    await enqueueGuestBookingEmail("open_play_reserved", {
      bookingId: row.id,
    });
  }

  revalidatePath("/open-play");
  revalidatePath(`/open-play/${parsed.data.sessionId}`);

  const { data: session } = await supabase.rpc("get_open_play_session", {
    p_session_id: parsed.data.sessionId,
  });
  const sessionRow = (Array.isArray(session) ? session[0] : session) as
    | OpenPlaySessionRow
    | null;

  return {
    status: "success",
    message:
      "Your place is reserved. Pay by GCash and submit proof before the session starts.",
    registration: {
      id: row.id,
      reference: row.reference,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      durationMinutes: row.duration_minutes,
      status: row.status,
      paymentStatus: row.payment_status,
      amountPhp: Number(row.amount_php),
      createdAt: row.created_at,
      fullName: parsed.data.fullName,
      mobile: normalizeMobile(parsed.data.phone) ?? parsed.data.phone,
      level: sessionRow ? mapOpenPlaySession(sessionRow).skillLevel : "",
    },
  };
}
