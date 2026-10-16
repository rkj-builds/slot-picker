import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatTimeRange } from "@/lib/format";
import {
  describeLength,
  expandRecurrence,
  lastDate,
  nextOccurrences,
  occursOn,
  type RecurrenceRule,
  summarizeRecurrence,
  useRecurrence,
  validateRule,
} from "@/primitives/recurrence";

/** The real Off-Screen Club Juniors hold: Sat and Sun, 4 – 5 pm at the venue, until ended. */
const OSC: RecurrenceRule = {
  interval: 1,
  weekdays: ["sat", "sun"],
  startDate: "2026-10-17",
  startMinute: 16 * 60,
  endMinute: 17 * 60,
  timeZone: "Asia/Kolkata",
  end: { type: "never" },
  exceptions: [],
};

const dates = (rule: RecurrenceRule, from: `${number}-${number}-${number}`, to: `${number}-${number}-${number}`): string[] =>
  expandRecurrence(rule, { from, to }).map((o) => o.date);

describe("expansion", () => {
  it("weekly by day, from the start date, inside the window", () => {
    expect(dates(OSC, "2026-10-15", "2026-10-26")).toEqual(["2026-10-17", "2026-10-18", "2026-10-24", "2026-10-25"]);
    expect(dates(OSC, "2026-10-01", "2026-10-16")).toEqual([]);
  });

  it("every other week keeps to the start's week", () => {
    expect(dates({ ...OSC, interval: 2 }, "2026-10-17", "2026-11-08")).toEqual(["2026-10-17", "2026-10-18", "2026-10-31", "2026-11-01"]);
  });

  it("until is inclusive", () => {
    expect(dates({ ...OSC, end: { type: "until", date: "2026-10-24" } }, "2026-10-17", "2026-12-31")).toEqual(["2026-10-17", "2026-10-18", "2026-10-24"]);
  });

  it("count counts from the start, and exceptions are removed after it (RFC 5545)", () => {
    const rule: RecurrenceRule = { ...OSC, end: { type: "count", count: 3 }, exceptions: ["2026-10-18"] };
    expect(dates(rule, "2026-10-17", "2026-12-31")).toEqual(["2026-10-17", "2026-10-24"]);
    expect(dates(rule, "2026-10-20", "2026-12-31")).toEqual(["2026-10-24"]);
    expect(lastDate(rule)).toBe("2026-10-24");
  });

  it("instants are 4 – 5 pm in Kolkata on every date", () => {
    const [first] = expandRecurrence(OSC, { from: "2026-10-17", to: "2026-10-17" });
    expect(new Date(first!.start).toISOString()).toBe("2026-10-17T10:30:00.000Z");
    expect(first!.end - first!.start).toBe(60 * 60_000);
  });

  it("a broken rule expands to nothing and says why", () => {
    const broken: RecurrenceRule = { ...OSC, weekdays: [], endMinute: 15 * 60, end: { type: "until", date: "2026-10-01" } };
    expect(validateRule(broken)).toEqual(["no-weekdays", "ends-before-it-starts", "until-before-start"]);
    expect(dates(broken, "2026-10-01", "2026-12-31")).toEqual([]);
  });

  it("next occurrences and occursOn", () => {
    expect(nextOccurrences(OSC, "2026-10-19", 2).map((o) => o.date)).toEqual(["2026-10-24", "2026-10-25"]);
    expect(occursOn(OSC, "2026-10-25")).toBe(true);
    expect(occursOn({ ...OSC, exceptions: ["2026-10-25"] }, "2026-10-25")).toBe(false);
  });
});

describe("time zones and DST", () => {
  it("a viewer in New York sees the Kolkata block move an hour on 1 Nov; the venue's clock does not", () => {
    const [sat, sun] = expandRecurrence(OSC, { from: "2026-10-31", to: "2026-11-01" });
    const ny = { locale: "en-US", timeZone: "America/New_York" };
    const kol = { locale: "en-IN", timeZone: "Asia/Kolkata" };
    expect(formatTimeRange(sat!.start, sat!.end, ny)).toBe("6:30 – 7:30 AM");
    expect(formatTimeRange(sun!.start, sun!.end, ny)).toBe("5:30 – 6:30 AM");
    expect(formatTimeRange(sat!.start, sat!.end, kol)).toBe(formatTimeRange(sun!.start, sun!.end, kol));
    expect(sun!.start - sat!.start).toBe(24 * 3_600_000);
  });

  it("a rule in a DST zone keeps its wall clock: a week across fall-back is 169 hours", () => {
    const rule: RecurrenceRule = { ...OSC, weekdays: ["sun"], startDate: "2026-10-25", startMinute: 9 * 60, endMinute: 10 * 60, timeZone: "America/New_York" };
    const [a, b] = expandRecurrence(rule, { from: "2026-10-25", to: "2026-11-01" });
    expect(new Date(a!.start).toISOString()).toBe("2026-10-25T13:00:00.000Z");
    expect(new Date(b!.start).toISOString()).toBe("2026-11-01T14:00:00.000Z");
    expect((b!.start - a!.start) / 3_600_000).toBe(169);
  });

  it("a start in the spring-forward gap shifts forward, as calendars do", () => {
    const rule: RecurrenceRule = { ...OSC, weekdays: ["sun"], startDate: "2026-03-08", startMinute: 2 * 60 + 30, endMinute: 3 * 60 + 30, timeZone: "America/New_York" };
    const [gap] = expandRecurrence(rule, { from: "2026-03-08", to: "2026-03-08" });
    expect(new Date(gap!.start).toISOString()).toBe("2026-03-08T07:30:00.000Z"); // 3:30 am EDT
  });
});

