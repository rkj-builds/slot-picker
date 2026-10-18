import { describe, expect, it } from "vitest";
import { type BookingRuleContext, bookingAction, bookingActions } from "@/app/desk/booking-rules";
import { TEST_NOW } from "@/app/test-utils";
import type { Viewer } from "@/data/types";
import type { Booking } from "@/lib/booking";

const ADMIN: BookingRuleContext["viewer"] = { role: "admin", can: { writeBookings: true, handleMoney: true, setPrices: true, refund: true, editProgrammes: true, manageTeam: true, editSettings: true } };
const DESK: BookingRuleContext["viewer"] = { role: "staff", can: { ...ADMIN.can, handleMoney: false, refund: false, editSettings: false, manageTeam: false } };
const COACH: Pick<Viewer, "role" | "can"> = { role: "coach", can: { ...DESK.can, writeBookings: false } };

/** Thursday 15 Oct 2026: TEST_NOW is 10:00 am. */
function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "bk_1",
    courtId: "court-1",
    date: "2026-10-15",
    startMinute: 19 * 60,
    durationMinutes: 60,
    customerId: "cus_05",
    kind: "booking",
    title: "",
    players: 4,
    notes: "",
    source: "desk",
    status: "confirmed",
    payMode: "venue",
    pricePaise: 80_000,
    holdExpiresAt: null,
    createdAt: 0,
    cancelledAt: null,
    ledger: [{ id: "le", at: 0, kind: "cash", amountPaise: 30_000, note: "Cash at the desk" }],
    ...overrides,
  };
}

const state = (ctx: Partial<BookingRuleContext> & { booking: Booking }): Record<string, string | null> =>
  Object.fromEntries(bookingActions({ viewer: ADMIN, now: TEST_NOW, hasCustomer: true, ...ctx }).map((a) => [a.id, a.reason]));

describe("booking action rules", () => {
  it("an upcoming booking with a balance: everything but a no-show, which waits for the start", () => {
    expect(state({ booking: booking() })).toEqual({
      "record-payment": null,
      "send-reminder": null,
      edit: null,
      "check-in": "Check-in opens an hour before 7:00 pm.",
      "no-show": "Available once it starts at 7:00 pm.",
      cancel: null,
    });
  });

  it("keeps the menu order: money, changes, after, destructive", () => {
    expect(bookingActions({ booking: booking(), viewer: ADMIN, now: TEST_NOW }).map((a) => a.group)).toEqual(["money", "money", "change", "change", "after", "destructive"]);
  });

  it("the past never blocks by itself (the desk works in arrears)", () => {
    const past = booking({ date: "2026-10-12" });
    const s = state({ booking: past });
    expect(s["record-payment"]).toBeNull();
    expect(s.edit).toBeNull();
    expect(s["no-show"]).toBeNull();
    expect(s["check-in"]).toBeNull();
    // A reminder about something that has happened makes no sense.
    expect(s["send-reminder"]).toBe("It has already happened.");
  });

  it("paid in full: nothing to record", () => {
    expect(bookingAction("record-payment", { booking: booking({ ledger: [{ id: "le", at: 0, kind: "online", amountPaise: 80_000, note: "" }] }), viewer: ADMIN, now: TEST_NOW })?.reason).toBe("Nothing is due.");
  });

  it("checked in: offers the undo, and a no-show needs that undone first", () => {
    const s = state({ booking: booking({ date: "2026-10-14" }), checkedIn: true });
    expect(s).toHaveProperty("undo-check-in", null);
    expect(s).not.toHaveProperty("check-in");
    expect(s["no-show"]).toBe("They checked in. Undo the check-in first.");
  });

  it("cancelled: put back, and nothing else until then", () => {
    const s = state({ booking: booking({ status: "cancelled", cancelledAt: 1 }) });
    expect(s).toHaveProperty("restore", null);
    expect(s).not.toHaveProperty("cancel");
    expect(s["record-payment"]).toBe("It's cancelled. Put it back first.");
    expect(s.edit).toBe("It's cancelled. Put it back first.");
  });

  it("a no-show can be undone", () => {
    const s = state({ booking: booking({ date: "2026-10-14", status: "no-show" }) });
    expect(s).toHaveProperty("undo-no-show", null);
    expect(s.edit).toBe("It was a no-show. Undo that first.");
  });

  it("a live hold: the customer is paying, so the desk waits", () => {
    const s = state({ booking: booking({ status: "held", holdExpiresAt: TEST_NOW + 60_000 }) });
    expect(s["record-payment"]).toBe("They're paying online now. Wait for the hold to finish.");
    expect(bookingAction("cancel", { booking: booking({ status: "held", holdExpiresAt: TEST_NOW + 60_000 }), viewer: ADMIN, now: TEST_NOW })?.label).toBe("Release hold");
  });

  it("front desk: money and refunds say who can", () => {
    const s = state({ booking: booking(), viewer: DESK });
    expect(s["record-payment"]).toBe("Front desk can't take or record money. Ask an admin.");
    // Money is in, so cancelling means credit or a refund.
    expect(s.cancel).toBe("Front desk can't refund or give credit. Ask an admin.");
    expect(s.edit).toBeNull();
    // With nothing paid, front desk can cancel.
    expect(bookingAction("cancel", { booking: booking({ ledger: [] }), viewer: DESK, now: TEST_NOW })?.enabled).toBe(true);
  });

  it("a coach can change nothing", () => {
    expect(bookingActions({ booking: booking(), viewer: COACH, now: TEST_NOW }).every((a) => !a.enabled)).toBe(true);
    expect(bookingAction("edit", { booking: booking(), viewer: COACH, now: TEST_NOW })?.reason).toBe("Coach can't change bookings. Ask an admin.");
  });

  it("blocks and coaching: only move and remove", () => {
    const block = booking({ kind: "blocked", title: "Repainting", customerId: null, pricePaise: 0, ledger: [] });
    const s = state({ booking: block, hasCustomer: false });
    expect(s["record-payment"]).toBe("Only for customer bookings.");
    expect(s.edit).toBeNull();
    expect(bookingAction("cancel", { booking: block, viewer: ADMIN, now: TEST_NOW })).toMatchObject({ label: "Remove block", enabled: true });
  });
});
