/** Staff date helpers. The club operates on Asia/Manila (UTC+8, no DST). */
export const MANILA_TIME_ZONE = "Asia/Manila";
export const MANILA_OFFSET = "+08:00";

const DATE_ID = /^\d{4}-\d{2}-\d{2}$/;
const TIME_VALUE = /^\d{2}:\d{2}$/;

export function manilaTodayId(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
}

export function isValidDateId(value: string | undefined | null) {
  return Boolean(value && DATE_ID.test(value));
}

export function shiftDateId(dateId: string, days: number) {
  const base = new Date(`${dateId}T12:00:00${MANILA_OFFSET}`);
  if (Number.isNaN(base.getTime())) return dateId;

  base.setUTCDate(base.getUTCDate() + days);
  return manilaTodayId(base);
}

export function manilaDateRange(dateId: string) {
  const safeDateId = isValidDateId(dateId) ? dateId : manilaTodayId();
  const start = new Date(`${safeDateId}T00:00:00${MANILA_OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return {
    dateId: safeDateId,
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * Converts a date and time entered by staff into a real instant. If the end
 * time is earlier than the start time, the caller can pass `nextDay`.
 */
export function manilaLocalToIso(dateId: string, time: string, nextDay = false) {
  if (!isValidDateId(dateId) || !TIME_VALUE.test(time)) return null;

  const date = new Date(
    `${dateId}T${time}:00${MANILA_OFFSET}`,
  );

  if (Number.isNaN(date.getTime())) return null;
  if (nextDay) date.setUTCDate(date.getUTCDate() + 1);

  return date.toISOString();
}

export function formatStaffDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = {},
) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: MANILA_TIME_ZONE,
    ...options,
  }).format(date);
}

export function formatStaffDateId(dateId: string) {
  const date = new Date(`${dateId}T12:00:00${MANILA_OFFSET}`);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: MANILA_TIME_ZONE,
  }).format(date);
}

export function formatStaffTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";

  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: MANILA_TIME_ZONE,
  }).format(date);
}

export function formatStaffDateTime(value: string | Date | null | undefined) {
  if (!value) return "Not available";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return `${formatStaffDate(date)} · ${formatStaffTime(date)}`;
}

export function formatStaffTimeRange(startsAt: string, endsAt: string) {
  return `${formatStaffTime(startsAt)} – ${formatStaffTime(endsAt)}`;
}

export function manilaTimeValue(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: MANILA_TIME_ZONE,
  }).format(date);
}

export function manilaDateValue(value: string | Date) {
  return manilaTodayId(value instanceof Date ? value : new Date(value));
}

export function relativeHoldLabel(value: string | null) {
  if (!value) return "No hold";
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return "No hold";

  const minutes = Math.round((target - Date.now()) / 60000);
  if (minutes <= 0) return "Expired";
  if (minutes < 60) return `${minutes} min left`;

  const hours = Math.floor(minutes / 60);
  return `${hours} hr${hours === 1 ? "" : "s"} left`;
}
