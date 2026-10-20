import { describe, expect, it } from "vitest";
import { canonicalZone, dayShift, instantAt, instantFromWallClock, sameWallClock, wallClockIn, ZONE_ALIASES, zoneCityLabel, zoneOffsetLabel, zoneOffsetMinutes } from "@/lib/time-zone";
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

describe("offsets come from the platform, including the odd ones", () => {
  it.each([
    ["Asia/Kolkata", "2026-06-01T00:00:00Z", 330],
    ["Asia/Kathmandu", "2026-06-01T00:00:00Z", 345],
    ["America/New_York", "2026-01-15T12:00:00Z", -300],
    ["America/New_York", "2026-07-15T12:00:00Z", -240],
    ["Australia/Lord_Howe", "2026-07-01T00:00:00Z", 630], // half-hour daylight saving
    ["Australia/Lord_Howe", "2026-12-01T00:00:00Z", 660],
    ["Pacific/Chatham", "2026-07-01T00:00:00Z", 765],
  ])("%s at %s is %i minutes", (zone, at, minutes) => {
    expect(zoneOffsetMinutes(Date.parse(at), zone)).toBe(minutes);
  });
});

describe("wall clock to instant, at the edges", () => {
  it("a half-hour jump (Lord Howe Island, 4 Oct 2026): 2:15 AM does not exist and lands at 2:45 AM", () => {
    // Clocks go from 2:00 to 2:30, so the missing quarter past two moves forward by the 30-minute gap.
    const instant = instantAt("2026-10-04", 2 * 60 + 15, "Australia/Lord_Howe");
    expect(wallClockIn(instant, "Australia/Lord_Howe")).toMatchObject({ day: 4, hour: 2, minute: 45 });
  });

  it("round-trips every half hour of a daylight-saving day (New York, 8 Mar 2026)", () => {
    for (let minute = 0; minute < 24 * 60; minute += 30) {
      if (minute === 120 || minute === 150) continue; // the hour that does not exist
      const instant = instantAt("2026-03-08", minute, NEW_YORK);
      expect(wallClockIn(instant, NEW_YORK)).toEqual({ year: 2026, month: 3, day: 8, hour: Math.floor(minute / 60), minute: minute % 60 });
    }
  });
});

describe("renamed zones", () => {
  it("maps the old names engines still list to the ones the cities use", () => {
    expect(canonicalZone("Asia/Katmandu")).toBe("Asia/Kathmandu");
    expect(canonicalZone("America/Godthab")).toBe("America/Nuuk");
    expect(canonicalZone("Asia/Calcutta")).toBe("Asia/Kolkata");
    expect(canonicalZone("Europe/Kiev")).toBe("Europe/Kyiv");
    expect(canonicalZone("Asia/Tokyo")).toBe("Asia/Tokyo");
  });

  it("every current name is one this engine accepts, at the same offset as the old one", () => {
    const at = Date.UTC(2026, 9, 18);
    for (const [old, current] of Object.entries(ZONE_ALIASES)) expect(zoneOffsetMinutes(at, current)).toBe(zoneOffsetMinutes(at, old));
  });

  it("labels a city by its current name, whichever id it came in under", () => {
    expect(zoneCityLabel("Asia/Katmandu")).toBe("Kathmandu");
    expect(zoneCityLabel("America/Godthab")).toBe("Nuuk");
    expect(zoneCityLabel("Asia/Ho_Chi_Minh")).toBe("Ho Chi Minh");
  });
});

describe("dayShift", () => {
  it("is nothing when the viewer is on the venue's day", () => {
    expect(dayShift(instantAt("2026-10-31", 19 * 60, KOLKATA), KOLKATA, NEW_YORK)).toEqual({ days: 0, text: "", spoken: "" });
    expect(dayShift(instantAt("2026-10-31", 19 * 60, KOLKATA), KOLKATA, KOLKATA).days).toBe(0);
  });

  it("6:00 am on Sat in Kolkata is Friday evening in New York: −1 day, the day before", () => {
    const instant = instantAt("2026-10-31", 6 * 60, KOLKATA);
    expect(wallClockIn(instant, NEW_YORK)).toMatchObject({ day: 30, hour: 20, minute: 30 });
    expect(dayShift(instant, KOLKATA, NEW_YORK)).toEqual({ days: -1, text: "\u22121 day", spoken: "the day before" });
  });

  it("10:00 pm on Sat in Kolkata is already Sunday in Auckland: +1 day, the day after", () => {
    expect(dayShift(instantAt("2026-10-31", 22 * 60, KOLKATA), KOLKATA, "Pacific/Auckland")).toEqual({ days: 1, text: "+1 day", spoken: "the day after" });
  });

  it("can be two days across the date line's extremes", () => {
    // 11:30 pm on Sat in Pago Pago (UTC−11) is 00:30 on Mon on Kiritimati (UTC+14).
    expect(dayShift(instantAt("2026-10-31", 23 * 60 + 30, "Pacific/Pago_Pago"), "Pacific/Pago_Pago", "Pacific/Kiritimati")).toEqual({ days: 2, text: "+2 days", spoken: "2 days after" });
  });
});
