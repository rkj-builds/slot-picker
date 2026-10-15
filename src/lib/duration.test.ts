import { describe, expect, it } from "vitest";
import { formatDuration } from "@/lib/duration";

describe("formatDuration", () => {
  it("never prints a decimal", () => {
    expect(formatDuration(90, { locale: "en-US" })).toBe("1 hour 30 minutes");
    expect(formatDuration(90, { locale: "en-US" })).not.toMatch(/\d\.\d/);
  });

  it("drops the empty unit", () => {
    expect(formatDuration(60, { locale: "en-US" })).toBe("1 hour");
    expect(formatDuration(120, { locale: "en-US" })).toBe("2 hours");
    expect(formatDuration(30, { locale: "en-US" })).toBe("30 minutes");
    expect(formatDuration(0, { locale: "en-US" })).toBe("0 minutes");
  });

  it("has a short form for tight spaces", () => {
    expect(formatDuration(90, { locale: "en-US", style: "short" })).toBe("1 hr 30 min");
    expect(formatDuration(60, { locale: "en-US", style: "short" })).toBe("1 hr");
  });

  it("localises", () => {
    // French separates digits from units with a no-break space; normalise it before comparing.
    expect(formatDuration(90, { locale: "fr-FR" }).replaceAll(/\s+/g, " ")).toBe("1 heure 30 minutes");
  });

  it("rejects nonsense", () => {
    expect(() => formatDuration(-1)).toThrow(RangeError);
    expect(() => formatDuration(Number.NaN)).toThrow(RangeError);
  });
});
