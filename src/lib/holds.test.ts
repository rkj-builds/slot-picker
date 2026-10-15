import { describe, expect, it } from "vitest";
import { describeCountdown, expireHolds, formatCountdown, holdRemainingMs, nextHoldExpiry } from "@/lib/holds";
import { aBooking } from "@/lib/test-helpers";

describe("holds", () => {
  const held = aBooking({ id: "h", status: "held", holdExpiresAt: 1_000_000 });

  it("counts down and stops at zero", () => {
    expect(holdRemainingMs(held, 100_000)).toBe(900_000);
    expect(holdRemainingMs(held, 2_000_000)).toBe(0);
    expect(formatCountdown(900_000)).toBe("15:00");
    expect(formatCountdown(7_001)).toBe("0:08");
    expect(formatCountdown(-5)).toBe("0:00");
    expect(describeCountdown(61_000)).toBe("1 minute 1 second left");
  });

  it("expires holds past their time and leaves the rest alone", () => {
    const live = aBooking({ id: "live", status: "held", holdExpiresAt: 5_000_000 });
    const confirmed = aBooking({ id: "c" });
    const before = [held, live, confirmed];
    const after = expireHolds(before, 2_000_000);
    expect(after.map((b) => b.status)).toEqual(["expired", "held", "confirmed"]);
    expect(after[0]?.holdExpiresAt).toBeNull();
  });

  it("returns the same array when nothing expired", () => {
    const list = [held];
    expect(expireHolds(list, 0)).toBe(list);
  });

  it("knows the next expiry", () => {
    expect(nextHoldExpiry([held, aBooking({ id: "x", status: "held", holdExpiresAt: 400_000 })], 0)).toBe(400_000);
    expect(nextHoldExpiry([held], 2_000_000)).toBeNull();
  });
});
