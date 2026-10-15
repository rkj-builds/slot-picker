/**
 * Availability: which start times a customer can actually book.
 *
 * A venue is a schedule (zone, slot step, allowed durations, weekly opening
 * ranges in minutes from midnight) plus the reservations already on its
 * spaces. For one space on one day and one chosen duration, every cell on the
 * slot step inside opening hours gets exactly one status:
 *
 *   available  — a booking of this duration can start here
 *   booked     — a confirmed reservation covers this cell
 *   held       — someone is mid-checkout on this cell; it may free up
 *   past       — this cell has already started
 *   conflict   — free, but the free run from here is shorter than the duration
 *   closing    — free, but the venue closes before the duration ends
 *
 * The distinction between the last three matters to the person reading the
 * grid: "past" explains itself, "closing" tells them to pick an earlier start,
 * and "conflict" tells them to pick a shorter duration.
 */
import { formatDuration } from "@/lib/duration";
import { instantAt } from "@/lib/time-zone";
import { addDays, type PlainDate, weekdayOf, type Weekday } from "@/lib/plain-date";

export type OpenRange = readonly [startMinute: number, endMinute: number];

export interface VenueSchedule {
  timeZone: string;
  slotStepMinutes: number;
  durationsMinutes: readonly number[];
  weeklyHours: Readonly<Record<Weekday, readonly OpenRange[]>>;
}

export interface Reservation {
  spaceId: string;
  /** Epoch milliseconds. */
  start: number;
  /** Epoch milliseconds, exclusive. */
  end: number;
  status: "booked" | "held";
}

export type SlotStatus = "available" | "booked" | "held" | "past" | "conflict" | "closing";

export interface Slot {
  /** Stable id, "2026-10-18T19:00" in the venue's wall clock. */
  id: string;
  /** Epoch milliseconds of the start. */
  start: number;
  /** Epoch milliseconds the chosen duration would end at. */
  end: number;
  minuteOfDay: number;
  status: SlotStatus;
  /** For "conflict": how long the free run from here is. */
  freeMinutes?: number;
}

export type Period = "morning" | "afternoon" | "evening";

export interface ComputeDaySlotsInput {
  schedule: VenueSchedule;
  date: PlainDate;
  spaceId: string;
  durationMinutes: number;
  reservations: readonly Reservation[];
  /** Epoch milliseconds; defaults to the real clock. */
  now?: number;
}

export function periodOf(minuteOfDay: number): Period {
  if (minuteOfDay < 12 * 60) return "morning";
  if (minuteOfDay < 17 * 60) return "afternoon";
  return "evening";
}

export function computeDaySlots({
  schedule,
  date,
  spaceId,
  durationMinutes,
  reservations,
  now = Date.now(),
}: ComputeDaySlotsInput): Slot[] {
  const { timeZone, slotStepMinutes: step } = schedule;
  if (step <= 0) throw new RangeError("slotStepMinutes must be positive");
  if (durationMinutes <= 0 || durationMinutes % step !== 0) {
    throw new RangeError(`durationMinutes must be a positive multiple of ${step}`);
  }

  const ranges = schedule.weeklyHours[weekdayOf(date)] ?? [];
  const onSpace = reservations.filter((r) => r.spaceId === spaceId);
  const slots: Slot[] = [];

  for (const [open, close] of ranges) {
    for (let minute = open; minute < close; minute += step) {
      const start = instantAt(date, minute, timeZone);
      const end = instantAt(date, minute + durationMinutes, timeZone);
      const wall = `${date}T${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;
      const base = { id: wall, start, end, minuteOfDay: minute };

      // The cell itself: is it already taken, or already gone?
      const covering = onSpace.find((r) => r.start <= start && start < r.end);
      if (covering) {
        slots.push({ ...base, status: covering.status });
        continue;
      }
      if (start < now) {
        slots.push({ ...base, status: "past" });
        continue;
      }

      // The run ahead: does the duration fit before the next reservation and before closing?
      if (minute + durationMinutes > close) {
        slots.push({ ...base, status: "closing" });
        continue;
      }
      const nextTaken = onSpace
        .filter((r) => r.start > start)
        .reduce<number | null>((min, r) => (min === null || r.start < min ? r.start : min), null);
      if (nextTaken !== null && nextTaken < end) {
        slots.push({ ...base, status: "conflict", freeMinutes: Math.round((nextTaken - start) / 60_000) });
        continue;
      }

      slots.push({ ...base, status: "available" });
    }
  }

  return slots;
}

/**
 * The next day on or after `from` with at least one available start, within
 * `horizonDays`. Null when nothing is open in that window.
 */
export function nextAvailableDate(
  input: Omit<ComputeDaySlotsInput, "date"> & { from: PlainDate; horizonDays?: number },
): PlainDate | null {
  const { from, horizonDays = 30, ...rest } = input;
  for (let i = 0; i < horizonDays; i += 1) {
    const date = addDays(from, i);
    if (computeDaySlots({ ...rest, date }).some((s) => s.status === "available")) return date;
  }
  return null;
}

/** Slots grouped by period, in order, skipping empty periods. */
export function groupByPeriod(slots: readonly Slot[]): { period: Period; slots: Slot[] }[] {
  const order: Period[] = ["morning", "afternoon", "evening"];
  return order
    .map((period) => ({ period, slots: slots.filter((s) => periodOf(s.minuteOfDay) === period) }))
    .filter((group) => group.slots.length > 0);
}

/** Why a slot cannot be picked, in words a person would use. */
export function describeSlotStatus(slot: Slot, locale?: string): string | null {
  switch (slot.status) {
    case "available":
      return null;
    case "booked":
      return "booked";
    case "held":
      return "being booked by someone else";
    case "past":
      return "already started";
    case "closing":
      return "ends after closing";
    case "conflict":
      return slot.freeMinutes === undefined
        ? "not enough time free"
        : `only ${formatDuration(slot.freeMinutes, { locale })} free`;
  }
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
