/**
 * The operations behind the customer's checkout, as pure functions over the
 * state. Each one either returns the action to dispatch or says exactly why
 * it cannot: the slot was taken, the hold ran out, the payment failed.
 * The store wraps them in latency; tests call them directly.
 */
import { type Booking, type Customer, findConflict, firstFreeCourt, isHoldActive, makeId, type PayMode, reservationsFrom } from "@/lib/booking";
import { computeDaySlots } from "@/lib/availability";
import { holdExpiry } from "@/lib/holds";
import type { Paise } from "@/lib/money";
import type { PlainDate } from "@/lib/plain-date";
import { decidePayment, type PolicyCustomer } from "@/lib/policy";
import { type Action, type AppState, customerByPhone, newCustomer } from "@/lib/store";
import { COURTS, type CourtId, priceFor, scheduleFromSettings } from "@/lib/venue";

export interface HoldRequest {
  /** A specific court, or null for whichever is free. */
  courtId: CourtId | null;
  date: PlainDate;
  startMinute: number;
  durationMinutes: number;
  players: number;
  name: string;
  phone: string;
  notes: string;
  /** Override the venue's hold length (the demo's 30-second scenario). */
  holdSeconds?: number;
}

export interface Alternative {
  courtId: CourtId;
  date: PlainDate;
  startMinute: number;
  durationMinutes: number;
}

export type HoldResult =
  | { ok: true; booking: Booking; customer: Customer; action: Action }
  | { ok: false; reason: "slot-taken"; alternatives: Alternative[] };

export function attemptHold(state: AppState, request: HoldRequest, now: number): HoldResult {
  const courtIds = request.courtId ? [request.courtId] : COURTS.map((c) => c.id);
  const courtId = firstFreeCourt(state.bookings, courtIds, request, now);
  if (!courtId) return { ok: false, reason: "slot-taken", alternatives: nextFreeStarts(state, request, now) };

  const existing = customerByPhone(state, request.phone);
  const customer: Customer = existing ? { ...existing, name: request.name.trim() || existing.name } : newCustomer(request.name, request.phone, now);
  const pricePaise = priceFor(state.settings, request.date, request.startMinute, request.durationMinutes);
  const holdMs = request.holdSeconds !== undefined ? request.holdSeconds * 1000 : state.settings.holdMinutes * 60_000;
  const booking: Booking = {
    id: makeId("bk"),
    courtId,
    date: request.date,
    startMinute: request.startMinute,
    durationMinutes: request.durationMinutes,
    customerId: customer.id,
    kind: "booking",
    title: "",
    players: request.players,
    notes: request.notes.trim(),
    source: "self-serve",
    status: "held",
    payMode: "full",
    pricePaise,
    holdExpiresAt: holdExpiry(now, holdMs / 60_000),
    createdAt: now,
    cancelledAt: null,
    ledger: [],
  };
  return { ok: true, booking, customer, action: { type: "hold", booking, customer } };
}

export type PayFailure = "payment-failed" | "hold-expired" | "slot-taken" | "not-allowed";

export type PayResult =
  | { ok: true; amountPaise: Paise; action: Action }
  | { ok: false; reason: PayFailure; alternatives: Alternative[]; action?: Action };

export interface PayOptions {
  /** Demo: the gateway declines this attempt. */
  decline?: boolean;
  /** Demo: another customer books the court while this one is paying. */
  race?: boolean;
  method: "upi" | "card";
}

