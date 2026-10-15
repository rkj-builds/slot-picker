/**
 * A fictional venue for the demo. Generated in the browser from a fixed seed,
 * so the page looks the same on every load and nothing here is real data.
 */
import type { Reservation, VenueSchedule } from "@/lib/availability";
import { addDays, type PlainDate, todayIn } from "@/lib/plain-date";
import { instantAt } from "@/lib/time-zone";

export const VENUE_TIME_ZONE = "Asia/Kolkata";

export const schedule: VenueSchedule = {
  timeZone: VENUE_TIME_ZONE,
  slotStepMinutes: 30,
  durationsMinutes: [60, 90, 120],
  weeklyHours: {
    sun: [[6 * 60, 23 * 60]],
    mon: [[6 * 60, 12 * 60], [16 * 60, 23 * 60]],
    tue: [[6 * 60, 12 * 60], [16 * 60, 23 * 60]],
    wed: [[6 * 60, 12 * 60], [16 * 60, 23 * 60]],
    thu: [[6 * 60, 12 * 60], [16 * 60, 23 * 60]],
    fri: [[6 * 60, 12 * 60], [16 * 60, 23 * 60]],
    sat: [[6 * 60, 23 * 60]],
  },
};

export const spaces = [
  { id: "court-1", name: "Court 1" },
  { id: "court-2", name: "Court 2" },
] as const;

/** A small deterministic PRNG (mulberry32), so the fixture is stable. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Reservations across the next 14 days on both courts: evenings busy, mornings light. */
export function makeReservations(now: number, seed = 831): Reservation[] {
  const random = seeded(seed);
  const today = todayIn(VENUE_TIME_ZONE, now);
  const out: Reservation[] = [];

  for (let d = 0; d < 14; d += 1) {
    const date: PlainDate = addDays(today, d);
    for (const space of spaces) {
      let minute = 6 * 60;
      while (minute < 23 * 60) {
        const evening = minute >= 17 * 60;
        const take = random() < (evening ? 0.42 : 0.2);
        if (!take) {
          minute += 30;
          continue;
        }
        const length = [60, 60, 90, 120][Math.floor(random() * 4)] ?? 60;
        const end = Math.min(minute + length, 23 * 60);
        out.push({
          spaceId: space.id,
          start: instantAt(date, minute, VENUE_TIME_ZONE),
          end: instantAt(date, end, VENUE_TIME_ZONE),
          status: random() < 0.12 ? "held" : "booked",
        });
        minute = end;
      }
    }
  }
  return out;
}
