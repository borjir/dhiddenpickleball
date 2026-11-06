import { requireStaff } from "@/lib/staff/auth";
import { getStaffReport } from "@/lib/staff/reports";
import { isValidDateId, manilaTodayId, shiftDateId } from "@/lib/staff/time";

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(request: Request) {
  const { supabase } = await requireStaff();
  const url = new URL(request.url);
  const today = manilaTodayId();
  const requestedFrom = url.searchParams.get("from");
  const requestedTo = url.searchParams.get("to");
  const from = isValidDateId(requestedFrom)
    ? requestedFrom!
    : shiftDateId(today, -29);
  const to = isValidDateId(requestedTo) ? requestedTo! : today;
  const report = await getStaffReport(supabase, from, to);

  const rows: Array<Array<string | number>> = [
    [
      "Date",
      "Court bookings",
      "Court hours",
      "Open-play places",
      "Collected PHP",
      "Cancellations",
      "No-shows",
    ],
    ...report.days.map((day) => [
      day.dateId,
      day.courtBookings,
      day.courtHours.toFixed(1),
      day.openPlayPlaces,
      day.collected.toFixed(2),
      day.cancellations,
      day.noShows,
    ]),
    [
      "Total",
      report.totals.courtBookings,
      report.totals.courtHours.toFixed(1),
      report.totals.openPlayPlaces,
      report.totals.collected.toFixed(2),
      report.totals.cancellations,
      report.totals.noShows,
    ],
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="d-hidden-operations-${report.from}-to-${report.to}.csv"`,
      "Cache-Control": "no-store, private",
    },
  });
}
