"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

const days = [
  { id: "mon", weekday: "Mon", date: "12", available: true },
  { id: "tue", weekday: "Tue", date: "13", available: true },
  { id: "wed", weekday: "Wed", date: "14", available: false },
  { id: "thu", weekday: "Thu", date: "15", available: true },
  { id: "fri", weekday: "Fri", date: "16", available: true },
  { id: "sat", weekday: "Sat", date: "17", available: true },
];

const slots = [
  { id: "06:00", label: "6:00 AM", status: "available" },
  { id: "07:30", label: "7:30 AM", status: "available" },
  { id: "09:00", label: "9:00 AM", status: "full" },
  { id: "10:30", label: "10:30 AM", status: "available" },
  { id: "12:00", label: "12:00 PM", status: "unavailable" },
  { id: "13:30", label: "1:30 PM", status: "available" },
] as const;

/** Sample interaction only — not real club availability. */
export function SlotPickerDemo() {
  const [day, setDay] = useState("thu");
  const [slot, setSlot] = useState<string | null>("07:30");

  const selectedDay = days.find((item) => item.id === day);
  const selectedSlot = slots.find((item) => item.id === slot);

  return (
    <div className="rounded-lg border border-line bg-surface p-4 sm:p-5">
      <p className="text-eyebrow font-bold uppercase text-muted">Date</p>
      <div
        role="group"
        aria-label="Sample booking dates"
        className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-6"
      >
        {days.map((item) => {
          const isSelected = item.id === day;
          return (
            <button
              key={item.id}
              type="button"
              disabled={!item.available}
              aria-pressed={isSelected}
              onClick={() => setDay(item.id)}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center rounded-md border px-2 py-2 transition-colors duration-150",
                isSelected
                  ? "border-brand-navy bg-brand-navy text-white"
                  : "border-line bg-surface text-ink hover:border-brand-blue/50 hover:bg-brand-blue-soft/40",
                !item.available &&
                  "border-line/70 bg-page text-muted/60 line-through hover:border-line/70 hover:bg-page",
              )}
            >
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em]">
                {item.weekday}
              </span>
              <span className="mt-0.5 font-display text-lg font-bold">
                {item.date}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-eyebrow font-bold uppercase text-muted">Time</p>
      <div
        role="group"
        aria-label="Sample booking times"
        className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3"
      >
        {slots.map((item) => {
          const isSelected = item.id === slot;
          const isDisabled = item.status !== "available";
          return (
            <button
              key={item.id}
              type="button"
              disabled={isDisabled}
              aria-pressed={isSelected}
              aria-label={
                item.status === "full"
                  ? `${item.label} — full`
                  : item.status === "unavailable"
                    ? `${item.label} — unavailable`
                    : item.label
              }
              onClick={() => setSlot(item.id)}
              className={cn(
                "flex h-11 items-center justify-between rounded-md border px-3 text-sm font-semibold transition-colors duration-150",
                isSelected
                  ? "border-brand-blue bg-brand-blue-soft text-accent-ink-strong"
                  : "border-line bg-surface text-ink hover:border-brand-blue/50",
                item.status === "full" &&
                  "border-line bg-page text-muted/70 hover:border-line",
                item.status === "unavailable" &&
                  "border-line/70 bg-page text-muted/50 hover:border-line/70",
              )}
            >
              <span>{item.label}</span>
              {item.status === "full" ? (
                <span className="text-[0.625rem] font-bold uppercase tracking-[0.1em]">
                  Full
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="mt-4 text-caption text-muted">
        {selectedSlot && selectedDay
          ? `Sample selection: ${selectedDay.weekday} ${selectedDay.date}, ${selectedSlot.label}. No booking is created.`
          : "Select a sample date and time."}
      </p>
    </div>
  );
}
