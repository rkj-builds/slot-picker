import { describe, expect, it } from "vitest";
import { paidPaise } from "@/lib/booking";
import { attemptHold, attemptPay, type HoldRequest, nextFreeStarts } from "@/lib/checkout";
import { reducer, type AppState } from "@/lib/store";
import { aBooking, aCustomer, aState } from "@/lib/test-helpers";
import { instantAt } from "@/lib/time-zone";

const NOW = instantAt("2026-10-16", 9 * 60, "Asia/Kolkata");
const SATURDAY = "2026-10-17" as const;
const request: HoldRequest = { courtId: null, date: SATURDAY, startMinute: 19 * 60, durationMinutes: 60, players: 4, name: "Kavya Menon", phone: "+919800000001", notes: "" };

function hold(state: AppState, req = request): { state: AppState; id: string } {
  const result = attemptHold(state, req, NOW);
  if (!result.ok) throw new Error("expected a hold");
  return { state: reducer(state, result.action), id: result.booking.id };
}

describe("checkout", () => {
  it("holds the first free court for the venue's hold time and creates the customer", () => {
    const state = aState({ bookings: [aBooking({ id: "x", courtId: "court-1", date: SATURDAY })] });
    const result = attemptHold(state, request, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.booking).toMatchObject({ courtId: "court-2", status: "held", pricePaise: 80_000, holdExpiresAt: NOW + 15 * 60_000 });
    expect(result.customer).toMatchObject({ name: "Kavya Menon", phone: "+919800000001" });
  });

  it("recognises a returning phone instead of creating a duplicate", () => {
    const result = attemptHold(aState(), { ...request, phone: aCustomer().phone }, NOW);
    expect(result.ok && result.customer.id).toBe("cus_a");
  });

  it("happy path: a weekend deposit confirms the booking with half paid", () => {
    const { state, id } = hold(aState());
    const paid = attemptPay(state, id, "part", NOW + 60_000, { method: "upi" });
    expect(paid).toMatchObject({ ok: true, amountPaise: 40_000 });
    if (!paid.ok) return;
    const after = reducer(state, paid.action);
    expect(after.bookings.find((b) => b.id === id)).toMatchObject({ status: "confirmed", payMode: "part" });
    expect(paidPaise(after.bookings.find((b) => b.id === id)!)).toBe(40_000);
  });

  it("refuses an option the policy did not offer", () => {
    const { state, id } = hold(aState());
    expect(attemptPay(state, id, "venue", NOW, { method: "upi" })).toMatchObject({ ok: false, reason: "not-allowed" });
  });

  it("a declined payment keeps the hold so the customer can retry", () => {
    const { state, id } = hold(aState());
    expect(attemptPay(state, id, "full", NOW, { method: "card", decline: true })).toMatchObject({ ok: false, reason: "payment-failed" });
    expect(attemptPay(state, id, "full", NOW, { method: "card" })).toMatchObject({ ok: true, amountPaise: 80_000 });
  });

  it("an expired hold cannot be paid, and offers nearby times", () => {
    const { state, id } = hold(aState());
    const late = attemptPay(state, id, "full", NOW + 16 * 60_000, { method: "upi" });
    expect(late).toMatchObject({ ok: false, reason: "hold-expired" });
    expect(late.ok ? [] : late.alternatives.length).toBeGreaterThan(0);
  });

  it("slot race: the hold is lost to someone else and the next free slots are offered", () => {
    const busy = aState({ bookings: [aBooking({ id: "c1", courtId: "court-1", date: SATURDAY, startMinute: 19 * 60, durationMinutes: 120 })] });
    const { state, id } = hold(busy, { ...request, courtId: "court-2" });
    const raced = attemptPay(state, id, "full", NOW, { method: "upi", race: true });
    expect(raced).toMatchObject({ ok: false, reason: "slot-taken" });
    if (raced.ok || !raced.action) throw new Error("expected a race");
    const after = reducer(state, raced.action);
    expect(after.bookings.find((b) => b.id === id)?.status).toBe("expired");
    // Both courts are now busy at 7 PM; the offers are the nearest free starts.
    // 6:30 PM would run into the 7 PM booking on Court 2, so the nearest three are 5:30, 6:00 and 8:00 PM.
    expect(raced.alternatives.map((a) => a.startMinute)).toEqual([17 * 60 + 30, 18 * 60, 20 * 60]);
  });

  it("refuses to hold a slot both courts already have", () => {
    const full = aState({
      bookings: [aBooking({ id: "a", courtId: "court-1", date: SATURDAY }), aBooking({ id: "b", courtId: "court-2", date: SATURDAY })],
    });
    const result = attemptHold(full, request, NOW);
    expect(result).toMatchObject({ ok: false, reason: "slot-taken" });
    expect(nextFreeStarts(full, request, NOW)).toHaveLength(3);
  });

  it("the 30-second scenario shortens the hold", () => {
    const result = attemptHold(aState(), { ...request, holdSeconds: 30 }, NOW);
    expect(result.ok && result.booking.holdExpiresAt).toBe(NOW + 30_000);
  });
});
