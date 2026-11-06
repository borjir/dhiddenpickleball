"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { profileSchema } from "@/lib/validation/profile";
import {
  manilaDateId,
  type AvailabilitySlot,
  type BookingConfirmation,
  type BookingGroupConfirmation,
  type BookingStatus,
  type PaymentStatus,
} from "@/lib/bookings";

const availabilitySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date."),
  duration: z.union([z.literal(60), z.literal(90), z.literal(120)]),
});

const bookingContactSchema = profileSchema.extend({
  phone: profileSchema.shape.phone.refine(
    (value) => value.length > 0,
    "Enter a mobile number the club can reach on the day.",
  ),
});

function isHourlyManilaStart(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const minute = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    minute: "2-digit",
  })
    .formatToParts(date)
    .find((part) => part.type === "minute")?.value;

  return minute !== undefined && Number(minute) === 0;
}

const bookingSlotSchema = z.object({
  courtId: z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      "Choose a court again.",
    ),
  startsAt: z
    .string()
    .refine(
      (value) => !Number.isNaN(Date.parse(value)),
      "Choose a start time again.",
    )
    .refine(isHourlyManilaStart, "Choose an hourly start time."),
  duration: z
    .string()
    .regex(/^\d+$/, "Choose a court time again.")
    .transform(Number)
    .refine(
      (value) => value >= 60 && value <= 1020 && value % 60 === 0,
      "Choose a whole number of hours.",
    ),
});

const bookingGroupItemSchema = z.object({
  courtId: z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      "Choose a court again.",
    ),
  startsAt: z
    .string()
    .refine(
      (value) => !Number.isNaN(Date.parse(value)),
      "Choose a start time again.",
    )
    .refine(isHourlyManilaStart, "Choose an hourly start time."),
  durationMinutes: z
    .number()
    .int()
    .min(60)
    .max(1020)
    .refine((value) => value % 60 === 0, "Choose a whole number of hours."),
});

const bookingGroupSchema = z.array(bookingGroupItemSchema).min(1).max(8);

export type AvailabilityResult =
  | { status: "ok"; slots: AvailabilitySlot[] }
  | { status: "error"; message: string };

export type BookingFormState = {
  status: "idle" | "error" | "success";
  code?:
    | "slot-taken"
    | "email-unverified"
    | "profile-error"
    | "session-expired";
  next?: string;
  message?: string;
  errors: Record<string, string>;
  values: {
    fullName: string;
    phone: string;
  };
  booking?: BookingConfirmation;
  group?: BookingGroupConfirmation;
};

type AvailabilityRow = {
  court_id: string;
  court_name: string;
  court_slug: string;
  starts_at: string;
  ends_at: string;
  start_minute: number;
  amount_php: number | string;
};

type BookingRow = {
  id: string;
  reference: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  amount_php: number | string;
  hold_expires_at: string | null;
};

type BookingGroupRow = {
  id: string;
  reference: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  amount_php: number | string;
  hold_expires_at: string | null;
};

type BookingGroupItemRow = {
  id: string;
  courtId: string;
  courtName: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  amountPhp: number | string;
};

type BookingGroupRpcResult = {
  group: BookingGroupRow;
  items: BookingGroupItemRow[];
};

function selectionPath({
  date,
  duration,
  courtId,
  startsAt,
}: {
  date: string;
  duration: number;
  courtId: string;
  startsAt: string;
}) {
  const params = new URLSearchParams({
    date,
    duration: String(duration),
    court: courtId,
    start: startsAt,
  });
  return `/book?${params.toString()}`;
}

export async function getCourtAvailability(input: {
  date: string;
  duration: number;
}): Promise<AvailabilityResult> {
  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: "Online booking is not connected in this environment.",
    };
  }

  const parsed = availabilitySchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Choose a valid date and court time.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_court_availability", {
    p_date: parsed.data.date,
    p_duration_minutes: parsed.data.duration,
  });

  if (error) {
    return {
      status: "error",
      message:
        "Live availability could not be loaded. Try again, or contact the club to book.",
    };
  }

  const rows = Array.isArray(data) ? (data as AvailabilityRow[]) : [];

  return {
    status: "ok",
    slots: rows.map((row) => ({
      courtId: row.court_id,
      courtName: row.court_name,
      courtSlug: row.court_slug,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      startMinute: Number(row.start_minute),
      amountPhp: Number(row.amount_php),
    })),
  };
}

