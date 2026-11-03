"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { BookingSummary } from "@/components/ui/booking-summary";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PaymentInstructions } from "@/components/ui/payment-instructions";
import { PolicyNotice } from "@/components/ui/policy-notice";
import { StatusPair } from "@/components/ui/status-pair";
import { Stepper } from "@/components/ui/stepper";
import { Toast, type ToastTone } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Logo } from "@/components/brand/logo";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  InfoIcon,
  ShieldIcon,
  UploadIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const steps = [
  { label: "Choose a time" },
  { label: "Review details" },
  { label: "Payment" },
] as const;

const stepContent = [
  {
    eyebrow: "Step 1 · Availability",
    title: "Choose your court time",
    description:
      "Two courts, open daily 7:00 AM to 12:00 AM. The availability below is sample data; no slot is held in this preview.",
  },
  {
    eyebrow: "Step 2 · Review",
    title: "Review your details",
    description:
      "Check the price and the rules, then create the account that will own this booking at launch.",
  },
  {
    eyebrow: "Step 3 · Payment",
    title: "Pay to keep the slot",
    description:
      "The slot is held for 15 minutes while you pay and upload proof. No booking, account, or payment is created in this preview.",
  },
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const WEEKDAY_NAMES = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/**
 * Fixed sample booking window: Thursday 5 November to Thursday 31 December
 * 2026. The window is pinned rather than derived from today's date so the
 * server and the client always render the same calendar. The real booking
 * window is an open client decision, so the calendar only ever claims sample
 * availability.
 */
const WINDOW_START = Date.UTC(2026, 10, 5);
const WINDOW_DAYS = 57;

type SampleDate = {
  /** Stable ISO key, e.g. "2026-11-05". */
  id: string;
  weekday: string;
  day: string;
  month: string;
  year: number;
  monthIndex: number;
  dayOfMonth: number;
};

const sampleDates: SampleDate[] = Array.from(
  { length: WINDOW_DAYS },
  (_, index) => {
    const date = new Date(WINDOW_START + index * DAY_MS);
    const year = date.getUTCFullYear();
    const monthIndex = date.getUTCMonth();
    const dayOfMonth = date.getUTCDate();
    return {
      id: `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}`,
      weekday: WEEKDAY_NAMES[date.getUTCDay()],
      day: String(dayOfMonth).padStart(2, "0"),
      month: MONTH_NAMES[monthIndex].slice(0, 3),
      year,
      monthIndex,
      dayOfMonth,
    };
  },
);

const sampleDatesById = new Map(sampleDates.map((date) => [date.id, date]));

const sampleMonths = sampleDates.reduce<
  { year: number; monthIndex: number; label: string }[]
>((months, date) => {
  if (
    !months.some(
      (month) =>
        month.year === date.year && month.monthIndex === date.monthIndex,
    )
  ) {
    months.push({
      year: date.year,
      monthIndex: date.monthIndex,
      label: `${MONTH_NAMES[date.monthIndex]} ${date.year}`,
    });
  }
  return months;
}, []);

type CalendarCell = {
  key: string;
  dayOfMonth: number;
  /** Present only when the day is inside the sample booking window. */
  date?: SampleDate;
};

/** Builds a Sunday-first month grid, padding the leading and trailing days. */
function buildCalendarCells(year: number, monthIndex: number): CalendarCell[] {
  const cells: CalendarCell[] = [];
  const leading = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  for (let index = 0; index < leading; index += 1) {
    cells.push({ key: `blank-${year}-${monthIndex}-${index}`, dayOfMonth: 0 });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const id = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ key: id, dayOfMonth: day, date: sampleDatesById.get(id) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({
      key: `trail-${year}-${monthIndex}-${cells.length}`,
      dayOfMonth: 0,
    });
  }
  return cells;
}

const OPENING_MINUTES = 7 * 60;
const CLOSING_MINUTES = 24 * 60;
const EVENING_START_MINUTES = 17 * 60;
const DAY_RATE = 250;
const EVENING_RATE = 300;
const HOLD_MINUTES = 15;
const HOLD_SECONDS = HOLD_MINUTES * 60;
const REFERENCE = "PREVIEW-1042";
/**
 * One-pixel PNG used as the thumbnail for a test-mode receipt. Test mode lets
 * the payment states be walked end to end without any real transfer.
 */
const TEST_RECEIPT_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

type SlotStatus = "available" | "booked" | "closed";
type CourtName = "Court 1" | "Court 2";
type CourtFilter = "all" | CourtName;
type ProofState = "idle" | "submitting" | "submitted";

const courtNames: CourtName[] = ["Court 1", "Court 2"];

const durations = [
  { value: 60, label: "60 min", hint: "1 hour" },
  { value: 90, label: "90 min", hint: "1½ hours" },
  { value: 120, label: "120 min", hint: "2 hours" },
] as const;

const periodMeta = [
  { id: "morning", label: "Morning", range: "7:00 AM – 11:59 AM" },
  { id: "afternoon", label: "Afternoon", range: "12:00 PM – 4:59 PM" },
  { id: "evening", label: "Evening", range: "5:00 PM – 11:00 PM" },
] as const;

type Slot = {
  id: string;
  court: CourtName;
  start: number;
  label: string;
  status: SlotStatus;
};

const sampleSlots: Slot[] = courtNames.flatMap((court, courtIndex) =>
  Array.from({ length: 17 }, (_, index) => {
    const start = OPENING_MINUTES + index * 60;
    const slotStatus: SlotStatus =
      (index + courtIndex) % 7 === 3
        ? "booked"
        : (index + courtIndex) % 11 === 6
          ? "closed"
          : "available";
    return {
      id: `${courtIndex}-${start}`,
      court,
      start,
      label: formatTime(start),
      status: slotStatus,
    };
  }),
);

function formatTime(minutes: number) {
  const hours = Math.floor(minutes / 60) % 24;
  const rest = minutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour}:${String(rest).padStart(2, "0")} ${period}`;
}

function formatPeso(amount: number) {
  return `₱${Math.round(amount).toLocaleString("en-PH")}`;
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Pro-rates a booking across the 5:00 PM rate change. */
function priceFor(start: number, durationMinutes: number) {
  const end = Math.min(start + durationMinutes, CLOSING_MINUTES);
  const dayMinutes = Math.max(0, Math.min(end, EVENING_START_MINUTES) - start);
  const eveningMinutes = Math.max(0, end - Math.max(start, EVENING_START_MINUTES));
  return {
    total: (dayMinutes / 60) * DAY_RATE + (eveningMinutes / 60) * EVENING_RATE,
    spansRateChange: dayMinutes > 0 && eveningMinutes > 0,
  };
}

function periodFor(start: number) {
  if (start < 12 * 60) return "morning";
  if (start < EVENING_START_MINUTES) return "afternoon";
  return "evening";
}

function formatDate(date: SampleDate | undefined) {
  return date ? `${date.weekday} ${date.day} ${date.month}` : undefined;
}

function SectionLabel({
  eyebrow,
  title,
  aside,
}: {
  eyebrow: string;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-eyebrow font-bold uppercase text-accent-ink">
          {eyebrow}
        </p>
        <h2 className="mt-1.5 text-heading font-semibold text-heading">
          {title}
        </h2>
      </div>
      {aside}
    </div>
  );
}

function SlotSkeleton() {
  return (
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="skeleton h-[4.25rem] rounded-xl"
          style={{ animationDelay: `${index * 60}ms` }}
        />
      ))}
    </div>
  );
}

export function BookingPreview() {
  const [step, setStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>(sampleDates[0].id);
  const [visibleMonth, setVisibleMonth] = useState(() => ({
    year: sampleDates[0].year,
    monthIndex: sampleDates[0].monthIndex,
  }));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(60);
  const [courtFilter, setCourtFilter] = useState<CourtFilter>("all");
  const [availabilityLoading, setAvailabilityLoading] = useState(true);

  const [form, setForm] = useState({ name: "", email: "", mobile: "" });
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    mobile: false,
  });
  const [attempted, setAttempted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  const [proof, setProof] = useState<{
    name: string;
    size: number;
    url: string;
  } | null>(null);
  const [proofState, setProofState] = useState<ProofState>("idle");
  const [fileError, setFileError] = useState("");
  const [holdSeconds, setHoldSeconds] = useState(HOLD_SECONDS);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(
    null,
  );

  const headingRef = useRef<HTMLHeadingElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);
  const hasMounted = useRef(false);
  const proofUrlRef = useRef<string | null>(null);
  const reviewTimerRef = useRef<number | null>(null);
  const submitTimerRef = useRef<number | null>(null);
  const reduce = useReducedMotion();

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    const timer = window.setTimeout(() => setAvailabilityLoading(false), 460);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    // The outgoing step finishes its exit animation first, so wait for the new
    // heading to be mounted before moving focus.
    const timer = window.setTimeout(() => headingRef.current?.focus(), 340);
    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    return () => {
      if (proofUrlRef.current) URL.revokeObjectURL(proofUrlRef.current);
      if (reviewTimerRef.current) window.clearTimeout(reviewTimerRef.current);
      if (submitTimerRef.current) window.clearTimeout(submitTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (step !== 2) return;
    const timer = window.setInterval(() => {
      setHoldSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  const selectedDateData = sampleDates.find((date) => date.id === selectedDate);
  const monthPosition = sampleMonths.findIndex(
    (month) =>
      month.year === visibleMonth.year &&
      month.monthIndex === visibleMonth.monthIndex,
  );
  const calendarCells = buildCalendarCells(
    visibleMonth.year,
    visibleMonth.monthIndex,
  );
  const selectedSlotData = sampleSlots.find((slot) => slot.id === selectedSlot);
  const durationMinutes = duration;
  const durationLabel = `${duration} minutes`;
  const dateLabel = formatDate(selectedDateData);

  const visibleSlots =
    courtFilter === "all"
      ? sampleSlots
      : sampleSlots.filter((slot) => slot.court === courtFilter);

  const availableSlots = visibleSlots.filter(
    (slot) =>
      slot.status === "available" &&
      slot.start + durationMinutes <= CLOSING_MINUTES,
  );

  const price = selectedSlotData
    ? priceFor(selectedSlotData.start, durationMinutes)
    : null;
  const priceLabel = price ? formatPeso(price.total) : "—";
  const priceNote = !price
    ? "Select a start time to see the amount."
    : price.spansRateChange
      ? "Pro-rated across the 5:00 PM rate change. Rounding rules are not confirmed."
      : "₱250/hour before 5:00 PM, ₱300/hour after. The weekend rate is not confirmed.";

  const errors = {
    name:
      form.name.trim().length < 2
        ? "Enter the name the booking should be under."
        : "",
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
      ? "Enter a valid email address, for example player@example.com."
      : "",
    mobile:
      form.mobile.replace(/\D/g, "").length < 10
        ? "Enter a mobile number the club can reach on the day."
        : "",
  };
  const isValid = !errors.name && !errors.email && !errors.mobile;
  const showError = (field: keyof typeof errors) =>
    (attempted || touched[field]) && Boolean(errors[field]);

  const paymentStatus =
    proofState === "submitted"
      ? { label: "Awaiting verification", variant: "warning" as const }
      : { label: "Unpaid", variant: "neutral" as const };

  const holdExpired = holdSeconds === 0;
  const holdPercent = Math.round((holdSeconds / HOLD_SECONDS) * 100);

  function chooseDate(id: string) {
    setSelectedDate(id);
    setSelectedSlot(null);
    setAvailabilityLoading(true);
    window.setTimeout(() => setAvailabilityLoading(false), 420);
  }

  function showMonth(position: number) {
    const month = sampleMonths[position];
    if (month) setVisibleMonth({ year: month.year, monthIndex: month.monthIndex });
  }

  function chooseNextSampleDay() {
    const current = sampleDates.findIndex((date) => date.id === selectedDate);
    const next = sampleDates[(current + 1) % sampleDates.length];
    setVisibleMonth({ year: next.year, monthIndex: next.monthIndex });
    chooseDate(next.id);
  }

  function chooseCourt(next: CourtFilter) {
    setCourtFilter(next);
    if (
      next !== "all" &&
      selectedSlotData &&
      selectedSlotData.court !== next
    ) {
      setSelectedSlot(null);
    }
  }

  function chooseDuration(next: number) {
    setDuration(next);
    if (selectedSlotData && selectedSlotData.start + next > CLOSING_MINUTES) {
      setSelectedSlot(null);
    }
  }

  function goToReview() {
    if (!selectedSlotData) return;
    setStep(1);
  }

  function goToPayment() {
    setAttempted(true);
    if (!isValid) {
      if (errors.name) nameRef.current?.focus();
      else if (errors.email) emailRef.current?.focus();
      else mobileRef.current?.focus();
      return;
    }
    if (!termsAccepted) {
      setTermsError(true);
      termsRef.current?.focus();
      return;
    }
    setTermsError(false);
    setSubmittingReview(true);
    reviewTimerRef.current = window.setTimeout(() => {
      setSubmittingReview(false);
      setHoldSeconds(HOLD_SECONDS);
      setStep(2);
    }, 650);
  }

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(REFERENCE);
      setToast({ message: "Reference copied to the clipboard.", tone: "success" });
    } catch {
      setToast({
        message: "Copy was blocked. Select the reference text instead.",
        tone: "error",
      });
    }
  }

  function chooseFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("Choose an image file such as a PNG or JPEG.");
      return;
    }
    if (proofUrlRef.current) URL.revokeObjectURL(proofUrlRef.current);
    const url = URL.createObjectURL(file);
    proofUrlRef.current = url;
    setFileError("");
    setProof({ name: file.name, size: file.size, url });
    setProofState("idle");
  }

  function submitProof() {
    if (!proof || proofState !== "idle") return;
    setProofState("submitting");
    submitTimerRef.current = window.setTimeout(() => {
      setProofState("submitted");
      setToast({
        message: "Proof submitted. Payment is now awaiting staff verification.",
        tone: "success",
      });
    }, 750);
  }

  function simulateTestPayment() {
    if (holdExpired || proofState === "submitting") return;
    setFileError("");
    setProof({
      name: "Test mode — no transfer made",
      size: 0,
      url: TEST_RECEIPT_DATA_URL,
    });
    setProofState("submitted");
    setToast({
      message: "Test mode: payment marked as received. No money moved.",
      tone: "success",
    });
  }

  function restart() {
    setStep(0);
    setSelectedDate(sampleDates[0].id);
    setVisibleMonth({
      year: sampleDates[0].year,
      monthIndex: sampleDates[0].monthIndex,
    });
    setSelectedSlot(null);
    setDuration(60);
    setCourtFilter("all");
    setForm({ name: "", email: "", mobile: "" });
    setTouched({ name: false, email: false, mobile: false });
    setAttempted(false);
    setTermsAccepted(false);
    setTermsError(false);
    setSubmittingReview(false);
    setProofState("idle");
    setFileError("");
    setHoldSeconds(HOLD_SECONDS);
    if (proofUrlRef.current) {
      URL.revokeObjectURL(proofUrlRef.current);
      proofUrlRef.current = null;
    }
    setProof(null);
    setToast(null);
  }

  const content = stepContent[step];

  return (
    <div className="min-h-screen bg-canvas">
      <Toast message={toast?.message ?? null} tone={toast?.tone} onDismiss={dismissToast} />

      <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-5 sm:px-8">
          <Link href="/" className="flex min-h-11 items-center gap-3 rounded-lg">
            <Logo size={40} />
            <span className="hidden leading-none sm:block">
              <span className="block font-display text-sm font-extrabold uppercase tracking-[0.14em] text-heading">
                D-Hidden
              </span>
              <span className="mt-1 block text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-muted">
                Court reservations
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Badge variant="yellow" className="hidden sm:inline-flex">
              Preview
            </Badge>
            <ThemeToggle />
            <Link
              href="/"
              className="hidden min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted transition-colors hover:bg-brand-blue-soft/60 hover:text-heading sm:inline-flex"
            >
              <ArrowLeftIcon className="size-4" />
              Homepage
            </Link>
          </div>
        </div>
        <div className="h-0.5 bg-line" aria-hidden="true">
          <div
            className="h-full rounded-r-full bg-gradient-to-r from-brand-blue via-brand-blue to-brand-lime transition-[width] duration-500 ease-out-expo"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 pb-28 pt-8 sm:px-8 sm:pt-10 lg:pb-16">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-eyebrow font-bold uppercase text-accent-ink">
              Court reservation
            </p>
            <h1 className="mt-2 text-title font-bold text-heading">
              Reserve a court
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
              Clear times, clear prices, and a summary that follows you all the
              way to payment. Sample availability only.
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 text-caption text-muted shadow-card sm:flex">
            <ShieldIcon className="size-4 text-brand-lime" />
            <span>
              <span className="block font-semibold text-ink">
                Price shown before commit
              </span>
              60 / 90 / 120 minutes · GCash review
            </span>
          </div>
        </div>

        <Stepper steps={steps} current={step} className="mt-8" />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={reduce ? undefined : { opacity: 0, y: 12 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8"
          >
            <div className="mb-6 max-w-2xl">
              <p className="text-eyebrow font-bold uppercase text-accent-ink">
                {content.eyebrow}
              </p>
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="mt-1.5 text-heading font-semibold text-heading focus:outline-none"
              >
                {content.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {content.description}
              </p>
            </div>

            {step === 0 ? (
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                <div className="min-w-0 space-y-6">
                  {/* Date */}
                  <section
                    aria-labelledby="preview-date"
                    className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6"
                  >
                    <SectionLabel
                      eyebrow="Date"
                      title="Pick a day"
                      aside={<Badge variant="neutral">Sample dates</Badge>}
                    />
                    <div
                      id="preview-date"
                      role="group"
                      aria-label="Choose a date"
                      className="mt-4 max-w-md"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          aria-label="Previous month"
                          disabled={monthPosition <= 0}
                          onClick={() => showMonth(monthPosition - 1)}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-heading transition-colors duration-200 hover:border-brand-blue/50 hover:bg-brand-blue-soft/60 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowLeftIcon className="size-4" />
                        </button>
                        <p
                          aria-live="polite"
                          className="text-sm font-bold text-heading"
                        >
                          {sampleMonths[monthPosition]?.label}
                        </p>
                        <button
                          type="button"
                          aria-label="Next month"
                          disabled={monthPosition >= sampleMonths.length - 1}
                          onClick={() => showMonth(monthPosition + 1)}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-heading transition-colors duration-200 hover:border-brand-blue/50 hover:bg-brand-blue-soft/60 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowRightIcon className="size-4" />
                        </button>
                      </div>

                      <div
                        className="mt-3 grid grid-cols-7 gap-1"
                        aria-hidden="true"
                      >
                        {WEEKDAY_LABELS.map((label) => (
                          <span
                            key={label}
                            className="py-1 text-center text-[0.625rem] font-bold uppercase tracking-[0.1em] text-muted"
                          >
                            {label}
                          </span>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {calendarCells.map((cell) => {
                          if (cell.dayOfMonth === 0) {
                            return (
                              <span key={cell.key} aria-hidden="true" />
                            );
                          }
                          if (!cell.date) {
                            return (
                              <span
                                key={cell.key}
                                aria-hidden="true"
                                className="flex h-11 items-center justify-center rounded-lg text-sm text-muted/35"
                              >
                                {cell.dayOfMonth}
                              </span>
                            );
                          }
                          const date = cell.date;
                          const selected = date.id === selectedDate;
                          return (
                            <button
                              key={cell.key}
                              type="button"
                              aria-pressed={selected}
                              aria-label={`${date.weekday} ${date.month} ${date.day}, ${selected ? "selected" : "available"}`}
                              onClick={() => chooseDate(date.id)}
                              className={cn(
                                "flex h-11 items-center justify-center rounded-lg text-sm font-semibold transition-colors duration-200",
                                selected
                                  ? "bg-brand-navy text-white shadow-card"
                                  : "text-ink hover:bg-brand-blue-soft/70 hover:text-accent-ink",
                              )}
                            >
                              {cell.dayOfMonth}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <p className="mt-2 text-caption text-muted">
                      Sample availability runs {sampleDates[0].dayOfMonth}{" "}
                      {sampleDates[0].month} –{" "}
                      {sampleDates[sampleDates.length - 1].dayOfMonth}{" "}
                      {sampleDates[sampleDates.length - 1].month}{" "}
                      {sampleDates[sampleDates.length - 1].year}. The real
                      booking window has not been confirmed.
                    </p>
                  </section>

                  {/* Duration and court */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <section
                      aria-labelledby="preview-duration"
                      className="rounded-2xl border border-line bg-surface p-5 shadow-card"
                    >
                      <h2
                        id="preview-duration"
                        className="text-sm font-bold text-heading"
                      >
                        Session length
                      </h2>
                      <div className="mt-3 inline-flex w-full rounded-xl border border-line bg-page p-1">
                        {durations.map((option) => {
                          const selected = option.value === duration;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => chooseDuration(option.value)}
                              className="relative flex-1 rounded-lg px-2 py-2 text-center transition-colors duration-200"
                            >
                              {selected ? (
                                <motion.span
                                  layoutId={reduce ? undefined : "duration-selection"}
                                  className="absolute inset-0 rounded-lg bg-surface shadow-card ring-1 ring-line"
                                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                                  aria-hidden="true"
                                />
                              ) : null}
                              <span className="relative block text-sm font-semibold text-heading">
                                {option.label}
                              </span>
                              <span className="relative mt-0.5 block text-[0.625rem] text-muted">
                                {option.hint}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-2.5 text-caption text-muted">
                        Slots that run past midnight are disabled.
                      </p>
                    </section>

                    <section
                      aria-labelledby="preview-court"
                      className="rounded-2xl border border-line bg-surface p-5 shadow-card"
                    >
                      <h2 id="preview-court" className="text-sm font-bold text-heading">
                        Court
                      </h2>
                      <div className="mt-3 inline-flex w-full rounded-xl border border-line bg-page p-1">
                        {(
                          [
                            { value: "all", label: "Both" },
                            { value: "Court 1", label: "Court 1" },
                            { value: "Court 2", label: "Court 2" },
                          ] as const
                        ).map((option) => {
                          const selected = option.value === courtFilter;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => chooseCourt(option.value)}
                              className="relative flex-1 rounded-lg px-2 py-2 text-sm font-semibold transition-colors duration-200"
                            >
                              {selected ? (
                                <motion.span
                                  layoutId={reduce ? undefined : "court-selection"}
                                  className="absolute inset-0 rounded-lg bg-brand-navy"
                                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                                  aria-hidden="true"
                                />
                              ) : null}
                              <span
                                className={cn(
                                  "relative",
                                  selected ? "text-white" : "text-heading",
                                )}
                              >
                                {option.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-2.5 text-caption text-muted">
                        Filter the grid, or compare both courts.
                      </p>
                    </section>
                  </div>

                  {/* Time */}
                  <section
                    aria-labelledby="preview-time"
                    className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6"
                  >
                    <SectionLabel
                      eyebrow="Time"
                      title="Choose a start time"
                      aside={
                        availabilityLoading ? (
                          <span className="skeleton h-6 w-28 rounded-full" />
                        ) : (
                          <Badge variant="lime" dot>
                            {availableSlots.length} open{" "}
                            {availableSlots.length === 1 ? "slot" : "slots"}
                          </Badge>
                        )
                      }
                    />

                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-line bg-page/60 px-4 py-3 text-caption text-muted">
                      <span>
                        <span className="font-semibold text-ink">Open</span> 7:00
                        AM – 12:00 AM daily
                      </span>
                      <span>
                        <span className="font-semibold text-ink">Day</span> ₱250/hour
                        before 5 PM
                      </span>
                      <span>
                        <span className="font-semibold text-ink">Evening</span>{" "}
                        ₱300/hour from 5 PM
                      </span>
                    </div>

                    {availabilityLoading ? (
                      <SlotSkeleton />
                    ) : availableSlots.length === 0 && visibleSlots.length === 0 ? (
                      <div
                        role="status"
                        className="mt-5 rounded-xl border border-dashed border-line-strong bg-page/50 px-5 py-10 text-center"
                      >
                        <CalendarIcon className="mx-auto size-8 text-line-strong" />
                        <p className="mt-3 font-display text-base font-semibold text-heading">
                          No courts match this filter
                        </p>
                        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                          Show both courts to see every sample time.
                        </p>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="mt-4"
                          onClick={() => chooseCourt("all")}
                        >
                          Show both courts
                        </Button>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div
                        role="status"
                        className="mt-5 rounded-xl border border-dashed border-line-strong bg-page/50 px-5 py-10 text-center"
                      >
                        <ClockIcon className="mx-auto size-8 text-line-strong" />
                        <p className="mt-3 font-display text-base font-semibold text-heading">
                          No open times for this selection
                        </p>
                        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                          Every remaining slot on {dateLabel} is booked, closed,
                          or too late for {durationLabel}.
                        </p>
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => chooseDuration(60)}
                          >
                            Try 60 minutes
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={chooseNextSampleDay}
                          >
                            Pick another day
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5 space-y-5">
                        {periodMeta.map((period) => {
                          const periodSlots = visibleSlots.filter(
                            (slot) => periodFor(slot.start) === period.id,
                          );
                          if (periodSlots.length === 0) return null;
                          return (
                            <div key={period.id}>
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h3 className="text-sm font-bold text-ink">
                                  {period.label}
                                  <span className="ml-2 text-caption font-normal text-muted">
                                    {period.range}
                                  </span>
                                </h3>
                                <p className="text-caption text-muted">
                                  {periodSlots.filter(
                                    (slot) =>
                                      slot.status === "available" &&
                                      slot.start + durationMinutes <=
                                        CLOSING_MINUTES,
                                  ).length}{" "}
                                  open
                                </p>
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                                {periodSlots.map((slot) => {
                                  const selected = slot.id === selectedSlot;
                                  const runsPastClose =
                                    slot.start + durationMinutes > CLOSING_MINUTES;
                                  const unavailable =
                                    slot.status !== "available" || runsPastClose;
                                  const slotRate =
                                    slot.start >= EVENING_START_MINUTES
                                      ? EVENING_RATE
                                      : DAY_RATE;
                                  const reason =
                                    slot.status === "booked"
                                      ? "booked"
                                      : slot.status === "closed"
                                        ? "closed"
                                        : runsPastClose
                                          ? "not available for the selected duration"
                                          : `${formatPeso(slotRate)} per hour, available`;

                                  return (
                                    <button
                                      key={slot.id}
                                      type="button"
                                      aria-pressed={selected}
                                      disabled={unavailable}
                                      aria-label={`${slot.label}, ${slot.court}, ${reason}${selected ? ", selected" : ""}`}
                                      onClick={() => setSelectedSlot(slot.id)}
                                      className={cn(
                                        "group relative min-h-[4.25rem] overflow-hidden rounded-xl border px-3 py-2 text-left transition-[border-color,background-color,color,box-shadow,transform] duration-200",
                                        selected
                                          ? "border-brand-blue bg-brand-blue text-white shadow-glow"
                                          : unavailable
                                            ? "cursor-not-allowed border-line bg-page/60 text-muted/70"
                                            : "border-line bg-surface text-ink hover:-translate-y-0.5 hover:border-brand-blue/60 hover:bg-brand-blue-soft/50 hover:shadow-card",
                                      )}
                                    >
                                      <span className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-bold">
                                          {slot.label}
                                        </span>
                                        {selected ? (
                                          <CheckIcon className="size-4 text-white" />
                                        ) : slot.status === "available" && !runsPastClose ? (
                                          <span
                                            aria-hidden="true"
                                            className="size-1.5 rounded-full bg-brand-lime transition-transform duration-200 group-hover:scale-125"
                                          />
                                        ) : null}
                                      </span>
                                      <span
                                        className={cn(
                                          "mt-0.5 block text-[0.6875rem]",
                                          selected ? "text-white/75" : "text-muted",
                                        )}
                                      >
                                        {slot.status === "booked"
                                          ? "Booked"
                                          : slot.status === "closed"
                                            ? "Closed"
                                            : runsPastClose
                                              ? "Past closing"
                                              : `${formatPeso(slotRate)}/hr`}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4 text-caption text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className="size-2.5 rounded-full bg-brand-lime"
                        />
                        Available
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className="size-2.5 rounded-full bg-brand-blue"
                        />
                        Selected
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className="size-2.5 rounded-full bg-line-strong"
                        />
                        Booked, closed, or past closing
                      </span>
                    </div>
                  </section>
                </div>

                <aside className="min-w-0 space-y-4 lg:sticky lg:top-6">
                  <BookingSummary
                    court={selectedSlotData?.court}
                    date={dateLabel}
                    time={selectedSlotData?.label}
                    duration={durationLabel}
                    priceLabel={priceLabel}
                    priceNote={priceNote}
                    sample
                  >
                    <Button
                      type="button"
                      size="lg"
                      className="w-full"
                      onClick={goToReview}
                      disabled={!selectedSlotData}
                    >
                      Review booking
                      <ArrowRightIcon className="size-4" />
                    </Button>
                    <p
                      className="mt-2 text-center text-caption text-muted"
                      aria-live="polite"
                    >
                      {selectedSlotData
                        ? "Preview only — no slot is held."
                        : "Choose a time to continue."}
                    </p>
                  </BookingSummary>

                  <PolicyNotice
                    items={[
                      "Open daily 7:00 AM – 12:00 AM. Holiday closures are not confirmed.",
                      "Cancellation cutoff: 24 hours before court time.",
                      "Payment deadline: 15 minutes, the same window as the temporary hold.",
                    ]}
                    note="Weekend rates, holiday closures, and the payment account name are still open in the decision register."
                  />
                </aside>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                <div className="min-w-0 space-y-6">
                  <Alert
                    variant="info"
                    eyebrow="Account required"
                    title="You will need an account to finish this booking"
                  >
                    Price and availability are shown first, so you only sign up
                    once you know what you are paying for. Full name, email, and
                    mobile number are required, and the email must be verified
                    before the slot is held.
                  </Alert>

                  <section
                    aria-labelledby="preview-player-details"
                    className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-eyebrow font-bold uppercase text-accent-ink">
                          Your details
                        </p>
                        <h2
                          id="preview-player-details"
                          className="mt-1.5 text-heading font-semibold text-heading"
                        >
                          Who is playing?
                        </h2>
                      </div>
                      <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-brand-blue-soft text-accent-ink">
                        <ShieldIcon className="size-5" />
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      These fields show the intended layout. They are not
                      submitted, stored, or verified in this preview.
                    </p>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <Field
                        id="preview-name"
                        label="Full name"
                        required
                        error={showError("name") ? errors.name : undefined}
                      >
                        <Input
                          ref={nameRef}
                          id="preview-name"
                          name="preview-name"
                          autoComplete="name"
                          placeholder="Sample player"
                          value={form.name}
                          onChange={(event) =>
                            setForm((value) => ({
                              ...value,
                              name: event.target.value,
                            }))
                          }
                          onBlur={() =>
                            setTouched((value) => ({ ...value, name: true }))
                          }
                          aria-invalid={showError("name") || undefined}
                          aria-describedby={
                            showError("name") ? "preview-name-error" : undefined
                          }
                        />
                      </Field>
                      <Field
                        id="preview-email"
                        label="Email address"
                        required
                        error={showError("email") ? errors.email : undefined}
                      >
                        <Input
                          ref={emailRef}
                          id="preview-email"
                          name="preview-email"
                          type="email"
                          autoComplete="email"
                          placeholder="player@example.com"
                          value={form.email}
                          onChange={(event) =>
                            setForm((value) => ({
                              ...value,
                              email: event.target.value,
                            }))
                          }
                          onBlur={() =>
                            setTouched((value) => ({ ...value, email: true }))
                          }
                          aria-invalid={showError("email") || undefined}
                          aria-describedby={
                            showError("email") ? "preview-email-error" : undefined
                          }
                        />
                      </Field>
                      <Field
                        id="preview-mobile"
                        label="Mobile number"
                        required
                        className="sm:col-span-2"
                        hint="Used for day-of contact. Verification messages are sent in a later phase."
                        error={showError("mobile") ? errors.mobile : undefined}
                      >
                        <Input
                          ref={mobileRef}
                          id="preview-mobile"
                          name="preview-mobile"
                          type="tel"
                          autoComplete="tel"
                          placeholder="+63 9XX XXX XXXX"
                          value={form.mobile}
                          onChange={(event) =>
                            setForm((value) => ({
                              ...value,
                              mobile: event.target.value,
                            }))
                          }
                          onBlur={() =>
                            setTouched((value) => ({ ...value, mobile: true }))
                          }
                          aria-invalid={showError("mobile") || undefined}
                          aria-describedby={
                            showError("mobile")
                              ? "preview-mobile-error"
                              : "preview-mobile-hint"
                          }
                        />
                      </Field>
                    </div>

                    <p className="mt-4 rounded-xl border border-line bg-page/60 px-4 py-3 text-caption leading-relaxed text-muted">
                      Booking for a group is allowed. Only your name is required;
                      the names of the other players are not collected. The
                      maximum number of players per court is not yet confirmed.
                    </p>
                  </section>

                  <section
                    aria-labelledby="preview-payment-method"
                    className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6"
                  >
                    <p className="text-eyebrow font-bold uppercase text-accent-ink">
                      Payment method
                    </p>
                    <h2
                      id="preview-payment-method"
                      className="mt-1.5 text-heading font-semibold text-heading"
                    >
                      How will you pay?
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      GCash QR is the only method confirmed for court bookings.
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="flex items-start justify-between gap-3 rounded-xl border border-brand-blue bg-brand-blue-soft/60 p-4">
                        <div>
                          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                            <WalletIcon className="size-4 text-accent-ink" />
                            GCash QR
                          </p>
                          <p className="mt-1 text-caption text-muted">
                            Scan, then upload the receipt as proof.
                          </p>
                        </div>
                        <Badge variant="lime" dot>
                          Only option
                        </Badge>
                      </div>
                      <div className="rounded-xl border border-dashed border-line-strong bg-page/50 p-4 opacity-75">
                        <p className="text-sm font-semibold text-muted">
                          Maya, card, cash
                        </p>
                        <p className="mt-1 text-caption text-muted">
                          Not confirmed for court bookings. Do not treat this as
                          available.
                        </p>
                      </div>
                    </div>
                  </section>

                  <PolicyNotice
                    items={[
                      "Cancel at least 24 hours before court time for a full GCash refund or one free move to another slot.",
                      "Inside 24 hours the court fee is not refunded and the slot is released to other players.",
                      "Self-service cancel and reschedule are not available yet — contact the club.",
                      "If payment proof is not submitted within 15 minutes, the request is cancelled automatically and the slot returns to the schedule.",
                    ]}
                    note="No-shows are not refunded and a late start does not extend the booking. If the club closes the court for weather or maintenance, the booking is refunded in full or moved free of charge."
                  />

                  <div>
                    <label
                      className={cn(
                        "group flex cursor-pointer items-start gap-3 rounded-xl border bg-surface p-4 text-sm text-ink transition-colors duration-200",
                        termsError
                          ? "border-danger bg-danger-soft/40"
                          : "border-line hover:border-line-strong",
                      )}
                    >
                      <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
                        <input
                          ref={termsRef}
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(event) => {
                            setTermsAccepted(event.target.checked);
                            if (event.target.checked) setTermsError(false);
                          }}
                          aria-invalid={termsError || undefined}
                          aria-describedby={
                            termsError ? "preview-terms-error" : undefined
                          }
                          className="peer size-5 appearance-none rounded-md border border-line-strong bg-surface transition-colors checked:border-brand-blue checked:bg-brand-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                        />
                        <CheckIcon className="pointer-events-none absolute size-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                      </span>
                      <span>
                        I understand this is a design preview and that no
                        booking, account, or payment is created.
                      </span>
                    </label>
                    {termsError ? (
                      <p
                        id="preview-terms-error"
                        className="mt-2 text-sm font-medium text-danger"
                      >
                        Accept the preview terms before continuing.
                      </p>
                    ) : null}
                  </div>

                  <div className="lg:hidden">
                    <Button
                      type="button"
                      variant="navy"
                      size="lg"
                      className="w-full"
                      onClick={goToPayment}
                      loading={submittingReview}
                    >
                      Confirm demo request
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-2 w-full"
                      onClick={() => setStep(0)}
                    >
                      Back to time selection
                    </Button>
                  </div>
                </div>

                <aside className="min-w-0 space-y-4 lg:sticky lg:top-6">
                  <BookingSummary
                    court={selectedSlotData?.court}
                    date={dateLabel}
                    time={selectedSlotData?.label}
                    duration={durationLabel}
                    priceLabel={priceLabel}
                    priceNote={priceNote}
                    sample
                  >
                    <StatusPair
                      booking={{ label: "Held · sample", variant: "warning" }}
                      payment={{ label: "Unpaid", variant: "neutral" }}
                    />
                    <p className="mt-3 flex items-center gap-1.5 text-caption text-muted">
                      <ClockIcon className="size-3.5" />
                      Held for 15 minutes from the moment you confirm.
                    </p>
                    <Button
                      type="button"
                      variant="navy"
                      size="lg"
                      className="mt-3 hidden w-full lg:inline-flex"
                      onClick={goToPayment}
                      loading={submittingReview}
                    >
                      Confirm demo request
                      <ArrowRightIcon className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-1 hidden w-full lg:inline-flex"
                      onClick={() => setStep(0)}
                    >
                      Back to time selection
                    </Button>
                  </BookingSummary>
                  <p className="px-1 text-caption leading-relaxed text-muted">
                    Preview only. No booking, account, or payment is created.
                  </p>
                </aside>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                <div className="min-w-0 space-y-6">
                  <Alert
                    variant="warning"
                    eyebrow="Design preview"
                    title="No booking was created"
                  >
                    This confirmation is a visual state only. The reference
                    number, dates, and payment details below are samples.
                  </Alert>

                  <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
                    <div className="relative overflow-hidden bg-brand-navy px-5 py-7 text-white sm:px-7">
                      <div
                        aria-hidden="true"
                        className="court-grid absolute inset-0 opacity-40"
                      />
                      <motion.div
                        aria-hidden="true"
                        className="absolute -right-6 top-1/2 size-40 -translate-y-1/2 rounded-full border border-brand-yellow/30"
                        animate={
                          reduce
                            ? undefined
                            : { scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }
                        }
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <div className="relative flex flex-wrap items-start justify-between gap-6">
                        <div className="max-w-md">
                          <p className="text-eyebrow font-bold uppercase text-brand-yellow">
                            Preview request
                          </p>
                          <h2 className="mt-2 text-title font-bold text-white">
                            Pay to keep this slot.
                          </h2>
                          <p className="mt-2 text-sm leading-relaxed text-white/70">
                            The club holds the slot temporarily, then verifies
                            the transfer. The booking only becomes confirmed
                            after that check.
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/15 bg-white/[0.07] px-4 py-3 text-right">
                          <p className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-white/50">
                            Hold expires in
                          </p>
                          <p
                            className={cn(
                              "mt-1 font-mono text-2xl font-bold tabular-nums",
                              holdExpired ? "text-danger" : "text-brand-yellow",
                            )}
                            aria-live="polite"
                          >
                            {holdExpired ? "Expired" : formatCountdown(holdSeconds)}
                          </p>
                          <p className="mt-1 text-[0.625rem] text-white/40">
                            15-minute hold
                          </p>
                        </div>
                      </div>
                      <div className="relative mt-5 h-1 overflow-hidden rounded-full bg-white/15">
                        <div
                          className="h-full rounded-full bg-brand-yellow transition-[width] duration-1000 ease-linear"
                          style={{ width: `${holdPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-5 sm:p-6">
                      <StatusPair
                        booking={{ label: "Awaiting payment", variant: "warning" }}
                        payment={paymentStatus}
                      />

                      {holdExpired ? (
                        <Alert
                          variant="error"
                          eyebrow="Preview state"
                          title="The 15-minute hold has ended"
                          className="mt-5"
                        >
                          The slot was released and is available again. No
                          booking or payment was created. Start a new preview to
                          choose another time.
                        </Alert>
                      ) : null}

                      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-line bg-page/50 p-4">
                          <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                            Reference
                          </dt>
                          <dd className="mt-1 flex items-center justify-between gap-2">
                            <span className="font-mono text-sm font-semibold text-heading">
                              {REFERENCE}
                            </span>
                            <button
                              type="button"
                              onClick={copyReference}
                              className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-line-strong hover:text-accent-ink"
                              aria-label="Copy booking reference"
                            >
                              <CopyIcon className="size-4" />
                            </button>
                          </dd>
                        </div>
                        <div className="rounded-xl border border-line bg-page/50 p-4">
                          <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                            Court time
                          </dt>
                          <dd className="mt-1 text-sm font-semibold text-ink">
                            {selectedSlotData?.court ?? "Court 1"} · {dateLabel} ·{" "}
                            {selectedSlotData?.label ?? "7:00 AM"} · {durationLabel}
                          </dd>
                        </div>
                        <div className="rounded-xl border border-line bg-page/50 p-4">
                          <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                            Hold length
                          </dt>
                          <dd className="mt-1 text-sm font-semibold text-ink">
                            {HOLD_MINUTES} minutes from confirmation
                          </dd>
                        </div>
                        <div className="rounded-xl border border-line bg-page/50 p-4">
                          <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                            Payment deadline
                          </dt>
                          <dd className="mt-1 text-sm font-semibold text-ink">
                            Same {HOLD_MINUTES} minutes · unpaid requests cancel
                            automatically
                          </dd>
                        </div>
                      </dl>

                      {proofState === "submitted" ? (
                        <div className="mt-5" role="status" aria-live="polite">
                          <Alert
                            variant="success"
                            eyebrow="Preview state"
                            title="Proof submitted — waiting for staff review"
                          >
                            A real upload would be verified against the actual
                            transfer. If the proof is rejected, the club must be
                            contacted; resubmission is not offered in the
                            confirmed rules.
                          </Alert>
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <PaymentInstructions
                    amountLabel={priceLabel}
                    reference={REFERENCE}
                    methodLabel="GCash QR"
                    qrSrc="/qr/gcash-sample.jpg"
                    qrAlt="Sample GCash QR code used as a stand-in"
                    qrSample
                    note="The code and account name shown are a personal stand-in, not the club's. Do not send money. The club has not supplied its receiving account."
                  >
                    <div className="rounded-xl border border-dashed border-line-strong bg-surface p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="max-w-md">
                          <p className="text-sm font-semibold text-heading">
                            Test mode
                          </p>
                          <p className="mt-1 text-caption leading-relaxed text-muted">
                            The club&apos;s GCash code is still pending, so this
                            button moves the request to the paid state without
                            any real transfer. Use it to walk the whole flow.
                          </p>
                        </div>
                        <Badge variant="yellow">Test only</Badge>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mt-3"
                        onClick={simulateTestPayment}
                        disabled={holdExpired || proofState === "submitted"}
                      >
                        {proofState === "submitted"
                          ? "Payment marked as received"
                          : "Simulate a successful payment"}
                      </Button>
                    </div>

                    <div className="mt-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-heading">
                            Upload payment proof
                          </p>
                          <p className="mt-1 text-caption leading-relaxed text-muted">
                            Choose an image to see the file-selected state. The
                            file never leaves this browser.
                          </p>
                        </div>
                        <Badge variant="neutral">Preview only</Badge>
                      </div>

                      {proofState === "submitted" ? (
                        <div className="mt-3 flex items-center gap-3 rounded-xl border border-success/30 bg-success-soft/60 p-3">
                          <motion.span
                            initial={reduce ? undefined : { scale: 0.6, opacity: 0 }}
                            animate={reduce ? undefined : { scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 18 }}
                            className="grid size-10 shrink-0 place-items-center rounded-full bg-success text-white"
                          >
                            <CheckIcon className="size-5" />
                          </motion.span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink">
                              Proof submitted
                            </p>
                            <p className="truncate text-caption text-muted">
                              {proof?.name}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="mt-3">
                            <input
                              id="preview-proof"
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(event) =>
                                chooseFile(event.target.files?.[0])
                              }
                              disabled={proofState === "submitting"}
                            />
                            <label
                              htmlFor="preview-proof"
                              className={cn(
                                "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed bg-page/40 p-4 transition-colors duration-200 hover:border-brand-blue/60 hover:bg-brand-blue-soft/40",
                                fileError ? "border-danger" : "border-line-strong",
                                proofState === "submitting" &&
                                  "pointer-events-none opacity-60",
                              )}
                            >
                              {proof ? (
                                <Image
                                  src={proof.url}
                                  alt=""
                                  width={56}
                                  height={56}
                                  unoptimized
                                  className="size-14 shrink-0 rounded-lg border border-line object-cover"
                                />
                              ) : (
                                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-accent-ink">
                                  <UploadIcon className="size-5" />
                                </span>
                              )}
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-heading">
                                  {proof ? "Replace image" : "Choose an image"}
                                </span>
                                <span className="mt-0.5 block truncate text-caption text-muted">
                                  {proof
                                    ? `${proof.name} · ${formatFileSize(proof.size)}`
                                    : "PNG or JPEG · preview only"}
                                </span>
                              </span>
                            </label>
                            {fileError ? (
                              <p className="mt-1.5 text-sm font-medium text-danger">
                                {fileError}
                              </p>
                            ) : null}
                          </div>

                          <Button
                            type="button"
                            size="md"
                            className="mt-3"
                            onClick={submitProof}
                            disabled={!proof || holdExpired}
                            loading={proofState === "submitting"}
                          >
                            {proofState === "submitting"
                              ? "Submitting proof"
                              : "Submit proof"}
                          </Button>
                        </>
                      )}
                    </div>
                  </PaymentInstructions>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setStep(1)}
                    >
                      <ArrowLeftIcon className="size-4" />
                      Back to review
                    </Button>
                    <Button type="button" variant="ghost" onClick={restart}>
                      Start a new preview
                    </Button>
                  </div>
                </div>

                <aside className="min-w-0 space-y-4">
                  <BookingSummary
                    court={selectedSlotData?.court}
                    date={dateLabel}
                    time={selectedSlotData?.label}
                    duration={durationLabel}
                    priceLabel={priceLabel}
                    priceNote="The reference and statuses are sample preview data."
                    sample
                  >
                    <StatusPair
                      booking={{ label: "Awaiting payment", variant: "warning" }}
                      payment={paymentStatus}
                    />
                  </BookingSummary>

                  <section
                    aria-labelledby="preview-next-steps"
                    className="rounded-2xl border border-line bg-surface p-5 shadow-card"
                  >
                    <h2
                      id="preview-next-steps"
                      className="text-heading font-semibold text-heading"
                    >
                      What happens next
                    </h2>
                    <ol className="mt-4 space-y-4">
                      {[
                        "Pay the amount shown within 15 minutes and keep the reference in the payment note.",
                        "Upload the receipt so staff can match the transfer to the reference.",
                        "Once verified, the booking becomes confirmed and the hold ends.",
                        "If proof is not submitted in time, the request is cancelled and the slot returns to the schedule.",
                      ].map((item, index) => {
                        const active =
                          (index === 0 && proofState === "idle") ||
                          (index === 1 && proofState === "submitted");
                        return (
                          <li
                            key={item}
                            className="relative flex gap-3 text-sm leading-relaxed"
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "grid size-6 shrink-0 place-items-center rounded-full border text-[0.625rem] font-bold transition-colors duration-300",
                                active
                                  ? "border-brand-blue bg-brand-blue text-white"
                                  : "border-line bg-page text-muted",
                              )}
                            >
                              {index + 1}
                            </span>
                            <span className={active ? "text-ink" : "text-muted"}>
                              {item}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                    <p className="mt-4 flex items-start gap-2 border-t border-line pt-3 text-caption leading-relaxed text-muted">
                      <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
                      No payment is taken, verified, or stored in this preview.
                    </p>
                  </section>

                  <p className="px-1 text-caption leading-relaxed text-muted">
                    Reference and statuses are samples. The GCash code is a
                    personal stand-in and must not be paid.
                  </p>
                </aside>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile action bar */}
      <AnimatePresence>
        {step === 0 ? (
          <motion.div
            initial={reduce ? undefined : { y: 80 }}
            animate={reduce ? undefined : { y: 0 }}
            exit={reduce ? undefined : { y: 80 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-raised backdrop-blur-xl lg:hidden"
          >
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                  {selectedSlotData
                    ? `${priceLabel} · ${durationLabel}`
                    : "Your total"}
                </p>
                <p className="truncate text-sm font-semibold text-heading">
                  {selectedSlotData
                    ? `${dateLabel} · ${selectedSlotData.label}`
                    : "Choose a time to continue"}
                </p>
              </div>
              <Button
                type="button"
                onClick={goToReview}
                disabled={!selectedSlotData}
              >
                Review
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
