import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  updateOpenPlayRegistrationAction,
  updateOpenPlaySessionAction,
} from "@/app/staff/actions";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ArrowLeftIcon, BallIcon, UsersIcon } from "@/components/ui/icons";
import { ConfirmSubmitButton } from "@/components/staff/confirm-submit-button";
import {
  StaffEmpty,
  StaffFlash,
  StaffPageHeader,
  StaffPanel,
} from "@/components/staff/staff-ui";
import { requireStaff } from "@/lib/staff/auth";
import { formatPeso, type BookingStatus, type PaymentStatus } from "@/lib/bookings";
import {
  openPlayLevelLabel,
  openPlaySessionStatusMeta,
  type OpenPlaySkillLevel,
  type OpenPlaySessionStatus,
} from "@/lib/open-play";
import {
  formatStaffDate,
  formatStaffDateTime,
  formatStaffTimeRange,
  manilaDateValue,
  manilaTimeValue,
} from "@/lib/staff/time";
import { personLabel, type StaffPerson } from "@/lib/staff/types";

export const metadata: Metadata = {
  title: "Open-play session",
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string | string[]; error?: string | string[] }>;
};

type Session = {
  id: string;
  starts_at: string;
  duration_minutes: number;
  skill_level: OpenPlaySkillLevel;
  capacity: number;
  amount_php: number | string;
  status: OpenPlaySessionStatus;
};

type Registration = {
  id: string;
  status: "registered" | "cancelled" | "attended" | "no_show";
  created_at: string;
  player: StaffPerson | null;
  booking: {
    reference: string;
    status: BookingStatus;
    payment_status: PaymentStatus;
  } | null;
};

