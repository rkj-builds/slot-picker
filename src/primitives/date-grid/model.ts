/**
 * The date grid's pure parts: which dates a month shows, where a key moves
 * focus, and what a day is called out loud. No React, so they test alone.
 */
import { addDays, addMonths, clampDate, compareDates, endOfMonth, type PlainDate, parsePlainDate, startOfMonth, type Weekday, weekdayIndex, weekdayOf } from "@/lib/plain-date";

export type DayStatus = "available" | "limited" | "full" | "unavailable";

export interface DayInfo {
  /** "full" and "unavailable" days stay focusable, so they can be read, but cannot be picked. Default "available". */
  status?: DayStatus | undefined;
  /** A short line under the date, such as a price. */
  label?: string | undefined;
  /** A single highlight, such as "Best", drawn as a word rather than a colour. */
  badge?: string | undefined;
  /** Read out in place of the label when the label alone is not enough ("from 700 rupees an hour"). */
  description?: string | undefined;
}

export const DEFAULT_STATUS_TEXT: Readonly<Record<DayStatus, string>> = {
  available: "",
  limited: "few times left",
  full: "fully booked",
  unavailable: "not available",
};

/**
 * Six weeks of seven dates, starting on `weekStartsOn`, covering `month`.
 * Always six rows, so the grid never changes height between months.
 */
export function monthWeeks(month: PlainDate, weekStartsOn: Weekday): PlainDate[][] {
  const first = startOfMonth(month);
  const lead = (weekdayIndex(weekdayOf(first)) - weekdayIndex(weekStartsOn) + 7) % 7;
  const start = addDays(first, -lead);
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
}

export function sameMonth(a: PlainDate, b: PlainDate): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function inRange(date: PlainDate, min?: PlainDate | null, max?: PlainDate | null): boolean {
  return (!min || compareDates(date, min) >= 0) && (!max || compareDates(date, max) <= 0);
}

export type DateGridKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Home" | "End" | "PageUp" | "PageDown";

const KEYS = new Set<string>(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]);

export function isDateGridKey(key: string): key is DateGridKey {
  return KEYS.has(key);
}

export interface MoveOptions {
  weekStartsOn: Weekday;
  /** Shift + Page Up / Down moves a year. */
  shiftKey?: boolean;
  /** Right-to-left: ← is the next day. */
  direction?: "ltr" | "rtl";
  min?: PlainDate | null;
  max?: PlainDate | null;
}

/**
 * Where a key moves focus from `date`, per the WAI-ARIA date grid pattern:
 * ←/→ a day, ↑/↓ a week, Home/End the week's first and last day, Page Up/Down
 * a month (Shift: a year, the day clamped so 31 Jan → 28 Feb). A move past
 * `min` or `max` stops at the edge rather than doing nothing.
 */
export function moveDate(date: PlainDate, key: DateGridKey, { weekStartsOn, shiftKey = false, direction = "ltr", min, max }: MoveOptions): PlainDate {
  const column = (weekdayIndex(weekdayOf(date)) - weekdayIndex(weekStartsOn) + 7) % 7;
  const forward = direction === "rtl" ? -1 : 1;
  const next: Record<DateGridKey, () => PlainDate> = {
    ArrowLeft: () => addDays(date, -forward),
    ArrowRight: () => addDays(date, forward),
    ArrowUp: () => addDays(date, -7),
    ArrowDown: () => addDays(date, 7),
    Home: () => addDays(date, -column),
    End: () => addDays(date, 6 - column),
    PageUp: () => addMonths(date, shiftKey ? -12 : -1),
    PageDown: () => addMonths(date, shiftKey ? 12 : 1),
  };
  return clampDate(next[key](), min, max);
}

/** Can the grid page to the month before / after `month` without leaving [min, max]? */
export function canPage(month: PlainDate, step: -1 | 1, min?: PlainDate | null, max?: PlainDate | null): boolean {
  const target = addMonths(startOfMonth(month), step);
  return step < 0 ? !min || compareDates(endOfMonth(target), min) >= 0 : !max || compareDates(startOfMonth(target), max) <= 0;
}

/** A plain date through `Intl`, in UTC where its midnight lives, so no viewer ever sees the day before. */
export function formatPlainDate(date: PlainDate, locale: string | undefined, options: Intl.DateTimeFormatOptions): string {
  const { year, month, day } = parsePlainDate(date);
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(Date.UTC(year, month - 1, day));
}

/** "today" in the reader's language ("aujourd’hui"), from `Intl.RelativeTimeFormat`. */
export function todayWord(locale: string | undefined): string {
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "day");
}

/**
 * What a day is called out loud: "Saturday, 31 October 2026, today, from ₹800 an hour, Best, few times left".
 * The visible day number is part of it, so the name contains what is seen (WCAG 2.5.3).
 */
export function spokenDay(
  date: PlainDate,
  { locale, isToday, info, inside, statusText = DEFAULT_STATUS_TEXT }: { locale?: string | undefined; isToday: boolean; info?: DayInfo | undefined; inside: boolean; statusText?: Readonly<Record<DayStatus, string>> },
): string {
  return [
    formatPlainDate(date, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    isToday ? todayWord(locale) : "",
    info?.description ?? info?.label ?? "",
    info?.badge ?? "",
    inside ? statusText[info?.status ?? "available"] : statusText.unavailable,
  ]
    .filter(Boolean)
    .join(", ");
}
