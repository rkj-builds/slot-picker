/**
 * Bookings, customers and the payment ledger.
 *
 * A booking never stores "amount paid" or "amount due": both are derived
 * from its ledger, so the desk, the customer's confirmation and Insights can
 * never disagree about money.
 */
import type { Reservation } from "@/lib/availability";
import { type Paise, sumPaise } from "@/lib/money";
import { compareDates, type PlainDate } from "@/lib/plain-date";
import { instantAt } from "@/lib/time-zone";
import { type CourtId, VENUE } from "@/lib/venue";

export type BookingStatus = "held" | "confirmed" | "cancelled" | "no-show" | "expired";
export type BookingKind = "booking" | "coaching" | "blocked";
export type PayMode = "venue" | "part" | "full";
export type BookingSource = "self-serve" | "desk";

/**
 * - online: paid through checkout (a deposit or the full amount)
 * - cash: recorded at the desk
 * - credit-applied: an earlier credit used against this booking
 * - refund: money sent back (reduces what was paid)
 * - credit-issued: what was paid became credit on the customer (money stays)
 */
export type LedgerKind = "online" | "cash" | "credit-applied" | "refund" | "credit-issued";

export interface LedgerEntry {
  id: string;
  at: number;
  kind: LedgerKind;
  amountPaise: Paise;
  note: string;
}

export interface Booking {
  id: string;
  courtId: CourtId;
  date: PlainDate;
  startMinute: number;
  durationMinutes: number;
  customerId: string | null;
  kind: BookingKind;
  /** For coaching and blocked time: what the block is. */
  title: string;
  players: number;
  notes: string;
  source: BookingSource;
  status: BookingStatus;
  payMode: PayMode;
  pricePaise: Paise;
  /** Epoch ms; only for status "held". */
  holdExpiresAt: number | null;
  createdAt: number;
  cancelledAt: number | null;
  ledger: LedgerEntry[];
}

export interface Customer {
  id: string;
  name: string;
  /** Canonical "+91XXXXXXXXXX". */
  phone: string;
  /** Asked to pay in full before a court is held (has ghosted before). */
  payFirst: boolean;
  /** Known regular: may pay at the venue even on prepay days. */
  trusted: boolean;
  creditPaise: Paise;
  createdAt: number;
}

export function bookingStart(b: Pick<Booking, "date" | "startMinute">): number {
  return instantAt(b.date, b.startMinute, VENUE.timeZone);
}

export function bookingEnd(b: Pick<Booking, "date" | "startMinute" | "durationMinutes">): number {
  return instantAt(b.date, b.startMinute + b.durationMinutes, VENUE.timeZone);
}

/** What has been paid and kept: online + cash + credit applied, minus refunds. */
export function paidPaise(b: Booking): Paise {
  return sumPaise(
    b.ledger.map((e) =>
      e.kind === "online" || e.kind === "cash" || e.kind === "credit-applied" ? e.amountPaise : e.kind === "refund" ? -e.amountPaise : 0,
    ),
  );
}

/** Paid through checkout, before the day: the number that predicts whether someone turns up. */
export function prepaidPaise(b: Booking): Paise {
  return sumPaise(b.ledger.filter((e) => e.kind === "online").map((e) => e.amountPaise));
}

export function duePaise(b: Booking): Paise {
  if (b.kind !== "booking" || b.status === "cancelled" || b.status === "expired") return 0;
  return Math.max(0, b.pricePaise - paidPaise(b));
}

export type PaymentState = "paid" | "part-paid" | "unpaid";

export function paymentState(b: Booking): PaymentState {
  const paid = paidPaise(b);
  if (paid >= b.pricePaise) return "paid";
  return paid > 0 ? "part-paid" : "unpaid";
}

/** The one word the desk grid shows for a block. */
export type DeskState = "held" | "paid" | "part-paid" | "due" | "coaching" | "blocked" | "no-show" | "cancelled" | "expired";

