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

/** Old IANA names some engines still report, mapped to the current ones. */
const ZONE_ALIASES: Readonly<Record<string, string>> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Rangoon": "Asia/Yangon",
  "Europe/Kiev": "Europe/Kyiv",
};

export function canonicalZone(timeZone: string): string {
  return ZONE_ALIASES[timeZone] ?? timeZone;
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
  const city = timeZone.split("/").at(-1) ?? timeZone;
  return city.replaceAll("_", " ");
}
