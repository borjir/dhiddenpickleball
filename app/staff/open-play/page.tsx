import type { Metadata } from "next";
import Link from "next/link";
import { createOpenPlaySessionAction } from "@/app/staff/actions";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Input, Select } from "@/components/ui/field";
import { BallIcon, PlusIcon, SearchIcon } from "@/components/ui/icons";
import {
  StaffEmpty,
  StaffFlash,
  StaffPageHeader,
  StaffPanel,
} from "@/components/staff/staff-ui";
import {
  StaffFilterBar,
  StaffFilterDate,
  StaffFilterField,
  StaffFilterSelect,
  StaffSearchField,
} from "@/components/staff/staff-filters";
import { requireStaff } from "@/lib/staff/auth";
import { openPlaySessionSearchIds, staffSearchTerm } from "@/lib/staff/search";
import { formatPeso } from "@/lib/bookings";
import {
  openPlayLevelLabel,
  openPlaySessionStatusMeta,
} from "@/lib/open-play";
import {
  formatStaffDate,
  formatStaffTime,
  isValidDateId,
  manilaDateRange,
  manilaTodayId,
} from "@/lib/staff/time";
import { type StaffOpenPlaySession } from "@/lib/staff/types";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Open play",
};

type SearchParams = Promise<{
  q?: string | string[];
  date?: string | string[];
  level?: string | string[];
  status?: string | string[];
  notice?: string | string[];
  error?: string | string[];
}>;

