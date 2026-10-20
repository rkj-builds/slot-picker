/**
 * The time-zone layer: plain `Intl` and `Date` math, no tz database.
 *
 * Two kinds of value move through this file and they must never be confused:
 *
 * - an **instant** is epoch milliseconds — a point on the timeline, the same
 *   everywhere on Earth;
 * - a **wall clock** is what a clock on a wall in one zone reads at that instant.
 *
 * Going from instant to wall clock is a function. Going back is not: in a zone
 * with daylight saving, a wall time can happen zero times (the spring-forward
 * gap) or twice (the fall-back overlap). `instantFromWallClock` resolves both
 * the way calendars expect — a gap shifts forward, an overlap takes the earlier.
 */

import { type PlainDate, parsePlainDate } from "@/lib/plain-date";

export interface WallClock {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number; // 0–23
  minute: number;
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

/** One cached numeric formatter per zone — constructing these is the slow part. */
function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    partsFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** What a wall clock in `timeZone` reads at `instant`. */
export function wallClockIn(instant: number, timeZone: string): WallClock {
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    // Some engines still print midnight as "24" under h23; normalise it.
    hour: read("hour") % 24,
    minute: read("minute"),
  };
}

/**
 * The zone's offset from UTC at `instant`, in minutes (east positive).
 * Asia/Kolkata → 330; America/New_York → −240 in summer, −300 in winter.
 */
export function zoneOffsetMinutes(instant: number, timeZone: string): number {
  const wall = wallClockIn(instant, timeZone);
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  // Drop seconds and milliseconds from the instant so they never leak into the offset.
  const flooredInstant = Math.floor(instant / 60_000) * 60_000;
  return Math.round((asUtc - flooredInstant) / 60_000);
}

/**
 * The instant at which a clock in `timeZone` reads `wall`.
 *
 * Guess with the offset at the naive UTC reading, then correct once with the
 * offset at the guess. If the corrected instant reads back as a different wall
 * time, `wall` fell in a spring-forward gap: we keep the pre-transition offset,
 * which lands the same distance past the gap ("2:30 AM" → "3:30 AM").
 * In a fall-back overlap both offsets are valid and we take the earlier instant.
 */
export function instantFromWallClock(wall: WallClock, timeZone: string): number {
  const naive = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  const offsetBefore = zoneOffsetMinutes(naive - 86_400_000, timeZone);
  const offsetAfter = zoneOffsetMinutes(naive + 86_400_000, timeZone);

  const candidates = [...new Set([offsetBefore, offsetAfter])]
    .map((offset) => naive - offset * 60_000)
    .filter((instant) => {
      const back = wallClockIn(instant, timeZone);
      return back.hour === wall.hour && back.minute === wall.minute && back.day === wall.day;
    })
    .sort((a, b) => a - b);

  const earliest = candidates[0];
  if (earliest !== undefined) return earliest;

  // A gap: no instant reads this wall time. Use the offset from before the
  // transition, which pushes the result forward by the size of the gap.
  return naive - offsetBefore * 60_000;
}

/** The instant a wall-clock minute on a calendar day happens in `timeZone`. */
export function instantAt(date: PlainDate, minuteOfDay: number, timeZone: string): number {
  const { year, month, day } = parsePlainDate(date);
  return instantFromWallClock(
    { year, month, day, hour: Math.floor(minuteOfDay / 60), minute: minuteOfDay % 60 },
    timeZone,
  );
}

/** Whether two zones show the same wall clock at `instant` (e.g. Kolkata and Colombo). */
export function sameWallClock(instant: number, a: string, b: string): boolean {
  return zoneOffsetMinutes(instant, a) === zoneOffsetMinutes(instant, b);
}

/**
 * Old IANA names some engines still report (Node and Chrome list Asia/Katmandu
 * and America/Godthab, not Asia/Kathmandu and America/Nuuk), mapped to the
 * names the cities use now. People search for the current name.
 */
export const ZONE_ALIASES: Readonly<Record<string, string>> = {
  "America/Godthab": "America/Nuuk",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "Europe/Kiev": "Europe/Kyiv",
  "Pacific/Enderbury": "Pacific/Kanton",
};

const canonicalCache = new Map<string, string>();

/**
 * The current name for a zone id. An alias is only used when this engine
 * accepts it, so an older engine that knows only "America/Godthab" keeps it
 * rather than getting a name `Intl` would reject.
 */
export function canonicalZone(timeZone: string): string {
  const alias = ZONE_ALIASES[timeZone];
  if (!alias) return timeZone;
  let resolved = canonicalCache.get(timeZone);
  if (resolved === undefined) {
    resolved = isValidTimeZone(alias) ? alias : timeZone;
    canonicalCache.set(timeZone, resolved);
  }
  return resolved;
}

/** The viewer's own zone, as the platform reports it, under its current name. */
export function localTimeZone(): string {
  return canonicalZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** "GMT+5:30", "GMT−4" — the zone's offset at `instant`, in the viewer's locale. */
export function zoneOffsetLabel(instant: number, timeZone: string, locale?: string): string {
  const part = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: "shortOffset" })
    .formatToParts(instant)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? timeZone;
}

/**
 * A human name for a zone: "Kolkata", "New York". Prefers the exemplar city
 * from the IANA id over long names like "India Standard Time", because a city
 * is what people recognise when they are working out where they will be.
 */
export function zoneCityLabel(timeZone: string): string {
  const city = canonicalZone(timeZone).split("/").at(-1) ?? timeZone;
  return city.replaceAll("_", " ");
}

export interface DayShift {
  /** Calendar days between the venue's date and the viewer's at the instant: −1, 0, +1 (±2 only across the date line's extremes). */
  days: number;
  /** What to print beside the time: "−1 day", "+1 day"; empty when it is the same day. */
  text: string;
  /** What to read out after the time: "the day before", "the day after"; empty when it is the same day. */
  spoken: string;
}

/**
 * Whether an instant falls on a different calendar day for the viewer than at
 * the venue. 6:00 am on Sat in Kolkata is 8:30 pm on Fri in New York: −1 day,
 * "the day before". A slot list grouped by the venue's day uses this to mark
 * the times that belong to the viewer's previous or next day.
 */
export function dayShift(instant: number, venueZone: string, viewerZone: string): DayShift {
  const venue = wallClockIn(instant, venueZone);
  const viewer = wallClockIn(instant, viewerZone);
  const days = Math.round((Date.UTC(viewer.year, viewer.month - 1, viewer.day) - Date.UTC(venue.year, venue.month - 1, venue.day)) / 86_400_000);
  if (days === 0) return { days: 0, text: "", spoken: "" };
  const n = Math.abs(days);
  const text = `${days > 0 ? "+" : "\u2212"}${n} ${n === 1 ? "day" : "days"}`;
  const spoken = n === 1 ? (days < 0 ? "the day before" : "the day after") : `${n} days ${days < 0 ? "before" : "after"}`;
  return { days, text, spoken };
}