function text(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const REGISTRATION_LABEL: Record<Registration["status"], string> = {
  registered: "Registered",
  cancelled: "Cancelled",
  attended: "Attended",
  no_show: "No-show",
};

async function SessionDetail({ params, searchParams }: PageProps) {
  const { supabase } = await requireStaff();
  const { id } = await params;
  const query = await searchParams;

  const { data: sessionData, error: sessionError } = await supabase
    .from("open_play_sessions")
    .select("id, starts_at, duration_minutes, skill_level, capacity, amount_php, status")
    .eq("id", id)
    .maybeSingle();

  if (sessionError || !sessionData) notFound();
  const session = sessionData as Session;

  const { data: registrationData, error: registrationError } = await supabase
    .from("open_play_registrations")
    .select(
      `id, status, created_at,
       player:profiles!open_play_registrations_player_id_fkey(full_name, email, phone),
       booking:bookings(reference, status, payment_status)`,
    )
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  const registrations = (registrationData ?? []) as unknown as Registration[];
  const active = registrations.filter((registration) =>
    ["registered", "attended"].includes(registration.status),
  );
  const meta = openPlaySessionStatusMeta(session.status);
  const full = active.length >= session.capacity;
  const returnPath = `/staff/open-play/${session.id}`;
  const endsAt = new Date(
    new Date(session.starts_at).getTime() + session.duration_minutes * 60000,
  ).toISOString();

  return (
    <>
      <Link
        href="/staff/open-play"
        className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-accent-ink"
      >
        <ArrowLeftIcon className="size-4" />
        Back to open play
      </Link>

      <div className="mt-3">
        <StaffPageHeader
          eyebrow="Open-play session"
          title={`${openPlayLevelLabel(session.skill_level)} · ${formatStaffDate(session.starts_at)}`}
          description={`${formatStaffTimeRange(session.starts_at, endsAt)} · ${formatPeso(Number(session.amount_php))} per player`}
          actions={
            <div className="flex items-center gap-2">
              <Badge variant={meta.variant} dot>{meta.label}</Badge>
              {full ? <Badge variant="warning">Full</Badge> : null}
            </div>
          }
        />
      </div>

      <div className="mt-5">
        <StaffFlash notice={text(query.notice) || null} error={text(query.error) || null} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_23rem] xl:items-start">
        <div className="space-y-5">
          <StaffPanel
            title="Player roster"
            description={`${active.length} of ${session.capacity} places filled`}
            action={<Badge variant={full ? "warning" : "info"}>{full ? "Full" : `${session.capacity - active.length} left`}</Badge>}
          >
            {registrationError ? (
              <p className="text-sm text-danger">The roster could not be loaded.</p>
            ) : null}

            {!registrationError && registrations.length === 0 ? (
              <StaffEmpty
                icon={UsersIcon}
                title="No registrations yet"
                description="Players who reserve a place will appear here with their payment and attendance controls."
              />
            ) : null}

            {registrations.length > 0 ? (
              <div className="space-y-2">
                {registrations.map((registration) => (
                  <div
                    key={registration.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-page/50 px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-heading">{personLabel(registration.player)}</p>
                      <p className="mt-0.5 truncate text-caption text-muted">
                        {registration.player?.email ?? "No email"}
                        {registration.booking?.reference ? ` · ${registration.booking.reference}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          registration.status === "attended"
                            ? "success"
                            : registration.status === "no_show"
                              ? "danger"
                              : registration.status === "cancelled"
                                ? "neutral"
                                : "info"
                        }
                      >
                        {REGISTRATION_LABEL[registration.status]}
                      </Badge>
                      <form action={updateOpenPlayRegistrationAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="returnPath" value={returnPath} />
                        <input type="hidden" name="registrationId" value={registration.id} />
                        <label className="sr-only" htmlFor={`attendance-${registration.id}`}>
                          Attendance for {personLabel(registration.player)}
                        </label>
                        <select
                          id={`attendance-${registration.id}`}
                          name="status"
                          defaultValue={registration.status}
                          className="h-8 rounded-md border border-line bg-surface px-2 text-xs font-semibold text-heading"
                        >
                          <option value="registered">Registered</option>
                          <option value="attended">Attended</option>
                          <option value="no_show">No-show</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <SubmitButton
                          variant="secondary"
                          size="sm"
                          className="h-8 px-2.5 text-xs"
                          pendingLabel="Saving…"
                        >
                          Save
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </StaffPanel>

          <StaffPanel
            title="Session settings"
            description="Updates appear on the public open-play schedule immediately."
          >
            <form action={updateOpenPlaySessionAction} className="space-y-4">
              <input type="hidden" name="sessionId" value={session.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="session-date" label="Date" required>
                  <Input id="session-date" name="date" type="date" defaultValue={manilaDateValue(session.starts_at)} required />
                </Field>
                <Field id="session-time" label="Start time" required>
                  <Input id="session-time" name="time" type="time" defaultValue={manilaTimeValue(session.starts_at)} required />
                </Field>
                <Field id="session-end-time" label="End time" required>
                  <Input
                    id="session-end-time"
                    name="endTime"
                    type="time"
                    defaultValue={manilaTimeValue(endsAt)}
                    required
                  />
                </Field>
                <Field id="session-level" label="Level" required>
                  <Select id="session-level" name="level" defaultValue={session.skill_level}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </Select>
                </Field>
                <Field id="session-capacity" label="Capacity" required>
                  <Input id="session-capacity" name="capacity" type="number" min={1} max={100} defaultValue={session.capacity} required />
                </Field>
                <Field id="session-amount" label="Price / player" required>
                  <Input id="session-amount" name="amount" type="number" min={0} step="0.01" defaultValue={Number(session.amount_php)} required />
                </Field>
              </div>
              <Field
                id="session-status"
                label="Status"
                hint="Choosing Cancelled requires a reason below and cancels active registrations."
              >
                <Select id="session-status" name="status" defaultValue={session.status}>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </Field>
              <Field
                id="session-reason"
                label="Cancellation reason"
                optionalLabel
                hint="Required only when the status is Cancelled."
              >
                <Textarea id="session-reason" name="reason" rows={2} maxLength={500} />
              </Field>
              <div className="flex justify-end">
                <ConfirmSubmitButton
                  message="Save these session changes?"
                  variant="primary"
                >
                  Save session
                </ConfirmSubmitButton>
              </div>
            </form>
          </StaffPanel>
        </div>

        <div className="space-y-5">
          <StaffPanel title="Session facts">
            <dl className="divide-y divide-line">
              <div className="flex justify-between gap-3 py-2.5 first:pt-0">
                <dt className="text-caption text-muted">Date</dt>
                <dd className="text-right text-sm font-semibold text-heading">{formatStaffDateTime(session.starts_at)}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="text-caption text-muted">Level</dt>
                <dd className="text-right text-sm font-semibold text-heading">{openPlayLevelLabel(session.skill_level)}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="text-caption text-muted">Places</dt>
                <dd className="text-right text-sm font-semibold text-heading">{active.length} / {session.capacity}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="text-caption text-muted">Price</dt>
                <dd className="text-right text-sm font-semibold text-heading">{formatPeso(Number(session.amount_php))}</dd>
              </div>
            </dl>
          </StaffPanel>

          {session.status !== "cancelled" ? (
            <StaffPanel title="Cancel session" description="This cannot be undone from the desk.">
              <form action={updateOpenPlaySessionAction} className="space-y-3">
                <input type="hidden" name="sessionId" value={session.id} />
                <input type="hidden" name="date" value={manilaDateValue(session.starts_at)} />
                <input type="hidden" name="time" value={manilaTimeValue(session.starts_at)} />
                <input type="hidden" name="endTime" value={manilaTimeValue(endsAt)} />
                <input type="hidden" name="level" value={session.skill_level} />
                <input type="hidden" name="capacity" value={session.capacity} />
                <input type="hidden" name="amount" value={Number(session.amount_php)} />
                <input type="hidden" name="status" value="cancelled" />
                <Field
                  id="cancel-session-reason"
                  label="Reason"
                  required
                  hint="Players will see this in their booking history."
                >
                  <Textarea id="cancel-session-reason" name="reason" rows={2} maxLength={500} required />
                </Field>
                <ConfirmSubmitButton
                  message="Cancel this open-play session for everyone?"
                  variant="danger"
                  className="w-full"
                >
                  Cancel session
                </ConfirmSubmitButton>
              </form>
            </StaffPanel>
          ) : (
            <div className="rounded-xl border border-danger/20 bg-danger-soft/45 p-4 text-sm text-danger">
              This session is cancelled. Active registrations were moved to cancelled.
            </div>
          )}

          <div className="rounded-xl border border-brand-blue/20 bg-brand-blue-soft/40 p-4">
            <div className="flex items-start gap-2.5">
              <BallIcon className="mt-0.5 size-5 shrink-0 text-accent-ink" />
              <p className="text-caption leading-relaxed text-muted">
                Attendance changes update the player&apos;s booking status. Payment is still managed
                separately in the payments queue.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function StaffOpenPlayDetailPage({ params, searchParams }: PageProps) {
  return <SessionDetail params={params} searchParams={searchParams} />;
}
