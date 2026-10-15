import { describe, expect, it } from "vitest";
import { duePaise, paidPaise } from "@/lib/booking";
import { parseStoredState, reducer } from "@/lib/store";
import { aBooking, aCustomer, aState } from "@/lib/test-helpers";

describe("reducer", () => {
  it("pays a held booking and confirms it", () => {
    const state = aState({ bookings: [aBooking({ status: "held", holdExpiresAt: 99 })] });
    const next = reducer(state, { type: "pay", bookingId: "bk_1", mode: "part", amountPaise: 40_000, at: 5, entryId: "le1", note: "Deposit by UPI" });
    const b = next.bookings[0]!;
    expect(b.status).toBe("confirmed");
    expect(b.holdExpiresAt).toBeNull();
    expect(paidPaise(b)).toBe(40_000);
    expect(duePaise(b)).toBe(40_000);
  });

  it("records cash against the balance", () => {
    const state = aState({ bookings: [aBooking()] });
    const next = reducer(state, { type: "record-cash", bookingId: "bk_1", amountPaise: 80_000, at: 5, entryId: "le1" });
    expect(duePaise(next.bookings[0]!)).toBe(0);
    expect(reducer(state, { type: "record-cash", bookingId: "bk_1", amountPaise: 0, at: 5, entryId: "le2" })).toBe(state);
  });

  it("cancelling as credit keeps the money and credits the customer", () => {
    const paid = aBooking({ ledger: [{ id: "x", at: 0, kind: "online", amountPaise: 40_000, note: "" }] });
    const next = reducer(aState({ bookings: [paid] }), { type: "cancel", bookingId: "bk_1", resolution: "credit", at: 9, entryId: "le9" });
    expect(next.bookings[0]).toMatchObject({ status: "cancelled", cancelledAt: 9 });
    expect(next.bookings[0]?.ledger.at(-1)).toMatchObject({ kind: "credit-issued", amountPaise: 40_000 });
    expect(next.customers[0]?.creditPaise).toBe(40_000);
  });

  it("cancelling as a refund returns the money and adds no credit", () => {
    const paid = aBooking({ ledger: [{ id: "x", at: 0, kind: "online", amountPaise: 40_000, note: "" }] });
    const next = reducer(aState({ bookings: [paid] }), { type: "cancel", bookingId: "bk_1", resolution: "refund", at: 9, entryId: "le9" });
    expect(paidPaise(next.bookings[0]!)).toBe(0);
    expect(next.customers[0]?.creditPaise).toBe(0);
  });

  it("undo restores the booking and the customer exactly", () => {
    const original = aBooking({ ledger: [{ id: "x", at: 0, kind: "online", amountPaise: 40_000, note: "" }] });
    const customer = aCustomer();
    const cancelled = reducer(aState({ bookings: [original], customers: [customer] }), { type: "cancel", bookingId: "bk_1", resolution: "credit", at: 9, entryId: "le9" });
    const restored = reducer(cancelled, { type: "restore", booking: original, customer });
    expect(restored.bookings[0]).toEqual(original);
    expect(restored.customers[0]).toEqual(customer);
  });

  it("marks only confirmed bookings as no-shows", () => {
    expect(reducer(aState({ bookings: [aBooking()] }), { type: "mark-no-show", bookingId: "bk_1" }).bookings[0]?.status).toBe("no-show");
    const held = aState({ bookings: [aBooking({ status: "held", holdExpiresAt: 9 })] });
    expect(reducer(held, { type: "mark-no-show", bookingId: "bk_1" })).toBe(held);
  });

  it("flags a customer pay-first", () => {
    expect(reducer(aState(), { type: "set-customer-flag", customerId: "cus_a", flag: "payFirst", value: true }).customers[0]?.payFirst).toBe(true);
  });

  it("expires holds without touching state when none are due", () => {
    const state = aState({ bookings: [aBooking({ status: "held", holdExpiresAt: 100 })] });
    expect(reducer(state, { type: "expire-holds", now: 50 })).toBe(state);
    expect(reducer(state, { type: "expire-holds", now: 150 }).bookings[0]?.status).toBe("expired");
  });

  it("slot race: loses the hold and adds the competitor", () => {
    const state = aState({ bookings: [aBooking({ status: "held", holdExpiresAt: 100 })] });
    const next = reducer(state, { type: "lose-hold", bookingId: "bk_1", competitor: aBooking({ id: "other" }) });
    expect(next.bookings.map((b) => [b.id, b.status])).toEqual([["bk_1", "expired"], ["other", "confirmed"]]);
  });
});

describe("parseStoredState", () => {
  it("survives garbage and old versions", () => {
    expect(parseStoredState(null)).toBeNull();
    expect(parseStoredState("{not json")).toBeNull();
    expect(parseStoredState(JSON.stringify({ version: 1 }))).toBeNull();
    expect(parseStoredState(JSON.stringify(aState()))).toEqual(aState());
  });
});
