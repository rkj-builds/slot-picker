import { describe, expect, it } from "vitest";
import { buildIcs, escapeText, utcStamp } from "@/lib/ics";
import { toCsv } from "@/lib/csv";
import { instantAt } from "@/lib/time-zone";

describe("buildIcs", () => {
  const start = instantAt("2026-10-17", 19 * 60, "Asia/Kolkata");
  const ics = buildIcs({ uid: "bk_1@project831", start, end: start + 90 * 60_000, summary: "Pickleball, Court 2", location: "Project 831, Jamshedpur", description: "Paid ₹600; ₹600 due at the venue", stamp: 0 });

  it("writes the instant in UTC so every calendar converts it", () => {
    expect(utcStamp(start)).toBe("20261017T133000Z");
    expect(ics).toContain("DTSTART:20261017T133000Z");
    expect(ics).toContain("DTEND:20261017T150000Z");
  });
  it("escapes commas and semicolons and ends lines with CRLF", () => {
    expect(ics).toContain("SUMMARY:Pickleball\\, Court 2");
    expect(escapeText("a;b\nc")).toBe("a\\;b\\nc");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});

describe("toCsv", () => {
  it("quotes only what needs quoting", () => {
    expect(toCsv([["Name", "Notes"], ["Neil D'Souza", 'Said "maybe", call']])).toBe('Name,Notes\r\nNeil D\'Souza,"Said ""maybe"", call"');
  });
});
