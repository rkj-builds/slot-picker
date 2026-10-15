/**
 * Formatting lives here so every surface prints a time the same way.
 * Everything takes an explicit zone; nothing reads the machine clock's zone.
 */
import { addDays, compareDates, type PlainDate, parsePlainDate, todayIn } from "@/lib/plain-date";

export interface FormatOptions {
  locale?: string;
  timeZone: string;
}

/** "7:00 PM" — the time of an instant on `timeZone`'s clock. */
export function formatTime(instant: number, { locale, timeZone }: FormatOptions): string {
  return new Intl.DateTimeFormat(locale, { timeZone, hour: "numeric", minute: "2-digit" }).format(instant);
}

/** "7:00 – 8:30 PM" — a range on one clock, with the shared period collapsed where the locale allows. */
export function formatTimeRange(start: number, end: number, { locale, timeZone }: FormatOptions): string {
  const formatter = new Intl.DateTimeFormat(locale, { timeZone, hour: "numeric", minute: "2-digit" });
  // formatRange collapses "7:00 PM – 8:30 PM" to "7:00 – 8:30 PM" in en-US.
  return formatter.formatRange(start, end).replace(/\s*[–-]\s*/, " – ");
}

/** "Sat 18 Oct" — a short day label for a plain date. */
export function formatDay(date: PlainDate, locale?: string): string {
  const { year, month, day } = parsePlainDate(date);
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(Date.UTC(year, month - 1, day));
}

/** "Saturday, 18 October 2026" — the long form for accessible names. */
export function formatDayLong(date: PlainDate, locale?: string): string {
  const { year, month, day } = parsePlainDate(date);
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(Date.UTC(year, month - 1, day));
}

/** "Today", "Tomorrow", "In 3 days", "Yesterday" — relative to today in the venue's zone. */
export function describeDayRelative(
  date: PlainDate,
  { locale, timeZone, now = Date.now() }: FormatOptions & { now?: number },
): string | null {
  const today = todayIn(timeZone, now);
  let diff = 0;
  let cursor = today;
  const direction = compareDates(date, today);
  while (cursor !== date && Math.abs(diff) < 14) {
    cursor = addDays(cursor, direction);
    diff += direction;
  }
  if (cursor !== date) return null;
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const text = formatter.format(diff, "day");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
