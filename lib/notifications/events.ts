import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookingUpdateEvent } from "./types";

/**
 * Record an in-app notification for a staff-driven booking or attendance
 * change. Booking, payment, and open-play events that already call
 * enqueueBookingEmail create their notification inside the database.
 */
export async function notifyBookingUpdate(
  supabase: SupabaseClient,
  event: BookingUpdateEvent,
  target: { bookingId?: string | null; groupId?: string | null },
) {
  const { error } = await supabase.rpc("notify_booking_update", {
    p_event: event,
    p_booking_id: target.bookingId ?? null,
    p_group_id: target.groupId ?? null,
  });

  if (error) {
    console.error("[notifications] Could not record update:", error.message);
  }
}
