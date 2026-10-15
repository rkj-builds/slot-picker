import { describe, expect, it } from "vitest";
import { formatInr, rupees, splitPaise } from "@/lib/money";

const norm = (s: string): string => s.replaceAll(/\s/g, " ");

describe("formatInr", () => {
  it("uses Indian digit grouping and drops .00 on whole rupees", () => {
    expect(norm(formatInr(12_500_000))).toBe("₹1,25,000");
    expect(norm(formatInr(80_000))).toBe("₹800");
  });
  it("shows paise when there are any", () => {
    expect(norm(formatInr(41_250))).toBe("₹412.50");
  });
  it("refuses fractional paise", () => {
    expect(() => formatInr(10.5)).toThrow(RangeError);
  });
});

describe("splitPaise", () => {
  it("halves an even amount", () => {
    expect(splitPaise(80_000, 50)).toEqual({ now: 40_000, later: 40_000 });
  });
  it("puts the rounding on the deposit, half-up, and never loses a paisa", () => {
    expect(splitPaise(125_050, 33)).toEqual({ now: 41_267, later: 83_783 });
    expect(splitPaise(1, 50)).toEqual({ now: 1, later: 0 });
    for (const total of [1, 3, 99, 70_001, 123_457]) {
      for (const pct of [0, 1, 30, 33, 50, 67, 99, 100]) {
        const { now, later } = splitPaise(total, pct);
        expect(now + later).toBe(total);
        expect(Number.isInteger(now)).toBe(true);
      }
    }
  });
  it("rejects a percent outside 0–100", () => {
    expect(() => splitPaise(100, 101)).toThrow(RangeError);
  });
});

describe("rupees", () => {
  it("converts without float drift", () => {
    expect(rupees(0.1 + 0.2)).toBe(30);
    expect(rupees(800)).toBe(80_000);
  });
});
