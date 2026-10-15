/** Builders for domain tests: a booking or customer with sensible defaults. */
import type { Booking, Customer } from "@/lib/booking";
import type { AppState } from "@/lib/store";
import { STATE_VERSION } from "@/lib/store";
import { DEFAULT_SETTINGS } from "@/lib/venue";

export function aBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "bk_1",
    courtId: "court-1",
    date: "2026-10-20",
    startMinute: 19 * 60,
    durationMinutes: 60,
    customerId: "cus_a",
    kind: "booking",
    title: "",
    players: 4,
    notes: "",
    source: "self-serve",
    status: "confirmed",
    payMode: "venue",
    pricePaise: 80_000,
    holdExpiresAt: null,
    createdAt: 0,
    cancelledAt: null,
    ledger: [],
    ...overrides,
  };
}

export function aCustomer(overrides: Partial<Customer> = {}): Customer {
  return { id: "cus_a", name: "Diya Patel", phone: "+919000000101", payFirst: false, trusted: false, creditPaise: 0, createdAt: 0, ...overrides };
}

export function aState(overrides: Partial<AppState> = {}): AppState {
  return { version: STATE_VERSION, seededOn: "2026-10-15", settings: DEFAULT_SETTINGS, customers: [aCustomer()], bookings: [], ...overrides };
}
