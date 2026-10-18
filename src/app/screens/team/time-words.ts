/**
 * Instants in words, for the inbox, the team list and the activity log:
 * "4 min ago", "Yesterday", "Waiting 5 hrs". Venue time, en-IN. Waits are
 * whole units (minutes, then hours, then days), never decimals.
 */
import { dayOf, LOCALE } from "@/app/format";
import { formatTime } from "@/lib/format";
import { addDays, type PlainDate, todayIn } from "@/lib/plain-date";
import { VENUE } from "@/lib/venue";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function dayOfInstant(at: number): PlainDate {
  return todayIn(VENUE.timeZone, at);
}

export function clockOf(at: number): string {
  return formatTime(at, { locale: LOCALE, timeZone: VENUE.timeZone });
}

/** "Just now", "4 min ago", "2 hours ago", "yesterday", "3 days ago", then the date. */
export function agoOf(at: number, now: number): string {
  const ms = Math.max(0, now - at);
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
  if (ms < MINUTE) return "Just now";
  if (ms < HOUR) return new Intl.RelativeTimeFormat(LOCALE, { style: "short" }).format(-Math.floor(ms / MINUTE), "minute");
  if (ms < DAY) return rtf.format(-Math.floor(ms / HOUR), "hour");
  const days = Math.round((Date.parse(`${dayOfInstant(now)}T00:00:00Z`) - Date.parse(`${dayOfInstant(at)}T00:00:00Z`)) / DAY);
  if (days < 7) return capitalise(rtf.format(-days, "day"));
  return dayOf(dayOfInstant(at));
}

/** A list row's time, as chat apps print it: the clock today, "Yesterday", the weekday this week, else the date. */
export function stampOf(at: number, now: number): string {
  const day = dayOfInstant(at);
  const today = dayOfInstant(now);
  if (day === today) return clockOf(at);
  if (day === addDays(today, -1)) return "Yesterday";
  for (let i = 2; i < 7; i += 1) if (day === addDays(today, -i)) return new Intl.DateTimeFormat(LOCALE, { weekday: "short", timeZone: VENUE.timeZone }).format(at);
  return dayOf(day);
}

/** A day divider in a message log: "Today", "Yesterday", "Sat, 10 Oct". */
export function dayHeadingOf(day: PlainDate, now: number): string {
  const today = dayOfInstant(now);
  if (day === today) return "Today";
  if (day === addDays(today, -1)) return "Yesterday";
  return dayOf(day);
}

/** How long someone has waited, in one whole unit: "12 min", "5 hrs", "2 days". */
export function waitOf(since: number, now: number): string {
  const ms = Math.max(0, now - since);
  const unit = (value: number, name: "minute" | "hour" | "day"): string => new Intl.NumberFormat(LOCALE, { style: "unit", unit: name, unitDisplay: name === "day" ? "long" : "short" }).format(value);
  if (ms < HOUR) return unit(Math.max(1, Math.floor(ms / MINUTE)), "minute");
  if (ms < DAY) return unit(Math.floor(ms / HOUR), "hour");
  return unit(Math.floor(ms / DAY), "day");
}

/** The wait's tone: calm under an hour, amber after one, red after four. */
export function waitTone(since: number, now: number): "outline" | "warning" | "error" {
  const ms = now - since;
  if (ms >= 4 * HOUR) return "error";
  if (ms >= HOUR) return "warning";
  return "outline";
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
