/**
 * How the app prints a booking. One locale (en-IN, the venue's), one zone
 * (the venue's): "Sat, 17 Oct", "7:00 – 8:30 pm", "₹1,200".
 */
import { bookingEnd, bookingStart } from "@/lib/booking";
import { formatDuration } from "@/lib/duration";
import { formatDay, formatDayLong, formatTime, formatTimeRange } from "@/lib/format";
import type { PlainDate } from "@/lib/plain-date";
import { instantAt } from "@/lib/time-zone";
import { VENUE } from "@/lib/venue";

export const LOCALE = "en-IN";

interface Span {
  date: PlainDate;
  startMinute: number;
  durationMinutes: number;
}

export function timeRangeOf(span: Span): string {
  return formatTimeRange(bookingStart(span), bookingEnd(span), { locale: LOCALE, timeZone: VENUE.timeZone });
}

export function startTimeOf(span: Pick<Span, "date" | "startMinute">): string {
  return formatTime(bookingStart(span), { locale: LOCALE, timeZone: VENUE.timeZone });
}

export function minuteLabel(minuteOfDay: number, date: PlainDate = "2026-01-01"): string {
  return formatTime(instantAt(date, minuteOfDay, VENUE.timeZone), { locale: LOCALE, timeZone: VENUE.timeZone });
}

export function dayOf(date: PlainDate): string {
  return formatDay(date, LOCALE);
}

export function longDayOf(date: PlainDate): string {
  return formatDayLong(date, LOCALE);
}

export function durationOf(minutes: number, style: "long" | "short" = "long"): string {
  return formatDuration(minutes, { locale: LOCALE, style });
}

/** "Sat, 17 Oct · 7:00 – 8:30 pm" */
export function whenOf(span: Span): string {
  return `${dayOf(span.date)} · ${timeRangeOf(span)}`;
}

/** "Asha Rao" → "AR", for an avatar fallback. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}
