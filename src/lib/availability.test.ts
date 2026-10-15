import { describe, expect, it } from "vitest";
import { computeDaySlots, groupByPeriod, nextAvailableDate, type Reservation, type VenueSchedule } from "@/lib/availability";
import { instantAt } from "@/lib/time-zone";

const TZ = "Asia/Kolkata";
const DATE = "2026-10-17" as const; // a Saturday

const schedule: VenueSchedule = {
  timeZone: TZ,
  slotStepMinutes: 30,
  durationsMinutes: [60, 90, 120],
  weeklyHours: {
    sun: [[6 * 60, 23 * 60]],
    mon: [],
    tue: [[6 * 60, 12 * 60], [16 * 60, 23 * 60]],
    wed: [],
    thu: [],
    fri: [],
    sat: [[6 * 60, 23 * 60]],
  },
};

const at = (hour: number, minute = 0): number => instantAt(DATE, hour * 60 + minute, TZ);
const EARLY = instantAt(DATE, 0, TZ); // a "now" before the day begins

function statusAt(slots: ReturnType<typeof computeDaySlots>, hour: number, minute = 0): string | undefined {
  return slots.find((s) => s.minuteOfDay === hour * 60 + minute)?.status;
}

describe("computeDaySlots", () => {
  it("emits one cell per step inside opening hours and nothing outside", () => {
    const slots = computeDaySlots({ schedule, date: DATE, spaceId: "c1", durationMinutes: 60, reservations: [], now: EARLY });
    expect(slots).toHaveLength((23 - 6) * 2);
    expect(slots[0]?.minuteOfDay).toBe(6 * 60);
    expect(slots.at(-1)?.minuteOfDay).toBe(22 * 60 + 30);
    expect(slots.find((s) => s.minuteOfDay === 5 * 60)).toBeUndefined();
  });

  it("is empty on a closed day", () => {
    expect(computeDaySlots({ schedule, date: "2026-10-19", spaceId: "c1", durationMinutes: 60, reservations: [], now: EARLY })).toEqual([]);
  });

  it("marks the last starts as closing when the duration runs past the end", () => {
    const slots = computeDaySlots({ schedule, date: DATE, spaceId: "c1", durationMinutes: 90, reservations: [], now: EARLY });
    expect(statusAt(slots, 21, 30)).toBe("available");
    expect(statusAt(slots, 22, 0)).toBe("closing");
    expect(statusAt(slots, 22, 30)).toBe("closing");
  });

  it("marks cells under a reservation as booked or held, and the run before it as conflict for a long duration", () => {
    const reservations: Reservation[] = [
      { spaceId: "c1", start: at(19), end: at(20), status: "booked" },
      { spaceId: "c1", start: at(21), end: at(21, 30), status: "held" },
    ];
    const slots = computeDaySlots({ schedule, date: DATE, spaceId: "c1", durationMinutes: 90, reservations, now: EARLY });
    expect(statusAt(slots, 19)).toBe("booked");
    expect(statusAt(slots, 19, 30)).toBe("booked");
    expect(statusAt(slots, 21)).toBe("held");
    // 17:30 + 90 = 19:00 fits exactly; 18:00 + 90 would cross the 19:00 booking.
    expect(statusAt(slots, 17, 30)).toBe("available");
    expect(statusAt(slots, 18)).toMatchObject({});
    const conflict = slots.find((s) => s.minuteOfDay === 18 * 60);
    expect(conflict?.status).toBe("conflict");
    expect(conflict?.freeMinutes).toBe(60);
    // 20:00 is free, but only 60 minutes until the hold at 21:00.
    expect(slots.find((s) => s.minuteOfDay === 20 * 60)).toMatchObject({ status: "conflict", freeMinutes: 60 });
  });

  it("a shorter duration fits where a longer one did not", () => {
    const reservations: Reservation[] = [{ spaceId: "c1", start: at(19), end: at(20), status: "booked" }];
    const slots = computeDaySlots({ schedule, date: DATE, spaceId: "c1", durationMinutes: 60, reservations, now: EARLY });
    expect(statusAt(slots, 18)).toBe("available");
  });

  it("ignores reservations on other spaces", () => {
    const reservations: Reservation[] = [{ spaceId: "c2", start: at(19), end: at(20), status: "booked" }];
    const slots = computeDaySlots({ schedule, date: DATE, spaceId: "c1", durationMinutes: 60, reservations, now: EARLY });
    expect(statusAt(slots, 19)).toBe("available");
  });

  it("marks cells that have already started as past, with the first future cell available", () => {
    const now = at(10, 15);
    const slots = computeDaySlots({ schedule, date: DATE, spaceId: "c1", durationMinutes: 60, reservations: [], now });
    expect(statusAt(slots, 10)).toBe("past");
    expect(statusAt(slots, 10, 30)).toBe("available");
  });

  it("refuses a duration that is not on the step", () => {
    expect(() => computeDaySlots({ schedule, date: DATE, spaceId: "c1", durationMinutes: 45, reservations: [], now: EARLY })).toThrow(RangeError);
  });
});

describe("nextAvailableDate", () => {
  it("skips closed days and fully booked days", () => {
    const sunday = "2026-10-18" as const;
    const allDay: Reservation[] = [{ spaceId: "c1", start: instantAt(sunday, 6 * 60, TZ), end: instantAt(sunday, 23 * 60, TZ), status: "booked" }];
    const next = nextAvailableDate({ schedule, spaceId: "c1", durationMinutes: 60, reservations: allDay, now: EARLY, from: sunday });
    expect(next).toBe("2026-10-20"); // Monday is closed, Tuesday opens
  });

  it("returns null when nothing is open within the horizon", () => {
    const closed: VenueSchedule = { ...schedule, weeklyHours: { ...schedule.weeklyHours, sun: [], tue: [], sat: [] } };
    expect(nextAvailableDate({ schedule: closed, spaceId: "c1", durationMinutes: 60, reservations: [], now: EARLY, from: DATE })).toBeNull();
  });
});

describe("groupByPeriod", () => {
  it("splits the day at noon and 5 PM and drops empty periods", () => {
    const slots = computeDaySlots({ schedule, date: "2026-10-20", spaceId: "c1", durationMinutes: 60, reservations: [], now: EARLY });
    const groups = groupByPeriod(slots);
    expect(groups.map((g) => g.period)).toEqual(["morning", "afternoon", "evening"]);
    expect(groups[1]?.slots[0]?.minuteOfDay).toBe(16 * 60);
    expect(groups[2]?.slots[0]?.minuteOfDay).toBe(17 * 60);
  });
});
