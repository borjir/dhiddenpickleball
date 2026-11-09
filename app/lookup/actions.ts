"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { normalizeMobile, type GuestRecord } from "@/lib/guest";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { turnstileClientIp, verifyTurnstile } from "@/lib/turnstile";

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
const refreshAttempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_LOOKUP_ATTEMPTS = 12;
const MAX_REFRESH_ATTEMPTS = 60;

function isThrottled(
  store: Map<string, { count: number; resetAt: number }>,
  key: string,
  maxAttempts: number,
) {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > maxAttempts;
}

function parseLookup(input: { reference: string; mobile: string }) {
  const parsed = lookupSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false as const,
      message:
        parsed.error.issues[0]?.message ?? "Enter your reference and mobile number.",
    };
  }

  const reference = parsed.data.reference.toUpperCase();
  const mobile = normalizeMobile(parsed.data.mobile);

  if (!mobile) {
    return {
      ok: false as const,
      message: "Enter the mobile number used for the booking.",
    };
  }

  return { ok: true as const, reference, mobile };
}

async function readGuestRecord(
  reference: string,
  mobile: string,
): Promise<LookupResult> {
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

export async function lookupGuestRecord(input: {
  reference: string;
  mobile: string;
  turnstileToken: string;
}): Promise<LookupResult> {
  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: "Booking lookup is not connected in this environment.",
    };
  }

  const parsed = parseLookup(input);

  if (!parsed.ok) {
    return { status: "error", message: parsed.message };
  }

  const gate = await verifyTurnstile({
    token: input.turnstileToken,
    action: "lookup",
    remoteIp: turnstileClientIp(await headers()),
  });

  if (!gate.ok) {
    return { status: "error", message: gate.message };
  }

  if (
    isThrottled(
      attempts,
      `${parsed.reference}|${parsed.mobile}`,
      MAX_LOOKUP_ATTEMPTS,
    )
  ) {
    return {
      status: "error",
      message: "Too many lookup attempts. Wait a few minutes and try again.",
    };
  }

  return readGuestRecord(parsed.reference, parsed.mobile);
}

/**
 * Refresh used only by an already-open status page. It deliberately does not
 * consume a Turnstile token: the guest has already passed the check once, and
 * tokens are single-use. It still requires the reference and matching mobile
 * and keeps its own, looser throttle for the 45-second poll.
 */
export async function refreshGuestRecord(input: {
  reference: string;
  mobile: string;
}): Promise<LookupResult> {
  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: "Booking lookup is not connected in this environment.",
    };
  }

  const parsed = parseLookup(input);

  if (!parsed.ok) {
    return { status: "error", message: parsed.message };
  }

  if (
    isThrottled(
      refreshAttempts,
      `${parsed.reference}|${parsed.mobile}`,
      MAX_REFRESH_ATTEMPTS,
    )
  ) {
    return {
      status: "error",
      message: "Too many refresh attempts. Wait a few minutes and try again.",
    };
  }

  return readGuestRecord(parsed.reference, parsed.mobile);
}
