"use server";

import { z } from "zod";
import { enqueueGuestBookingEmail } from "@/lib/email/events";
import { normalizeMobile } from "@/lib/guest";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  manilaDateId,
  type AvailabilitySlot,
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

/**
 * Guests have no account, so the contact details travel with each booking.
 * The mobile number is the second half of the status-lookup credential.
 */
const guestContactSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter the full name for this booking.")
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
  code?: "slot-taken" | "active-hold";
  message?: string;
  errors: Record<string, string>;
  values: {
    fullName: string;
    phone: string;
    email: string;
  };
  group?: BookingGroupConfirmation & {
    fullName: string;
    mobile: string;
  };
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
  customer: { fullName: string; mobile: string; email: string | null };
  items: BookingGroupItemRow[];
};

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

  const { data: courtRows } = await supabase
    .from("courts")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return {
    status: "ok",
    courts: courtRows ?? [],
    today: manilaDateId(new Date()),
  };
}

function fieldErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return errors;
}

export async function createBookingGroup(
  _previousState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const values = {
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
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
  const contact = guestContactSchema.safeParse(values);
  let parsedItems: unknown;

  try {
    parsedItems = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    parsedItems = [];
  }

  const items = bookingGroupSchema.safeParse(parsedItems);
  const errors: Record<string, string> = {};

  if (!contact.success) {
    Object.assign(errors, fieldErrors(contact.error));
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

  const { data, error } = await supabase.rpc("create_guest_court_booking_group", {
    p_ranges: items.data,
    p_full_name: contact.data.fullName,
    p_mobile: contact.data.phone,
    p_email: contact.data.email,
  });

  if (error) {
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

    if (
      error.code === "55000" &&
      error.message.includes("already have a court booking")
    ) {
      return {
        status: "error",
        code: "active-hold",
        message: error.message,
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
      message: "The booking was not returned. Check your booking status instead.",
      errors: {},
      values,
    };
  }

  // Guests opt in to email by supplying an address. Do not create an outbox
  // row for a booking that has no address to deliver to.
  if (contact.data.email) {
    await enqueueGuestBookingEmail("court_booking_received", {
      groupId: result.group.id,
    });
  }

  return {
    status: "success",
    errors: {},
    values: {
      fullName: contact.data.fullName,
      phone: contact.data.phone,
      email: contact.data.email ?? "",
    },
    group: {
      id: result.group.id,
      reference: result.group.reference,
      status: result.group.status,
      paymentStatus: result.group.payment_status,
      amountPhp: Number(result.group.amount_php),
      holdExpiresAt: result.group.hold_expires_at,
      fullName: result.customer?.fullName ?? contact.data.fullName,
      mobile: result.customer?.mobile ?? normalizeMobile(contact.data.phone) ?? "",
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
