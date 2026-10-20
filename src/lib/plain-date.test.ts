import { describe, expect, it } from "vitest";
import { addMonths, clampDate, daysInMonth, endOfMonth, startOfMonth, weekdayIndex, weekStartsOn } from "@/lib/plain-date";

describe("month arithmetic", () => {
  it("adds a month without running into the next one", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
    expect(addMonths("2026-03-31", -13)).toBe("2025-02-28");
  });

  it("knows the length and the ends of a month", () => {
    expect([daysInMonth(2026, 2), daysInMonth(2028, 2), daysInMonth(2026, 4), daysInMonth(2026, 12)]).toEqual([28, 29, 30, 31]);
    expect(startOfMonth("2026-10-21")).toBe("2026-10-01");
    expect(endOfMonth("2026-11-05")).toBe("2026-11-30");
  });

  it("clamps a date into a range, either end optional", () => {
    expect(clampDate("2026-10-01", "2026-10-15", "2026-12-31")).toBe("2026-10-15");
    expect(clampDate("2027-02-01", "2026-10-15", "2026-12-31")).toBe("2026-12-31");
    expect(clampDate("2026-11-01", "2026-10-15")).toBe("2026-11-01");
    expect(clampDate("2026-11-01")).toBe("2026-11-01");
  });
});

describe("weekStartsOn", () => {
  it("starts the week where the locale does", () => {
    expect(weekStartsOn("en-US")).toBe("sun");
    expect(weekStartsOn("en-IN")).toBe("sun");
    expect(weekStartsOn("en-GB")).toBe("mon");
    expect(weekStartsOn("de-DE")).toBe("mon");
    expect(weekdayIndex("sun")).toBe(0);
    expect(weekdayIndex("sat")).toBe(6);
  });
});
