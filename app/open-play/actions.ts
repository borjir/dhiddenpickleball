"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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
};

export type OpenPlayRegistrationResult =
  | {
      status: "success";
      message: string;
      registration: OpenPlayRegistration;
    }
  | {
      status: "error";
      code?:
        | "session-expired"
        | "email-unverified"
        | "session-full"
        | "already-registered"
        | "invalid";
      message: string;
    };

export type OpenPlayModalData =
  | {
      status: "ok";
      session: OpenPlaySession;
      viewer: {
        email: string;
        fullName: string;
        verified: boolean;
      } | null;
      existingReference: string | null;
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
  const isPast = new Date(session.startsAt).getTime() <= Date.now();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewer: {
    email: string;
    fullName: string;
    verified: boolean;
  } | null = null;
  let existingReference: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    viewer = {
      email: user.email ?? "",
      fullName: profile?.full_name?.trim() ?? "",
      verified: Boolean(user.email_confirmed_at),
    };

    const { data: registration } = await supabase
      .from("open_play_registrations")
      .select("status, booking:bookings(reference)")
      .eq("session_id", session.id)
      .eq("player_id", user.id)
      .maybeSingle();

    const booking = registration?.booking as
      | { reference?: string }
      | { reference?: string }[]
      | null
      | undefined;
    const reference = Array.isArray(booking)
      ? booking[0]?.reference
      : booking?.reference;

    existingReference = reference ?? null;
  }

  return { status: "ok", session, viewer, existingReference, isPast };
}

export async function registerForOpenPlay(input: {
  sessionId: string;
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
    return {
      status: "error",
      code: "invalid",
      message:
        parsed.error.issues[0]?.message ??
        "Choose a session and accept the booking terms.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      status: "error",
      code: "session-expired",
      message: "Your session expired. Sign in again to reserve a place.",
    };
  }

  if (!user.email_confirmed_at) {
    return {
      status: "error",
      code: "email-unverified",
      message:
        "Verify your email address before reserving a place. Check your inbox for the confirmation link.",
    };
  }

  const { data, error } = await supabase.rpc(
    "create_open_play_registration",
    {
      p_session_id: parsed.data.sessionId,
      p_player_id: user.id,
    },
  );

  if (error) {
    if (error.code === "42501") {
      return {
        status: "error",
        code: "session-expired",
        message: "Your session expired. Sign in again to reserve a place.",
      };
    }

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
          "You already have a place in this session. Open it from your account to see the payment status.",
      };
    }

    if (error.code === "22023" || error.code === "55000") {
      return {
        status: "error",
        code: "invalid",
        message: error.message,
      };
    }

    if (error.code === "23503") {
      return {
        status: "error",
        message:
          "Your player profile could not be found. Refresh the page and try again.",
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
      message:
        "The reservation was not returned. Refresh your account before trying again.",
    };
  }

  revalidatePath("/open-play");
  revalidatePath(`/open-play/${parsed.data.sessionId}`);
  revalidatePath("/account");

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
    },
  };
}
