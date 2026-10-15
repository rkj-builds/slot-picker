/**
 * The numbers behind the pay-first policy, computed from the bookings.
 * Only finished days count: a booking next Saturday has not had the chance
 * to be cancelled or missed yet.
 */
import { type Booking, paidPaise, prepaidPaise } from "@/lib/booking";
import type { Paise } from "@/lib/money";
import { addDays, compareDates, type PlainDate, weekdayOf } from "@/lib/plain-date";

export type PaymentGroup = "full" | "part" | "none";

export const PAYMENT_GROUP_LABEL: Record<PaymentGroup, string> = {
  full: "Paid in full",
  part: "Part-paid",
  none: "Nothing paid",
};

export interface GroupStats {
  group: PaymentGroup;
  total: number;
  cancelled: number;
  noShows: number;
  /** Cancelled ÷ total, 0–1. */
  cancelRate: number;
}

export interface WeekShare {
  /** Monday of the week. */
  weekOf: PlainDate;
  selfServe: number;
  desk: number;
  /** Self-serve bookings with nothing paid up front. */
  selfServeUnpaid: number;
}

export interface Insights {
  groups: GroupStats[];
  /** Self-serve with nothing paid vs any money up front (full or part), the headline comparison. */
  unpaid: GroupStats;
  paid: Omit<GroupStats, "group">;
  /** Price of slots left empty by unpaid cancellations and no-shows. */
  lostPaise: Paise;
  /** Money kept from prepaid cancellations and no-shows (as credit or not refunded). */
  recoveredPaise: Paise;
  weeks: WeekShare[];
  selfServeShare: number;
  finishedBookings: number;
}

export function groupOf(b: Booking): PaymentGroup {
  const prepaid = prepaidPaise(b);
  if (prepaid <= 0) return "none";
  return prepaid >= b.pricePaise ? "full" : "part";
}

export function computeInsights(bookings: readonly Booking[], today: PlainDate): Insights {
  const finished = bookings.filter(
    (b) => b.kind === "booking" && compareDates(b.date, today) < 0 && (b.status === "confirmed" || b.status === "cancelled" || b.status === "no-show"),
  );
  const selfServe = finished.filter((b) => b.source === "self-serve");

  const stats = (list: readonly Booking[]): Omit<GroupStats, "group"> => {
    const cancelled = list.filter((b) => b.status === "cancelled").length;
    return {
      total: list.length,
      cancelled,
      noShows: list.filter((b) => b.status === "no-show").length,
      cancelRate: list.length === 0 ? 0 : cancelled / list.length,
    };
  };
  const groups = (["full", "part", "none"] as const).map((group) => ({ group, ...stats(selfServe.filter((b) => groupOf(b) === group)) }));

  const lost = finished.filter((b) => (b.status === "cancelled" || b.status === "no-show") && prepaidPaise(b) === 0);
  const kept = finished.filter((b) => (b.status === "cancelled" || b.status === "no-show") && prepaidPaise(b) > 0);

  const weeks = new Map<PlainDate, WeekShare>();
  for (const b of finished) {
    const weekOf = mondayOf(b.date);
    const w = weeks.get(weekOf) ?? { weekOf, selfServe: 0, desk: 0, selfServeUnpaid: 0 };
    if (b.source === "self-serve") {
      w.selfServe += 1;
      if (groupOf(b) === "none") w.selfServeUnpaid += 1;
    } else w.desk += 1;
    weeks.set(weekOf, w);
  }

  return {
    groups,
    unpaid: { group: "none", ...stats(selfServe.filter((b) => groupOf(b) === "none")) },
    paid: stats(selfServe.filter((b) => groupOf(b) !== "none")),
    lostPaise: lost.reduce((s, b) => s + b.pricePaise, 0),
    recoveredPaise: kept.reduce((s, b) => s + Math.max(0, paidPaise(b)), 0),
    weeks: [...weeks.values()].sort((a, b) => compareDates(a.weekOf, b.weekOf)),
    selfServeShare: finished.length === 0 ? 0 : selfServe.length / finished.length,
    finishedBookings: finished.length,
  };
}

export function mondayOf(date: PlainDate): PlainDate {
  const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  return addDays(date, -order.indexOf(weekdayOf(date)));
}

/** "45%" — whole percents only; a rate is never shown with false precision. */
export function formatPercent(rate: number): string {
  return new Intl.NumberFormat("en-IN", { style: "percent", maximumFractionDigits: 0 }).format(rate);
}
