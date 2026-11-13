import type { Metadata } from "next";
import {
  createCourtClosureAction,
  deleteCourtClosureAction,
  updateCourtHoursAction,
  updateServiceRateAction,
} from "@/app/staff/actions";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  CalendarIcon,
  ClockIcon,
  CourtIcon,
  PlusIcon,
  SearchIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { ConfirmSubmitButton } from "@/components/staff/confirm-submit-button";
import {
  StaffEmpty,
  StaffFlash,
  StaffPageHeader,
  StaffPanel,
} from "@/components/staff/staff-ui";
import {
  StaffFilterBar,
  StaffFilterField,
  StaffFilterSelect,
  StaffSearchField,
} from "@/components/staff/staff-filters";
import { requireStaff } from "@/lib/staff/auth";
import { staffSearchTerm } from "@/lib/staff/search";
import {
  formatStaffDateTime,
  manilaTodayId,
} from "@/lib/staff/time";

export const metadata: Metadata = {
  title: "Courts",
};

type SearchParams = Promise<{
  q?: string | string[];
  court?: string | string[];
  notice?: string | string[];
  error?: string | string[];
}>;

type Court = { id: string; name: string; slug: string };
type Closure = {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string;
  court: { name: string } | null;
};
type Rate = {
  id: string;
  starts_at_minute: number;
  ends_at_minute: number;
  amount_php: number;
  service: { code: string; name: string } | null;
};
type OperatingHours = {
  court_id: string;
  day_of_week: number;
  opens_at_minute: number;
  closes_at_minute: number;
  is_closed: boolean;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function text(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/** 420 → "07:00" for a time input. */
function timeValue(minute: number) {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** 420 → "7:00 AM", 1440 → "12:00 AM". */
function timeLabel(minute: number) {
  const hours = Math.floor(minute / 60) % 24;
  const minutes = minute % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function hoursSummary(rows: OperatingHours[]) {
  if (rows.length === 0) return "Hours not configured";
  if (rows.every((row) => row.is_closed)) return "Closed every day";

  const open = rows.filter((row) => !row.is_closed);
  const first = open[0];
  const same = open.every(
    (row) =>
      row.opens_at_minute === first.opens_at_minute &&
      row.closes_at_minute === first.closes_at_minute,
  );

  return same
    ? `Daily ${timeLabel(first.opens_at_minute)} – ${timeLabel(first.closes_at_minute)}`
    : "Custom hours by day";
}

async function Courts({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireStaff();
  const params = await searchParams;
  const now = new Date().toISOString();
  const query = staffSearchTerm(text(params.q));
  const requestedCourt = text(params.court);
  const courtFilter =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      requestedCourt,
    )
      ? requestedCourt
      : "all";

  let closuresRequest = supabase
    .from("court_closures")
    .select("id, starts_at, ends_at, reason, court:courts(name)")
    .gte("ends_at", now)
    .order("starts_at", { ascending: true })
    .limit(80);

  if (courtFilter !== "all") {
    // A whole-club block has no court_id, so it applies to every court.
    closuresRequest = closuresRequest.or(
      `court_id.eq.${courtFilter},court_id.is.null`,
    );
  }

  const [courtsResult, closuresResult, ratesResult, hoursResult] =
    await Promise.all([
      supabase
        .from("courts")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("sort_order"),
      closuresRequest,
      supabase
        .from("service_rates")
        .select(
          "id, starts_at_minute, ends_at_minute, amount_php, service:services(code, name)",
        )
        .eq("is_active", true)
        .order("starts_at_minute"),
      supabase
        .from("court_operating_hours")
        .select(
          "court_id, day_of_week, opens_at_minute, closes_at_minute, is_closed",
        )
        .order("day_of_week"),
    ]);

  const courts = (courtsResult.data ?? []) as Court[];
  const rates = (ratesResult.data ?? []) as unknown as Rate[];
  const operatingHours = (hoursResult.data ?? []) as OperatingHours[];
  const upcomingClosures = (closuresResult.data ?? []) as unknown as Closure[];
  const needle = query.toLowerCase();
  const closures = query
    ? upcomingClosures.filter((closure) =>
        `${closure.reason} ${closure.court?.name ?? "all courts"}`
          .toLowerCase()
          .includes(needle),
      )
    : upcomingClosures;

  return (
    <>
      <StaffPageHeader
        eyebrow="Availability"
        title="Court blocks"
        description="Block maintenance, private events, or a whole-club closure. Blocked time disappears from online availability immediately."
      />

      <div className="mt-5">
        <StaffFlash notice={text(params.notice) || null} error={text(params.error) || null} />
      </div>

      <StaffFilterBar
        action="/staff/courts"
        active={Boolean(query || courtFilter !== "all")}
        clearHref="/staff/courts"
        submitLabel="Show blocks"
        help="Search only looks at the upcoming blocks below."
        columns="sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_14rem]"
      >
        <StaffSearchField
          id="closure-search"
          label="Search blocks"
          placeholder="Reason or court name"
          defaultValue={query}
          hint="For example: repair, tournament, or Court 2."
        />
        <StaffFilterField
          id="closure-court"
          label="Court"
          hint="Whole-club blocks always appear."
        >
          <StaffFilterSelect
            id="closure-court"
            name="court"
            value={courtFilter}
            options={[
              { value: "all", label: "All courts" },
              ...courts.map((court) => ({
                value: court.id,
                label: court.name,
              })),
            ]}
          />
        </StaffFilterField>
      </StaffFilterBar>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <StaffPanel
          title="Upcoming blocks"
          description="Shown in Asia/Manila time."
          action={<Badge variant="neutral">{closures.length} upcoming</Badge>}
        >
          {closuresResult.error ? (
            <p className="text-sm text-danger">Court blocks could not be loaded.</p>
          ) : null}

          {!closuresResult.error && closures.length === 0 ? (
            <StaffEmpty
              icon={query ? SearchIcon : CalendarIcon}
              title={
                query
                  ? `No upcoming block matches “${query}”`
                  : courtFilter !== "all"
                    ? "No blocks for this court"
                    : "No court blocks"
              }
              description={
                query
                  ? "Check the spelling, or clear the filters to see every upcoming block."
                  : courtFilter !== "all"
                    ? "This court is following its normal hours. Whole-club closures would still appear here."
                    : "Both courts are following their normal operating hours. Add a block when a court needs to come offline."
              }
              action={
                query || courtFilter !== "all" ? (
                  <a
                    href="/staff/courts"
                    className={buttonClasses({ size: "sm" })}
                  >
                    Clear filters
                  </a>
                ) : undefined
              }
            />
          ) : null}

          {closures.length > 0 ? (
            <div className="space-y-2">
              {closures.map((closure) => (
                <div
                  key={closure.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line bg-page/50 px-3.5 py-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={closure.court ? "warning" : "danger"}>
                        {closure.court?.name ?? "All courts"}
                      </Badge>
                      <span className="text-sm font-bold text-heading">{closure.reason}</span>
                    </div>
                    <p className="mt-1 text-caption text-muted">
                      {formatStaffDateTime(closure.starts_at)} → {formatStaffDateTime(closure.ends_at)}
                    </p>
                  </div>
                  <form action={deleteCourtClosureAction}>
                    <input type="hidden" name="closureId" value={closure.id} />
                    <ConfirmSubmitButton
                      message="Remove this court block? Availability will open again."
                      variant="secondary"
                      size="sm"
                      className="text-danger hover:border-danger/40 hover:bg-danger-soft"
                    >
                      Remove
                    </ConfirmSubmitButton>
                  </form>
                </div>
              ))}
            </div>
          ) : null}
        </StaffPanel>

        <StaffPanel
          title="Add a block"
          description="Choose one court or the whole club."
          className="order-first xl:order-none"
        >
          <form action={createCourtClosureAction} className="space-y-3">
            <Field id="block-court" label="Court" required>
              <Select id="block-court" name="courtId" defaultValue="all">
                <option value="all">All courts</option>
                {courts.map((court) => (
                  <option key={court.id} value={court.id}>{court.name}</option>
                ))}
              </Select>
            </Field>
            <Field id="block-date" label="Date" required>
              <Input id="block-date" name="date" type="date" defaultValue={manilaTodayId()} required />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field id="block-start" label="From" required>
                <Input id="block-start" name="startTime" type="time" defaultValue="08:00" required />
              </Field>
              <Field id="block-end" label="To" required>
                <Input id="block-end" name="endTime" type="time" defaultValue="09:00" required />
              </Field>
            </div>
            <Field
              id="block-reason"
              label="Reason"
              required
              hint="Visible to staff. Keep it factual."
            >
              <Textarea
                id="block-reason"
                name="reason"
                rows={2}
                maxLength={300}
                placeholder="Example: Court 2 net repair"
                required
              />
            </Field>
            <SubmitButton className="w-full" pendingLabel="Saving block…">
              <PlusIcon className="size-4" />
              Save block
            </SubmitButton>
          </form>
        </StaffPanel>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {courts.map((court) => (
          <div
            key={court.id}
            className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-card"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-brand-blue-soft text-accent-ink ring-1 ring-brand-blue/10">
              <CourtIcon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-heading">{court.name}</p>
              <p className="mt-0.5 text-caption text-muted">
                {hoursSummary(
                  operatingHours.filter((row) => row.court_id === court.id),
                )}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-lime-soft px-2.5 py-1 text-[0.625rem] font-bold text-brand-lime-ink">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-lime" />
              Bookable
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
        <StaffPanel
          title="Prices"
          description="New bookings use the new amount immediately. Existing bookings keep the price they were quoted."
          action={<Badge variant="neutral">{rates.length} window{rates.length === 1 ? "" : "s"}</Badge>}
        >
          {rates.length === 0 ? (
            <StaffEmpty
              icon={WalletIcon}
              title="No rates configured"
              description="Court booking cannot quote a price until at least one rate window exists."
            />
          ) : (
            <ul className="divide-y divide-line">
              {rates.map((rate) => (
                <li
                  key={rate.id}
                  className="flex flex-wrap items-end justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-heading">
                      {rate.service?.name ?? "Court rental"}
                    </p>
                    <p className="mt-0.5 text-caption text-muted">
                      {timeLabel(rate.starts_at_minute)} – {timeLabel(rate.ends_at_minute)}
                    </p>
                  </div>
                  <form
                    action={updateServiceRateAction}
                    className="flex items-end gap-2"
                  >
                    <input type="hidden" name="rateId" value={rate.id} />
                    <Field id={`rate-${rate.id}`} label="Per hour (PHP)">
                      <Input
                        id={`rate-${rate.id}`}
                        name="amount"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        max="100000"
                        defaultValue={rate.amount_php.toFixed(2)}
                        className="w-28"
                        required
                      />
                    </Field>
                    <SubmitButton variant="secondary" size="sm" pendingLabel="Saving…">
                      Save
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </StaffPanel>

        <StaffPanel
          title="Operating hours"
          description="Online availability, booking checks, and price windows all follow these hours."
        >
          {courts.length === 0 ? (
            <StaffEmpty
              icon={ClockIcon}
              title="No active courts"
              description="Activate a court before setting its hours."
            />
          ) : (
            <div className="space-y-4">
              {courts.map((court) => {
                const rows = operatingHours.filter((row) => row.court_id === court.id);

                return (
                  <div key={court.id}>
                    <p className="text-sm font-bold text-heading">{court.name}</p>
                    {rows.length === 0 ? (
                      <p className="mt-1 text-caption text-muted">
                        No hours yet. Saving a day creates it.
                      </p>
                    ) : null}
                    <ul className="mt-1.5 space-y-1.5">
                      {rows.map((row) => (
                        <li key={row.day_of_week}>
                          <form
                            action={updateCourtHoursAction}
                            className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-page/40 px-2.5 py-2"
                          >
                            <input type="hidden" name="courtId" value={court.id} />
                            <input
                              type="hidden"
                              name="dayOfWeek"
                              value={row.day_of_week}
                            />
                            <span className="w-20 shrink-0 text-xs font-bold text-heading">
                              {DAY_NAMES[row.day_of_week]}
                            </span>
                            <input
                              type="time"
                              name="opensAt"
                              aria-label={`${court.name} ${DAY_NAMES[row.day_of_week]} opening time`}
                              defaultValue={timeValue(row.opens_at_minute)}
                              className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink"
                            />
                            <span className="text-xs text-muted">to</span>
                            <input
                              type="time"
                              name="closesAt"
                              aria-label={`${court.name} ${DAY_NAMES[row.day_of_week]} closing time`}
                              defaultValue={timeValue(row.closes_at_minute)}
                              className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink"
                            />
                            <label className="flex items-center gap-1 text-[0.6875rem] text-muted">
                              <input
                                type="checkbox"
                                name="isClosed"
                                defaultChecked={row.is_closed}
                              />
                              Closed
                            </label>
                            <SubmitButton
                              variant="ghost"
                              size="sm"
                              pendingLabel="Saving…"
                              className="ml-auto"
                            >
                              Save
                            </SubmitButton>
                          </form>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-3 border-t border-line pt-3 text-[0.6875rem] leading-relaxed text-muted">
            Times are Asia/Manila. Closing time may be 24:00 (midnight). A court
            closed for the day is removed from online availability.
          </p>
        </StaffPanel>
      </div>
    </>
  );
}

export default function StaffCourtsPage({ searchParams }: { searchParams: SearchParams }) {
  return <Courts searchParams={searchParams} />;
}
