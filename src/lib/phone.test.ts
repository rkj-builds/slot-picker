import { describe, expect, it } from "vitest";
import { checkIndianPhone, formatPhone, normalizeIndianPhone } from "@/lib/phone";

describe("normalizeIndianPhone", () => {
  it.each(["9876543210", "98765 43210", "+91 98765 43210", "+91-98765-43210", "098765 43210", "919876543210"])("accepts %s", (input) => {
    expect(normalizeIndianPhone(input)).toBe("+919876543210");
  });
  it("names the problem", () => {
    expect(checkIndianPhone("").problem).toBe("empty");
    expect(checkIndianPhone("98765").problem).toBe("too-short");
    expect(checkIndianPhone("98765432101").problem).toBe("too-long");
    expect(checkIndianPhone("5876543210").problem).toBe("not-mobile");
    expect(checkIndianPhone("+1 415 555 0100").problem).toBe("not-mobile");
    expect(checkIndianPhone("98765abc10").problem).toBe("not-digits");
  });
  it("prints in groups", () => {
    expect(formatPhone("+919876543210")).toBe("+91 98765 43210");
  });
});
