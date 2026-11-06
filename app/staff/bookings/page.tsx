import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import {
  CalendarIcon,
  PlusIcon,
  SearchIcon,
} from "@/components/ui/icons";
import {
  StaffEmpty,
  StaffFlash,
  StaffPageHeader,
  StaffPanel,
} from "@/components/staff/staff-ui";
import { requireStaff } from "@/lib/staff/auth";
import {
  bookingStatusMeta,
  formatPeso,
  paymentStatusMeta,
} from "@/lib/bookings";
import {
  formatStaffDate,
  formatStaffTime,
  isValidDateId,
  manilaDateRange,
  manilaTodayId,
  shiftDateId,
} from "@/lib/staff/time";
import { personLabel, type StaffBooking } from "@/lib/staff/types";

export const metadata: Metadata = {
  title: "Bookings",
};

type SearchParams = Promise<{
  date?: string | string[];
  status?: string | string[];
  q?: string | string[];
  notice?: string | string[];
  error?: string | string[];
}>;

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending holds" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No-shows" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All statuses" },
] as const;

function text(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function RoomLabel({ booking }: { booking: StaffBooking }) {
  const court = booking.court_reservations?.[0]?.court?.name;
  if (court) return <>{court}</>;
  if (booking.service?.code === "open_play") return <>Open play</>;
  return <>{booking.service?.name ?? "Court booking"}</>;
}

async function BookingList({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireStaff();
  const params = await searchParams;
  const query = text(params.q).trim();
  const requestedDate = text(params.date);
  const dateId = isValidDateId(requestedDate) ? requestedDate : manilaTodayId();
  const status = STATUSES.some((item) => item.value === text(params.status))
    ? (text(params.status) as (typeof STATUSES)[number]["value"])
    : "active";
  const { start, end } = manilaDateRange(dateId);

  let request = supabase
    .from("bookings")
    .select(
      `id, reference, starts_at, ends_at, duration_minutes, status, payment_status,
       amount_php, hold_expires_at, group_id, source, notes,
       booking_group:booking_groups(reference),
       player:profiles!bookings_player_id_fkey(full_name, email, phone),
       service:services(name, code),
       court_reservations(court:courts(name))`,
    )
    .order("starts_at", { ascending: !query })
    .limit(query ? 200 : 120);

  if (query) {
    request = request.or(`reference.ilike.%${query}%`);
  } else {
    request = request.gte("starts_at", start).lt("starts_at", end);
  }

  if (status === "active") request = request.in("status", ["pending", "confirmed"]);
  else if (status !== "all") request = request.eq("status", status);

  const { data, error } = await request;
  let bookings = (data ?? []) as unknown as StaffBooking[];

  if (query) {
    const needle = query.toLowerCase();
    bookings = bookings.filter((booking) => {
      const haystack = [
        booking.reference,
        booking.booking_group?.reference,
        booking.player?.full_name,
        booking.player?.email,
        booking.player?.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }

  return (
    <>
      <StaffPageHeader
        eyebrow="Reservations"
        title="Bookings"
        description="Find a player, check a hold, confirm a walk-in, or update today's arrivals."
        actions={
          <Link href="/staff/bookings/new" className={buttonClasses({ size: "sm" })}>
            <PlusIcon className="size-4" />
            New walk-in
          </Link>
        }
      />

      <div className="mt-5">
        <StaffFlash notice={text(params.notice) || null} error={text(params.error) || null} />
      </div>

      <form
        action="/staff/bookings"
        method="get"
        className="mb-4 grid gap-2 rounded-xl border border-line bg-surface p-3 shadow-card sm:grid-cols-[1fr_10rem_10rem_auto]"
      >
        <label className="relative block">
          <span className="sr-only">Search bookings</span>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search reference, name, email, or phone"
            className="h-10 w-full rounded-lg border border-line bg-page pl-9 pr-3 text-sm text-ink focus:border-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-blue/15"
          />
        </label>
        <label>
          <span className="sr-only">Booking date</span>
          <input
            type="date"
            name="date"
            defaultValue={dateId}
            className="h-10 w-full rounded-lg border border-line bg-page px-2 text-sm font-semibold text-heading"
          />
        </label>
        <label>
          <span className="sr-only">Booking status</span>
          <select
            name="status"
            defaultValue={status}
            className="h-10 w-full rounded-lg border border-line bg-page px-2 text-sm font-semibold text-heading"
          >
            {STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={buttonClasses({ size: "md" })}>
          Apply
        </button>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-caption text-muted">
        <Link
          href={`/staff/bookings?date=${shiftDateId(dateId, -1)}&status=${status}`}
          className="rounded-md border border-line bg-surface px-2 py-1 font-semibold text-heading"
        >
          ← {formatStaffDate(`${shiftDateId(dateId, -1)}T12:00:00+08:00`, { year: undefined })}
        </Link>
        <span className="font-semibold text-heading">
          {query ? `Search results for “${query}”` : formatStaffDate(`${dateId}T12:00:00+08:00`)}
        </span>
        <Link
          href={`/staff/bookings?date=${shiftDateId(dateId, 1)}&status=${status}`}
          className="rounded-md border border-line bg-surface px-2 py-1 font-semibold text-heading"
        >
          {formatStaffDate(`${shiftDateId(dateId, 1)}T12:00:00+08:00`, { year: undefined })} →
        </Link>
        {!query && dateId !== manilaTodayId() ? (
          <Link href={`/staff/bookings?status=${status}`} className="font-semibold text-accent-ink">
            Today
          </Link>
        ) : null}
        {query ? (
          <Link href={`/staff/bookings?date=${dateId}`} className="font-semibold text-accent-ink">
            Clear search
          </Link>
        ) : null}
      </div>

      {error ? (
        <Alert variant="warning" title="Bookings could not be loaded">
          Refresh the page and try again.
        </Alert>
      ) : null}

      {!error && bookings.length === 0 ? (
        <StaffPanel title="No matching bookings">
          <StaffEmpty
            icon={CalendarIcon}
            title="Nothing to show here"
            description="Try a different date, clear the filter, or search by a booking reference."
            action={
              <Link href="/staff/bookings/new" className={buttonClasses({ size: "sm" })}>
                Create a walk-in
              </Link>
            }
          />
        </StaffPanel>
      ) : null}

      {bookings.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line bg-page/70 text-[0.6875rem] uppercase tracking-[0.1em] text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Time</th>
                  <th className="px-4 py-2.5 font-bold">Player</th>
                  <th className="px-4 py-2.5 font-bold">Court / service</th>
                  <th className="px-4 py-2.5 font-bold">Status</th>
                  <th className="px-4 py-2.5 font-bold">Payment</th>
                  <th className="px-4 py-2.5 text-right font-bold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {bookings.map((booking) => {
                  const statusMeta = bookingStatusMeta(booking.status);
                  const paymentMeta = paymentStatusMeta(booking.payment_status);
                  return (
                    <tr key={booking.id} className="transition-colors hover:bg-page/55">
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link
                          href={`/staff/bookings/${encodeURIComponent(booking.reference)}`}
                          className="font-semibold text-heading hover:text-accent-ink"
                        >
                          {formatStaffDate(booking.starts_at, { weekday: "short" })}
                        </Link>
                        <span className="mt-0.5 block text-caption text-muted">
                          {formatStaffTime(booking.starts_at)} · {booking.duration_minutes} min
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-heading">{personLabel(booking.player)}</p>
                        <p className="mt-0.5 max-w-[12rem] truncate text-caption text-muted">
                          {booking.player?.email ?? "No email"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-heading"><RoomLabel booking={booking} /></p>
                        <p className="mt-0.5 font-mono text-[0.625rem] text-muted">
                          {booking.booking_group?.reference ?? booking.reference}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusMeta.variant} dot>{statusMeta.label}</Badge>
                        {booking.status === "pending" && booking.hold_expires_at ? (
                          <p className="mt-1 text-[0.625rem] text-warning">Hold active</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={paymentMeta.variant}>{paymentMeta.label}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-heading">
                        {formatPeso(Number(booking.amount_php))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-line md:hidden">
            {bookings.map((booking) => {
              const statusMeta = bookingStatusMeta(booking.status);
              const paymentMeta = paymentStatusMeta(booking.payment_status);
              return (
                <Link
                  key={booking.id}
                  href={`/staff/bookings/${encodeURIComponent(booking.reference)}`}
                  className="block p-4 transition-colors hover:bg-page/55"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-heading">
                        {formatStaffDate(booking.starts_at, { weekday: "short" })}
                      </p>
                      <p className="mt-0.5 text-caption text-muted">
                        {formatStaffTime(booking.starts_at)} · <RoomLabel booking={booking} />
                      </p>
                    </div>
                    <span className="font-bold text-heading">{formatPeso(Number(booking.amount_php))}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant={statusMeta.variant} dot>{statusMeta.label}</Badge>
                    <Badge variant={paymentMeta.variant}>{paymentMeta.label}</Badge>
                    <span className="text-caption text-muted">{personLabel(booking.player)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {bookings.length >= 120 && !query ? (
        <p className="mt-3 text-caption text-muted">
          Showing the first 120 rows. Narrow the date or status to see fewer.
        </p>
      ) : null}
    </>
  );
}

export default function StaffBookingsPage({ searchParams }: { searchParams: SearchParams }) {
  return <BookingList searchParams={searchParams} />;
}
