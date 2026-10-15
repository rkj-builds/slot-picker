/** Pure helpers for the desk screens: the stats strip and a booking's spoken description. */
import { bookingTitle, stateLabel } from "@/app/desk/booking-visuals";
import { type Booking, type Customer, deskState, type DeskState, duePaise, paidPaise } from "@/lib/booking";
import { formatCountdown, holdRemainingMs } from "@/lib/holds";
import { formatInr, sumPaise } from "@/lib/money";
import type { PlainDate } from "@/lib/plain-date";

export interface DayStats {
  minutesBooked: number;
  expectedPaise: number;
  collectedPaise: number;
  duePaise: number;
}

/** The strip above the grid. Cancelled and expired bookings count for nothing; coaching and blocks are not revenue. */
export function dayStats(bookings: readonly Booking[], now: number): DayStats {
  const live = bookings.filter((b) => b.kind === "booking" && !["cancelled", "expired"].includes(deskState(b, now)));
  return {
    minutesBooked: live.reduce((s, b) => s + b.durationMinutes, 0),
    expectedPaise: sumPaise(live.map((b) => b.pricePaise)),
    collectedPaise: sumPaise(live.map((b) => Math.max(0, paidPaise(b)))),
    duePaise: sumPaise(live.map((b) => duePaise(b))),
  };
}

export function describeBooking(b: Booking, customers: readonly Customer[], state: DeskState, now: number): string {
  const parts = [bookingTitle(b, customers), stateLabel(state)];
  if (state === "held") parts.push(`${formatCountdown(holdRemainingMs(b, now))} left`);
  const due = duePaise(b);
  if ((state === "part-paid" || state === "due") && due > 0) parts.push(`${formatInr(due)} due`);
  return parts.join(", ");
}

export interface CustomerHistory {
  bookings: number;
  paidAhead: number;
  unpaid: number;
  noShows: number;
  cancelled: number;
  last: Booking | undefined;
  next: Booking | undefined;
}

/** A customer's record at this venue: what the desk wants to know before taking their next booking. */
export function customerHistory(customer: Customer, bookings: readonly Booking[], today: PlainDate): CustomerHistory {
  const theirs = bookings.filter((b) => b.kind === "booking" && b.customerId === customer.id && b.status !== "held" && b.status !== "expired");
  const kept = theirs.filter((b) => b.status !== "cancelled");
  return {
    bookings: theirs.length,
    paidAhead: theirs.filter((b) => b.ledger.some((e) => e.kind === "online")).length,
    unpaid: theirs.filter((b) => paidPaise(b) <= 0).length,
    noShows: theirs.filter((b) => b.status === "no-show").length,
    cancelled: theirs.filter((b) => b.status === "cancelled").length,
    last: kept.filter((b) => b.date < today).sort((a, b) => (a.date < b.date ? 1 : -1))[0],
    next: kept.filter((b) => b.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1))[0],
  };
}
