"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  createBookingGroup,
  getCourtAvailability,
  type BookingFormState,
} from "@/app/book/actions";
import { BookingGroupConfirmation } from "@/components/booking/booking-group-confirmation";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { BookingSummary } from "@/components/ui/booking-summary";
import { Button } from "@/components/ui/button";
import { Field, Input, PhoneInput } from "@/components/ui/field";
import { PolicyNotice } from "@/components/ui/policy-notice";
import { Stepper } from "@/components/ui/stepper";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Logo } from "@/components/brand/logo";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  InfoIcon,
  PlusIcon,
  ShieldIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  formatMinuteLabel,
  formatPeso,
  type AvailabilitySlot,
} from "@/lib/bookings";
import { revealTarget } from "@/lib/scroll";

const steps = [
  { label: "Choose time" },
  { label: "Your details" },
  { label: "Hold & pay" },
] as const;

const stepContent = [
  {
    eyebrow: "Step 1 · Choose a time",
    title: "Pick your court time",
    description:
      "Tap an open hour. Tap adjacent hours to extend your booking, then review your total.",
  },
  {
    eyebrow: "Step 2 · Your details",
    title: "Tell us who is playing",
    description:
      "Enter the booker’s name and mobile number, accept the terms, then hold the slot.",
  },
  {
    eyebrow: "Step 3 · Hold & pay",
    title: "Pay within 15 minutes",
    description:
      "Your slot is held for 15 minutes. Pay by GCash and upload your proof before the hold ends.",
  },
] as const;

// Saved court times survive a page reload (and a confirmation link opening in
// a new tab) for two hours, then disappear on their own.
const CART_STORAGE_KEY = "dhidden-booking-cart";
const CART_STORAGE_TTL_MS = 2 * 60 * 60 * 1000;

const DAY_OPEN_MINUTE = 7 * 60;
const DAY_CLOSE_MINUTE = 24 * 60;

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
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

const initialBookingState: BookingFormState = {
  status: "idle",
  errors: {},
  values: {
    fullName: "",
    phone: "",
    email: "",
  },
};

type CourtOption = {
  id: string;
  name: string;
  slug: string;
};

type CartRange = {
  key: string;
  courtId: string;
  courtName: string;
  date: string;
  startsAt: string;
  endsAt: string;
  startMinute: number;
  endMinute: number;
  durationMinutes: number;
  amountPhp: number;
};

function isSavedCartRange(value: unknown): value is CartRange {
  if (!value || typeof value !== "object") return false;

  const item = value as Partial<CartRange>;
  return (
    typeof item.key === "string" &&
    typeof item.courtId === "string" &&
    typeof item.courtName === "string" &&
    typeof item.date === "string" &&
    typeof item.startsAt === "string" &&
    typeof item.endsAt === "string" &&
    typeof item.startMinute === "number" &&
    typeof item.endMinute === "number" &&
    typeof item.durationMinutes === "number" &&
    typeof item.amountPhp === "number"
  );
}

type HourCell = {
  key: string;
  courtId: string | null;
  courtName: string | null;
  startMinute: number;
  endMinute: number;
  status: "open" | "taken" | "past" | "in-cart";
  slot?: AvailabilitySlot;
};

type DateParts = {
  year: number;
  monthIndex: number;
  day: number;
};

type CalendarCell = {
  key: string;
  dayOfMonth: number;
  dateId?: string;
  disabled?: boolean;
};

function parseDateId(value: string | null | undefined): DateParts | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, monthIndex: month - 1, day };
}

function dateIdFromParts({ year, monthIndex, day }: DateParts) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDateId(value: string) {
  const parts = parseDateId(value);
  if (!parts) return "Date unavailable";

  return new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parts.year, parts.monthIndex, parts.day)));
}

function quickDateParts(value: string) {
  const parts = parseDateId(value);
  if (!parts) return { weekday: "Date", monthDay: value };

  const date = new Date(Date.UTC(parts.year, parts.monthIndex, parts.day));

  return {
    weekday: new Intl.DateTimeFormat("en-PH", {
      weekday: "short",
      timeZone: "UTC",
    }).format(date),
    monthDay: new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(date),
  };
}

function formatMonth(year: number, monthIndex: number) {
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}

function buildCalendarCells(
  year: number,
  monthIndex: number,
  today: string,
): CalendarCell[] {
  const cells: CalendarCell[] = [];
  const leading = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(
    Date.UTC(year, monthIndex + 1, 0),
  ).getUTCDate();

  for (let index = 0; index < leading; index += 1) {
    cells.push({ key: `blank-${year}-${monthIndex}-${index}`, dayOfMonth: 0 });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateId = dateIdFromParts({ year, monthIndex, day });
    cells.push({
      key: dateId,
      dayOfMonth: day,
      dateId,
      disabled: dateId < today,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      key: `trail-${year}-${monthIndex}-${cells.length}`,
      dayOfMonth: 0,
    });
  }

  return cells;
}

function addDays(value: string, days: number) {
  const parts = parseDateId(value);
  if (!parts) return value;

  const date = new Date(Date.UTC(parts.year, parts.monthIndex, parts.day));
  date.setUTCDate(date.getUTCDate() + days);

  return dateIdFromParts({
    year: date.getUTCFullYear(),
    monthIndex: date.getUTCMonth(),
    day: date.getUTCDate(),
  });
}

function formatHourLabel(minutes: number) {
  return formatMinuteLabel(minutes).replace(":00", "");
}

function formatHourRange(startMinute: number, endMinute = startMinute + 60) {
  return `${formatHourLabel(startMinute)} – ${formatHourLabel(endMinute)}`;
}

function manilaMinuteNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );
  return (hour % 24) * 60 + minute;
}

/** Returns the contiguous hourly slots that can be booked from a start time. */
function rangeForSlot(slot: AvailabilitySlot, slots: AvailabilitySlot[]) {
  const courtSlots = slots
    .filter((candidate) => candidate.courtId === slot.courtId)
    .sort((a, b) => a.startMinute - b.startMinute);
  const startIndex = courtSlots.findIndex(
    (candidate) => candidate.startsAt === slot.startsAt,
  );

  if (startIndex === -1) return [];

  const range = [courtSlots[startIndex]];
  for (let index = startIndex + 1; index < courtSlots.length; index += 1) {
    const previous = range[range.length - 1];
    const candidate = courtSlots[index];
    if (candidate.startMinute !== previous.startMinute + 60) break;
    range.push(candidate);
  }

  return range;
}

function rangeAmount(range: AvailabilitySlot[], hours: number) {
  return range
    .slice(0, hours)
    .reduce((total, slot) => total + slot.amountPhp, 0);
}

function rangeToCartItem(
  range: AvailabilitySlot[],
  dateId: string,
): CartRange | null {
  const first = range[0];
  const last = range[range.length - 1];
  if (!first || !last) return null;

  return {
    key: `${dateId}-${first.courtId}-${first.startsAt}`,
    courtId: first.courtId,
    courtName: first.courtName,
    date: dateId,
    startsAt: first.startsAt,
    endsAt: last.endsAt,
    startMinute: first.startMinute,
    endMinute: last.startMinute + 60,
    durationMinutes: range.length * 60,
    amountPhp: rangeAmount(range, range.length),
  };
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
        <h3 className="mt-1.5 text-heading font-semibold text-heading">
          {title}
        </h3>
      </div>
      {aside}
    </div>
  );
}

function SlotSkeleton() {
  return (
    <div
      className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4"
      aria-hidden="true"
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="skeleton h-[4.6rem] rounded-xl"
          style={{ animationDelay: `${index * 60}ms` }}
        />
      ))}
    </div>
  );
}

