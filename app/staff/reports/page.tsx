import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  ChartIcon,
  ClockIcon,
  DownloadIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/ui/icons";
import {
  StaffFlash,
  StaffPageHeader,
  StaffPanel,
  StaffStat,
} from "@/components/staff/staff-ui";
import {
  StaffFilterBar,
  StaffFilterDate,
  StaffFilterField,
} from "@/components/staff/staff-filters";
import { requireStaff } from "@/lib/staff/auth";
import { purgeProofsAction } from "@/app/staff/actions";
import { formatPeso } from "@/lib/bookings";
import { getStaffReport } from "@/lib/staff/reports";
import { cn } from "@/lib/cn";
import {
  isValidDateId,
  manilaTodayId,
  shiftDateId,
} from "@/lib/staff/time";

export const metadata: Metadata = {
  title: "Reports",
};

type SearchParams = Promise<{
  from?: string | string[];
  to?: string | string[];
  notice?: string | string[];
  error?: string | string[];
}>;

function text(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

async function Reports({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireStaff();
  const params = await searchParams;
  const today = manilaTodayId();
  const from = isValidDateId(text(params.from))
    ? text(params.from)
    : shiftDateId(today, -29);
  const to = isValidDateId(text(params.to)) ? text(params.to) : today;
  const report = await getStaffReport(supabase, from, to);
  const { data: quotaData } = await supabase.rpc("staff_quota_usage");
  const quota = quotaData as
    | {
        database_bytes: number;
        storage_bytes: number;
        proof_count: number;
        booking_count: number;
        payment_count: number;
        audit_count: number;
      }
    | null;
  const maxHours = Math.max(...report.days.map((day) => day.courtHours), 1);
  const maxCollected = Math.max(...report.days.map((day) => day.collected), 1);
  const presets = [
    { label: "Today", from: today, to: today },
    { label: "Last 7 days", from: shiftDateId(today, -6), to: today },
    { label: "Last 30 days", from: shiftDateId(today, -29), to: today },
    { label: "This month", from: `${today.slice(0, 7)}-01`, to: today },
  ];

  return (
    <>
      <StaffPageHeader
        eyebrow="Numbers"
        title="Operations report"
        description="The useful view first: court usage, open-play demand, money collected, and exceptions."
        actions={
          <Link
            href={`/staff/reports/export?from=${report.from}&to=${report.to}`}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            <DownloadIcon className="size-4" />
            Export Excel
          </Link>
        }
      />

      {text(params.notice) || text(params.error) ? (
        <div className="mt-5">
          <StaffFlash
            notice={text(params.notice) || null}
            error={text(params.error) || null}
          />
        </div>
      ) : null}

      <div className="mt-5">
        <StaffFilterBar
          action="/staff/reports"
          active={Boolean(text(params.from) || text(params.to))}
          clearHref="/staff/reports"
          submitLabel="Show report"
          help="Pick the first and last day you want to include."
          columns="sm:grid-cols-2 lg:grid-cols-[11rem_11rem]"
        >
          <StaffFilterField id="report-from" label="From date">
            <StaffFilterDate id="report-from" name="from" value={report.from} />
          </StaffFilterField>
          <StaffFilterField id="report-to" label="To date">
            <StaffFilterDate id="report-to" name="to" value={report.to} />
          </StaffFilterField>
        </StaffFilterBar>
      </div>

      <div className="-mt-1 mb-4 flex flex-wrap items-center gap-2">
        <span className="text-caption font-semibold text-muted">Quick ranges:</span>
        {presets.map((preset) => {
          const active = report.from === preset.from && report.to === preset.to;
          return (
            <Link
              key={preset.label}
              href={`/staff/reports?from=${preset.from}&to=${preset.to}`}
              aria-current={active ? "true" : undefined}
              className={cn(
                "inline-flex min-h-9 items-center rounded-lg border px-3 text-caption font-semibold transition-colors",
                active
                  ? "border-brand-navy bg-brand-navy text-white"
                  : "border-line bg-surface text-heading hover:border-line-strong hover:bg-brand-blue-soft/50",
              )}
            >
              {preset.label}
            </Link>
          );
        })}
        <span className="text-caption text-muted sm:ml-auto">
          Showing {report.from} to {report.to} · {report.days.length} day
          {report.days.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4">
        <StaffStat
          icon={CalendarIcon}
          label="Court bookings"
          value={report.totals.courtBookings}
          detail={`${report.totals.courtHours.toFixed(1)} booked court hours`}
          tone="blue"
        />
        <StaffStat
          icon={UsersIcon}
          label="Open-play places"
          value={report.totals.openPlayPlaces}
          detail="Registrations in the selected range"
          tone="lime"
        />
        <StaffStat
          icon={WalletIcon}
          label="Collected"
          value={formatPeso(report.totals.collected)}
          detail="Verified and manually recorded"
          tone="navy"
        />
        <StaffStat
          icon={ClockIcon}
          label="Outstanding"
          value={formatPeso(report.totals.outstanding)}
          detail="Upcoming unpaid bookings"
          tone={report.totals.outstanding > 0 ? "amber" : "navy"}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <StaffPanel
          title="Daily activity"
          description="Court hours and money collected are shown per Manila date."
          bodyClassName="p-0"
          className="min-w-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[660px] text-left text-sm">
              <thead className="border-b border-line bg-page/70 text-[0.6875rem] uppercase tracking-[0.1em] text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Date</th>
                  <th className="px-3 py-2.5 text-right font-bold">Courts</th>
                  <th className="px-3 py-2.5 font-bold">Hours</th>
                  <th className="px-3 py-2.5 text-right font-bold">Open play</th>
                  <th className="px-3 py-2.5 text-right font-bold">Collected</th>
                  <th className="px-3 py-2.5 text-right font-bold">Exceptions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.days.map((day) => (
                  <tr key={day.dateId} className="hover:bg-page/45">
                    <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-heading">
                      {day.label.replace(/, \d{4}$/, "")}
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted">{day.courtBookings}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-page">
                          <div
                            className="h-full rounded-full bg-brand-blue"
                            style={{ width: `${Math.min(100, (day.courtHours / maxHours) * 100)}%` }}
                          />
                        </div>
                        <span className="text-caption text-muted">{day.courtHours.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted">{day.openPlayPlaces}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="font-semibold text-heading">{formatPeso(day.collected)}</span>
                      <div className="ml-auto mt-1 h-1 w-16 overflow-hidden rounded-full bg-page">
                        <div
                          className="h-full rounded-full bg-brand-lime"
                          style={{ width: `${Math.min(100, (day.collected / maxCollected) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {day.cancellations + day.noShows > 0 ? (
                        <Badge variant="warning">{day.cancellations + day.noShows}</Badge>
                      ) : (
                        <span className="text-caption text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-line bg-page/60 font-bold text-heading">
                <tr>
                  <td className="px-4 py-3">Total</td>
                  <td className="px-3 py-3 text-right">{report.totals.courtBookings}</td>
                  <td className="px-3 py-3">{report.totals.courtHours.toFixed(1)} hr</td>
                  <td className="px-3 py-3 text-right">{report.totals.openPlayPlaces}</td>
                  <td className="px-3 py-3 text-right">{formatPeso(report.totals.collected)}</td>
                  <td className="px-3 py-3 text-right">
                    {report.totals.cancellations + report.totals.noShows}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </StaffPanel>

        <div className="space-y-5">
          <StaffPanel title="Court occupancy" description="Based on 2 courts × 17 open hours per day.">
            <div className="flex items-end justify-between gap-3">
              <p className="font-display text-4xl font-extrabold tracking-[-0.05em] text-heading">
                {report.totals.occupancy}%
              </p>
              <ChartIcon className="size-6 text-accent-ink" />
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-page ring-1 ring-line">
              <div
                className="h-full rounded-full bg-brand-blue"
                style={{ width: `${report.totals.occupancy}%` }}
              />
            </div>
            <p className="mt-2 text-caption leading-relaxed text-muted">
              {report.totals.courtHours.toFixed(1)} booked hours out of approximately{" "}
              {report.days.length * 34} available hours.
            </p>
          </StaffPanel>

          <StaffPanel title="Exceptions">
            <dl className="divide-y divide-line">
              <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                <dt className="text-caption text-muted">Cancellations</dt>
                <dd className="text-sm font-bold text-heading">{report.totals.cancellations}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-caption text-muted">No-shows</dt>
                <dd className="text-sm font-bold text-heading">{report.totals.noShows}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-caption text-muted">Outstanding</dt>
                <dd className="text-sm font-bold text-warning">{formatPeso(report.totals.outstanding)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[0.6875rem] leading-relaxed text-muted">
              Collected totals use staff review or a manually recorded payment. A submitted
              screenshot does not count as collected until it is verified.
            </p>
          </StaffPanel>

          <StaffPanel
            title="Free-plan headroom"
            description="Supabase measures the database (500 MB) and file storage (1 GB) separately."
          >
            {quota ? (
              <div className="space-y-3">
                {[
                  {
                    label: "Database",
                    used: quota.database_bytes,
                    limit: 500 * 1024 * 1024,
                    detail: `${quota.booking_count} bookings · ${quota.payment_count} payments · ${quota.audit_count} audit rows`,
                  },
                  {
                    label: "Payment proofs",
                    used: quota.storage_bytes,
                    limit: 1024 * 1024 * 1024,
                    detail: `${quota.proof_count} screenshot${quota.proof_count === 1 ? "" : "s"} kept`,
                  },
                ].map((item) => {
                  const percent = Math.min(
                    100,
                    Math.round((item.used / item.limit) * 1000) / 10,
                  );

                  return (
                    <div key={item.label}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-caption font-bold text-heading">
                          {item.label}
                        </p>
                        <p className="text-caption tabular-nums text-muted">
                          {(item.used / 1024 / 1024).toFixed(1)} MB · {percent}%
                        </p>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-page ring-1 ring-line">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            percent > 80 ? "bg-danger" : "bg-brand-lime",
                          )}
                          style={{ width: `${Math.max(percent, 1)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[0.6875rem] text-muted">{item.detail}</p>
                    </div>
                  );
                })}
                <div className="border-t border-line pt-3">
                  <form action={purgeProofsAction}>
                    <button
                      type="submit"
                      className={buttonClasses({ variant: "secondary", size: "sm" })}
                    >
                      Delete cancelled proofs
                    </button>
                  </form>
                  <p className="mt-2 text-[0.6875rem] leading-relaxed text-muted">
                    Screenshots are kept permanently. The only ones removed are
                    those whose booking or open-play registration was cancelled,
                    whose payment was rejected, or whose record was voided.
                    Verified and completed bookings never lose their proof.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-caption text-muted">
                Usage is unavailable right now. Run the migration that adds
                <code className="mx-1 rounded bg-page px-1 py-0.5">
                  staff_quota_usage()
                </code>
                or check the Supabase dashboard.
              </p>
            )}
          </StaffPanel>
        </div>
      </div>
    </>
  );
}

export default function StaffReportsPage({ searchParams }: { searchParams: SearchParams }) {
  return <Reports searchParams={searchParams} />;
}