describe("summary", () => {
  it("en-IN", () => {
    expect(summarizeRecurrence({ ...OSC, end: { type: "until", date: "2026-11-30" } }, "en-IN")).toBe("Every Sat and Sun, 4 – 5 pm, until 30 Nov");
    expect(summarizeRecurrence(OSC, "en-IN")).toBe("Every Sat and Sun, 4 – 5 pm");
    expect(summarizeRecurrence({ ...OSC, weekdays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] }, "en-IN")).toBe("Every day, 4 – 5 pm");
  });

  it("en-IN with an interval, odd minutes, a count and an exception", () => {
    const rule: RecurrenceRule = { ...OSC, interval: 2, startMinute: 16 * 60 + 30, endMinute: 18 * 60, end: { type: "count", count: 4 }, exceptions: ["2026-10-31"] };
    expect(summarizeRecurrence(rule, "en-IN")).toBe("Every 2 weeks on Sat and Sun, 4:30 – 6:00 pm, 4 times, except 31 Oct");
    expect(summarizeRecurrence({ ...rule, end: { type: "count", count: 1 }, exceptions: [] }, "en-IN")).toBe("Every 2 weeks on Sat and Sun, 4:30 – 6:00 pm, once");
  });

  it("en-US orders the date its own way", () => {
    expect(summarizeRecurrence({ ...OSC, end: { type: "until", date: "2026-11-30" } }, "en-US")).toBe("Every Sat and Sun, 4 – 5 PM, until Nov 30");
  });

  it("French: long weekday names, a 24-hour clock, its own punctuation", () => {
    expect(summarizeRecurrence({ ...OSC, end: { type: "until", date: "2026-11-30" } }, "fr")).toBe("Chaque samedi et dimanche, 16:00 – 17:00, jusqu’au 30 nov.");
    expect(summarizeRecurrence({ ...OSC, interval: 2, end: { type: "count", count: 4 } }, "fr")).toBe("Toutes les 2 semaines, samedi et dimanche, 16:00 – 17:00, 4 fois");
  });

  it("names the year only when it changes", () => {
    expect(summarizeRecurrence({ ...OSC, end: { type: "until", date: "2027-01-31" } }, "en-IN")).toBe("Every Sat and Sun, 4 – 5 pm, until 31 Jan 2027");
  });

  it("lengths are never decimal", () => {
    expect(describeLength({ startMinute: 960, endMinute: 1050 }, "en-IN")).toBe("1 hour 30 minutes");
  });
});

describe("useRecurrence", () => {
  it("edits keep the rule well formed and the summary live", () => {
    const { result } = renderHook(() => useRecurrence({ defaultValue: OSC, locale: "en-IN" }));
    act(() => result.current.toggleWeekday("sat"));
    expect(result.current.rule.weekdays).toEqual(["sun"]);
    act(() => result.current.toggleWeekday("fri"));
    expect(result.current.rule.weekdays).toEqual(["fri", "sun"]);
    act(() => result.current.setInterval(0));
    expect(result.current.rule.interval).toBe(1);
    act(() => result.current.setEnd({ type: "until", date: "2026-11-30" }));
    expect(result.current.summary).toBe("Every Fri and Sun, 4 – 5 pm, until 30 Nov");
    act(() => result.current.toggleException("2026-10-25"));
    expect(result.current.expand({ from: "2026-10-23", to: "2026-10-25" }).map((o) => o.date)).toEqual(["2026-10-23"]);
    act(() => result.current.toggleWeekday("fri"));
    act(() => result.current.toggleWeekday("sun"));
    expect(result.current.valid).toBe(false);
    expect(result.current.problems).toContain("no-weekdays");
  });

  it("controlled: reports changes and shows the owner's rule", () => {
    const seen: RecurrenceRule[] = [];
    const { result } = renderHook(() => useRecurrence({ value: OSC, defaultValue: OSC, onValueChange: (r) => seen.push(r) }));
    act(() => result.current.getWeekdayProps("mon").onChange());
    expect(seen[0]?.weekdays).toEqual(["mon", "sat", "sun"]);
    expect(result.current.rule.weekdays).toEqual(["sat", "sun"]);
  });
});
