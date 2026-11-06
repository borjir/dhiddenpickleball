import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ArrowRightIcon, CalendarIcon } from "@/components/ui/icons";
import {
  bookingCourtName,
  bookingStatusMeta,
  formatBookingDate,
  formatBookingTimeRange,
  formatPeso,
  isUpcomingBooking,
  manilaDateId,
  paymentStatusMeta,
  type AccountBooking,
  type BookingGroupSummary,
} from "@/lib/bookings";

function GroupCard({
  group,
  bookings,
}: {
  group: BookingGroupSummary;
  bookings: AccountBooking[];
}) {
  const status = bookingStatusMeta(group.status);
  const payment = paymentStatusMeta(group.payment_status);
  const sorted = [...bookings].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
  const first = sorted[0];
  const dates = new Set(bookings.map((booking) => manilaDateId(booking.starts_at)));

  return (
    <Link
      href={`/account/bookings/group/${encodeURIComponent(group.reference)}`}
      className="group block rounded-xl border border-brand-blue/30 bg-brand-blue-soft/20 p-4 transition-[border-color,background-color,box-shadow] duration-200 hover:border-brand-blue/50 hover:bg-surface hover:shadow-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-heading">
            {first ? formatBookingDate(first.starts_at) : "Grouped reservation"}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {bookings.length}{" "}
            {bookings.length === 1 ? "court time" : "court times"} ·{" "}
            {dates.size} {dates.size === 1 ? "date" : "dates"}
          </p>
        </div>
        <Badge variant={status.variant} dot>
          {status.label}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.08em] text-muted">
          {group.reference}
        </p>
        <ArrowRightIcon className="size-4 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent-ink" />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <Badge variant={payment.variant}>{payment.label}</Badge>
        <span className="text-sm font-semibold text-heading">
          {formatPeso(group.amount_php)}
        </span>
      </div>
    </Link>
  );
}

function BookingCard({ booking }: { booking: AccountBooking }) {
  const status = bookingStatusMeta(booking.status);
  const payment = paymentStatusMeta(booking.payment_status);

  return (
    <Link
      href={`/account/bookings/${encodeURIComponent(booking.reference)}`}
      className="group block rounded-xl border border-line bg-page/40 p-4 transition-[border-color,background-color,box-shadow] duration-200 hover:border-brand-blue/35 hover:bg-surface hover:shadow-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-heading">
            {formatBookingDate(booking.starts_at)}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {formatBookingTimeRange(booking.starts_at, booking.ends_at)}
          </p>
        </div>
        <Badge variant={status.variant} dot>
          {status.label}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-heading">
          {bookingCourtName(booking)}
          <span className="font-normal text-muted">
            {" "}
            · {booking.duration_minutes} min
          </span>
        </p>
        <ArrowRightIcon className="size-4 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent-ink" />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <span className="font-mono text-[0.6875rem] font-semibold tracking-[0.08em] text-muted">
          {booking.reference}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <Badge variant={payment.variant}>{payment.label}</Badge>
          <span className="text-sm font-semibold text-heading">
            {formatPeso(booking.amount_php)}
          </span>
        </span>
      </div>
    </Link>
  );
}

function EmptyBookings() {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-line-strong bg-page/40 px-5 py-8 text-center">
      <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-brand-blue-soft text-accent-ink">
        <CalendarIcon className="size-5" />
      </span>
      <p className="mt-3 font-display text-base font-bold text-heading">
        No bookings yet
      </p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
        Your court time or open-play place, reference, and payment status will
        appear here.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link
          href="/book"
          className={buttonClasses({
            variant: "secondary",
            size: "md",
          })}
        >
          Book a court
          <ArrowRightIcon className="size-4" />
        </Link>
        <Link
          href="/open-play"
          className={buttonClasses({
            variant: "secondary",
            size: "md",
          })}
        >
          Find open play
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    </div>
  );
}

export function BookingList({
  bookings,
  error,
}: {
  bookings: AccountBooking[];
  error: boolean;
}) {
  const groupBuckets = new Map<
    string,
    { group: BookingGroupSummary; bookings: AccountBooking[] }
  >();
  const individual: AccountBooking[] = [];

  for (const booking of bookings) {
    if (booking.group_id && booking.booking_group) {
      const bucket = groupBuckets.get(booking.group_id);
      if (bucket) bucket.bookings.push(booking);
      else
        groupBuckets.set(booking.group_id, {
          group: booking.booking_group,
          bookings: [booking],
        });
    } else {
      individual.push(booking);
    }
  }

  const groups = Array.from(groupBuckets.values());
  const upcomingGroups = groups.filter(({ bookings: ranges }) =>
    ranges.some((booking) => isUpcomingBooking(booking)),
  );
  const pastGroups = groups.filter(
    ({ bookings: ranges }) =>
      !ranges.some((booking) => isUpcomingBooking(booking)),
  );
  const upcomingIds = new Set(
    individual
      .filter((booking) => isUpcomingBooking(booking))
      .map((booking) => booking.id),
  );
  const upcoming = individual
    .filter((booking) => upcomingIds.has(booking.id))
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
  const past = individual
    .filter((booking) => !upcomingIds.has(booking.id))
    .sort(
      (a, b) =>
        new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
    );

  return (
    <section
      aria-labelledby="account-bookings"
      className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-eyebrow font-bold uppercase text-accent-ink">
            Bookings
          </p>
          <h2
            id="account-bookings"
            className="mt-1 font-display text-2xl font-bold text-heading"
          >
            Your bookings
          </h2>
        </div>
        <Link
          href="/book"
          className={buttonClasses({ variant: "secondary" })}
        >
          <CalendarIcon className="size-4" />
          Book a court
        </Link>
      </div>

      {error ? (
        <Alert
          variant="warning"
          className="mt-5"
          eyebrow="Reservations not loaded"
          title="Your bookings could not be read right now"
        >
          Refresh the page and try again. If it keeps failing, contact the club
          with your booking reference.
        </Alert>
      ) : null}

      {!error && bookings.length === 0 ? <EmptyBookings /> : null}

      {!error && (upcomingGroups.length > 0 || upcoming.length > 0) ? (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-heading">Upcoming</h3>
          <div className="mt-3 space-y-3">
            {upcomingGroups.map(({ group, bookings: ranges }) => (
              <GroupCard key={group.id} group={group} bookings={ranges} />
            ))}
            {upcoming.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </div>
      ) : null}

      {!error &&
      bookings.length > 0 &&
      upcomingGroups.length === 0 &&
      upcoming.length === 0 ? (
        <p className="mt-5 rounded-lg bg-page/60 px-4 py-3 text-sm text-muted">
          No upcoming bookings. Past and cancelled bookings are below.
        </p>
      ) : null}

      {!error && (pastGroups.length > 0 || past.length > 0) ? (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-heading">
            Past and cancelled
          </h3>
          <div className="mt-3 space-y-3">
            {pastGroups.map(({ group, bookings: ranges }) => (
              <GroupCard key={group.id} group={group} bookings={ranges} />
            ))}
            {past.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
