import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, priceFor, scheduleFromSettings } from "@/lib/venue";

describe("priceFor", () => {
  it("charges ₹700/hour on a weekday morning and ₹800/hour in the evening", () => {
    expect(priceFor(DEFAULT_SETTINGS, "2026-10-20", 7 * 60, 60)).toBe(70_000);
    expect(priceFor(DEFAULT_SETTINGS, "2026-10-20", 19 * 60, 90)).toBe(120_000);
  });
  it("splits a booking that crosses into the peak band", () => {
    // 4:30–6:00 PM Tuesday: 30 min off-peak + 60 min peak.
    expect(priceFor(DEFAULT_SETTINGS, "2026-10-20", 16 * 60 + 30, 90)).toBe(35_000 + 80_000);
  });
  it("is peak all day at the weekend", () => {
    expect(priceFor(DEFAULT_SETTINGS, "2026-10-17", 7 * 60, 60)).toBe(80_000);
  });
});

describe("scheduleFromSettings", () => {
  it("drops closed days", () => {
    const schedule = scheduleFromSettings({ ...DEFAULT_SETTINGS, hours: { ...DEFAULT_SETTINGS.hours, mon: { open: 360, close: 1380, closed: true } } });
    expect(schedule.weeklyHours.mon).toEqual([]);
    expect(schedule.weeklyHours.tue).toEqual([[360, 1380]]);
  });
});
