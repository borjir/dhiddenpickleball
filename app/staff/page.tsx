import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BallIcon,
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  WalletIcon,
} from "@/components/ui/icons";
import {
  StaffEmpty,
  StaffFlash,
  StaffPageHeader,
  StaffPanel,
  StaffStat,
  StaffLink,
} from "@/components/staff/staff-ui";
import { PaymentQueueEmpty, paymentReference } from "@/components/staff/payment-review";
import { requireStaff } from "@/lib/staff/auth";
import { formatPeso } from "@/lib/bookings";
import {
  formatStaffDateId,
  formatStaffTime,
  formatStaffTimeRange,
  isValidDateId,
  manilaDateRange,
  manilaTodayId,
  shiftDateId,
} from "@/lib/staff/time";
import {
  one,
  personLabel,
  type StaffBooking,
  type StaffOpenPlaySession,
  type StaffPayment,
} from "@/lib/staff/types";
import { openPlayLevelLabel } from "@/lib/open-play";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Today",
};

type SearchParams = Promise<{
  date?: string | string[];
  notice?: string | string[];
  error?: string | string[];
}>;

function text(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function DateSwitcher({ dateId }: { dateId: string }) {
  const today = manilaTodayId();
  const previous = shiftDateId(dateId, -1);
  const next = shiftDateId(dateId, 1);

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface p-1 shadow-card">
      <Link
        href={`/staff?date=${previous}`}
        aria-label="Previous day"
        className="grid size-9 place-items-center rounded-md text-muted transition-colors hover:bg-brand-blue-soft hover:text-heading"
      >
        <ArrowLeftIcon className="size-4" />
      </Link>
      <form action="/staff" method="get" className="flex items-center gap-1.5">
        <label htmlFor="dashboard-date" className="sr-only">
          Dashboard date
        </label>
        <input
          id="dashboard-date"
          type="date"
          name="date"
          defaultValue={dateId}
          className="h-9 rounded-md border border-line bg-page px-2 text-xs font-semibold text-heading"
        />
        <button
          type="submit"
          className="h-9 rounded-md px-2 text-xs font-bold text-accent-ink hover:bg-brand-blue-soft"
        >
          Go
        </button>
      </form>
      <Link
        href={`/staff?date=${next}`}
        aria-label="Next day"
        className="grid size-9 place-items-center rounded-md text-muted transition-colors hover:bg-brand-blue-soft hover:text-heading"
      >
        <ArrowRightIcon className="size-4" />
      </Link>
      {dateId !== today ? (
        <Link
          href="/staff"
          className="inline-flex h-9 items-center rounded-md bg-brand-blue-soft px-2.5 text-xs font-bold text-accent-ink"
        >
          Today
        </Link>
      ) : null}
    </div>
  );
}

function TimelineRow({
  kind,
  start,
  end,
  title,
  detail,
  meta,
  href,
}: {
  kind: "court" | "open";
  start: string;
  end: string;
  title: string;
  detail?: string;
  meta?: string;
  href?: string;
}) {
  const body = (
    <div className="relative flex min-w-0 flex-1 items-start justify-between gap-3 rounded-lg border border-transparent px-2 py-2 transition-colors group-hover:border-line group-hover:bg-page/60">
      <span
        aria-hidden="true"
        className={cn(
          "absolute -left-[1.35rem] top-4 size-2.5 rounded-full ring-4 ring-surface",
          kind === "court" ? "bg-brand-blue" : "bg-brand-lime",
        )}
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-heading">{title}</p>
          {meta ? <Badge variant="neutral">{meta}</Badge> : null}
        </div>
        {detail ? <p className="mt-0.5 truncate text-caption text-muted">{detail}</p> : null}
      </div>
      <span className="shrink-0 text-right text-caption font-semibold text-muted">
        {formatStaffTimeRange(start, end)}
      </span>
    </div>
  );

  return (
    <li className="grid grid-cols-[4.25rem_1fr] gap-3 py-0.5">
      <div className="pt-3 text-right">
        <p className="text-xs font-bold text-heading">{formatStaffTime(start)}</p>
        <p className="mt-0.5 text-[0.625rem] text-muted">{kind === "court" ? "Court" : "Open play"}</p>
      </div>
      <div className="border-l border-line pl-4 group">
        {href ? (
          <Link href={href} className="block">
            {body}
          </Link>
        ) : (
          body
        )}
      </div>
    </li>
  );
}

