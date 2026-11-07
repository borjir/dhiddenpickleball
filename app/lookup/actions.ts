"use server";

import { z } from "zod";
import { normalizeMobile, type GuestRecord } from "@/lib/guest";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const lookupSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(3, "Enter the booking reference.")
    .max(40, "That reference is too long."),
  mobile: z
    .string()
    .trim()
    .refine(
      (value) => normalizeMobile(value) !== null,
      "Enter the mobile number used for the booking.",
    ),
});

export type LookupResult =
  | { status: "ok"; record: GuestRecord }
  | { status: "error"; message: string };

/**
 * Basic in-memory throttle so a public reference/mobile form cannot be used to
 * enumerate bookings quickly. It is best-effort per server instance; the
 * database still requires both the reference and the matching mobile.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 12;

function isThrottled(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function lookupGuestRecord(input: {
  reference: string;
  mobile: string;
}): Promise<LookupResult> {
  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: "Booking lookup is not connected in this environment.",
    };
  }

  const parsed = lookupSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "Enter your reference and mobile number.",
    };
  }

  const reference = parsed.data.reference.toUpperCase();
  const mobile = normalizeMobile(parsed.data.mobile);

  if (!mobile) {
    return {
      status: "error",
      message: "Enter the mobile number used for the booking.",
    };
  }

  if (isThrottled(`${reference}|${mobile}`)) {
    return {
      status: "error",
      message: "Too many lookup attempts. Wait a few minutes and try again.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lookup_guest_record", {
    p_reference: reference,
    p_mobile: mobile,
  });

  if (error) {
    if (error.code === "22023") {
      return {
        status: "error",
        message:
          "We could not find a booking with that reference and mobile number. Check both and try again.",
      };
    }

    return {
      status: "error",
      message: "The booking could not be loaded. Try again in a moment.",
    };
  }

  if (!data) {
    return {
      status: "error",
      message:
        "We could not find a booking with that reference and mobile number. Check both and try again.",
    };
  }

  return { status: "ok", record: data as GuestRecord };
}
