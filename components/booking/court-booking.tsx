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
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  createBookingGroup,
  getCourtAvailability,
  type BookingFormState,
} from "@/app/book/actions";
import { BookingGroupConfirmation } from "@/components/booking/booking-group-confirmation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { BookingSummary } from "@/components/ui/booking-summary";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
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
  ShieldIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  formatMinuteLabel,
  formatPeso,
  type AvailabilitySlot,
} from "@/lib/bookings";

const steps = [
  { label: "Choose time" },
  { label: "Review" },
  { label: "Confirm" },
] as const;

const stepContent = [
  {
    eyebrow: "Step 1 · Availability",
    title: "Choose your court time",
    description:
      "Pick a date, tap a start time, then tap the hour you want to end. Tap again to adjust before adding it.",
  },
  {
    eyebrow: "Step 2 · Review",
    title: "Check your details",
    description:
      "Confirm the contact details on your account and accept the booking terms. The slot is not held until you submit.",
  },
  {
    eyebrow: "Step 3 · Booking created",
    title: "Your slot is on hold",
    description:
      "Keep the reference. The 15-minute hold starts when the request is created, and staff verify payment separately.",
  },
] as const;

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
  },
};

type Viewer = {
  email: string;
  fullName: string;
  phone: string;
  verified: boolean;
  profileError: boolean;
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
  viewer,
  courts,
  today,
  embedded = false,
}: {
  viewer: Viewer | null;
  courts: CourtOption[];
  today: string;
  embedded?: boolean;
}) {
  const router = useRouter();
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
  const [selectedHours, setSelectedHours] = useState(1);
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
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(
    null,
  );
  const [cart, setCart] = useState<CartRange[]>([]);
  const [step, setStep] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [nowMinute, setNowMinute] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [bookingState, setBookingState] =
    useState<BookingFormState>(initialBookingState);
  const [pending, setPending] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
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
            const range = rangeForSlot(match, result.slots);
            const hours = Math.min(initialHours, range.length);
            setSelectedSlot(match);
            setSelectedHours(hours);
            if (viewer) setStep(1);
            else setNotice("Your selection is ready. Sign in to finish the booking.");
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
  }, [date, initialHours, refreshKey, requestedCourt, requestedStart, viewer]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    const timer = window.setTimeout(() => headingRef.current?.focus(), 360);
    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    const tick = () => setNowMinute(manilaMinuteNow());
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (searchParams.get("resume") !== "cart") return;

    try {
      const raw = sessionStorage.getItem("dhidden-booking-cart");
      if (!raw) return;
      const parsed = JSON.parse(raw) as CartRange[];
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter(
        (item) =>
          typeof item?.courtId === "string" &&
          typeof item?.startsAt === "string" &&
          typeof item?.endsAt === "string" &&
          typeof item?.amountPhp === "number",
      );
      if (valid.length > 0) {
        const timer = window.setTimeout(() => {
          setCart(valid);
          setStep(1);
          sessionStorage.removeItem("dhidden-booking-cart");
        }, 0);
        return () => window.clearTimeout(timer);
      }
    } catch {
      // Ignore a stale or malformed saved cart.
    }
  }, [searchParams]);

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

  const selectedRange = selectedSlot
    ? rangeForSlot(selectedSlot, slotsForPicker)
    : [];
  const hasSelectedRange = Boolean(selectedSlot && selectedRange.length > 0);
  const effectiveHours = hasSelectedRange
    ? Math.max(1, Math.min(selectedHours, selectedRange.length))
    : 0;
  const selectedDuration = effectiveHours * 60;
  const selectedEndMinute = hasSelectedRange
    ? selectedSlot!.startMinute + selectedDuration
    : null;
  const selectedAmount = hasSelectedRange
    ? rangeAmount(selectedRange, effectiveHours)
    : 0;
  const priceLabel = hasSelectedRange ? formatPeso(selectedAmount) : "—";
  const durationLabel = hasSelectedRange
    ? `${effectiveHours} ${effectiveHours === 1 ? "hour" : "hours"}`
    : "Choose a start time";
  const activeContent = stepContent[step];
  const group = bookingState.group;
  const cartTotal = cart.reduce((total, item) => total + item.amountPhp, 0);
  const canSubmit =
    Boolean(viewer) &&
    Boolean(viewer?.verified) &&
    !viewer?.profileError &&
    cart.length > 0 &&
    !pending;

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

  function addRange(hours: number) {
    if (!selectedSlot) return;

    const range = rangeForSlot(selectedSlot, slotsForPicker).slice(0, hours);
    if (range.length === 0) return;

    const last = range[range.length - 1];
    const item: CartRange = {
      key: `${date}-${selectedSlot.courtId}-${selectedSlot.startsAt}`,
      courtId: selectedSlot.courtId,
      courtName: selectedSlot.courtName,
      date,
      startsAt: selectedSlot.startsAt,
      endsAt: last.endsAt,
      startMinute: selectedSlot.startMinute,
      endMinute: last.startMinute + 60,
      durationMinutes: range.length * 60,
      amountPhp: rangeAmount(range, range.length),
    };

    setCart((current) => {
      const overlaps = current.some(
        (existing) =>
          existing.courtId === item.courtId &&
          existing.date === item.date &&
          existing.startMinute < item.endMinute &&
          item.startMinute < existing.endMinute,
      );
      return overlaps ? current : [...current, item];
    });
    setSelectedSlot(null);
    setSelectedHours(1);
    setNotice(
      `Added ${formatDateId(date)} · ${formatHourRange(item.startMinute)}. Pick another date or time.`,
    );
  }

  function removeRange(key: string) {
    setCart((current) => current.filter((item) => item.key !== key));
  }

  function changeDate(nextDate: string) {
    setDate(nextDate);
    const parts = parseDateId(nextDate);
    if (parts) {
      setVisibleMonth({ year: parts.year, monthIndex: parts.monthIndex });
    }
    setSelectedSlot(null);
    setAvailabilityState("loading");
    setAvailabilityError(null);
    clearBookingFeedback();
    setStep(0);
  }

  function changeCourt(nextCourt: "all" | string) {
    setCourtFilter(nextCourt);
    if (
      selectedSlot &&
      nextCourt !== "all" &&
      selectedSlot.courtId !== nextCourt
    ) {
      setSelectedSlot(null);
    }
    clearBookingFeedback();
  }

  function chooseSlot(slot: AvailabilitySlot) {
    setBookingState(initialBookingState);
    setNotice(null);

    if (!selectedSlot || selectedSlot.courtId !== slot.courtId) {
      setSelectedSlot(slot);
      setSelectedHours(1);
      return;
    }

    const courtSlots = slotsForPicker
      .filter((candidate) => candidate.courtId === slot.courtId)
      .sort((a, b) => a.startMinute - b.startMinute);
    const anchorIndex = courtSlots.findIndex(
      (candidate) => candidate.startsAt === selectedSlot.startsAt,
    );
    const targetIndex = courtSlots.findIndex(
      (candidate) => candidate.startsAt === slot.startsAt,
    );

    if (anchorIndex === -1 || targetIndex === -1) {
      setSelectedSlot(slot);
      setSelectedHours(1);
      return;
    }

    const startIndex = Math.min(anchorIndex, targetIndex);
    const endIndex = Math.max(anchorIndex, targetIndex);
    const contiguous = courtSlots
      .slice(startIndex, endIndex + 1)
      .every(
        (candidate, index, range) =>
          index === 0 ||
          candidate.startMinute === range[index - 1].startMinute + 60,
      );

    if (!contiguous) {
      setSelectedSlot(slot);
      setSelectedHours(1);
      return;
    }

    setSelectedSlot(courtSlots[startIndex]);
    setSelectedHours(endIndex - startIndex + 1);
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

    if (!viewer) {
      try {
        sessionStorage.setItem("dhidden-booking-cart", JSON.stringify(cart));
      } catch {
        // The cart still survives on this page if storage is unavailable.
      }
      const returnPath =
        window.location.pathname === "/book"
          ? "/"
          : window.location.pathname;
      router.push(
        `/sign-in?next=${encodeURIComponent(`${returnPath}?booking=1&resume=cart`)}`,
      );
      return;
    }

    setBookingState(initialBookingState);
    setNotice(null);
    setStep(1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

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
      const result = await createBookingGroup(initialBookingState, formData);

      if (result.code === "session-expired" && result.next) {
        router.push(
          `/sign-in?next=${encodeURIComponent(result.next)}&notice=session-expired`,
        );
        return;
      }

      setBookingState(result);

      if (result.status === "success") {
        setCart([]);
        setStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setBookingState({
        status: "error",
        message:
          "The booking request could not be sent. Check your connection and try again.",
        errors: {},
        values: {
          fullName: viewer?.fullName ?? "",
          phone: viewer?.phone ?? "",
        },
      });
    } finally {
      setPending(false);
    }
  }

  function renderHourCell(cell: HourCell) {
    const selected = Boolean(
      cell.slot &&
        selectedRange
          .slice(0, effectiveHours)
          .some((slot) => slot.startsAt === cell.slot!.startsAt),
    );
    const detail =
      cell.status === "open"
        ? `${cell.courtName ?? "Court"} · ${formatPeso(cell.slot!.amountPhp)}`
        : cell.status === "in-cart"
          ? `${cell.courtName ?? "Court"} · Added`
          : cell.status === "taken"
            ? "Taken"
            : "Past";

    return (
      <button
        key={cell.key}
        type="button"
        disabled={cell.status !== "open"}
        aria-pressed={selected}
        aria-label={`${formatHourRange(cell.startMinute)}, ${cell.courtName ?? "court"}, ${cell.status === "open" ? "available" : cell.status === "in-cart" ? "already added" : cell.status}${selected ? ", selected" : ""}`}
        onClick={() => cell.slot && chooseSlot(cell.slot)}
        className={cn(
          "group flex min-h-[3.8rem] flex-col justify-between rounded-xl border px-2.5 py-2 text-left transition-colors duration-200",
          selected
            ? "border-brand-blue bg-brand-blue text-white shadow-glow"
            : cell.status === "open"
              ? "border-line bg-surface text-ink hover:-translate-y-0.5 hover:border-brand-blue/60 hover:bg-brand-blue-soft/50 hover:shadow-card"
              : "cursor-not-allowed border-line/70 bg-page/65 text-muted/70",
        )}
      >
        <span className="flex items-start justify-between gap-1">
          <span className="text-[0.72rem] font-bold leading-tight">
            {formatHourRange(cell.startMinute)}
          </span>
          {selected ? (
            <CheckIcon className="size-3.5 shrink-0 text-white" />
          ) : null}
        </span>
        <span
          className={cn(
            "mt-1 block truncate text-[0.625rem]",
            selected ? "text-white/80" : cell.status === "open" ? "text-muted" : "text-muted/60",
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
            ? "pb-8 pt-3 sm:px-7"
            : "pb-28 pt-5 sm:px-8 sm:pt-7 lg:pb-16",
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
              href={viewer ? "/account" : "/sign-in?next=/book"}
              className="inline-flex min-h-11 items-center rounded-lg px-2.5 text-sm font-semibold text-ink transition-colors hover:text-accent-ink sm:px-3"
            >
              {viewer ? "My account" : "Sign in"}
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
        <div className="mt-8 flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-eyebrow font-bold uppercase text-accent-ink">
              Court reservation
            </p>
            <h1 className="mt-2 text-title font-bold text-heading">
              Reserve a court
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
              Live times and prices, a 15-minute hold after you confirm, and a
              clear payment status in your account.
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
          className={embedded ? "mt-2" : "mt-8"}
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
            className="mt-8"
          >
            {embedded && step === 0 ? null : (
              <div className="mb-6 max-w-2xl">
                <p className="text-eyebrow font-bold uppercase text-accent-ink">
                  {activeContent.eyebrow}
                </p>
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  className="mt-1.5 text-heading font-semibold text-heading focus:outline-none"
                >
                  {activeContent.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {activeContent.description}
                </p>
              </div>
            )}

            {step === 0 ? (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_19rem]">
                <div
                  className={
                    embedded
                      ? "grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start xl:grid-cols-[22rem_minmax(0,1fr)]"
                      : "min-w-0 space-y-6"
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
                            Past dates are disabled. The maximum advance booking
                            window is not yet confirmed, so later months remain
                            open.
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
                        Tap a start time, then tap an end time. The hours between
                        fill in automatically. Grey times are already taken.
                      </p>
                    ) : null}

                    {embedded ? null : (
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-line bg-page/60 px-4 py-3 text-caption text-muted">
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
                          Each block is one hour. Grey times are taken or
                          already past.
                        </p>

                        {hasSelectedRange &&
                        selectedSlot &&
                        selectedEndMinute ? (
                          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-brand-blue/40 bg-brand-blue-soft/40 p-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-heading">
                                {formatHourRange(
                                  selectedSlot.startMinute,
                                  selectedEndMinute,
                                )}
                              </p>
                              <p className="truncate text-caption text-muted">
                                {selectedSlot.courtName} · {durationLabel} ·{" "}
                                <span className="font-semibold text-ink">
                                  {priceLabel}
                                </span>
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedSlot(null)}
                                className="min-h-9 rounded-lg px-2 text-sm font-semibold text-muted transition-colors hover:bg-surface hover:text-heading"
                              >
                                Clear
                              </button>
                              <Button
                                type="button"
                                size="md"
                                onClick={() => addRange(effectiveHours)}
                              >
                                Add court time
                              </Button>
                            </div>
                          </div>
                        ) : null}

                        {notice ? (
                          <p
                            role="status"
                            className="mt-2 text-caption text-muted"
                          >
                            {notice}
                          </p>
                        ) : null}
                      </div>
                    )}

                    {embedded ? null : (
                      <p className="mt-5 border-t border-line pt-4 text-caption leading-relaxed text-muted">
                        Each block is one hour. Weekend rates, partial-hour
                        rounding, holiday closures, and the maximum booking window
                        are not yet confirmed.
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
                              <p className="truncate text-xs font-semibold text-heading">
                                {formatDateId(item.date)}
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
                        ? "One reference and one GCash total cover every court time in this reservation."
                        : "Tap a start, then an end. Add another date or review."
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
                              <p className="truncate text-xs font-semibold text-heading">
                                {formatDateId(item.date)}
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
                        ? viewer
                          ? "No slot is held until you submit the review."
                          : "Sign-in is required after you build your reservation."
                        : hasSelectedRange
                          ? "Add this court time, or tap another hour to extend it."
                          : "Tap a start time to begin."}
                    </p>
                  </BookingSummary>

                  {embedded ? null : (
                    <PolicyNotice
                      items={[
                        "Open daily 7:00 AM – 12:00 AM. Holiday and maintenance closures are not yet published.",
                        "Cancellation cutoff: 24 hours before court time. Self-service changes are not available.",
                        "After you confirm, the slot is held for 15 minutes while payment is arranged.",
                      ]}
                      note="A test GCash QR is shown after booking. The club's official QR and receiving account name are still pending; payment is verified by staff."
                    />
                  )}
                </aside>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                <div className="min-w-0 space-y-6">
                  {!viewer ? (
                    <Alert
                      variant="warning"
                      eyebrow="Sign in required"
                      title="Sign in to finish this booking"
                    >
                      <p>
                        Availability and prices are shown first. Sign in to use
                        the name, email, and mobile number on your account.
                      </p>
                      <Button
                        type="button"
                        className="mt-3"
                        onClick={goToReview}
                      >
                        Sign in
                      </Button>
                    </Alert>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-eyebrow font-bold uppercase text-accent-ink">
                            Account
                          </p>
                          <p className="mt-1 text-sm font-semibold break-all text-heading">
                            {viewer.email}
                          </p>
                        </div>
                        <Badge
                          variant={viewer.verified ? "success" : "warning"}
                          dot
                        >
                          {viewer.verified ? "Email verified" : "Email unverified"}
                        </Badge>
                      </div>

                      {!viewer.verified ? (
                        <Alert
                          variant="warning"
                          eyebrow="Verify your email"
                          title="Confirm your email before holding a court"
                        >
                          Check your inbox for the confirmation link. If you need
                          a new link, contact the club.
                        </Alert>
                      ) : null}

                      {viewer.profileError ? (
                        <Alert
                          variant="warning"
                          eyebrow="Profile not loaded"
                          title="Your account details could not be read"
                        >
                          Refresh the page and try again. If it keeps failing,
                          contact the club before booking.
                        </Alert>
                      ) : null}

                      {bookingState.status === "error" &&
                      bookingState.message ? (
                        <Alert
                          variant="error"
                          eyebrow="Booking not created"
                          title={bookingState.message}
                          role="alert"
                        >
                          {bookingState.code === "slot-taken" ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="md"
                              className="mt-3"
                              onClick={() => {
                                setStep(0);
                                setSelectedSlot(null);
                                setAvailabilityState("loading");
                                setAvailabilityError(null);
                                setRefreshKey((value) => value + 1);
                              }}
                            >
                              Choose another time
                            </Button>
                          ) : null}
                          {bookingState.errors.form ? (
                            <p className="mt-2">{bookingState.errors.form}</p>
                          ) : null}
                        </Alert>
                      ) : null}

                      <form
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
                            All court times are held together for 15 minutes and
                            share one reference and one GCash total.
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
                            The name and mobile number below are saved to your
                            account when the booking is created.
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
                                defaultValue={
                                  bookingState.status === "idle"
                                    ? viewer.fullName
                                    : bookingState.values.fullName
                                }
                                invalid={Boolean(bookingState.errors.fullName)}
                                aria-describedby={
                                  bookingState.errors.fullName
                                    ? "booking-name-error"
                                    : undefined
                                }
                              />
                            </Field>

                            <div className="rounded-lg border border-line bg-page/60 px-3.5 py-3">
                              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
                                Email address
                              </p>
                              <p className="mt-1 break-all text-sm font-semibold text-heading">
                                {viewer.email}
                              </p>
                              <p className="mt-1 text-caption text-muted">
                                The booking is tied to this account.
                              </p>
                            </div>

                            <Field
                              id="booking-phone"
                              label="Mobile number"
                              required
                              className="sm:col-span-2"
                              hint="Used by the club on the day of your booking."
                              error={bookingState.errors.phone}
                            >
                              <Input
                                id="booking-phone"
                                name="phone"
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                required
                                maxLength={30}
                                defaultValue={
                                  bookingState.status === "idle"
                                    ? viewer.phone
                                    : bookingState.values.phone
                                }
                                invalid={Boolean(bookingState.errors.phone)}
                                aria-describedby={
                                  bookingState.errors.phone
                                    ? "booking-phone-error"
                                    : "booking-phone-hint"
                                }
                              />
                            </Field>
                          </div>

                          <p className="mt-4 rounded-xl border border-line bg-page/60 px-4 py-3 text-caption leading-relaxed text-muted">
                            Group bookings are allowed. Only your name is
                            required. The maximum number of players per court is
                            not yet confirmed.
                          </p>
                        </section>

                        <PolicyNotice
                          items={[
                            "Cancel at least 24 hours before court time for a full GCash refund or one free move to another slot.",
                            "Inside 24 hours the court fee is not refunded. No-shows and late arrivals are not refunded.",
                          ]}
                          note="Self-service changes are not available; contact the club. Payment proof is due within the 15-minute hold. The full booking policy is linked below."
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
                              I agree to the booking, cancellation, and payment
                              terms, and I understand that the slot is only held
                              for 15 minutes.
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
                    </>
                  )}
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
                    priceNote="The amount is recalculated by the club's rate table when the reservation is created."
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
                  : hasSelectedRange
                    ? `${selectedDateLabel} · tap another hour to extend`
                    : "Choose a start time"}
              </p>
            </div>
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
