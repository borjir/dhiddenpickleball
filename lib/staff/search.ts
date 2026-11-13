import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Staff search helpers.
 *
 * Searching by a player's name, mobile, or email has to cross into the
 * `customers` table, because PostgREST cannot OR filters across embedded
 * tables. Each helper resolves the related ids first, then returns safe
 * `or()` fragments for the page query.
 */

const MAX_TERM_LENGTH = 60;

/** Strip PostgREST syntax characters so a name like "Dela Cruz, Ana" is safe. */
export function staffSearchTerm(value: string) {
  return value
    .trim()
    .replace(/[%_*(),\\"]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, MAX_TERM_LENGTH);
}

function pattern(term: string) {
  return `%${term}%`;
}

/** Digits-only mobile fragment, so "0917 123 4567" finds "639171234567". */
function mobileFragment(value: string) {
  if (!/^[+\d\s()-]+$/.test(value.trim())) return "";
  const digits = value.replace(/\D/g, "").replace(/^0/, "");
  return digits.length >= 7 ? digits : "";
}

export async function matchCustomerIds(
  supabase: SupabaseClient,
  term: string,
): Promise<string[]> {
  if (!term) return [];

  const like = pattern(term);
  const parts = [
    `full_name.ilike.${like}`,
    `email.ilike.${like}`,
    `mobile.ilike.${like}`,
  ];
  const digits = mobileFragment(term);
  if (digits) parts.push(`mobile.ilike.%${digits}%`);

  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .or(parts.join(","))
    .limit(50);

  if (error) return [];
  return ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
}

/** OR fragments for the bookings table: reference, group reference, or guest. */
export async function bookingSearchParts(
  supabase: SupabaseClient,
  term: string,
): Promise<string[]> {
  const like = pattern(term);
  const [customerIds, groupResult] = await Promise.all([
    matchCustomerIds(supabase, term),
    supabase
      .from("booking_groups")
      .select("id")
      .ilike("reference", like)
      .limit(50),
  ]);

  const parts = [`reference.ilike.${like}`];
  if (customerIds.length > 0) {
    parts.push(`customer_id.in.(${customerIds.join(",")})`);
  }

  const groupIds = ((groupResult.data ?? []) as Array<{ id: string }>).map(
    (row) => row.id,
  );
  if (groupIds.length > 0) {
    parts.push(`group_id.in.(${groupIds.join(",")})`);
  }

  return parts;
}

/** OR fragments for the payments table: GCash ref, booking, group, or guest. */
export async function paymentSearchParts(
  supabase: SupabaseClient,
  term: string,
): Promise<string[]> {
  const like = pattern(term);
  const customerIds = await matchCustomerIds(supabase, term);

  const bookingParts = [`reference.ilike.${like}`];
  const groupParts = [`reference.ilike.${like}`];
  if (customerIds.length > 0) {
    const customers = `customer_id.in.(${customerIds.join(",")})`;
    bookingParts.push(customers);
    groupParts.push(customers);
  }

  const [bookingsResult, groupsResult] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, group_id")
      .or(bookingParts.join(","))
      .limit(200),
    supabase
      .from("booking_groups")
      .select("id")
      .or(groupParts.join(","))
      .limit(100),
  ]);

  const bookingRows = (bookingsResult.data ?? []) as Array<{
    id: string;
    group_id: string | null;
  }>;
  const groupIds = new Set(
    ((groupsResult.data ?? []) as Array<{ id: string }>).map((row) => row.id),
  );
  for (const row of bookingRows) {
    if (row.group_id) groupIds.add(row.group_id);
  }

  const parts = [`transaction_reference.ilike.${like}`];
  if (bookingRows.length > 0) {
    parts.push(`booking_id.in.(${bookingRows.map((row) => row.id).join(",")})`);
  }
  if (groupIds.size > 0) {
    parts.push(`group_id.in.(${[...groupIds].join(",")})`);
  }

  return parts;
}

/** Session ids whose roster or booking reference matches the term. */
export async function openPlaySessionSearchIds(
  supabase: SupabaseClient,
  term: string,
): Promise<string[]> {
  const sessionIds = new Set<string>();
  const customerIds = await matchCustomerIds(supabase, term);

  if (customerIds.length > 0) {
    const { data } = await supabase
      .from("open_play_registrations")
      .select("session_id")
      .in("customer_id", customerIds)
      .limit(300);

    for (const row of (data ?? []) as Array<{ session_id: string }>) {
      sessionIds.add(row.session_id);
    }
  }

  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("id")
    .ilike("reference", pattern(term))
    .limit(100);
  const bookingIds = ((bookingRows ?? []) as Array<{ id: string }>).map(
    (row) => row.id,
  );

  if (bookingIds.length > 0) {
    const { data } = await supabase
      .from("open_play_registrations")
      .select("session_id")
      .in("booking_id", bookingIds)
      .limit(300);

    for (const row of (data ?? []) as Array<{ session_id: string }>) {
      sessionIds.add(row.session_id);
    }
  }

  return [...sessionIds];
}