async function Dashboard({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireStaff();
  const params = await searchParams;
  const requestedDate = text(params.date);
  const todayId = manilaTodayId();
  const dateId = isValidDateId(requestedDate) ? requestedDate : todayId;
  const { start, end } = manilaDateRange(dateId);

  await supabase.rpc("release_expired_court_holds");

  const nowIso = new Date().toISOString();
  const [
    bookingsResult,
    sessionsResult,
    queueResult,
    reviewCountResult,
    holdCountResult,
    collectedResult,
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        `id, reference, starts_at, ends_at, duration_minutes, status, payment_status,
         amount_php, hold_expires_at, group_id, source, notes,
         player:profiles!bookings_player_id_fkey(full_name, email, phone),
         service:services(name, code),
         court_reservations(court:courts(name))`,
      )
      .gte("starts_at", start)
      .lt("starts_at", end)
      .in("status", ["pending", "confirmed", "completed"])
      .order("starts_at", { ascending: true }),
    supabase
      .from("open_play_sessions")
      .select(
        "id, starts_at, duration_minutes, skill_level, capacity, amount_php, status, open_play_registrations(id, status)",
      )
      .gte("starts_at", start)
      .lt("starts_at", end)
      .order("starts_at", { ascending: true }),
    supabase
      .from("payments")
      .select(
        `id, status, amount_php, transaction_reference, proof_path, submitted_at, rejection_reason,
         booking:bookings!payments_booking_id_fkey(reference, starts_at, player:profiles!bookings_player_id_fkey(full_name, email, phone)),
         group:booking_groups!payments_group_id_fkey(reference, created_at, player:profiles!booking_groups_player_id_fkey(full_name, email, phone))`,
      )
      .eq("status", "awaiting_verification")
      .order("submitted_at", { ascending: true })
      .limit(5),
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "awaiting_verification"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .gt("hold_expires_at", nowIso),
    supabase
      .from("payments")
      .select("amount_php, reviewed_at")
      .eq("status", "paid")
      .gte("reviewed_at", start)
      .lt("reviewed_at", end),
  ]);

  const bookings = (bookingsResult.data ?? []) as unknown as StaffBooking[];
  const sessions = (sessionsResult.data ?? []) as unknown as StaffOpenPlaySession[];
  const queue = (queueResult.data ?? []) as unknown as StaffPayment[];
  const collected = (collectedResult.data ?? []).reduce(
    (sum, payment) => sum + Number(payment.amount_php),
    0,
  );
  const openPlayPlayers = sessions.reduce(
    (sum, session) =>
      sum +
      (session.open_play_registrations ?? []).filter((registration) =>
        ["registered", "attended"].includes(registration.status),
      ).length,
    0,
  );
  const nearCapacity = sessions.filter((session) => {
    const count = (session.open_play_registrations ?? []).filter((registration) =>
      ["registered", "attended"].includes(registration.status),
    ).length;
    return session.status === "scheduled" && count / session.capacity >= 0.8;
  });
  const activeBookings = bookings.filter((booking) => booking.status !== "cancelled");
  const timeline = [
    ...activeBookings.map((booking) => ({
      key: `booking-${booking.id}`,
      kind: "court" as const,
      start: booking.starts_at,
      end: booking.ends_at,
      title:
        booking.court_reservations?.[0]?.court?.name ??
        booking.service?.name ??
        "Court booking",
      detail: personLabel(booking.player),
      meta: booking.status === "pending" ? "On hold" : undefined,
      href: `/staff/bookings/${encodeURIComponent(booking.reference)}`,
    })),
    ...sessions.map((session) => ({
      key: `session-${session.id}`,
      kind: "open" as const,
      start: session.starts_at,
      end: new Date(
        new Date(session.starts_at).getTime() + session.duration_minutes * 60000,
      ).toISOString(),
      title: `${openPlayLevelLabel(session.skill_level)} open play`,
      detail: `${(session.open_play_registrations ?? []).filter((registration) => ["registered", "attended"].includes(registration.status)).length} of ${session.capacity} places filled`,
      meta: session.status === "scheduled" ? "Open" : session.status,
      href: `/staff/open-play/${session.id}`,
    })),
  ].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const attentionCount = (reviewCountResult.count ?? 0) + (holdCountResult.count ?? 0);

  return (
    <>
      <StaffPageHeader
        eyebrow="Operations desk"
        title={dateId === todayId ? "Today at D-Hidden" : formatStaffDateId(dateId)}
        description="The short version of the day: who is playing, what needs checking, and where the next gap is."
        actions={<DateSwitcher dateId={dateId} />}
      />

      <div className="mt-5">
        <StaffFlash notice={text(params.notice) || null} error={text(params.error) || null} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StaffStat
          icon={CalendarIcon}
          label="Court bookings"
          value={activeBookings.length}
          detail={`${activeBookings.reduce((sum, booking) => sum + booking.duration_minutes / 60, 0)} court hours booked`}
          tone="blue"
          href={`/staff/bookings?date=${dateId}`}
        />
        <StaffStat
          icon={BallIcon}
          label="Open-play players"
          value={openPlayPlayers}
          detail={`${sessions.length} session${sessions.length === 1 ? "" : "s"} today`}
          tone="lime"
          href="/staff/open-play"
        />
        <StaffStat
          icon={WalletIcon}
          label="To verify"
          value={reviewCountResult.count ?? 0}
          detail={attentionCount > 0 ? `${attentionCount} items need a look` : "Queue is clear"}
          tone={attentionCount > 0 ? "amber" : "navy"}
          href="/staff/payments"
        />
        <StaffStat
          icon={ClockIcon}
          label="Collected today"
          value={formatPeso(collected)}
          detail="Verified and manually recorded payments"
          tone="navy"
          href="/staff/reports"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <StaffPanel
          title="Day timeline"
          description="Courts and open play in one chronological view."
          action={
            <Link
              href={`/staff/bookings?date=${dateId}`}
              className="text-xs font-bold text-accent-ink hover:text-heading"
            >
              All bookings
            </Link>
          }
          bodyClassName="pt-2"
        >
          {timeline.length === 0 ? (
            <StaffEmpty
              icon={CalendarIcon}
              title="Nothing scheduled"
              description="No court reservations or open-play sessions are on the books for this date."
              action={
                <Link href="/staff/bookings/new" className={buttonClasses({ size: "sm" })}>
                  <PlusIcon className="size-4" />
                  Add a walk-in
                </Link>
              }
            />
          ) : (
            <ol className="max-h-[33rem] space-y-0 overflow-auto pr-1">
              {timeline.map((item) => (
                <TimelineRow
                  key={item.key}
                  kind={item.kind}
                  start={item.start}
                  end={item.end}
                  title={item.title}
                  detail={item.detail}
                  meta={item.meta}
                  href={item.href}
                />
              ))}
            </ol>
          )}
        </StaffPanel>

        <div className="space-y-5">
          <StaffPanel
            title="Needs attention"
            description="Work the queue before the next player arrives."
            action={
              <Link
                href="/staff/payments"
                className="text-xs font-bold text-accent-ink hover:text-heading"
              >
                Open queue
              </Link>
            }
            bodyClassName="space-y-3"
          >
            {(reviewCountResult.count ?? 0) > 0 ? (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold text-heading">Payments to verify</p>
                  <span className="text-xs font-bold text-warning">
                    {reviewCountResult.count} waiting
                  </span>
                </div>
                {queue.length === 0 ? (
                  <PaymentQueueEmpty compact />
                ) : (
                  <div className="space-y-2">
                    {queue.slice(0, 3).map((payment) => {
                      const booking = one(payment.booking);
                      const group = one(payment.group);
                      return (
                        <Link
                          key={payment.id}
                          href="/staff/payments"
                          className="flex items-center justify-between gap-3 rounded-lg border border-line bg-page/50 px-3 py-2.5 transition-colors hover:border-brand-blue/35 hover:bg-surface"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-heading">
                              {personLabel(booking?.player ?? group?.player)}
                            </span>
                            <span className="mt-0.5 block font-mono text-[0.625rem] text-muted">
                              {paymentReference(payment)}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-bold text-heading">
                            {formatPeso(Number(payment.amount_php))}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </>
            ) : null}

            {(holdCountResult.count ?? 0) > 0 ? (
              <Link
                href="/staff/bookings?status=pending"
                className="flex items-center justify-between gap-3 rounded-lg border border-warning/25 bg-warning-soft/50 px-3 py-2.5"
              >
                <span>
                  <span className="block text-sm font-semibold text-heading">Holds still active</span>
                  <span className="mt-0.5 block text-caption text-muted">
                    {holdCountResult.count} pending payment window{holdCountResult.count === 1 ? "" : "s"}
                  </span>
                </span>
                <ArrowRightIcon className="size-4 text-warning" />
              </Link>
            ) : null}

            {nearCapacity.length > 0 ? (
              <Link
                href="/staff/open-play"
                className="flex items-center justify-between gap-3 rounded-lg border border-brand-blue/20 bg-brand-blue-soft/50 px-3 py-2.5"
              >
                <span>
                  <span className="block text-sm font-semibold text-heading">Sessions filling up</span>
                  <span className="mt-0.5 block text-caption text-muted">
                    {nearCapacity.length} session{nearCapacity.length === 1 ? "" : "s"} at 80% or more
                  </span>
                </span>
                <ArrowRightIcon className="size-4 text-accent-ink" />
              </Link>
            ) : null}

            {attentionCount === 0 && nearCapacity.length === 0 ? (
              <div className="rounded-lg border border-success/20 bg-success-soft/50 px-4 py-4">
                <p className="text-sm font-semibold text-success">Nothing urgent right now</p>
                <p className="mt-1 text-caption text-muted">
                  Holds and payment proofs are clear. Keep an eye on the timeline for arrivals.
                </p>
              </div>
            ) : null}
          </StaffPanel>

          <StaffPanel title="Quick actions" bodyClassName="grid grid-cols-2 gap-2">
            <Link
              href="/staff/bookings/new"
              className="flex min-h-20 flex-col justify-between rounded-lg border border-line bg-page/50 p-3 transition-colors hover:border-brand-blue/35 hover:bg-surface"
            >
              <PlusIcon className="size-5 text-accent-ink" />
              <span className="text-sm font-bold text-heading">New walk-in</span>
            </Link>
            <Link
              href="/staff/payments"
              className="flex min-h-20 flex-col justify-between rounded-lg border border-line bg-page/50 p-3 transition-colors hover:border-brand-blue/35 hover:bg-surface"
            >
              <WalletIcon className="size-5 text-accent-ink" />
              <span className="text-sm font-bold text-heading">Review payments</span>
            </Link>
            <Link
              href="/staff/open-play"
              className="flex min-h-20 flex-col justify-between rounded-lg border border-line bg-page/50 p-3 transition-colors hover:border-brand-blue/35 hover:bg-surface"
            >
              <BallIcon className="size-5 text-accent-ink" />
              <span className="text-sm font-bold text-heading">Open-play desk</span>
            </Link>
            <Link
              href="/staff/courts"
              className="flex min-h-20 flex-col justify-between rounded-lg border border-line bg-page/50 p-3 transition-colors hover:border-brand-blue/35 hover:bg-surface"
            >
              <CalendarIcon className="size-5 text-accent-ink" />
              <span className="text-sm font-bold text-heading">Block a court</span>
            </Link>
          </StaffPanel>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-caption text-muted">
            <span>Signed in to the operations desk</span>
            <StaffLink href="/staff/reports">View reports</StaffLink>
          </div>
        </div>
      </div>
    </>
  );
}

export default function StaffTodayPage({ searchParams }: { searchParams: SearchParams }) {
  return <Dashboard searchParams={searchParams} />;
}
