/**
 * The whole app's state and the one reducer that changes it. Pure: ids and
 * timestamps come in on the action, so every transition is reproducible in
 * a test. The React provider (src/app/store.tsx) adds latency, persistence
 * and the clock around it.
 */
import { type Booking, type Customer, makeId, paidPaise, type PayMode } from "@/lib/booking";
import { expireHolds } from "@/lib/holds";
import type { Paise } from "@/lib/money";
import type { PlainDate } from "@/lib/plain-date";
import type { VenueSettings } from "@/lib/venue";

export const STATE_VERSION = 3;

export interface AppState {
  version: number;
  /** The venue day the seed was generated for; a new day reseeds the demo. */
  seededOn: PlainDate;
  settings: VenueSettings;
  customers: Customer[];
  bookings: Booking[];
}

export type CancelResolution = "credit" | "refund";

export type Action =
  /** A self-serve booking takes a hold while the customer pays. */
  | { type: "hold"; booking: Booking; customer: Customer }
  | { type: "pay"; bookingId: string; mode: Exclude<PayMode, "venue">; amountPaise: Paise; at: number; entryId: string; note: string }
  /** Confirm without money: the customer pays at the venue. */
  | { type: "confirm-at-venue"; bookingId: string }
  | { type: "release-hold"; bookingId: string }
  | { type: "expire-holds"; now: number }
  /** Slot race: the hold is gone and someone else's booking took the court. */
  | { type: "lose-hold"; bookingId: string; competitor: Booking }
  /** A booking made at the desk, confirmed straight away. */
  | { type: "create"; booking: Booking; customer?: Customer }
  | { type: "record-cash"; bookingId: string; amountPaise: Paise; at: number; entryId: string }
  | { type: "mark-no-show"; bookingId: string }
  | { type: "cancel"; bookingId: string; resolution: CancelResolution; at: number; entryId: string }
  /** Undo: put a booking (and its customer) back exactly as they were. */
  | { type: "restore"; booking: Booking; customer?: Customer }
  | { type: "set-customer-flag"; customerId: string; flag: "payFirst" | "trusted"; value: boolean }
  | { type: "update-settings"; settings: VenueSettings }
  | { type: "reset"; state: AppState };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "hold":
      return { ...state, customers: upsertCustomer(state.customers, action.customer), bookings: [...state.bookings, action.booking] };

    case "pay":
      return updateBooking(state, action.bookingId, (b) => ({
        ...b,
        status: "confirmed",
        payMode: action.mode,
        holdExpiresAt: null,
        ledger: [...b.ledger, { id: action.entryId, at: action.at, kind: "online", amountPaise: action.amountPaise, note: action.note }],
      }));

    case "confirm-at-venue":
      return updateBooking(state, action.bookingId, (b) => ({ ...b, status: "confirmed", payMode: "venue", holdExpiresAt: null }));

    case "release-hold":
      return updateBooking(state, action.bookingId, (b) => (b.status === "held" ? { ...b, status: "expired", holdExpiresAt: null } : b));

    case "expire-holds": {
      const bookings = expireHolds(state.bookings, action.now);
      return bookings === state.bookings ? state : { ...state, bookings };
    }

    case "lose-hold": {
      const next = updateBooking(state, action.bookingId, (b) => ({ ...b, status: "expired", holdExpiresAt: null }));
      return { ...next, bookings: [...next.bookings, action.competitor] };
    }

    case "create":
      return {
        ...state,
        customers: action.customer ? upsertCustomer(state.customers, action.customer) : state.customers,
        bookings: [...state.bookings, action.booking],
      };

    case "record-cash":
      if (action.amountPaise <= 0) return state;
      return updateBooking(state, action.bookingId, (b) => ({
        ...b,
        ledger: [...b.ledger, { id: action.entryId, at: action.at, kind: "cash", amountPaise: action.amountPaise, note: "Cash at the desk" }],
      }));

    case "mark-no-show":
      return updateBooking(state, action.bookingId, (b) => (b.kind === "booking" && b.status === "confirmed" ? { ...b, status: "no-show" } : b));

    case "cancel": {
      const booking = state.bookings.find((b) => b.id === action.bookingId);
      if (!booking || booking.status === "cancelled") return state;
      const paid = paidPaise(booking);
      const entry =
        paid > 0
          ? {
              id: action.entryId,
              at: action.at,
              kind: action.resolution === "credit" ? ("credit-issued" as const) : ("refund" as const),
              amountPaise: paid,
              note: action.resolution === "credit" ? "Kept as credit for the next booking" : "Refunded to the original payment method",
            }
          : null;
      const next = updateBooking(state, booking.id, (b) => ({
        ...b,
        status: "cancelled",
        holdExpiresAt: null,
        cancelledAt: action.at,
        ledger: entry ? [...b.ledger, entry] : b.ledger,
      }));
      if (!entry || action.resolution !== "credit" || !booking.customerId) return next;
      return {
        ...next,
        customers: next.customers.map((c) => (c.id === booking.customerId ? { ...c, creditPaise: c.creditPaise + paid } : c)),
      };
    }

    case "restore":
      return {
        ...state,
        customers: action.customer ? upsertCustomer(state.customers, action.customer) : state.customers,
        bookings: state.bookings.some((b) => b.id === action.booking.id)
          ? state.bookings.map((b) => (b.id === action.booking.id ? action.booking : b))
          : [...state.bookings, action.booking],
      };

    case "set-customer-flag":
      return {
        ...state,
        customers: state.customers.map((c) => (c.id === action.customerId ? { ...c, [action.flag]: action.value } : c)),
      };

    case "update-settings":
      return { ...state, settings: action.settings };

    case "reset":
      return action.state;
  }
}

function updateBooking(state: AppState, id: string, change: (b: Booking) => Booking): AppState {
  let changed = false;
  const bookings = state.bookings.map((b) => {
    if (b.id !== id) return b;
    const next = change(b);
    changed ||= next !== b;
    return next;
  });
  return changed ? { ...state, bookings } : state;
}

function upsertCustomer(customers: Customer[], customer: Customer): Customer[] {
  return customers.some((c) => c.id === customer.id)
    ? customers.map((c) => (c.id === customer.id ? customer : c))
    : [...customers, customer];
}

/** Find a returning customer by canonical phone. */
export function customerByPhone(state: Pick<AppState, "customers">, phone: string): Customer | undefined {
  return state.customers.find((c) => c.phone === phone);
}

export function newCustomer(name: string, phone: string, now: number): Customer {
  return { id: makeId("cus"), name: name.trim(), phone, payFirst: false, trusted: false, creditPaise: 0, createdAt: now };
}

/** Parse what came out of storage; anything unexpected is treated as absent. */
export function parseStoredState(raw: string | null): AppState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AppState> | null;
    if (value?.version !== STATE_VERSION || !Array.isArray(value.bookings) || !Array.isArray(value.customers) || !value.settings) {
      return null;
    }
    return value as AppState;
  } catch {
    return null;
  }
}
