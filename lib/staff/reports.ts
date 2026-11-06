import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatStaffDateId,
  isValidDateId,
  manilaDateRange,
  manilaTodayId,
  manilaDateValue,
  shiftDateId,
} from "@/lib/staff/time";

type ReportBooking = {
  starts_at: string;
  duration_minutes: number;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  amount_php: number | string;
  service: { code: string } | null;
};

type ReportPayment = {
  amount_php: number | string;
  reviewed_at: string | null;
};

export type StaffReportDay = {
  dateId: string;
  label: string;
  courtBookings: number;
  courtHours: number;
  openPlayPlaces: number;
  collected: number;
  cancellations: number;
  noShows: number;
};

export type StaffReport = {
  from: string;
  to: string;
  days: StaffReportDay[];
  totals: {
    courtBookings: number;
    courtHours: number;
    openPlayPlaces: number;
    collected: number;
    cancellations: number;
    noShows: number;
    outstanding: number;
    occupancy: number;
  };
};

function daysBetween(from: string, to: string) {
  const start = new Date(`${from}T00:00:00+08:00`).getTime();
  const end = new Date(`${to}T00:00:00+08:00`).getTime();
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

export async function getStaffReport(
  supabase: SupabaseClient,
  requestedFrom: string | null | undefined,
  requestedTo: string | null | undefined,
): Promise<StaffReport> {
  const today = manilaTodayId();
  const from = isValidDateId(requestedFrom)
    ? requestedFrom!
    : shiftDateId(today, -29);
  const to = isValidDateId(requestedTo) ? requestedTo! : today;
  const orderedFrom = from <= to ? from : to;
  const orderedTo = from <= to ? to : from;
  const fromRange = manilaDateRange(orderedFrom);
  const toRange = manilaDateRange(orderedTo);
  const now = new Date().toISOString();

  const [bookingsResult, paymentsResult, outstandingResult] = await Promise.all([
    supabase
      .from("bookings")
      .select("starts_at, duration_minutes, status, amount_php, service:services(code)")
      .gte("starts_at", fromRange.start)
      .lt("starts_at", toRange.end)
      .order("starts_at", { ascending: true }),
    supabase
      .from("payments")
      .select("amount_php, reviewed_at")
      .eq("status", "paid")
      .gte("reviewed_at", fromRange.start)
      .lt("reviewed_at", toRange.end),
    supabase
      .from("bookings")
      .select("amount_php")
      .in("status", ["pending", "confirmed"])
      .neq("payment_status", "paid")
      .gte("starts_at", now),
  ]);

  const bookings = (bookingsResult.data ?? []) as unknown as ReportBooking[];
  const payments = (paymentsResult.data ?? []) as unknown as ReportPayment[];
  const outstanding = (outstandingResult.data ?? []).reduce(
    (sum, booking) => sum + Number(booking.amount_php),
    0,
  );

  const dayCount = daysBetween(orderedFrom, orderedTo);
  const days: StaffReportDay[] = Array.from({ length: dayCount }, (_, index) => {
    const dateId = shiftDateId(orderedFrom, index);
    return {
      dateId,
      label: formatStaffDateId(dateId),
      courtBookings: 0,
      courtHours: 0,
      openPlayPlaces: 0,
      collected: 0,
      cancellations: 0,
      noShows: 0,
    };
  });
  const byDate = new Map(days.map((day) => [day.dateId, day]));

  for (const booking of bookings) {
    const dateId = manilaDateValue(booking.starts_at);
    const day = byDate.get(dateId);
    if (!day) continue;

    if (booking.status === "cancelled") {
      day.cancellations += 1;
      continue;
    }

    if (booking.status === "no_show") {
      day.noShows += 1;
      day.courtBookings += 1;
      continue;
    }

    if (booking.service?.code === "open_play") {
      day.openPlayPlaces += 1;
    } else {
      day.courtBookings += 1;
      day.courtHours += booking.duration_minutes / 60;
    }
  }

  for (const payment of payments) {
    if (!payment.reviewed_at) continue;
    const dateId = manilaDateValue(payment.reviewed_at);
    const day = byDate.get(dateId);
    if (day) day.collected += Number(payment.amount_php);
  }

  const totals = days.reduce(
    (sum, day) => ({
      courtBookings: sum.courtBookings + day.courtBookings,
      courtHours: sum.courtHours + day.courtHours,
      openPlayPlaces: sum.openPlayPlaces + day.openPlayPlaces,
      collected: sum.collected + day.collected,
      cancellations: sum.cancellations + day.cancellations,
      noShows: sum.noShows + day.noShows,
      outstanding: sum.outstanding,
      occupancy: 0,
    }),
    {
      courtBookings: 0,
      courtHours: 0,
      openPlayPlaces: 0,
      collected: 0,
      cancellations: 0,
      noShows: 0,
      outstanding,
      occupancy: 0,
    },
  );

  const availableHours = dayCount * 2 * 17;
  totals.occupancy =
    availableHours > 0
      ? Math.min(100, Math.round((totals.courtHours / availableHours) * 100))
      : 0;

  return {
    from: orderedFrom,
    to: orderedTo,
    days,
    totals,
  };
}
