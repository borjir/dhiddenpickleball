import type { Metadata } from "next";
import Link from "next/link";
import { createOpenPlaySessionAction } from "@/app/staff/actions";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Input, Select } from "@/components/ui/field";
import { BallIcon, PlusIcon } from "@/components/ui/icons";
import {
  StaffEmpty,
  StaffFlash,
  StaffPageHeader,
  StaffPanel,
} from "@/components/staff/staff-ui";
import { requireStaff } from "@/lib/staff/auth";
import { formatPeso } from "@/lib/bookings";
import {
  openPlayLevelLabel,
  openPlaySessionStatusMeta,
} from "@/lib/open-play";
import {
  formatStaffDate,
  formatStaffTime,
  manilaDateRange,
  manilaTodayId,
} from "@/lib/staff/time";
import { type StaffOpenPlaySession } from "@/lib/staff/types";

export const metadata: Metadata = {
  title: "Open play",
};

type SearchParams = Promise<{
  notice?: string | string[];
  error?: string | string[];
}>;

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
  const { start } = manilaDateRange(manilaTodayId());
  const { data, error } = await supabase
    .from("open_play_sessions")
    .select(
      "id, starts_at, duration_minutes, skill_level, capacity, amount_php, status, open_play_registrations(id, status)",
    )
    .gte("starts_at", start)
    .order("starts_at", { ascending: true })
    .limit(120);

  const sessions = (data ?? []) as unknown as StaffOpenPlaySession[];
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
          <a
            href="#new-session"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-brand-blue px-3 text-sm font-semibold text-white"
          >
            <PlusIcon className="size-4" />
            New session
          </a>
        }
      />

      <div className="mt-5">
        <StaffFlash notice={text(params.notice) || null} error={text(params.error) || null} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start">
        <div className="space-y-4">
          {error ? (
            <StaffPanel title="Sessions could not be loaded">
              <p className="text-sm text-muted">Refresh the page and try again.</p>
            </StaffPanel>
          ) : null}

          {!error && sessions.length === 0 ? (
            <StaffPanel title="Upcoming sessions">
              <StaffEmpty
                icon={BallIcon}
                title="No sessions scheduled"
                description="Create the next open-play session on the right. It will appear on the public schedule immediately."
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
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-blue-soft text-accent-ink">
                        <BallIcon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-heading">
                          {formatStaffTime(session.starts_at)} · {openPlayLevelLabel(session.skill_level)}
                        </p>
                        <p className="mt-0.5 text-caption text-muted">
                          {count} of {session.capacity} places · {formatPeso(Number(session.amount_php))} per player
                        </p>
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
          className="scroll-mt-24"
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
