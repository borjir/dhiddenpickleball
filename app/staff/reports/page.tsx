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
  StaffPageHeader,
  StaffPanel,
  StaffStat,
} from "@/components/staff/staff-ui";
import { requireStaff } from "@/lib/staff/auth";
import { formatPeso } from "@/lib/bookings";
import { getStaffReport } from "@/lib/staff/reports";
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
  const maxHours = Math.max(...report.days.map((day) => day.courtHours), 1);
  const maxCollected = Math.max(...report.days.map((day) => day.collected), 1);

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
            Export CSV
          </Link>
        }
      />

      <form
        action="/staff/reports"
        method="get"
        className="mt-5 flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-3 shadow-card"
      >
        <label className="flex flex-col gap-1 text-caption font-semibold text-muted">
          From
          <input
            type="date"
            name="from"
            defaultValue={report.from}
            className="h-10 rounded-lg border border-line bg-page px-2 text-sm font-semibold text-heading"
          />
        </label>
        <label className="flex flex-col gap-1 text-caption font-semibold text-muted">
          To
          <input
            type="date"
            name="to"
            defaultValue={report.to}
            className="h-10 rounded-lg border border-line bg-page px-2 text-sm font-semibold text-heading"
          />
        </label>
        <button type="submit" className={buttonClasses({ size: "md" })}>
          Apply range
        </button>
        <Link
          href="/staff/reports"
          className="inline-flex min-h-10 items-center px-2 text-sm font-semibold text-accent-ink"
        >
          Last 30 days
        </Link>
        <span className="ml-auto text-caption text-muted">
          {report.days.length} day{report.days.length === 1 ? "" : "s"} · {report.from} → {report.to}
        </span>
      </form>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
        </div>
      </div>
    </>
  );
}

export default function StaffReportsPage({ searchParams }: { searchParams: SearchParams }) {
  return <Reports searchParams={searchParams} />;
}
