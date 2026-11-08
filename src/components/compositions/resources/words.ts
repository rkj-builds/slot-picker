import { formatDay, formatTime, formatTimeRange } from "@/lib/format";
import type { PlainDate, Weekday } from "@/lib/plain-date";
import { type HoursSegment, hoursSummary, type ResourceBooking, type ResourceWeek } from "@/lib/resources";
import { instantAt } from "@/lib/time-zone";

export const DAY_LABEL: Record<Weekday, { short: string; long: string }> = {
  mon: { short: "Mon", long: "Monday" },
  tue: { short: "Tue", long: "Tuesday" },
  wed: { short: "Wed", long: "Wednesday" },
  thu: { short: "Thu", long: "Thursday" },
  fri: { short: "Fri", long: "Friday" },
  sat: { short: "Sat", long: "Saturday" },
  sun: { short: "Sun", long: "Sunday" },
};

/** "7:00 pm", on the venue's clock. The date only matters for the zone's offset that day. */
export function minuteLabel(minute: number, timeZone: string, locale?: string, date: PlainDate = "2026-01-05"): string {
  if (minute === 24 * 60) return "Midnight";
  return formatTime(instantAt(date, minute, timeZone), { locale, timeZone });
}

/** "7:00 – 8:00 pm" */
export function spanLabel(b: Pick<ResourceBooking, "date" | "startMinute" | "durationMinutes">, timeZone: string, locale?: string): string {
  return formatTimeRange(instantAt(b.date, b.startMinute, timeZone), instantAt(b.date, b.startMinute + b.durationMinutes, timeZone), { locale, timeZone });
}

/** "Mon, 2 Nov" */
export function dayLabel(date: PlainDate, locale?: string): string {
  return formatDay(date, locale);
}

/** The week as lines: "Mon–Fri", "6:00 am – 10:00 pm". */
export function weekLines(week: ResourceWeek, timeZone: string, locale?: string): HoursSegment[] {
  return hoursSummary(week, { day: (d) => DAY_LABEL[d].short, time: (m) => minuteLabel(m, timeZone, locale) });
}

/** "1 booking at a time · up to 4 people" */
export function capacityLine(atOnce: number, people: number): string {
  return `${atOnce} ${atOnce === 1 ? "booking" : "bookings"} at a time · up to ${people} ${people === 1 ? "person" : "people"}`;
}

export const SOURCE_LABEL: Record<ResourceBooking["source"], string> = {
  page: "from the booking page",
  api: "from WhatsApp",
  desk: "at the desk",
};

/** "Rahul · 4 players" */
export function bookingTitle(b: ResourceBooking): string {
  return `${b.name} · ${b.people} ${b.people === 1 ? "player" : "players"}`;
}
