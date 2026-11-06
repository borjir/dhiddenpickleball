import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
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
