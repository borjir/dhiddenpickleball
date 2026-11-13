import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  PlusIcon,
  SearchIcon,
} from "@/components/ui/icons";
import {
  StaffEmpty,
  StaffFlash,
  StaffPageHeader,
} from "@/components/staff/staff-ui";
import {
  StaffFilterBar,
  StaffFilterDate,
  StaffFilterField,
  StaffFilterSelect,
  StaffSearchField,
} from "@/components/staff/staff-filters";
import { StaffPagination } from "@/components/staff/staff-pagination";
import { requireStaff } from "@/lib/staff/auth";
import {
  staffPageCount,
  staffPageHref,
  staffPageNumber,
} from "@/lib/staff/pagination";
import { bookingSearchParts, staffSearchTerm } from "@/lib/staff/search";
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
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Bookings",
};

type SearchParams = Promise<{
  date?: string | string[];
  status?: string | string[];
  q?: string | string[];
  page?: string | string[];
  notice?: string | string[];
  error?: string | string[];
}>;

const STATUSES = [
  { value: "active", label: "Active bookings" },
  { value: "pending", label: "Waiting for payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No-shows" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "Everything" },
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
  const query = staffSearchTerm(text(params.q));
  const requestedDate = text(params.date);
  const dateId = isValidDateId(requestedDate) ? requestedDate : manilaTodayId();
  const requestedStatus = text(params.status);
  const status = STATUSES.some((item) => item.value === requestedStatus)
    ? (requestedStatus as (typeof STATUSES)[number]["value"])
    : query
      ? "all"
      : "active";
  const { start, end } = manilaDateRange(dateId);
  const pageSize = 40;
  const page = staffPageNumber(text(params.page));
  const listParams = {
    q: query || undefined,
    date: query ? undefined : dateId,
    status,
  };
  const clearSearchHref = `/staff/bookings?date=${dateId}${
    requestedStatus && requestedStatus !== "all" ? `&status=${status}` : ""
  }`;

  let request = supabase
    .from("bookings")
    .select(
      `id, reference, starts_at, ends_at, duration_minutes, status, payment_status,
       amount_php, hold_expires_at, group_id, source, notes,
       booking_group:booking_groups(reference),
       player:customers!bookings_customer_id_fkey(full_name, email, phone:mobile),
       service:services(name, code),
       court_reservations(court:courts(name))`,
      { count: "exact" },
    )
    // Voided rows are audit history, not desk work.
    .is("voided_at", null)
    .order("starts_at", { ascending: !query })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (query) {
    const parts = await bookingSearchParts(supabase, query);
    request = request.or(parts.join(","));
  } else {
    request = request.gte("starts_at", start).lt("starts_at", end);
  }

  if (status === "active") request = request.in("status", ["pending", "confirmed"]);
  else if (status !== "all") request = request.eq("status", status);

  const { data, error, count } = await request;
  const bookings = (data ?? []) as unknown as StaffBooking[];
  const total = count ?? 0;
  const totalPages = staffPageCount(total, pageSize);

  if (!error && page > totalPages) {
    redirect(staffPageHref("/staff/bookings", listParams, totalPages));
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

      <StaffFilterBar
        action="/staff/bookings"
        active={Boolean(query || requestedDate || text(params.status))}
        clearHref="/staff/bookings"
        submitLabel="Show bookings"
        help="Leave a box empty to see everything."
        columns="sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_11rem_13rem]"
      >
        <StaffSearchField
          id="booking-search"
          label="Search bookings"
          placeholder="Name, mobile, email, or reference"
          defaultValue={query}
          hint="Looks through every date and status, including old bookings."
          className="sm:col-span-2 lg:col-span-1"
        />
        {query ? (
          <input type="hidden" name="date" value={dateId} />
        ) : (
          <StaffFilterField id="booking-date" label="Date">
            <StaffFilterDate id="booking-date" name="date" value={dateId} />
          </StaffFilterField>
        )}
        <StaffFilterField
          id="booking-status"
          label="Booking status"
          hint="Active means waiting for payment or already confirmed."
        >
          <StaffFilterSelect
            id="booking-status"
            name="status"
            value={status}
            options={STATUSES}
          />
        </StaffFilterField>
      </StaffFilterBar>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {query ? (
          <>
            <span className="inline-flex min-h-9 items-center rounded-lg bg-brand-navy px-3 text-caption font-bold text-white">
              Searching all dates for “{query}”
            </span>
            <span className="text-caption font-semibold text-muted">
              {total} match{total === 1 ? "" : "es"}
            </span>
            <Link
              href={clearSearchHref}
              className="inline-flex h-9 items-center rounded-lg px-2 text-caption font-bold text-accent-ink hover:bg-brand-blue-soft/60"
            >
              Clear search
            </Link>
          </>
        ) : (
          <>
            <Link
              href={`/staff/bookings?date=${shiftDateId(dateId, -1)}&status=${status}`}
              aria-label={`Previous day, ${formatStaffDate(`${shiftDateId(dateId, -1)}T12:00:00+08:00`)}`}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 text-caption font-semibold text-heading transition-colors hover:border-line-strong hover:bg-brand-blue-soft/50"
            >
              <ArrowLeftIcon className="size-3.5" />
              {formatStaffDate(`${shiftDateId(dateId, -1)}T12:00:00+08:00`, { year: undefined })}
            </Link>
            <span className="inline-flex h-9 items-center rounded-lg bg-brand-navy px-3 text-caption font-bold text-white">
              {formatStaffDate(`${dateId}T12:00:00+08:00`)}
            </span>
            <Link
              href={`/staff/bookings?date=${shiftDateId(dateId, 1)}&status=${status}`}
              aria-label={`Next day, ${formatStaffDate(`${shiftDateId(dateId, 1)}T12:00:00+08:00`)}`}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 text-caption font-semibold text-heading transition-colors hover:border-line-strong hover:bg-brand-blue-soft/50"
            >
              {formatStaffDate(`${shiftDateId(dateId, 1)}T12:00:00+08:00`, { year: undefined })}
              <ArrowRightIcon className="size-3.5" />
            </Link>
            {dateId !== manilaTodayId() ? (
              <Link
                href={`/staff/bookings?status=${status}`}
                className="inline-flex h-9 items-center rounded-lg px-2 text-caption font-bold text-accent-ink hover:bg-brand-blue-soft/60"
              >
                Today
              </Link>
            ) : null}
          </>
        )}
      </div>

      {error ? (
        <Alert variant="warning" title="Bookings could not be loaded">
          Refresh the page and try again.
        </Alert>
      ) : null}

      {!error && bookings.length === 0 ? (
        <StaffEmpty
          icon={query ? SearchIcon : CalendarIcon}
          title={query ? `No booking found for “${query}”` : "Nothing on this day"}
          description={
            query
              ? "Check the spelling, then try the mobile number or the booking reference printed on the receipt."
              : "Try another date, choose a different status, or clear the filters."
          }
          action={
            query ? (
              <Link
                href={clearSearchHref}
                className={buttonClasses({ size: "sm" })}
              >
                Clear search
              </Link>
            ) : (
              <Link href="/staff/bookings/new" className={buttonClasses({ size: "sm" })}>
                Create a walk-in
              </Link>
            )
          }
        />
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
                  className="group flex gap-3 p-4 transition-colors hover:bg-page/55"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 w-1 shrink-0 self-stretch rounded-full",
                      statusMeta.variant === "success"
                        ? "bg-brand-lime"
                        : statusMeta.variant === "warning"
                          ? "bg-warning"
                          : statusMeta.variant === "danger"
                            ? "bg-danger"
                            : "bg-brand-blue",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-heading">
                          {formatStaffTime(booking.starts_at)} · {booking.duration_minutes} min
                        </span>
                        <span className="mt-0.5 block truncate text-caption text-muted">
                          {formatStaffDate(booking.starts_at, { weekday: "short" })} · <RoomLabel booking={booking} /> · {personLabel(booking.player)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-bold text-heading tabular-nums">
                          {formatPeso(Number(booking.amount_php))}
                        </span>
                        <ArrowRightIcon className="ml-auto mt-1 size-3.5 text-muted/50 transition-transform group-hover:translate-x-0.5 group-hover:text-accent-ink" />
                      </span>
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant={statusMeta.variant} dot>{statusMeta.label}</Badge>
                      <Badge variant={paymentMeta.variant}>{paymentMeta.label}</Badge>
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <StaffPagination
        page={page}
        pageSize={pageSize}
        total={total}
        basePath="/staff/bookings"
        params={listParams}
        noun={query ? "matching bookings" : "bookings"}
      />
    </>
  );
}

export default function StaffBookingsPage({ searchParams }: { searchParams: SearchParams }) {
  return <BookingList searchParams={searchParams} />;
}