export function deskState(b: Booking, now: number): DeskState {
  if (b.kind === "coaching") return "coaching";
  if (b.kind === "blocked") return "blocked";
  if (b.status === "cancelled") return "cancelled";
  if (b.status === "expired" || (b.status === "held" && !isHoldActive(b, now))) return "expired";
  if (b.status === "held") return "held";
  if (b.status === "no-show") return "no-show";
  const state = paymentState(b);
  return state === "paid" ? "paid" : state === "part-paid" ? "part-paid" : "due";
}

export const DESK_STATE_LABEL: Record<DeskState, string> = {
  held: "Held, awaiting payment",
  paid: "Paid",
  "part-paid": "Part-paid",
  due: "Due at venue",
  coaching: "Coaching",
  blocked: "Blocked",
  "no-show": "No-show",
  cancelled: "Cancelled",
  expired: "Hold expired",
};

export function isHoldActive(b: Booking, now: number): boolean {
  return b.status === "held" && b.holdExpiresAt !== null && b.holdExpiresAt > now;
}

/** Does this booking keep its court busy right now? */
export function isBlocking(b: Booking, now: number): boolean {
  if (b.status === "cancelled" || b.status === "expired") return false;
  if (b.status === "held") return isHoldActive(b, now);
  return true;
}

export function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}

/** The bookings as availability sees them: one reservation per blocking booking. */
export function reservationsFrom(bookings: readonly Booking[], now: number): Reservation[] {
  return bookings
    .filter((b) => isBlocking(b, now))
    .map((b) => ({ spaceId: b.courtId, start: bookingStart(b), end: bookingEnd(b), status: b.status === "held" ? "held" : "booked" }));
}

export const ANY_COURT = "any";

/**
 * Reservations for a virtual "any court" space: a stretch is taken only when
 * every court is taken. It reads as "held" if any court in it is only held,
 * because that stretch may still free up.
 */
export function anyCourtReservations(bookings: readonly Booking[], courtIds: readonly string[], now: number): Reservation[] {
  const all = reservationsFrom(bookings, now);
  const points = [...new Set(all.flatMap((r) => [r.start, r.end]))].sort((a, b) => a - b);
  const out: Reservation[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i] ?? 0;
    const end = points[i + 1] ?? 0;
    const mid = (start + end) / 2;
    const covering = courtIds.map((id) => all.find((r) => r.spaceId === id && r.start <= mid && mid < r.end));
    if (covering.some((r) => r === undefined)) continue;
    const status = covering.some((r) => r?.status === "held") ? "held" : "booked";
    const last = out.at(-1);
    if (last?.end === start && last.status === status) last.end = end;
    else out.push({ spaceId: ANY_COURT, start, end, status });
  }
  return out;
}

/** The first blocking booking that would collide with a candidate on the same court. */
export function findConflict(
  bookings: readonly Booking[],
  candidate: Pick<Booking, "courtId" | "date" | "startMinute" | "durationMinutes">,
  now: number,
  ignoreId?: string,
): Booking | null {
  const span = { start: bookingStart(candidate), end: bookingEnd(candidate) };
  return (
    bookings.find(
      (b) => b.id !== ignoreId && b.courtId === candidate.courtId && isBlocking(b, now) && overlaps(span, { start: bookingStart(b), end: bookingEnd(b) }),
    ) ?? null
  );
}

/** The first court in `courtIds` free for the whole span, or null. */
export function firstFreeCourt(
  bookings: readonly Booking[],
  courtIds: readonly CourtId[],
  slot: Pick<Booking, "date" | "startMinute" | "durationMinutes">,
  now: number,
): CourtId | null {
  return courtIds.find((courtId) => !findConflict(bookings, { ...slot, courtId }, now)) ?? null;
}

export function sortBookings(a: Booking, b: Booking): number {
  return compareDates(a.date, b.date) || a.startMinute - b.startMinute || a.courtId.localeCompare(b.courtId);
}

export function customerById(customers: readonly Customer[], id: string | null): Customer | undefined {
  return id ? customers.find((c) => c.id === id) : undefined;
}

let counter = 0;
/** Ids unique within a session; the prefix says what it is when it shows up in a log. */
export function makeId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}
