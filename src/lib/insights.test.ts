import { describe, expect, it } from "vitest";
import { computeInsights, formatPercent, mondayOf } from "@/lib/insights";
import { todayIn } from "@/lib/plain-date";
import { seedState } from "@/lib/seed";
import { instantAt } from "@/lib/time-zone";

const NOW = instantAt("2026-10-15", 18 * 60, "Asia/Kolkata");

describe("the seeded history matches the real finding", () => {
  const state = seedState(NOW);
  const insights = computeInsights(state.bookings, todayIn("Asia/Kolkata", NOW));

  it("unpaid self-serve bookings cancel around 45% of the time, paid ones around 7%", () => {
    expect(insights.unpaid.cancelRate).toBeGreaterThan(0.4);
    expect(insights.unpaid.cancelRate).toBeLessThan(0.5);
    expect(insights.paid.cancelRate).toBeGreaterThan(0.04);
    expect(insights.paid.cancelRate).toBeLessThan(0.1);
  });

  it("no-shows only happen when nothing was paid", () => {
    expect(insights.unpaid.noShows).toBeGreaterThanOrEqual(10);
    expect(insights.paid.noShows).toBe(0);
  });

  it("deposits recovered money that unpaid bookings lost", () => {
    expect(insights.lostPaise).toBeGreaterThan(insights.recoveredPaise);
    expect(insights.recoveredPaise).toBeGreaterThan(0);
  });

  it("seeds one live hold and no overlapping bookings", () => {
    expect(state.bookings.filter((b) => b.status === "held")).toHaveLength(1);
    const live = state.bookings.filter((b) => b.status !== "cancelled");
    for (const a of live) {
      for (const b of live) {
        if (a === b || a.courtId !== b.courtId || a.date !== b.date) continue;
        expect(a.startMinute + a.durationMinutes <= b.startMinute || b.startMinute + b.durationMinutes <= a.startMinute).toBe(true);
      }
    }
  });

  it("is deterministic", () => {
    expect(seedState(NOW).bookings.map((b) => b.id)).toEqual(state.bookings.map((b) => b.id));
  });
});

describe("helpers", () => {
  it("weeks start on Monday", () => {
    expect(mondayOf("2026-10-18")).toBe("2026-10-12");
    expect(mondayOf("2026-10-12")).toBe("2026-10-12");
  });
  it("percent has no decimals", () => {
    expect(formatPercent(0.4477)).toBe("45%");
  });
});