/** Settle a held booking with the chosen mode. "venue" confirms without money. */
export function attemptPay(state: AppState, bookingId: string, mode: PayMode, now: number, options: PayOptions): PayResult {
  const booking = state.bookings.find((b) => b.id === bookingId);
  if (booking?.status !== "held" || !isHoldActive(booking, now)) {
    return { ok: false, reason: "hold-expired", alternatives: booking ? nextFreeStarts(state, booking, now, bookingId) : [] };
  }
  const decision = decidePayment(state.settings, booking, policyCustomerFor(state, booking.customerId, bookingId));
  if (!decision.modes.includes(mode)) return { ok: false, reason: "not-allowed", alternatives: [] };

  if (options.race) {
    const competitor: Booking = {
      ...booking,
      id: makeId("bk"),
      customerId: null,
      title: "Another customer",
      notes: "",
      status: "confirmed",
      holdExpiresAt: null,
      createdAt: now,
      ledger: [{ id: makeId("le"), at: now, kind: "online", amountPaise: booking.pricePaise, note: "Paid online" }],
    };
    const action: Action = { type: "lose-hold", bookingId, competitor };
    const after: AppState = { ...state, bookings: [...state.bookings.map((b) => (b.id === bookingId ? { ...b, status: "expired" as const } : b)), competitor] };
    return { ok: false, reason: "slot-taken", alternatives: nextFreeStarts(after, booking, now), action };
  }
  // A hold blocks everyone else, so a conflict here means the data is wrong; refuse rather than double-book.
  if (findConflict(state.bookings, booking, now, bookingId)) {
    return { ok: false, reason: "slot-taken", alternatives: nextFreeStarts(state, booking, now, bookingId) };
  }
  if (mode === "venue") return { ok: true, amountPaise: 0, action: { type: "confirm-at-venue", bookingId } };
  if (options.decline) return { ok: false, reason: "payment-failed", alternatives: [] };

  const amountPaise = mode === "part" ? decision.depositPaise : booking.pricePaise;
  const note = `${mode === "part" ? "Deposit" : "Paid in full"} by ${options.method === "upi" ? "UPI" : "card"}`;
  return { ok: true, amountPaise, action: { type: "pay", bookingId, mode, amountPaise, at: now, entryId: makeId("le"), note } };
}

/**
 * The customer as the policy sees them: null for someone with no earlier
 * bookings (a first-timer), otherwise their flags.
 */
export function policyCustomerFor(state: Pick<AppState, "customers" | "bookings">, customerId: string | null, ignoreBookingId?: string): PolicyCustomer | null {
  const customer = customerId ? state.customers.find((c) => c.id === customerId) : undefined;
  if (!customer) return null;
  if (customer.payFirst || customer.trusted) return { payFirst: customer.payFirst, trusted: customer.trusted };
  const returning = state.bookings.some((b) => b.customerId === customer.id && b.id !== ignoreBookingId && b.status !== "expired");
  return returning ? { payFirst: false, trusted: false } : null;
}

/**
 * The next few free starts for the same duration, same day first, nearest
 * to the time that was lost, on any court.
 */
export function nextFreeStarts(
  state: AppState,
  around: Pick<Booking, "date" | "startMinute" | "durationMinutes">,
  now: number,
  ignoreId?: string,
  limit = 3,
): Alternative[] {
  const schedule = scheduleFromSettings(state.settings);
  const reservations = reservationsFrom(
    state.bookings.filter((b) => b.id !== ignoreId),
    now,
  );
  const found: Alternative[] = [];
  for (const court of COURTS) {
    const slots = computeDaySlots({ schedule, date: around.date, spaceId: court.id, durationMinutes: around.durationMinutes, reservations, now });
    for (const s of slots) {
      if (s.status === "available") found.push({ courtId: court.id, date: around.date, startMinute: s.minuteOfDay, durationMinutes: around.durationMinutes });
    }
  }
  // Nearest first; one entry per start time (the first court that has it).
  const seen = new Set<number>();
  return found
    .sort((a, b) => Math.abs(a.startMinute - around.startMinute) - Math.abs(b.startMinute - around.startMinute) || a.startMinute - b.startMinute)
    .filter((a) => (seen.has(a.startMinute) ? false : (seen.add(a.startMinute), true)))
    .slice(0, limit)
    .sort((a, b) => a.startMinute - b.startMinute);
}
