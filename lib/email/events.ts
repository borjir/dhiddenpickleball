import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { processEmailOutbox } from "./process";
import type { PlayerEmailEvent } from "./types";

/**
 * Record an email event after the database change succeeded. Delivery is
 * attempted after the response is sent; failures stay in the outbox for the
 * cron retry instead of breaking the booking or payment action.
 */
export async function enqueueBookingEmail(
  supabase: SupabaseClient,
  event: PlayerEmailEvent,
  target: { bookingId?: string | null; groupId?: string | null },
) {
  const { error } = await supabase.rpc("enqueue_booking_email_event", {
    p_event: event,
    p_booking_id: target.bookingId ?? null,
    p_group_id: target.groupId ?? null,
  });

  if (error) {
    console.error("[email] Could not enqueue event:", error.message);
    return;
  }

  after(() => processEmailOutbox(25));
}

/**
 * Enqueue an email for a guest booking. Guests have no session, so this runs
 * with the server-only service role and the database function is not exposed to
 * anon or authenticated roles. A missing service-role key only skips email; the
 * booking, QR, and lookup still work.
 */
export async function enqueueGuestBookingEmail(
  event: PlayerEmailEvent,
  target: { bookingId?: string | null; groupId?: string | null },
) {
  const admin = createAdminClient();

  if (!admin) {
    console.warn("[email] Service role is not configured; guest email skipped.");
    return;
  }

  const { error } = await admin.rpc("enqueue_guest_booking_email_event", {
    p_event: event,
    p_booking_id: target.bookingId ?? null,
    p_group_id: target.groupId ?? null,
  });

  if (error) {
    console.error("[email] Could not enqueue guest event:", error.message);
    return;
  }

  after(() => processEmailOutbox(25));
}