export function CourtBooking({
  courts,
  today,
  embedded = false,
}: {
  courts: CourtOption[];
  today: string;
  embedded?: boolean;
}) {
  const searchParams = useSearchParams();
  const reduce = useReducedMotion();

  const requestedDate = searchParams.get("date");
  const requestedDuration = Number(searchParams.get("duration"));
  const requestedCourt = searchParams.get("court");
  const requestedStart = searchParams.get("start");

  const initialDate =
    parseDateId(requestedDate) && requestedDate! >= today ? requestedDate! : today;
  const initialHours =
    Number.isInteger(requestedDuration) &&
    requestedDuration >= 60 &&
    requestedDuration <= 1020 &&
    requestedDuration % 60 === 0
      ? requestedDuration / 60
      : 1;

  const [date, setDate] = useState(initialDate);
  const [courtFilter, setCourtFilter] = useState<"all" | string>(
    requestedCourt && courts.some((court) => court.id === requestedCourt)
      ? requestedCourt
      : (courts[0]?.id ?? "all"),
  );
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const parts = parseDateId(initialDate) ?? parseDateId(today)!;
    return { year: parts.year, monthIndex: parts.monthIndex };
  });
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [availabilityState, setAvailabilityState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null,
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [cart, setCart] = useState<CartRange[]>([]);
  const [activeRangeKey, setActiveRangeKey] = useState<string | null>(null);
  // Snapshots of the cart so a stray tap can be undone in one click.
  const [history, setHistory] = useState<
    { cart: CartRange[]; activeRangeKey: string | null }[]
  >([]);
  const [hydrated, setHydrated] = useState(false);
  // Set by "Add court time" so the very next pick starts its own range even
  // when it is adjacent to one already in the cart.
  const [forceNewRange, setForceNewRange] = useState(false);
  // An out-of-range pick the player can confirm as a separate court time.
  const [blockedSlot, setBlockedSlot] = useState<{
    slot: AvailabilitySlot;
    date: string;
  } | null>(null);
  const [step, setStep] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [nowMinute, setNowMinute] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [bookingState, setBookingState] =
    useState<BookingFormState>(initialBookingState);
  const [pending, setPending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const blockedNoticeRef = useRef<HTMLDivElement>(null);
  const restoredSelection = useRef(false);
  const hasMounted = useRef(false);

  useEffect(() => {
    let cancelled = false;

    getCourtAvailability({ date, duration: 60 })
      .then((result) => {
        if (cancelled) return;

        if (result.status === "error") {
          setSlots([]);
          setAvailabilityError(result.message);
          setAvailabilityState("error");
          return;
        }

        setSlots(result.slots);
        setAvailabilityState("ready");

        if (
          !restoredSelection.current &&
          requestedCourt &&
          requestedStart
        ) {
          restoredSelection.current = true;
          const requestedTime = Date.parse(requestedStart);
          const match = result.slots.find(
            (slot) =>
              slot.courtId === requestedCourt &&
              Math.abs(Date.parse(slot.startsAt) - requestedTime) < 1000,
          );

          if (match) {
            const range = rangeForSlot(match, result.slots).slice(
              0,
              initialHours,
            );
            const item = rangeToCartItem(range, date);
            if (item) {
              setCart((current) =>
                current.some((existing) => existing.key === item.key)
                  ? current
                  : [...current, item],
              );
              setActiveRangeKey(item.key);
              setStep(1);
            } else {
              setNotice("That time is no longer available. Choose another.");
            }
          } else {
            setNotice("That time is no longer available. Choose another.");
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSlots([]);
        setAvailabilityError(
          "Live availability could not be loaded. Try again, or contact the club.",
        );
        setAvailabilityState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [date, initialHours, refreshKey, requestedCourt, requestedStart]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    const timer = window.setTimeout(
      () => revealTarget(headingRef.current, { block: "start" }),
      360,
    );
    return () => window.clearTimeout(timer);
  }, [step]);

  // A failed submit is reported above the form, which is off-screen when the
  // guest taps the button at the bottom. Bring the first field to fix into
  // view, or the error card when no single field is at fault.
  useEffect(() => {
    if (bookingState.status !== "error") return;

    const firstInvalid = formRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );

    revealTarget(firstInvalid ?? document.getElementById("booking-error"));
  }, [bookingState]);

  // The out-of-range pick is only actionable through the card below the grid.
  // Bring it into view instead of leaving the explanation off-screen.
  useEffect(() => {
    if (!blockedSlot) return;

    const timer = window.setTimeout(() => {
      revealTarget(blockedNoticeRef.current, { focus: false, block: "center" });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [blockedSlot]);

  useEffect(() => {
    const tick = () => setNowMinute(manilaMinuteNow());
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Restore a selection after a reload or a confirmation link opening in a new
  // tab. It lives in localStorage and expires so an old half-built selection
  // never returns.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(CART_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            savedAt?: number;
            items?: unknown;
          };
          const savedAt = typeof parsed?.savedAt === "number" ? parsed.savedAt : 0;
          const fresh = Date.now() - savedAt < CART_STORAGE_TTL_MS;
          const items = Array.isArray(parsed?.items) ? parsed.items : [];
          const valid = fresh ? items.filter(isSavedCartRange) : [];

          if (valid.length > 0) {
            setCart(valid);
            setActiveRangeKey(valid[valid.length - 1].key);
            setNotice(
              "We kept the court times you picked earlier. Check the hours below, then continue.",
            );
            const params = new URLSearchParams(window.location.search);
            if (params.get("resume") === "cart") {
              setStep(1);
              // Consume the hint so a later reopen starts on the picker.
              params.delete("resume");
              const query = params.toString();
              window.history.replaceState(
                {},
                "",
                `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
              );
            }
          } else if (!fresh) {
            window.localStorage.removeItem(CART_STORAGE_KEY);
          }
        }
      } catch {
        // Ignore a stale or malformed saved selection.
      }

      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  // Only start saving once the restore above had its chance to read.
  useEffect(() => {
    if (!hydrated) return;

    try {
      if (cart.length === 0) {
        window.localStorage.removeItem(CART_STORAGE_KEY);
        return;
      }

      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({ savedAt: Date.now(), items: cart }),
      );
    } catch {
      // Storage can be unavailable; the selection still works on this page.
    }
  }, [cart, hydrated]);

  const todayParts = parseDateId(today)!;
  const quickDates = Array.from({ length: 14 }, (_, index) =>
    addDays(today, index),
  );
  const selectedDateLabel = formatDateId(date);
  const calendarCells = buildCalendarCells(
    visibleMonth.year,
    visibleMonth.monthIndex,
    today,
  );
  const monthPosition =
    visibleMonth.year * 12 + visibleMonth.monthIndex;
  const todayPosition = todayParts.year * 12 + todayParts.monthIndex;

  const courtOptions = useMemo(() => {
    if (courts.length > 0) return courts;

    const seen = new Map<string, CourtOption>();
    for (const slot of slots) {
      if (!seen.has(slot.courtId)) {
        seen.set(slot.courtId, {
          id: slot.courtId,
          name: slot.courtName,
          slug: slot.courtSlug,
        });
      }
    }
    return Array.from(seen.values());
  }, [courts, slots]);

  const slotsForPicker = slots.filter(
    (slot) =>
      !cart.some(
        (item) =>
          item.courtId === slot.courtId &&
          item.date === date &&
          item.startMinute < slot.startMinute + 60 &&
          slot.startMinute < item.endMinute,
      ),
  );
  const visibleSlots =
    courtFilter === "all"
      ? slotsForPicker
      : slotsForPicker.filter((slot) => slot.courtId === courtFilter);
  const hourCells = useMemo(() => {
    const courtIds =
      courtFilter === "all"
        ? courtOptions.map((court) => court.id)
        : [courtFilter];
    const cells: HourCell[] = [];

    for (
      let startMinute = DAY_OPEN_MINUTE;
      startMinute < DAY_CLOSE_MINUTE;
      startMinute += 60
    ) {
      const openSlots = slots.filter(
        (slot) =>
          courtIds.includes(slot.courtId) &&
          slot.startMinute === startMinute &&
          !cart.some(
            (item) =>
              item.courtId === slot.courtId &&
              item.date === date &&
              item.startMinute < slot.startMinute + 60 &&
              slot.startMinute < item.endMinute,
          ),
      );
      const cartCourts = courtIds.filter((courtId) =>
        cart.some(
          (item) =>
            item.courtId === courtId &&
            item.date === date &&
            item.startMinute <= startMinute &&
            startMinute < item.endMinute,
        ),
      );

      for (const courtId of cartCourts) {
        const item = cart.find(
          (entry) =>
            entry.courtId === courtId &&
            entry.date === date &&
            entry.startMinute <= startMinute &&
            startMinute < entry.endMinute,
        );
        cells.push({
          key: `cart-${courtId}-${startMinute}`,
          courtId,
          courtName: item?.courtName ?? null,
          startMinute,
          endMinute: startMinute + 60,
          status: "in-cart",
          // Kept so the cell can trim just its hour out of the range.
          slot: slots.find(
            (candidate) =>
              candidate.courtId === courtId &&
              candidate.startMinute === startMinute,
          ),
        });
      }

      if (openSlots.length > 0) {
        for (const slot of openSlots) {
          cells.push({
            key: `${slot.courtId}-${slot.startsAt}`,
            courtId: slot.courtId,
            courtName: slot.courtName,
            startMinute,
            endMinute: startMinute + 60,
            status: "open",
            slot,
          });
        }
        continue;
      }

      if (cartCourts.length > 0) continue;

      const past = date === today && startMinute <= nowMinute;
      const court =
        courtIds.length === 1
          ? courtOptions.find((option) => option.id === courtIds[0])
          : undefined;

      cells.push({
        key: `closed-${startMinute}`,
        courtId: court?.id ?? null,
        courtName: court?.name ?? null,
        startMinute,
        endMinute: startMinute + 60,
        status: past ? "past" : "taken",
      });
    }

    return cells.sort(
      (a, b) =>
        a.startMinute - b.startMinute ||
        (a.courtName ?? "").localeCompare(b.courtName ?? ""),
    );
  }, [
    cart,
    courtFilter,
    courtOptions,
    date,
    nowMinute,
    slots,
    today,
  ]);

  const activeContent = stepContent[step];
  const group = bookingState.group;
  const cartTotal = cart.reduce((total, item) => total + item.amountPhp, 0);
  const canSubmit = cart.length > 0 && !pending;

  function clearBookingFeedback() {
    setBookingState(initialBookingState);
    setNotice(null);
  }

  function handleGroupProofSubmitted() {
    setBookingState((current) =>
      current.group
        ? {
            ...current,
            group: {
              ...current.group,
              status: "confirmed",
              paymentStatus: "awaiting_verification",
              holdExpiresAt:
                current.group.status === "pending"
                  ? null
                  : current.group.holdExpiresAt,
            },
          }
        : current,
    );
  }

  function removeRange(key: string) {
    const removed = cart.find((item) => item.key === key);
    rememberCart();
    setCart((current) => current.filter((item) => item.key !== key));
    setActiveRangeKey((current) => (current === key ? null : current));
    if (removed) {
      setNotice(
        `Removed ${formatDateId(removed.date)} · ${formatHourRange(removed.startMinute, removed.endMinute)}.`,
      );
    }
  }

  function changeDate(nextDate: string) {
    setDate(nextDate);
    const parts = parseDateId(nextDate);
    if (parts) {
      setVisibleMonth({ year: parts.year, monthIndex: parts.monthIndex });
    }
    setActiveRangeKey(null);
    setBlockedSlot(null);
    setAvailabilityState("loading");
    setAvailabilityError(null);
    clearBookingFeedback();
    setStep(0);
  }

  function rememberCart() {
    setHistory((entries) =>
      entries.length >= 20
        ? [...entries.slice(1), { cart, activeRangeKey }]
        : [...entries, { cart, activeRangeKey }],
    );
  }

  function undoLastChange() {
    const previous = history[history.length - 1];
    if (!previous) return;

    setCart(previous.cart);
    setActiveRangeKey(previous.activeRangeKey);
    setHistory((entries) => entries.slice(0, -1));
    setBlockedSlot(null);
    setForceNewRange(false);
    setNotice("Restored your previous court times.");
  }

  function changeCourt(nextCourt: "all" | string) {
    setCourtFilter(nextCourt);
    clearBookingFeedback();
  }

  function addAnotherCourtTime() {
    setActiveRangeKey(null);
    setBlockedSlot(null);
    setForceNewRange(true);
    setNotice(
      "Choose another date or time. It will be added as a separate court time; use × to remove an existing one.",
    );
    document
      .getElementById("booking-date")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function trimHourFromRange(item: CartRange, startMinute: number) {
    rememberCart();

    const courtSlots = slots
      .filter((candidate) => candidate.courtId === item.courtId)
      .sort((a, b) => a.startMinute - b.startMinute);
    const segments: CartRange[] = [];

    const buildSegment = (segmentStart: number, segmentEnd: number) => {
      if (segmentEnd <= segmentStart) return;

      const startSlot = courtSlots.find(
        (candidate) => candidate.startMinute === segmentStart,
      );
      if (!startSlot) return;

      const range = rangeForSlot(startSlot, courtSlots).slice(
        0,
        (segmentEnd - segmentStart) / 60,
      );
      const segment = rangeToCartItem(range, item.date);
      if (segment) segments.push(segment);
    };

    // Removing a middle hour splits the range into the part before it and the
    // part after it; removing an end hour simply shortens the range.
    buildSegment(item.startMinute, startMinute);
    buildSegment(startMinute + 60, item.endMinute);

    setCart((current) => [
      ...current.filter((candidate) => candidate.key !== item.key),
      ...segments,
    ]);
    setActiveRangeKey(segments[0]?.key ?? segments[1]?.key ?? null);
    setForceNewRange(false);
    setNotice(
      `Removed ${formatHourRange(startMinute)} from that court time. Tap an adjacent hour to extend a range, or use × to remove a whole range.`,
    );
  }

  // A non-adjacent pick bridges the gap into the range it belongs with when
  // every hour in between is open, so 4 PM then 10 PM becomes 4 PM – 11 PM.
  function bridgedRange(slot: AvailabilitySlot): CartRange | null {
    if (forceNewRange) return null;

    const sameDayRanges = cart.filter(
      (item) => item.courtId === slot.courtId && item.date === date,
    );
    if (sameDayRanges.length === 0) return null;

    const active = activeRangeKey
      ? sameDayRanges.find((item) => item.key === activeRangeKey)
      : undefined;
    const gapFor = (item: CartRange) =>
      item.startMinute > slot.startMinute
        ? item.startMinute - (slot.startMinute + 60)
        : slot.startMinute - item.endMinute;
    const target =
      active ?? [...sameDayRanges].sort((a, b) => gapFor(a) - gapFor(b))[0];

    const spanStart = Math.min(target.startMinute, slot.startMinute);
    const spanEnd = Math.max(target.endMinute, slot.startMinute + 60);
    const courtSlots = slots
      .filter((candidate) => candidate.courtId === slot.courtId)
      .sort((a, b) => a.startMinute - b.startMinute);
    const spanSlots = courtSlots.filter(
      (candidate) =>
        candidate.startMinute >= spanStart && candidate.startMinute < spanEnd,
    );

    // Refuse the bridge when any hour in between is taken or closed.
    if (spanSlots.length !== (spanEnd - spanStart) / 60) return null;

    return rangeToCartItem(spanSlots, date);
  }

  function addBlockedSlotSeparately() {
    if (!blockedSlot) return;

    const item = rangeToCartItem([blockedSlot.slot], blockedSlot.date);
    if (!item) return;

    rememberCart();
    setCart((current) => [...current, item]);
    setActiveRangeKey(item.key);
    setForceNewRange(false);
    setBlockedSlot(null);
    setNotice(
      `Added ${formatDateId(blockedSlot.date)} · ${formatHourRange(blockedSlot.slot.startMinute)} as a separate court time. Tap an adjacent hour to extend it, or use × to remove it.`,
    );
  }

  function toggleSlot(slot: AvailabilitySlot) {
    setBookingState(initialBookingState);
    setNotice(null);
    setBlockedSlot(null);

    const existing = cart.find(
      (item) =>
        item.courtId === slot.courtId &&
        item.date === date &&
        item.startMinute <= slot.startMinute &&
        slot.startMinute < item.endMinute,
    );

    // Tapping an added hour trims that hour out of its range; × in the
    // court-times list removes the whole range.
    if (existing) {
      trimHourFromRange(existing, slot.startMinute);
      return;
    }

    // Any adjacent hour extends whichever existing range it touches, so a
    // range can keep growing later, not just right after it was created.
    // "Add court time" clears this list for exactly one pick, so the next
    // choice starts a separate range even when it is adjacent.
    const neighbours = forceNewRange
      ? []
      : cart.filter(
          (item) =>
            item.courtId === slot.courtId &&
            item.date === date &&
            (item.endMinute === slot.startMinute ||
              item.startMinute === slot.startMinute + 60),
        );

    if (neighbours.length > 0) {
      const courtSlots = slots
        .filter((candidate) => candidate.courtId === slot.courtId)
        .sort((a, b) => a.startMinute - b.startMinute);
      const startMinute = Math.min(
        slot.startMinute,
        ...neighbours.map((item) => item.startMinute),
      );
      const endMinute = Math.max(
        slot.startMinute + 60,
        ...neighbours.map((item) => item.endMinute),
      );
      const startSlot = courtSlots.find(
        (candidate) => candidate.startMinute === startMinute,
      );

      if (!startSlot) return;

      const range = rangeForSlot(startSlot, courtSlots).slice(
        0,
        (endMinute - startMinute) / 60,
      );
      const item = rangeToCartItem(range, date);

      if (!item) return;

      rememberCart();
      setCart((current) => [
        ...current.filter(
          (candidate) =>
            !neighbours.some((entry) => entry.key === candidate.key),
        ),
        item,
      ]);
      setActiveRangeKey(item.key);
      setForceNewRange(false);
      setNotice(
        `Extended the court time to ${formatDateId(date)} · ${formatHourRange(item.startMinute, item.endMinute)}. Tap an adjacent hour to extend it again, or use × to remove it.`,
      );
      return;
    }

    const bridged = bridgedRange(slot);
    if (bridged) {
      rememberCart();
      setCart((current) => [
        ...current.filter(
          (item) =>
            !(
              item.courtId === slot.courtId &&
              item.date === date &&
              item.startMinute < bridged.endMinute &&
              bridged.startMinute < item.endMinute
            ),
        ),
        bridged,
      ]);
      setActiveRangeKey(bridged.key);
      setForceNewRange(false);
      setNotice(
        `Extended the court time to ${formatDateId(date)} · ${formatHourRange(bridged.startMinute, bridged.endMinute)}. Tap an adjacent hour to extend it again, or use × to remove it.`,
      );
      return;
    }

    // A pick away from every existing range would be a separate court time,
    // which only "Add court time" may start. Otherwise leave the cart as it
    // is and tell the player how to add one.
    if (cart.length > 0 && !forceNewRange) {
      setBlockedSlot({ slot, date });
      setNotice(
        "That hour is outside your current court time, so it was not added. Extend an existing range with a neighbouring hour, or add it as a separate court time below.",
      );
      return;
    }

    const item = rangeToCartItem([slot], date);
    if (!item) return;

    rememberCart();
    setCart((current) => [...current, item]);
    setActiveRangeKey(item.key);
    setForceNewRange(false);
    setNotice(
      `Added ${formatDateId(date)} · ${formatHourRange(item.startMinute)} as a separate court time. Tap an adjacent hour to extend any range, or use × to remove one.`,
    );
  }

  function showMonth(offset: number) {
    const position = monthPosition + offset;
    if (position < todayPosition) return;

    const year = Math.floor(position / 12);
    const monthIndex = position % 12;
    setVisibleMonth({ year, monthIndex });
  }

  function chooseNextDay() {
    changeDate(addDays(date, 1));
  }

  function goToReview() {
    if (cart.length === 0) return;

    setBookingState(initialBookingState);
    setNotice(null);
    setStep(1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    if (!turnstileToken) {
      setBookingState({
        status: "error",
        message:
          "Complete the security check below the booking terms, then try again.",
        errors: {},
        values: {
          fullName: bookingState.values.fullName,
          phone: bookingState.values.phone,
          email: bookingState.values.email,
        },
      });
      revealTarget(document.getElementById("booking-turnstile"));
      return;
    }

    setPending(true);
    setBookingState(initialBookingState);

    try {
      const formData = new FormData(event.currentTarget);
      formData.set(
        "items",
        JSON.stringify(
          cart.map((item) => ({
            courtId: item.courtId,
            startsAt: item.startsAt,
            durationMinutes: item.durationMinutes,
          })),
        ),
      );
      formData.set("turnstileToken", turnstileToken);
      const result = await createBookingGroup(initialBookingState, formData);

      setBookingState(result);

      if (result.status === "success") {
        setCart([]);
        setHistory([]);
        setActiveRangeKey(null);
        setStep(2);
      } else {
        // The token was redeemed by the failed attempt; load a fresh one.
        setTurnstileToken(null);
        setTurnstileReset((count) => count + 1);
      }
    } catch {
      setTurnstileToken(null);
      setTurnstileReset((count) => count + 1);
      setBookingState({
        status: "error",
        message:
          "The booking request could not be sent. Check your connection and try again.",
        errors: {},
        values: {
          fullName: bookingState.values.fullName,
          phone: bookingState.values.phone,
          email: bookingState.values.email,
        },
      });
    } finally {
      setPending(false);
    }
  }

  function renderHourCell(cell: HourCell) {
    const selected = cell.status === "in-cart";
    const cartItem = selected
      ? cart.find(
          (item) =>
            item.courtId === cell.courtId &&
            item.date === date &&
            item.startMinute <= cell.startMinute &&
            cell.startMinute < item.endMinute,
        )
      : undefined;
    // The most recently edited range is highlighted. Tapping an added hour
    // trims just that hour; × removes the whole range.
    const active = Boolean(cartItem && cartItem.key === activeRangeKey);
    const detail =
      cell.status === "open"
        ? `${cell.courtName ?? "Court"} · ${formatPeso(cell.slot!.amountPhp)} · Tap to add`
        : cell.status === "in-cart"
          ? active
            ? "Current · tap hour to remove"
            : "Added · tap hour to remove"
          : cell.status === "taken"
            ? "Taken"
            : "Past";

    return (
      <button
        key={cell.key}
        type="button"
        disabled={cell.status === "taken" || cell.status === "past"}
        aria-pressed={selected}
        aria-label={`${formatHourRange(cell.startMinute)}, ${cell.courtName ?? "court"}, ${
          cell.status === "open"
            ? "available, tap to add"
            : cell.status === "in-cart"
              ? active
                ? "current range, tap to remove just this hour"
                : "added, tap to remove just this hour; use the remove button to delete the whole range"
              : cell.status
        }`}
        onClick={() => cell.slot && toggleSlot(cell.slot)}
        className={cn(
          "group flex min-h-[3.8rem] flex-col justify-between rounded-xl border px-2.5 py-2 text-left transition-colors duration-200",
          active
            ? "border-brand-blue bg-brand-blue text-white shadow-glow ring-2 ring-brand-blue/25"
            : selected
              ? "border-brand-blue/45 bg-brand-blue-soft text-brand-blue"
              : cell.status === "open"
                ? "border-line bg-surface text-ink hover:-translate-y-0.5 hover:border-brand-blue/60 hover:bg-brand-blue-soft/50 hover:shadow-card"
                : "cursor-not-allowed border-line/70 bg-page/65 text-muted/70",
        )}
      >
        <span className="flex items-start justify-between gap-1">
          <span className="text-[0.72rem] font-bold leading-tight">
            {formatHourRange(cell.startMinute)}
          </span>
          {active ? (
            <CheckIcon className="size-3.5 shrink-0 text-white" />
          ) : selected ? (
            <CheckIcon className="size-3.5 shrink-0 text-brand-blue" />
          ) : null}
        </span>
        <span
          className={cn(
            "mt-1 block truncate text-[0.625rem]",
            active
              ? "text-white/80"
              : selected
                ? "text-brand-blue/80"
                : cell.status === "open"
                  ? "text-muted"
                  : "text-muted/60",
          )}
        >
          {detail}
        </span>
      </button>
    );
  }

  return (
    <div className="min-h-full bg-page">
      <div
        className={cn(
          "mx-auto w-full max-w-7xl px-5",
          embedded
            ? step === 0
              ? "pb-32 pt-3 sm:px-7 lg:pb-8"
              : "pb-8 pt-3 sm:px-7"
            : "pb-32 pt-5 sm:px-8 sm:pt-7 lg:pb-16",
        )}
      >
        {embedded ? null : (
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2.5 rounded-lg"
            aria-label="D-Hidden Pickleball Court & Bistro — home"
          >
            <Logo size={42} priority />
            <span className="hidden leading-none sm:block">
              <span className="block font-display text-sm font-extrabold uppercase tracking-[0.14em] text-heading">
                D-Hidden
              </span>
              <span className="mt-1 block text-[0.5625rem] font-semibold uppercase tracking-[0.18em] text-muted">
                Court reservations
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Link
              href="/lookup"
              className="inline-flex min-h-11 items-center rounded-lg px-2.5 text-sm font-semibold text-ink transition-colors hover:text-accent-ink sm:px-3"
            >
              Check booking
            </Link>
            <Link
              href="/"
              className="hidden min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted transition-colors hover:bg-brand-blue-soft/60 hover:text-heading sm:inline-flex"
            >
              <ArrowLeftIcon className="size-4" />
              Home
            </Link>
          </div>
        </header>
        )}

        {embedded ? null : (
        <div className="mt-6 flex flex-wrap items-start justify-between gap-5 sm:mt-8">
          <div className="max-w-2xl">
            <p className="hidden text-eyebrow font-bold uppercase text-accent-ink sm:block">
              Court reservation
            </p>
            <h1 className="text-title font-bold text-heading sm:mt-2">
              Reserve a court
            </h1>
            <p className="mt-3 hidden max-w-xl text-base leading-relaxed text-muted sm:block">
              Choose a time, check the total, then pay by GCash. No account
              needed.
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 text-caption text-muted shadow-card sm:flex">
            <ShieldIcon className="size-4 text-brand-lime" />
            <span>
              <span className="block font-semibold text-ink">
                Price shown before you commit
              </span>
              Tap start and end · one-hour blocks · staff-verified payment
            </span>
          </div>
        </div>
        )}

        <Stepper
          steps={steps}
          current={step}
          className={embedded ? "mt-2" : "mt-5 sm:mt-8"}
        />

        {notice && !embedded ? (
          <Alert
            variant="info"
            className="mt-5 max-w-2xl"
            eyebrow="Selection"
            title={notice}
            role="status"
          />
        ) : null}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={reduce ? undefined : { opacity: 0, y: 12 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 sm:mt-8"
          >
            {embedded && step === 0 ? null : (
              <div className="mb-4 max-w-2xl sm:mb-6">
                <p className="hidden text-eyebrow font-bold uppercase text-accent-ink sm:block">
                  {activeContent.eyebrow}
                </p>
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  className="mt-1.5 text-heading font-semibold text-heading focus:outline-none"
                >
                  {activeContent.title}
                </h2>
                <p className="mt-2 hidden text-sm leading-relaxed text-muted sm:block">
                  {activeContent.description}
                </p>
              </div>
            )}

            {step === 0 ? (
              <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_19rem]">
                <div
                  className={
                    embedded
                      ? "grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start xl:grid-cols-[22rem_minmax(0,1fr)]"
                      : "min-w-0 space-y-4 sm:space-y-6"
                  }
                >
                  <section
                    aria-labelledby="booking-date"
                    className="min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6"
                  >
                    <SectionLabel
                      eyebrow="Date"
                      title="Pick a day"
                      aside={<Badge variant="lime" dot>Live availability</Badge>}
                    />
                    <div
                      id="booking-date"
                      role="group"
                      aria-label="Choose a date"
                      className="mt-4"
                    >
                      <div
                        className={cn(
                          "-mx-1 flex gap-2 overflow-x-auto px-1 pb-2",
                          embedded && "lg:hidden",
                        )}
                      >
                        {quickDates.map((dateId) => {
                          const selected = dateId === date;
                          const parts = quickDateParts(dateId);

                          return (
                            <button
                              key={dateId}
                              type="button"
                              aria-pressed={selected}
                              aria-label={`${formatDateId(dateId)}${selected ? ", selected" : ""}`}
                              onClick={() => changeDate(dateId)}
                              className={cn(
                                "flex min-w-[4.75rem] shrink-0 flex-col items-center rounded-xl border px-3 py-2.5 text-center transition-colors duration-200",
                                selected
                                  ? "border-brand-navy bg-brand-navy text-white shadow-card"
                                  : "border-line bg-surface text-heading hover:border-brand-blue/40 hover:bg-brand-blue-soft/60",
                              )}
                            >
                              <span
                                className={cn(
                                  "text-[0.625rem] font-bold uppercase tracking-[0.12em]",
                                  selected ? "text-white/60" : "text-muted",
                                )}
                              >
                                {parts.weekday}
                              </span>
                              <span className="mt-0.5 text-sm font-bold">
                                {parts.monthDay}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-caption text-muted">
                          Selected:{" "}
                          <span className="font-semibold text-ink">
                            {selectedDateLabel}
                          </span>
                        </p>
                        <button
                          type="button"
                          aria-expanded={showCalendar}
                          aria-controls="booking-date-calendar"
                          onClick={() => setShowCalendar((value) => !value)}
                          className={cn(
                            "inline-flex min-h-9 items-center text-sm font-semibold text-accent-ink underline-offset-4 hover:underline",
                            embedded && "lg:hidden",
                          )}
                        >
                          {showCalendar ? "Hide calendar" : "More dates"}
                        </button>
                      </div>

                      {showCalendar || embedded ? (
                        <div
                          id="booking-date-calendar"
                          className={cn(
                            "mt-3 max-w-md rounded-xl border border-line bg-page/50 p-3",
                            embedded && !showCalendar && "hidden lg:block",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              aria-label="Previous month"
                              disabled={monthPosition <= todayPosition}
                              onClick={() => showMonth(-1)}
                              className="inline-flex size-11 items-center justify-center rounded-lg border border-line bg-surface text-heading transition-colors duration-200 hover:border-brand-blue/50 hover:bg-brand-blue-soft/60 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ArrowLeftIcon className="size-4" />
                            </button>
                            <p
                              aria-live="polite"
                              className="text-sm font-bold text-heading"
                            >
                              {formatMonth(
                                visibleMonth.year,
                                visibleMonth.monthIndex,
                              )}
                            </p>
                            <button
                              type="button"
                              aria-label="Next month"
                              onClick={() => showMonth(1)}
                              className="inline-flex size-11 items-center justify-center rounded-lg border border-line bg-surface text-heading transition-colors duration-200 hover:border-brand-blue/50 hover:bg-brand-blue-soft/60"
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
                              if (!cell.dateId || cell.dayOfMonth === 0) {
                                return (
                                  <span key={cell.key} aria-hidden="true" />
                                );
                              }

                              const selected = cell.dateId === date;

                              return (
                                <button
                                  key={cell.key}
                                  type="button"
                                  disabled={cell.disabled}
                                  aria-pressed={selected}
                                  aria-label={`${formatDateId(cell.dateId)}${cell.disabled ? ", past" : selected ? ", selected" : ", available"}`}
                                  onClick={() => changeDate(cell.dateId!)}
                                  className={cn(
                                    "flex h-11 items-center justify-center rounded-lg text-sm font-semibold transition-colors duration-200",
                                    selected
                                      ? "bg-brand-navy text-white shadow-card"
                                      : cell.disabled
                                        ? "cursor-not-allowed text-muted/35"
                                        : "text-ink hover:bg-brand-blue-soft/70 hover:text-accent-ink",
                                  )}
                                >
                                  {cell.dayOfMonth}
                                </button>
                              );
                            })}
                          </div>
                          <p className="mt-2 text-caption text-muted">
                            Past dates are unavailable.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section
                    aria-labelledby="booking-time"
                    className="min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6"
                  >
                    <SectionLabel
                      eyebrow="Time"
                      title="Choose your time"
                      aside={
                        availabilityState === "loading" ? (
                          <span className="skeleton h-6 w-28 rounded-full" />
                        ) : (
                          <Badge variant="lime" dot>
                            {visibleSlots.length} open{" "}
                            {visibleSlots.length === 1 ? "slot" : "slots"}
                          </Badge>
                        )
                      }
                    />

                    {embedded ? (
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        Tap an open hour. Tap adjacent hours to extend. Use Add
                        court time for another date or range.
                      </p>
                    ) : null}

                    {embedded ? null : (
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 rounded-xl border border-line bg-page/60 px-3.5 py-2.5 text-caption text-muted">
                        <span>
                          <span className="font-semibold text-ink">Hours</span> 7:00
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
                    )}

                    {courtOptions.length > 1 ? (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div
                          role="group"
                          aria-label="Filter by court"
                          className="inline-flex rounded-xl border border-line bg-page p-1"
                        >
                          {[
                            { value: "all" as const, label: "Both" },
                            ...courtOptions.map((court) => ({
                              value: court.id,
                              label: court.name,
                            })),
                          ].map((option) => {
                            const selected = option.value === courtFilter;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => changeCourt(option.value)}
                                className={cn(
                                  "min-h-9 rounded-lg px-3 text-sm font-semibold transition-colors duration-200",
                                  selected
                                    ? "bg-brand-navy text-white shadow-card"
                                    : "text-heading hover:bg-brand-blue-soft/60",
                                )}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                        <p
                          className={cn(
                            "text-caption text-muted",
                            embedded && "hidden",
                          )}
                        >
                          Filter the grid, or compare both courts.
                        </p>
                      </div>
                    ) : null}

                    {availabilityState === "loading" ? (
                      <SlotSkeleton />
                    ) : availabilityState === "error" ? (
                      <div
                        role="status"
                        className="mt-5 rounded-xl border border-dashed border-line-strong bg-page/50 px-5 py-8 text-center"
                      >
                        <InfoIcon className="mx-auto size-7 text-line-strong" />
                        <p className="mt-3 font-display text-base font-semibold text-heading">
                          Availability is unavailable
                        </p>
                        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                          {availabilityError}
                        </p>
                        <Button
                          type="button"
                          variant="secondary"
                          size="md"
                          className="mt-4"
                          onClick={() => {
                            setAvailabilityState("loading");
                            setAvailabilityError(null);
                            setRefreshKey((value) => value + 1);
                          }}
                        >
                          Try again
                        </Button>
                      </div>
                    ) : slots.length === 0 ? (
                      <div
                        role="status"
                        className="mt-5 rounded-xl border border-dashed border-line-strong bg-page/50 px-5 py-8 text-center"
                      >
                        <ClockIcon className="mx-auto size-8 text-line-strong" />
                        <p className="mt-3 font-display text-base font-semibold text-heading">
                          No open times for this selection
                        </p>
                        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                          Every start time on {selectedDateLabel} is booked,
                          closed, or outside today&apos;s remaining hours.
                        </p>
                        <Button
                          type="button"
                          variant="secondary"
                          size="md"
                          className="mt-4"
                          onClick={chooseNextDay}
                        >
                          Try the next day
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <div
                          className={cn(
                            "grid min-w-0 grid-cols-3 gap-2",
                            !embedded && "sm:grid-cols-4",
                            "xl:grid-cols-4",
                          )}
                        >
                          {hourCells.map(renderHourCell)}
                        </div>
                        <p className="mt-2 text-caption text-muted">
                          Blue is selected. Grey is taken or past. Tap a selected
                          hour to remove it; × removes the range.
                        </p>

                        {notice ? (
                          <p
                            role="status"
                            className="mt-2 text-caption text-muted"
                          >
                            {notice}
                            {history.length > 0 ? (
                              <>
                                {" "}
                                <button
                                  type="button"
                                  onClick={undoLastChange}
                                  className="font-semibold text-accent-ink underline underline-offset-2 transition-colors hover:text-brand-blue"
                                >
                                  Undo
                                </button>
                              </>
                            ) : null}
                          </p>
                        ) : null}

                        {blockedSlot ? (
                          <div
                            ref={blockedNoticeRef}
                            role="status"
                            className="mt-3 scroll-mt-24 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-blue/40 bg-brand-blue-soft/50 px-3.5 py-3"
                          >
                            <p className="text-caption text-ink">
                              {formatHourRange(
                                blockedSlot.slot.startMinute,
                                blockedSlot.slot.startMinute + 60,
                              )}{" "}
                              on {formatDateId(blockedSlot.date)} is not part of
                              your current court time.
                            </p>
                            <Button
                              type="button"
                              variant="secondary"
                              className="shrink-0"
                              onClick={addBlockedSlotSeparately}
                            >
                              Add it as a separate court time
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {embedded ? null : (
                      <p className="mt-5 border-t border-line pt-4 text-caption text-muted">
                        Each block is one hour.
                      </p>
                    )}
                  </section>

                  {cart.length > 0 ? (
                    <section
                      aria-labelledby="booking-cart"
                      className="rounded-xl border border-line bg-surface p-3 lg:hidden"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p
                            id="booking-cart"
                            className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-accent-ink"
                          >
                            Your court times
                          </p>
                          <p className="text-caption text-muted">
                            {cart.length} added
                          </p>
                        </div>
                        <p className="text-sm font-bold text-heading">
                          {formatPeso(cartTotal)}
                        </p>
                      </div>
                      <div className="mt-1 divide-y divide-line">
                        {cart.map((item) => (
                          <div
                            key={item.key}
                            className="flex items-center gap-2 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-heading">
                                {formatDateId(item.date)}
                                {item.key === activeRangeKey ? (
                                  <span className="rounded-full bg-brand-blue-soft px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-[0.08em] text-brand-blue">
                                    Current
                                  </span>
                                ) : null}
                              </p>
                              <p className="truncate text-[0.6875rem] text-muted">
                                {formatHourRange(
                                  item.startMinute,
                                  item.endMinute,
                                )}{" "}
                                · {item.courtName}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs font-semibold text-heading">
                              {formatPeso(item.amountPhp)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeRange(item.key)}
                              aria-label={`Remove ${formatDateId(item.date)} ${formatHourRange(item.startMinute, item.endMinute)}`}
                              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-lg leading-none text-muted transition-colors hover:bg-brand-blue-soft/60 hover:text-accent-ink"
                            >
                              <span aria-hidden="true">×</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>

                <aside className="hidden min-w-0 space-y-4 lg:sticky lg:top-6 lg:block">
                  <BookingSummary
                    court={
                      cart.length === 1
                        ? cart[0].courtName
                        : cart.length > 1
                          ? `${cart.length} court times`
                          : undefined
                    }
                    date={
                      cart.length === 1
                        ? formatDateId(cart[0].date)
                        : cart.length > 1
                          ? `${new Set(cart.map((item) => item.date)).size} dates`
                          : selectedDateLabel
                    }
                    time={
                      cart.length === 1
                        ? formatHourRange(
                            cart[0].startMinute,
                            cart[0].endMinute,
                          )
                        : undefined
                    }
                    duration={
                      cart.length > 0
                        ? `${cart.reduce((total, item) => total + item.durationMinutes, 0) / 60} hours total`
                        : "No court time selected"
                    }
                    priceLabel={cart.length > 0 ? formatPeso(cartTotal) : "—"}
                    priceNote={
                      cart.length > 0
                        ? "One reference and one GCash total cover all court times."
                        : "Tap a time to add it. Use Add court time for another date or range."
                    }
                  >
                    {cart.length > 0 ? (
                      <div className="mb-4 divide-y divide-line border-y border-line">
                        {cart.map((item) => (
                          <div
                            key={item.key}
                            className="flex items-center gap-2 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-heading">
                                {formatDateId(item.date)}
                                {item.key === activeRangeKey ? (
                                  <span className="rounded-full bg-brand-blue-soft px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-[0.08em] text-brand-blue">
                                    Current
                                  </span>
                                ) : null}
                              </p>
                              <p className="truncate text-[0.6875rem] text-muted">
                                {formatHourRange(
                                  item.startMinute,
                                  item.endMinute,
                                )}{" "}
                                · {item.courtName}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs font-semibold text-heading">
                              {formatPeso(item.amountPhp)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeRange(item.key)}
                              aria-label={`Remove ${formatDateId(item.date)} ${formatHourRange(item.startMinute, item.endMinute)}`}
                              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-base leading-none text-muted transition-colors hover:bg-brand-blue-soft/60 hover:text-accent-ink"
                            >
                              <span aria-hidden="true">×</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {cart.length > 0 ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="lg"
                        className="mb-2 w-full"
                        onClick={addAnotherCourtTime}
                      >
                        <PlusIcon className="size-4" />
                        Add court time
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="lg"
                      className="w-full"
                      onClick={goToReview}
                      disabled={cart.length === 0}
                    >
                      Review booking
                      <ArrowRightIcon className="size-4" />
                    </Button>
                    <p
                      className="mt-2 text-center text-caption text-muted"
                      aria-live="polite"
                    >
                      {cart.length > 0
                        ? "No slot is held until you submit."
                        : "Tap a time to add it."}
                    </p>
                  </BookingSummary>

                  {embedded ? null : (
                    <PolicyNotice
                      items={[
                        "Open daily, 7:00 AM – 12:00 AM.",
                        "Cancel at least 24 hours before court time. Contact the club for changes.",
                        "Your slot is held for 15 minutes after you submit.",
                        "Only one unpaid hold is allowed at a time.",
                      ]}
                      note="The GCash QR is shown after booking. Staff verify the actual transfer."
                    />
                  )}
                </aside>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                <div className="min-w-0 space-y-6">
                      {bookingState.status === "error" &&
                      bookingState.message ? (
                        <Alert
                          id="booking-error"
                          tabIndex={-1}
                          variant="error"
                          eyebrow="Booking not created"
                          title={bookingState.message}
                          role="alert"
                          className="focus:outline-none"
                        >
                          {bookingState.code === "slot-taken" ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="md"
                              className="mt-3"
                              onClick={() => {
                                setStep(0);
                                setAvailabilityState("loading");
                                setAvailabilityError(null);
                                setRefreshKey((value) => value + 1);
                              }}
                            >
                              Choose another time
                            </Button>
                          ) : null}
                          {bookingState.code === "active-hold" ? (
                            <Link
                              href="/lookup"
                              className="mt-3 inline-flex min-h-10 items-center font-semibold text-accent-ink underline decoration-brand-blue/40 underline-offset-2 hover:text-brand-blue-strong"
                            >
                              Check my current booking
                            </Link>
                          ) : null}
                          {bookingState.errors.form ? (
                            <p className="mt-2">{bookingState.errors.form}</p>
                          ) : null}
                        </Alert>
                      ) : null}

                      <form
                        ref={formRef}
                        id="booking-form"
                        onSubmit={handleSubmit}
                        noValidate
                        className="space-y-6"
                      >
                        <section
                          aria-labelledby="review-ranges"
                          className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-eyebrow font-bold uppercase text-accent-ink">
                                Your reservation
                              </p>
                              <h3
                                id="review-ranges"
                                className="mt-1.5 text-heading font-semibold text-heading"
                              >
                                {cart.length}{" "}
                                {cart.length === 1 ? "court time" : "court times"}
                              </h3>
                            </div>
                            <p className="font-display text-2xl font-bold text-heading">
                              {formatPeso(cartTotal)}
                            </p>
                          </div>
                          <div className="mt-4 space-y-2">
                            {cart.map((item) => (
                              <div
                                key={item.key}
                                className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-line bg-page/50 p-3.5"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-heading">
                                    {formatDateId(item.date)}
                                  </p>
                                  <p className="mt-0.5 text-sm text-muted">
                                    {formatHourRange(
                                      item.startMinute,
                                      item.endMinute,
                                    )}{" "}
                                    · {item.courtName}
                                  </p>
                                </div>
                                <span className="text-sm font-semibold text-heading">
                                  {formatPeso(item.amountPhp)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <p className="mt-3 text-caption text-muted">
                            One reference and one GCash total cover all court
                            times.
                          </p>
                        </section>

                        <section
                          aria-labelledby="booking-details"
                          className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-eyebrow font-bold uppercase text-accent-ink">
                                Your details
                              </p>
                              <h3
                                id="booking-details"
                                className="mt-1.5 text-heading font-semibold text-heading"
                              >
                                Who is playing?
                              </h3>
                            </div>
                            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-brand-blue-soft text-accent-ink">
                              <ShieldIcon className="size-5" />
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-muted">
                            No account needed. We use this to identify your
                            booking.
                          </p>

                          <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <Field
                              id="booking-name"
                              label="Full name"
                              required
                              error={bookingState.errors.fullName}
                            >
                              <Input
                                id="booking-name"
                                name="fullName"
                                autoComplete="name"
                                required
                                maxLength={100}
                                defaultValue={bookingState.values.fullName}
                                invalid={Boolean(bookingState.errors.fullName)}
                                aria-describedby={
                                  bookingState.errors.fullName
                                    ? "booking-name-error"
                                    : undefined
                                }
                              />
                            </Field>

                            <Field
                              id="booking-email"
                              label="Email address"
                              optionalLabel
                              hint="Optional. We only email booking updates and reminders."
                              error={bookingState.errors.email}
                            >
                              <Input
                                id="booking-email"
                                name="email"
                                type="email"
                                inputMode="email"
                                autoComplete="email"
                                maxLength={254}
                                defaultValue={bookingState.values.email}
                                invalid={Boolean(bookingState.errors.email)}
                                aria-describedby={
                                  bookingState.errors.email
                                    ? "booking-email-error"
                                    : "booking-email-hint"
                                }
                              />
                            </Field>

                            <Field
                              id="booking-phone"
                              label="Mobile number"
                              required
                              className="sm:col-span-2"
                              hint="Used with your reference to check the booking."
                              error={bookingState.errors.phone}
                            >
                              <PhoneInput
                                id="booking-phone"
                                name="phone"
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                required
                                maxLength={30}
                                placeholder="917 123 4567"
                                defaultValue={bookingState.values.phone}
                                invalid={Boolean(bookingState.errors.phone)}
                                aria-describedby={
                                  bookingState.errors.phone
                                    ? "booking-phone-error"
                                    : "booking-phone-hint"
                                }
                              />
                            </Field>
                          </div>


                        </section>

                        <PolicyNotice
                          items={[
                            "Cancel at least 24 hours before court time for a refund or one free move.",
                            "Inside 24 hours, court fees are not refunded.",
                          ]}
                          note="Contact the club for changes. Upload payment proof within the 15-minute hold."
                        />

                        <div>
                          <label
                            className={cn(
                              "group flex cursor-pointer items-start gap-3 rounded-xl border bg-surface p-4 text-sm text-ink transition-colors duration-200",
                              bookingState.errors.terms
                                ? "border-danger bg-danger-soft/40"
                                : "border-line hover:border-line-strong",
                            )}
                          >
                            <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
                              <input
                                type="checkbox"
                                name="terms"
                                aria-invalid={
                                  Boolean(bookingState.errors.terms) || undefined
                                }
                                aria-describedby={
                                  bookingState.errors.terms
                                    ? "booking-terms-error"
                                    : undefined
                                }
                                className="peer size-5 appearance-none rounded-md border border-line-strong bg-surface transition-colors checked:border-brand-blue checked:bg-brand-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                              />
                              <CheckIcon className="pointer-events-none absolute size-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                            </span>
                            <span>
                              I agree to the{" "}
                              <Link
                                href="/policies/booking"
                                className="font-semibold text-accent-ink underline decoration-brand-blue/40 underline-offset-2 hover:text-brand-blue-strong"
                              >
                                booking
                              </Link>
                              ,{" "}
                              <Link
                                href="/policies/booking#cancellation-and-rescheduling"
                                className="font-semibold text-accent-ink underline decoration-brand-blue/40 underline-offset-2 hover:text-brand-blue-strong"
                              >
                                cancellation
                              </Link>
                              , and{" "}
                              <Link
                                href="/policies/payments"
                                className="font-semibold text-accent-ink underline decoration-brand-blue/40 underline-offset-2 hover:text-brand-blue-strong"
                              >
                                payment
                              </Link>{" "}
                              terms. The slot is held for 15 minutes.
                            </span>
                          </label>
                          {bookingState.errors.terms ? (
                            <p
                              id="booking-terms-error"
                              className="mt-2 text-sm font-medium text-danger"
                            >
                              {bookingState.errors.terms}
                            </p>
                          ) : null}
                        </div>

                        <div
                          id="booking-turnstile"
                          className="scroll-mt-24 rounded-xl border border-line bg-page/40 p-3"
                        >
                          <p className="mb-2 text-caption font-semibold text-muted">
                            Quick security check — keeps fake bookings out.
                          </p>
                          <TurnstileWidget
                            action="booking"
                            onToken={setTurnstileToken}
                            resetSignal={turnstileReset}
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
                          <Link
                            href="/policies/booking"
                            className="text-sm font-semibold text-accent-ink underline decoration-brand-blue/40 underline-offset-2 hover:text-brand-blue-strong"
                          >
                            Read the booking policy
                          </Link>
                          <Button
                            type="submit"
                            size="lg"
                            className="w-full sm:w-auto lg:hidden"
                            loading={pending}
                            disabled={!canSubmit}
                          >
                            {pending
                              ? "Holding your court times…"
                              : `Hold ${cart.length} ${cart.length === 1 ? "court time" : "court times"}`}
                          </Button>
                        </div>
                      </form>

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setStep(0)}
                      >
                        <ArrowLeftIcon className="size-4" />
                        Back to time selection
                      </Button>
                </div>

                <aside className="hidden min-w-0 space-y-4 lg:sticky lg:top-6 lg:block">
                  <BookingSummary
                    court={
                      cart.length === 1
                        ? cart[0].courtName
                        : `${cart.length} court times`
                    }
                    date={
                      cart.length === 1
                        ? formatDateId(cart[0].date)
                        : `${new Set(cart.map((item) => item.date)).size} dates`
                    }
                    time={
                      cart.length === 1
                        ? formatHourRange(
                            cart[0].startMinute,
                            cart[0].endMinute,
                          )
                        : undefined
                    }
                    duration={`${cart.reduce((total, item) => total + item.durationMinutes, 0) / 60} hours total`}
                    priceLabel={formatPeso(cartTotal)}
                    priceNote="The final total is checked when the booking is created."
                  >
                    <Button
                      type="submit"
                      form="booking-form"
                      variant="navy"
                      size="lg"
                      className="hidden w-full lg:inline-flex"
                      loading={pending}
                      disabled={!canSubmit}
                    >
                      {pending
                        ? "Holding your court times…"
                        : `Hold ${cart.length} ${cart.length === 1 ? "court time" : "court times"}`}
                      <ArrowRightIcon className="size-4" />
                    </Button>
                    <p className="mt-2 text-center text-caption text-muted">
                      No payment is taken on this page.
                    </p>
                  </BookingSummary>
                  <p className="px-1 text-caption leading-relaxed text-muted">
                    No court time is held until the reservation request is created.
                  </p>
                </aside>
              </div>
            ) : null}

            {step === 2 && group ? (
              <BookingGroupConfirmation
                group={group}
                onProofSubmitted={handleGroupProofSubmitted}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {step === 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-raised backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                {cart.length > 0
                  ? `${formatPeso(cartTotal)} · ${cart.length} ${cart.length === 1 ? "court time" : "court times"}`
                  : "Your total"}
              </p>
              <p className="truncate text-sm font-semibold text-heading">
                {cart.length > 0
                  ? `${new Set(cart.map((item) => item.date)).size} ${new Set(cart.map((item) => item.date)).size === 1 ? "date" : "dates"} selected`
                  : "Tap a time to add court time"}
              </p>
            </div>
            {cart.length > 0 ? (
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="shrink-0 px-3"
                onClick={addAnotherCourtTime}
                aria-label="Add another court date or time"
              >
                <PlusIcon className="size-4" />
                Add time
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={goToReview}
              disabled={cart.length === 0}
            >
              Review
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
