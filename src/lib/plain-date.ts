/**
 * A calendar date with no time and no zone, as an ISO string: "2026-10-18".
 *
 * Bookings are made against the venue's calendar, so the date is a plain
 * value and only becomes an instant when a zone is applied (see time-zone.ts).
 */
export type PlainDate = `${number}-${number}-${number}`;

export interface PlainDateParts {
  year: number;
  month: number; // 1–12
  day: number;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isPlainDate(value: string): value is PlainDate {
  return ISO_DATE.test(value);
}

export function parsePlainDate(date: PlainDate): PlainDateParts {
  const match = ISO_DATE.exec(date);
  if (!match) throw new RangeError(`Not a plain date: ${date}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function toPlainDate({ year, month, day }: PlainDateParts): PlainDate {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}` as PlainDate;
}

/** The date `days` after `date` (negative steps back). Calendar arithmetic, no zone. */
export function addDays(date: PlainDate, days: number): PlainDate {
  const { year, month, day } = parsePlainDate(date);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return toPlainDate({
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  });
}

export function compareDates(a: PlainDate, b: PlainDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Days in a month (1–12) of a year: 28–31. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Add calendar months and clamp the day, so 31 Jan plus one month is 28 or
 * 29 Feb, never 3 Mar. Negative steps back.
 */
export function addMonths(date: PlainDate, months: number): PlainDate {
  const { year, month, day } = parsePlainDate(date);
  const total = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (((total % 12) + 12) % 12) + 1;
  return toPlainDate({ year: nextYear, month: nextMonth, day: Math.min(day, daysInMonth(nextYear, nextMonth)) });
}

/** `date`, held inside [min, max] when either is given. */
export function clampDate(date: PlainDate, min?: PlainDate | null, max?: PlainDate | null): PlainDate {
  if (min && compareDates(date, min) < 0) return min;
  if (max && compareDates(date, max) > 0) return max;
  return date;
}

/** The first of the month `date` is in. */
export function startOfMonth(date: PlainDate): PlainDate {
  const { year, month } = parsePlainDate(date);
  return toPlainDate({ year, month, day: 1 });
}

/** The last day of the month `date` is in. */
export function endOfMonth(date: PlainDate): PlainDate {
  const { year, month } = parsePlainDate(date);
  return toPlainDate({ year, month, day: daysInMonth(year, month) });
}

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

const WEEKDAYS: readonly Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function weekdayOf(date: PlainDate): Weekday {
  const { year, month, day } = parsePlainDate(date);
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? "sun";
}

/** Sunday-first index of a weekday, as `Date#getDay`: sun → 0 … sat → 6. */
export function weekdayIndex(day: Weekday): number {
  return WEEKDAYS.indexOf(day);
}

/**
 * The day a locale's week starts on: Sunday in en-US and en-IN, Monday in
 * en-GB and de, Saturday in much of the Gulf. Read from `Intl.Locale`'s week
 * info where the engine has it (Chrome, Safari, Node), else from the region.
 */
export function weekStartsOn(locale?: string): Weekday {
  try {
    const loc = new Intl.Locale(locale ?? new Intl.DateTimeFormat().resolvedOptions().locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const info = loc.getWeekInfo?.() ?? loc.weekInfo;
    // Intl counts Monday as 1 and Sunday as 7.
    if (info) return WEEKDAYS[info.firstDay % 7] ?? "mon";
    const region = loc.maximize().region ?? "";
    if (["US", "CA", "IN", "JP", "BR", "MX", "PH", "IL", "ZA"].includes(region)) return "sun";
    if (["AE", "AF", "BH", "DZ", "EG", "IQ", "IR", "JO", "KW", "LY", "OM", "QA", "SA", "SD", "SY"].includes(region)) return "sat";
  } catch {
    /* an unknown locale falls back to Monday, as ISO 8601 */
  }
  return "mon";
}

/** The calendar date it currently is in `timeZone`. */
export function todayIn(timeZone: string, now: number = Date.now()): PlainDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return toPlainDate({ year: read("year"), month: read("month"), day: read("day") });
}

/**
 * The date as a local-midnight `Date`, for calendar widgets that work in the
 * browser's zone (the coss Calendar, on DayPicker). Only the year, month and
 * day survive the round trip; no instant is implied.
 */
export function toLocalDate(date: PlainDate): Date {
  const { year, month, day } = parsePlainDate(date);
  return new Date(year, month - 1, day);
}

/** The calendar day a local `Date` falls on: the inverse of `toLocalDate`. */
export function fromLocalDate(date: Date): PlainDate {
  return toPlainDate({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() });
}
