"use client";

import { useState } from "react";
import { useBookingModal } from "@/components/booking/booking-modal-provider";
import { Badge } from "@/components/ui/badge";
import { ArrowRightIcon, ClockIcon } from "@/components/ui/icons";
import { formatBookingTimeRange, formatPeso } from "@/lib/bookings";
import {
  isOpenPlaySessionFull,
  openPlayLevelMeta,
  openPlaySessionStatusMeta,
  openPlaySpotsRemaining,
  type OpenPlaySession,
} from "@/lib/open-play";
import { cn } from "@/lib/cn";

export type OpenPlaySessionGroup = {
  dateId: string;
  dateLabel: string;
  sessions: OpenPlaySession[];
};

function dateParts(dateLabel: string) {
  const date = new Date(dateLabel);
  if (Number.isNaN(date.getTime())) {
    return { weekday: "Date", monthDay: dateLabel };
  }

  return {
    weekday: new Intl.DateTimeFormat("en-PH", {
      weekday: "short",
      timeZone: "Asia/Manila",
    }).format(date),
    monthDay: new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      timeZone: "Asia/Manila",
    }).format(date),
  };
}

export function OpenPlayBrowser({ groups }: { groups: OpenPlaySessionGroup[] }) {
  const { openOpenPlay } = useBookingModal();
  const [selectedDate, setSelectedDate] = useState(groups[0]?.dateId ?? "");
  const selected =
    groups.find((group) => group.dateId === selectedDate) ?? groups[0];

  if (!selected) return null;

  return (
    <div className="mt-7">
      <div
        role="group"
        aria-label="Choose an open-play date"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
      >
        {groups.map((group) => {
          const parts = dateParts(group.sessions[0]?.startsAt ?? group.dateId);
          const active = group.dateId === selected.dateId;

          return (
            <button
              key={group.dateId}
              type="button"
              aria-pressed={active}
              onClick={() => setSelectedDate(group.dateId)}
              className={cn(
                "flex min-w-[4.75rem] shrink-0 flex-col items-center rounded-xl border px-3 py-2.5 text-center transition-colors duration-200",
                active
                  ? "border-brand-navy bg-brand-navy text-white shadow-card"
                  : "border-line bg-surface text-heading hover:border-brand-blue/40 hover:bg-brand-blue-soft/60",
              )}
            >
              <span
                className={cn(
                  "text-[0.625rem] font-bold uppercase tracking-[0.12em]",
                  active ? "text-white/60" : "text-muted",
                )}
              >
                {parts.weekday}
              </span>
              <span className="mt-0.5 text-sm font-bold">{parts.monthDay}</span>
              <span
                className={cn(
                  "mt-1 text-[0.625rem]",
                  active ? "text-white/60" : "text-muted",
                )}
              >
                {group.sessions.length}{" "}
                {group.sessions.length === 1 ? "session" : "sessions"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-baseline justify-between gap-4">
        <h3 className="font-display text-xl font-bold text-heading">
          {selected.dateLabel}
        </h3>
        <p className="text-sm text-muted">{selected.sessions.length} sessions</p>
      </div>

      <div className="mt-3 space-y-3">
        {selected.sessions.map((session) => {
          const level = openPlayLevelMeta(session.skillLevel);
          const status = openPlaySessionStatusMeta(session.status);
          const full = isOpenPlaySessionFull(session);
          const remaining = openPlaySpotsRemaining(session);

          return (
            <button
              key={session.id}
              type="button"
              aria-haspopup="dialog"
              onClick={() => void openOpenPlay(session.id)}
              className="group grid w-full gap-3 rounded-xl border border-line bg-surface p-4 text-left shadow-card transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-brand-blue/40 hover:shadow-raised sm:grid-cols-[8.5rem_minmax(0,1fr)_auto] sm:items-center sm:p-5"
            >
              <div>
                <p className="text-sm font-bold text-heading">
                  {formatBookingTimeRange(session.startsAt, session.endsAt)}
                </p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-caption text-muted">
                  <ClockIcon className="size-3.5 text-brand-lime" />
                  {session.durationMinutes} min
                </p>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={level.variant} dot>
                    {level.label}
                  </Badge>
                  <Badge variant={full ? "danger" : status.variant} dot>
                    {full ? "Full" : status.label}
                  </Badge>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm text-muted">
                  {level.description}
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-line pt-3 sm:min-w-[9.5rem] sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                <div className="sm:text-right">
                  <p className="font-display text-lg font-bold text-heading">
                    {formatPeso(session.amountPhp)}
                    <span className="ml-1 text-caption font-normal text-muted">
                      / player
                    </span>
                  </p>
                  <p className="text-caption text-muted">
                    {full
                      ? "No places left"
                      : `${remaining} of ${session.capacity} left`}
                  </p>
                </div>
                <span className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-accent-ink">
                  {full ? "View" : "Reserve"}
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
