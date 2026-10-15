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

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

const WEEKDAYS: readonly Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function weekdayOf(date: PlainDate): Weekday {
  const { year, month, day } = parsePlainDate(date);
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? "sun";
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
