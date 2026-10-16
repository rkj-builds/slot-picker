/**
 * Demo presets that change what the app shows, as a pure overlay on the real
 * state. The overlay is applied on the way out of the store and never
 * written back: turn a preset off and the data is exactly as it was, and
 * nothing it adds is ever saved. Everything it adds has an id starting
 * "demo:".
 */
import { type Booking, findConflict } from "@/lib/booking";
import { bookingsWithBlocks } from "@/lib/recurring-blocks";
import { addDays, type PlainDate, todayIn, weekdayOf } from "@/lib/plain-date";
import type { AppState } from "@/lib/store";
import { COURTS, priceFor, VENUE } from "@/lib/venue";

export interface DemoOverlay {
  /** Every court taken all of today. */
  fullyBooked: boolean;
  /** The venue is shut today. */
  closedToday: boolean;
  /** Customers with very long names. */
  longNames: boolean;
  /** No bookings at all, anywhere: the empty states. */
  emptyVenue: boolean;
  /** Half-hour bookings back to back through today's evening. */
  backToBack: boolean;
}

export const NO_OVERLAY: DemoOverlay = { fullyBooked: false, closedToday: false, longNames: false, emptyVenue: false, backToBack: false };

const LONG_SURNAMES = [
  "Venkataraghavan-Subramaniam Chakraborty",
  "Lakshminarayanan Bhattacharjee-Raghunathan",
  "Ramakrishnan Gopalaswamy-Iyengar Mukhopadhyay",
];

function demoBooking(state: AppState, fields: Pick<Booking, "courtId" | "date" | "startMinute" | "durationMinutes" | "customerId">, n: number, now: number): Booking {
  const price = priceFor(state.settings, fields.date, fields.startMinute, fields.durationMinutes);
  return {
    ...fields,
    id: `demo:${fields.courtId}:${fields.date}:${fields.startMinute}:${n}`,
    kind: "booking",
    title: "",
    players: 4,
    notes: "",
    source: "self-serve",
    status: "confirmed",
    payMode: "full",
    pricePaise: price,
    holdExpiresAt: null,
    createdAt: now - 86_400_000,
    cancelledAt: null,
    ledger: [{ id: `demo:le:${n}`, at: now - 86_400_000, kind: "online", amountPaise: price, note: "Paid in full by UPI" }],
  };
}

/** Fill a day's free time on every court with hour-long (or `step`-long) paid bookings. */
function fill(state: AppState, date: PlainDate, from: number, to: number, step: number, now: number): Booking[] {
  const added: Booking[] = [];
  let n = 0;
  for (const court of COURTS) {
    for (let m = from; m + step <= to; m += step) {
      const span = { courtId: court.id, date, startMinute: m, durationMinutes: step };
      if (findConflict([...bookingsWithBlocks(state, date), ...added], span, now)) continue;
      const customer = state.customers[(n + m / 30) % Math.max(1, state.customers.length)];
      added.push(demoBooking(state, { ...span, customerId: customer?.id ?? null }, (n += 1), now));
    }
  }
  return added;
}

export function applyDemoOverlay(state: AppState, overlay: DemoOverlay, now: number): AppState {
  if (!Object.values(overlay).some(Boolean)) return state;
  let next = state;
  const today = todayIn(VENUE.timeZone, now);
  const hours = next.settings.hours[weekdayOf(today)];

  if (overlay.emptyVenue) next = { ...next, bookings: [], recurringBlocks: [] };
  if (overlay.closedToday) {
    next = { ...next, settings: { ...next.settings, hours: { ...next.settings.hours, [weekdayOf(today)]: { ...hours, closed: true } } } };
  }
  if (overlay.longNames) {
    next = { ...next, customers: next.customers.map((c, i) => (i % 2 === 0 ? { ...c, name: `${c.name.split(" ")[0] ?? c.name} ${LONG_SURNAMES[(i / 2) % LONG_SURNAMES.length] ?? ""}` } : c)) };
  }
  if (overlay.backToBack) next = { ...next, bookings: [...next.bookings, ...fill(next, today, 17 * 60, 21 * 60, 30, now)] };
  if (overlay.fullyBooked) {
    // Every court, open to close, today and tomorrow, so the customer's day has nothing left and the next free day is the day after.
    const added = [today, addDays(today, 1)].flatMap((date) => {
      const h = next.settings.hours[weekdayOf(date)];
      return fill(next, date, h.open, h.close, 30, now);
    });
    next = { ...next, bookings: [...next.bookings, ...added] };
  }
  return next;
}

export function isDemoId(id: string): boolean {
  return id.startsWith("demo:");
}
