import { describe, expect, it } from "vitest";
import { instantAt, instantFromWallClock, sameWallClock, wallClockIn, zoneOffsetLabel, zoneOffsetMinutes } from "@/lib/time-zone";
import { formatTime } from "@/lib/format";

const KOLKATA = "Asia/Kolkata";
const NEW_YORK = "America/New_York";

describe("zoneOffsetMinutes", () => {
  it("Kolkata is +5:30 all year", () => {
    expect(zoneOffsetMinutes(Date.UTC(2026, 0, 15), KOLKATA)).toBe(330);
    expect(zoneOffsetMinutes(Date.UTC(2026, 6, 15), KOLKATA)).toBe(330);
  });

  it("New York is −4 in summer and −5 in winter", () => {
    expect(zoneOffsetMinutes(Date.UTC(2026, 9, 31, 12), NEW_YORK)).toBe(-240);
    expect(zoneOffsetMinutes(Date.UTC(2026, 10, 2, 12), NEW_YORK)).toBe(-300);
  });
});

describe("a Kolkata evening seen from New York across the 1 Nov 2026 DST change", () => {
  it("7:00 PM IST on Sat 31 Oct is 9:30 AM EDT", () => {
    const start = instantAt("2026-10-31", 19 * 60, KOLKATA);
    expect(formatTime(start, { locale: "en-US", timeZone: NEW_YORK })).toBe("9:30 AM");
    expect(wallClockIn(start, NEW_YORK)).toMatchObject({ month: 10, day: 31, hour: 9, minute: 30 });
  });

  it("7:00 PM IST on Mon 2 Nov is 8:30 AM EST", () => {
    const start = instantAt("2026-11-02", 19 * 60, KOLKATA);
    expect(formatTime(start, { locale: "en-US", timeZone: NEW_YORK })).toBe("8:30 AM");
  });

  it("the venue's own clock never moves", () => {
    for (const date of ["2026-10-31", "2026-11-01", "2026-11-02"] as const) {
      const start = instantAt(date, 19 * 60, KOLKATA);
      expect(formatTime(start, { locale: "en-US", timeZone: KOLKATA })).toBe("7:00 PM");
    }
  });

  it("labels the offsets the viewer will see", () => {
    expect(zoneOffsetLabel(instantAt("2026-10-31", 0, KOLKATA), NEW_YORK, "en-US")).toBe("GMT-4");
    expect(zoneOffsetLabel(instantAt("2026-11-02", 0, KOLKATA), NEW_YORK, "en-US")).toBe("GMT-5");
    expect(zoneOffsetLabel(Date.UTC(2026, 0, 1), KOLKATA, "en-US")).toBe("GMT+5:30");
  });
});

describe("instantFromWallClock on the New York transitions", () => {
  it("round-trips an ordinary wall time", () => {
    const wall = { year: 2026, month: 6, day: 10, hour: 14, minute: 45 };
    expect(wallClockIn(instantFromWallClock(wall, NEW_YORK), NEW_YORK)).toEqual(wall);
  });

  it("spring-forward gap, 8 Mar 2026: 2:30 AM does not exist and lands at 3:30 AM EDT", () => {
    const instant = instantFromWallClock({ year: 2026, month: 3, day: 8, hour: 2, minute: 30 }, NEW_YORK);
    expect(wallClockIn(instant, NEW_YORK)).toMatchObject({ hour: 3, minute: 30 });
    expect(instant).toBe(Date.UTC(2026, 2, 8, 7, 30));
  });

  it("fall-back overlap, 1 Nov 2026: 1:30 AM happens twice and we take the earlier (EDT)", () => {
    const instant = instantFromWallClock({ year: 2026, month: 11, day: 1, hour: 1, minute: 30 }, NEW_YORK);
    expect(instant).toBe(Date.UTC(2026, 10, 1, 5, 30));
    expect(zoneOffsetMinutes(instant, NEW_YORK)).toBe(-240);
  });

  it("the half-hour zone round-trips too", () => {
    const wall = { year: 2026, month: 10, day: 18, hour: 19, minute: 0 };
    expect(instantFromWallClock(wall, KOLKATA)).toBe(Date.UTC(2026, 9, 18, 13, 30));
  });
});

describe("sameWallClock", () => {
  it("Kolkata and Colombo read the same clock", () => {
    expect(sameWallClock(Date.UTC(2026, 9, 18), KOLKATA, "Asia/Colombo")).toBe(true);
  });
  it("Kolkata and London do not", () => {
    expect(sameWallClock(Date.UTC(2026, 9, 18), KOLKATA, "Europe/London")).toBe(false);
  });
});
