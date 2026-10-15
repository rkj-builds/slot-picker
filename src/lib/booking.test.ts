import { describe, expect, it } from "vitest";
import { anyCourtReservations, bookingStart, deskState, duePaise, findConflict, firstFreeCourt, paidPaise, paymentState, reservationsFrom } from "@/lib/booking";
import { aBooking } from "@/lib/test-helpers";

const NOW = 0;

describe("ledger-derived money", () => {
  it("sums what was paid, net of refunds", () => {
    const b = aBooking({
      pricePaise: 80_000,
      ledger: [
        { id: "1", at: 0, kind: "online", amountPaise: 40_000, note: "" },
        { id: "2", at: 0, kind: "cash", amountPaise: 10_000, note: "" },
      ],
    });
    expect(paidPaise(b)).toBe(50_000);
    expect(duePaise(b)).toBe(30_000);
    expect(paymentState(b)).toBe("part-paid");
    expect(paidPaise({ ...b, ledger: [...b.ledger, { id: "3", at: 0, kind: "refund", amountPaise: 50_000, note: "" }] })).toBe(0);
  });

  it("names every desk state", () => {
    expect(deskState(aBooking(), NOW)).toBe("due");
    expect(deskState(aBooking({ ledger: [{ id: "1", at: 0, kind: "online", amountPaise: 80_000, note: "" }] }), NOW)).toBe("paid");
    expect(deskState(aBooking({ status: "held", holdExpiresAt: 10 }), NOW)).toBe("held");
    expect(deskState(aBooking({ status: "held", holdExpiresAt: 10 }), 20)).toBe("expired");
    expect(deskState(aBooking({ kind: "coaching" }), NOW)).toBe("coaching");
    expect(deskState(aBooking({ status: "no-show" }), NOW)).toBe("no-show");
    expect(deskState(aBooking({ status: "cancelled" }), NOW)).toBe("cancelled");
  });
});

describe("conflicts", () => {
  const evening = aBooking({ id: "a", courtId: "court-1", startMinute: 19 * 60, durationMinutes: 60 });
  const heldGone = aBooking({ id: "h", courtId: "court-2", startMinute: 19 * 60, status: "held", holdExpiresAt: -1 });

  it("finds an overlap on the same court only", () => {
    expect(findConflict([evening], { courtId: "court-1", date: evening.date, startMinute: 19 * 60 + 30, durationMinutes: 60 }, NOW)?.id).toBe("a");
    expect(findConflict([evening], { courtId: "court-1", date: evening.date, startMinute: 20 * 60, durationMinutes: 60 }, NOW)).toBeNull();
    expect(findConflict([evening], { courtId: "court-2", date: evening.date, startMinute: 19 * 60, durationMinutes: 60 }, NOW)).toBeNull();
  });

  it("ignores expired holds and cancellations", () => {
    expect(reservationsFrom([heldGone, aBooking({ id: "c", status: "cancelled" })], NOW)).toEqual([]);
    expect(firstFreeCourt([evening, heldGone], ["court-1", "court-2"], evening, NOW)).toBe("court-2");
  });

  it("'any court' is taken only where every court is", () => {
    const c2 = aBooking({ id: "b", courtId: "court-2", startMinute: 19 * 60 + 30, durationMinutes: 60, status: "held", holdExpiresAt: 10 });
    const any = anyCourtReservations([evening, c2], ["court-1", "court-2"], NOW);
    expect(any).toHaveLength(1);
    expect(any[0]).toMatchObject({ spaceId: "any", status: "held", start: bookingStart({ date: evening.date, startMinute: 19 * 60 + 30 }) });
    expect(any[0]?.end).toBe(bookingStart({ date: evening.date, startMinute: 20 * 60 }));
  });
});