export type BookingModalData =
  | {
      status: "ok";
      viewer: {
        email: string;
        fullName: string;
        phone: string;
        verified: boolean;
        profileError: boolean;
      } | null;
      courts: { id: string; name: string; slug: string }[];
      today: string;
    }
  | { status: "error"; message: string };

export async function getBookingModalData(): Promise<BookingModalData> {
  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: "Online booking is not connected in this environment.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewer: Extract<BookingModalData, { status: "ok" }>["viewer"] = null;

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle();

    viewer = {
      email: user.email ?? "",
      fullName: profile?.full_name?.trim() ?? "",
      phone: profile?.phone?.trim() ?? "",
      verified: Boolean(user.email_confirmed_at),
      profileError: Boolean(profileError),
    };
  }

  const { data: courtRows } = await supabase
    .from("courts")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return {
    status: "ok",
    viewer,
    courts: courtRows ?? [],
    today: manilaDateId(new Date()),
  };
}

export async function createBooking(
  _previousState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const values = {
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  };
  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: "Online booking is not connected in this environment.",
      errors: {},
      values,
    };
  }

  const termsAccepted = formData.get("terms") === "on";
  const contact = bookingContactSchema.safeParse(values);
  const slot = bookingSlotSchema.safeParse({
    courtId: String(formData.get("courtId") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    duration: String(formData.get("duration") ?? ""),
  });

  const errors: Record<string, string> = {};

  if (!contact.success) {
    for (const issue of contact.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !errors[field]) {
        errors[field] = issue.message;
      }
    }
  }

  if (!slot.success && !errors.form) {
    errors.form = "Choose a court time again.";
  }

  if (!termsAccepted) {
    errors.terms = "Accept the booking terms before continuing.";
  }

  if (Object.keys(errors).length > 0 || !contact.success || !slot.success) {
    return {
      status: "error",
      message: "Check the fields below.",
      errors,
      values,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const date = manilaDateId(slot.data.startsAt);
    return {
      status: "error",
      code: "session-expired",
      next: selectionPath({
        date: date || "",
        duration: slot.data.duration,
        courtId: slot.data.courtId,
        startsAt: slot.data.startsAt,
      }),
      message: "Your session expired. Sign in again to finish this booking.",
      errors: {},
      values,
    };
  }

  if (!user.email_confirmed_at) {
    return {
      status: "error",
      code: "email-unverified",
      message:
        "Verify your email address before holding a court. Check your inbox for the confirmation link.",
      errors: {},
      values,
    };
  }

  // Releasing here covers a hold that expired after availability was loaded.
  // The exclusion constraint remains the final authority on a double booking.
  const { error: releaseError } = await supabase.rpc(
    "release_expired_court_holds",
  );

  if (releaseError) {
    return {
      status: "error",
      message:
        "Online booking is not ready yet. Contact the club and mention the availability setup.",
      errors: {},
      values,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: contact.data.fullName,
      phone: contact.data.phone,
    })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (profileError || !profile) {
    return {
      status: "error",
      code: "profile-error",
      message:
        "Your contact details could not be saved. Refresh the page and try again.",
      errors: {},
      values,
    };
  }

  const { data, error } = await supabase.rpc("create_court_booking", {
    p_court_id: slot.data.courtId,
    p_starts_at: slot.data.startsAt,
    p_duration_minutes: slot.data.duration,
    p_player_id: user.id,
  });

  if (error) {
    if (error.code === "42501") {
      const date = manilaDateId(slot.data.startsAt);
      return {
        status: "error",
        code: "session-expired",
        next: selectionPath({
          date: date || "",
          duration: slot.data.duration,
          courtId: slot.data.courtId,
          startsAt: slot.data.startsAt,
        }),
        message: "Your session expired. Sign in again to finish this booking.",
        errors: {},
        values,
      };
    }

    if (error.code === "23P01") {
      return {
        status: "error",
        code: "slot-taken",
        message:
          "That court and time were just taken. Choose another time; nothing was charged.",
        errors: {},
        values,
      };
    }

    if (error.code === "23503") {
      return {
        status: "error",
        message:
          "Your player profile could not be found. Refresh the page and try again.",
        errors: {},
        values,
      };
    }

    if (error.code === "22023" || error.code === "55000") {
      return {
        status: "error",
        message: error.message,
        errors: {},
        values,
      };
    }

    return {
      status: "error",
      message:
        "Your booking could not be created. Try again, or contact the club.",
      errors: {},
      values,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as BookingRow | null;

  if (!row) {
    return {
      status: "error",
      message:
        "The booking was not returned. Refresh your account before trying again.",
      errors: {},
      values,
    };
  }

  const { data: court } = await supabase
    .from("courts")
    .select("name")
    .eq("id", slot.data.courtId)
    .maybeSingle();

  return {
    status: "success",
    errors: {},
    values: {
      fullName: contact.data.fullName,
      phone: contact.data.phone,
    },
    booking: {
      id: row.id,
      reference: row.reference,
      courtName: court?.name ?? "Court",
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      durationMinutes: row.duration_minutes,
      status: row.status,
      paymentStatus: row.payment_status,
      amountPhp: Number(row.amount_php),
      holdExpiresAt: row.hold_expires_at,
    },
  };
}

export async function createBookingGroup(
  _previousState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const values = {
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  };

  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: "Online booking is not connected in this environment.",
      errors: {},
      values,
    };
  }

  const termsAccepted = formData.get("terms") === "on";
  const contact = bookingContactSchema.safeParse(values);
  let parsedItems: unknown;

  try {
    parsedItems = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    parsedItems = [];
  }

  const items = bookingGroupSchema.safeParse(parsedItems);
  const errors: Record<string, string> = {};

  if (!contact.success) {
    for (const issue of contact.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !errors[field]) {
        errors[field] = issue.message;
      }
    }
  }

  if (!items.success && !errors.form) {
    errors.form = "Choose at least one court time again.";
  }

  if (!termsAccepted) {
    errors.terms = "Accept the booking terms before continuing.";
  }

  if (Object.keys(errors).length > 0 || !contact.success || !items.success) {
    return {
      status: "error",
      message: "Check the fields below.",
      errors,
      values,
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
      next: "/book",
      message: "Your session expired. Sign in again to finish this booking.",
      errors: {},
      values,
    };
  }

  if (!user.email_confirmed_at) {
    return {
      status: "error",
      code: "email-unverified",
      message:
        "Verify your email address before holding a court. Check your inbox for the confirmation link.",
      errors: {},
      values,
    };
  }

  const { error: releaseError } = await supabase.rpc(
    "release_expired_court_holds",
  );

  if (releaseError) {
    return {
      status: "error",
      message:
        "Online booking is not ready yet. Contact the club and mention the availability setup.",
      errors: {},
      values,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: contact.data.fullName,
      phone: contact.data.phone,
    })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (profileError || !profile) {
    return {
      status: "error",
      code: "profile-error",
      message:
        "Your contact details could not be saved. Refresh the page and try again.",
      errors: {},
      values,
    };
  }

  const { data, error } = await supabase.rpc("create_court_booking_group", {
    p_ranges: items.data,
    p_player_id: user.id,
  });

  if (error) {
    if (error.code === "42501") {
      return {
        status: "error",
        code: "session-expired",
        next: "/book",
        message: "Your session expired. Sign in again to finish this booking.",
        errors: {},
        values,
      };
    }

    if (error.code === "23P01") {
      return {
        status: "error",
        code: "slot-taken",
        message:
          "One of those court times was just taken. Choose another time; nothing was charged.",
        errors: {},
        values,
      };
    }

    if (error.code === "23503") {
      return {
        status: "error",
        message:
          "Your player profile could not be found. Refresh the page and try again.",
        errors: {},
        values,
      };
    }

    if (error.code === "22023" || error.code === "55000") {
      return {
        status: "error",
        message: error.message,
        errors: {},
        values,
      };
    }

    return {
      status: "error",
      message:
        "Your booking could not be created. Try again, or contact the club.",
      errors: {},
      values,
    };
  }

  const result = data as BookingGroupRpcResult | null;

  if (!result?.group || !Array.isArray(result.items)) {
    return {
      status: "error",
      message:
        "The booking was not returned. Refresh your account before trying again.",
      errors: {},
      values,
    };
  }

  return {
    status: "success",
    errors: {},
    values: {
      fullName: contact.data.fullName,
      phone: contact.data.phone,
    },
    group: {
      id: result.group.id,
      reference: result.group.reference,
      status: result.group.status,
      paymentStatus: result.group.payment_status,
      amountPhp: Number(result.group.amount_php),
      holdExpiresAt: result.group.hold_expires_at,
      items: result.items.map((item) => ({
        id: item.id,
        courtId: item.courtId,
        courtName: item.courtName,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        durationMinutes: item.durationMinutes,
        amountPhp: Number(item.amountPhp),
      })),
    },
  };
}