const LEVELS = [
  { value: "all", label: "All levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

const SESSION_STATUSES = [
  { value: "all", label: "All sessions" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

function text(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function activeCount(session: StaffOpenPlaySession) {
  return (session.open_play_registrations ?? []).filter((registration) =>
    ["registered", "attended"].includes(registration.status),
  ).length;
}

async function OpenPlayDesk({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireStaff();
  const params = await searchParams;
  const query = staffSearchTerm(text(params.q));
  const requestedDate = text(params.date);
  const dateId = isValidDateId(requestedDate) ? requestedDate : "";
  const level = LEVELS.some((item) => item.value === text(params.level))
    ? (text(params.level) as (typeof LEVELS)[number]["value"])
    : "all";
  const sessionStatus = SESSION_STATUSES.some(
    (item) => item.value === text(params.status),
  )
    ? (text(params.status) as (typeof SESSION_STATUSES)[number]["value"])
    : "all";
  const todayRange = manilaDateRange(manilaTodayId());
  const limit = query ? 150 : 120;
  const matchingSessionIds = query
    ? await openPlaySessionSearchIds(supabase, query)
    : null;

  let sessions: StaffOpenPlaySession[] = [];
  let error = false;

  if (!matchingSessionIds || matchingSessionIds.length > 0) {
    let request = supabase
      .from("open_play_sessions")
      .select(
        "id, starts_at, duration_minutes, skill_level, capacity, amount_php, status, open_play_registrations(id, status)",
      )
      .order("starts_at", { ascending: !query })
      .limit(limit);

    if (matchingSessionIds) {
      request = request.in("id", matchingSessionIds);
    } else if (dateId) {
      const { start, end } = manilaDateRange(dateId);
      request = request.gte("starts_at", start).lt("starts_at", end);
    } else {
      request = request.gte("starts_at", todayRange.start);
    }

    if (level !== "all") request = request.eq("skill_level", level);
    if (sessionStatus !== "all") request = request.eq("status", sessionStatus);

    const result = await request;
    sessions = (result.data ?? []) as unknown as StaffOpenPlaySession[];
    error = Boolean(result.error);
  }

  const hasFilters =
    Boolean(query || requestedDate || level !== "all" || sessionStatus !== "all");
  const grouped = new Map<string, StaffOpenPlaySession[]>();
  for (const session of sessions) {
    const date = formatStaffDate(session.starts_at);
    grouped.set(date, [...(grouped.get(date) ?? []), session]);
  }

  return (
    <>
      <StaffPageHeader
        eyebrow="Programme"
        title="Open-play desk"
        description="Capacity, attendance, and session changes without touching the database."
        actions={
          <a href="#new-session" className={buttonClasses({ size: "sm" })}>
            <PlusIcon className="size-4" />
            New session
          </a>
        }
      />

      <div className="mt-5">
        <StaffFlash notice={text(params.notice) || null} error={text(params.error) || null} />
      </div>

      <StaffFilterBar
        action="/staff/open-play"
        active={hasFilters}
        clearHref="/staff/open-play"
        submitLabel="Show sessions"
        help="Leave the date empty to see all upcoming sessions."
        columns="sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_10rem_10rem_11rem]"
      >
        <StaffSearchField
          id="session-search"
          label="Find a player"
          placeholder="Name, mobile, email, or reference"
          defaultValue={query}
          hint="Checks the player roster on every date, including past sessions."
          className="sm:col-span-2 lg:col-span-1"
        />
        {query ? (
          <input type="hidden" name="date" value={requestedDate} />
        ) : (
          <StaffFilterField id="session-date" label="Date">
            <StaffFilterDate id="session-date" name="date" value={dateId} />
          </StaffFilterField>
        )}
        <StaffFilterField id="session-level" label="Level">
          <StaffFilterSelect
            id="session-level"
            name="level"
            value={level}
            options={LEVELS}
          />
        </StaffFilterField>
        <StaffFilterField id="session-status" label="Session status">
          <StaffFilterSelect
            id="session-status"
            name="status"
            value={sessionStatus}
            options={SESSION_STATUSES}
          />
        </StaffFilterField>
      </StaffFilterBar>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start">
        <div className="space-y-4">
          {query && !error && sessions.length > 0 ? (
            <p className="text-caption font-semibold text-muted">
              {sessions.length} session{sessions.length === 1 ? "" : "s"}{" "}
              with “{query}” on the roster, from every date.
            </p>
          ) : null}

          {error ? (
            <StaffPanel title="Sessions could not be loaded">
              <p className="text-sm text-muted">Refresh the page and try again.</p>
            </StaffPanel>
          ) : null}

          {!error && sessions.length === 0 ? (
            <StaffPanel title={query ? "Search results" : "Upcoming sessions"}>
              <StaffEmpty
                icon={query ? SearchIcon : BallIcon}
                title={
                  query
                    ? `No session found for “${query}”`
                    : hasFilters
                      ? "No sessions match these filters"
                      : "No sessions scheduled"
                }
                description={
                  query
                    ? "Check the spelling, or try the player's mobile number or the booking reference printed on the receipt."
                    : hasFilters
                      ? "Try a different date, level, or session status. Choose “All levels” and “All sessions” to see everything."
                      : "Create the next open-play session on the right. It will appear on the public schedule immediately."
                }
                action={
                  query ? (
                    <Link
                      href={`/staff/open-play?date=${dateId}&level=${level}&status=${sessionStatus}`}
                      className={buttonClasses({ size: "sm" })}
                    >
                      Clear search
                    </Link>
                  ) : undefined
                }
              />
            </StaffPanel>
          ) : null}

          {Array.from(grouped.entries()).map(([date, rows]) => (
            <StaffPanel key={date} title={date} description={`${rows.length} session${rows.length === 1 ? "" : "s"}`} bodyClassName="space-y-2">
              {rows.map((session) => {
                const count = activeCount(session);
                const full = count >= session.capacity;
                const meta = openPlaySessionStatusMeta(session.status);
                return (
                  <Link
                    key={session.id}
                    href={`/staff/open-play/${session.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-page/50 px-3.5 py-3 transition-colors hover:border-brand-blue/35 hover:bg-surface"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-blue-soft text-accent-ink ring-1 ring-brand-blue/10">
                        <BallIcon className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-heading">
                          {formatStaffTime(session.starts_at)} · {openPlayLevelLabel(session.skill_level)}
                        </p>
                        <p className="mt-0.5 text-caption text-muted">
                          {count} of {session.capacity} places · {formatPeso(Number(session.amount_php))} per player
                        </p>
                        <span className="mt-2 flex items-center gap-2">
                          <span className="h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-line/60">
                            <span
                              className={cn(
                                "block h-full rounded-full transition-[width] duration-300",
                                full ? "bg-warning" : "bg-brand-lime",
                              )}
                              style={{
                                width: `${Math.min(100, Math.round((count / Math.max(1, session.capacity)) * 100))}%`,
                              }}
                            />
                          </span>
                          <span className="shrink-0 text-[0.625rem] font-semibold tabular-nums text-muted">
                            {Math.min(100, Math.round((count / Math.max(1, session.capacity)) * 100))}%
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={meta.variant} dot>{meta.label}</Badge>
                      {full && session.status === "scheduled" ? <Badge variant="warning">Full</Badge> : null}
                    </div>
                  </Link>
                );
              })}
            </StaffPanel>
          ))}
        </div>

        <StaffPanel
          className="order-first scroll-mt-24 xl:order-none"
          title="Create a session"
          description="Times are Asia/Manila. The public list updates on save."
        >
          <form id="new-session" action={createOpenPlaySessionAction} className="space-y-3">
            <Field id="new-session-date" label="Date" required>
              <Input id="new-session-date" name="date" type="date" defaultValue={manilaTodayId()} required />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field id="new-session-time" label="Start" required>
                <Input id="new-session-time" name="time" type="time" defaultValue="08:00" required />
              </Field>
              <Field id="new-session-end-time" label="End" required>
                <Input id="new-session-end-time" name="endTime" type="time" defaultValue="10:00" required />
              </Field>
            </div>
            <Field id="new-session-level" label="Level" required>
              <Select id="new-session-level" name="level" defaultValue="beginner">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field id="new-session-capacity" label="Capacity" required>
                <Input id="new-session-capacity" name="capacity" type="number" min={1} max={100} defaultValue={12} required />
              </Field>
              <Field id="new-session-amount" label="Price / player" required>
                <Input id="new-session-amount" name="amount" type="number" min={0} step="0.01" defaultValue={75} required />
              </Field>
            </div>
            <SubmitButton className="w-full" pendingLabel="Creating session…">
              <PlusIcon className="size-4" />
              Create session
            </SubmitButton>
          </form>
        </StaffPanel>
      </div>
    </>
  );
}

export default function StaffOpenPlayPage({ searchParams }: { searchParams: SearchParams }) {
  return <OpenPlayDesk searchParams={searchParams} />;
}
