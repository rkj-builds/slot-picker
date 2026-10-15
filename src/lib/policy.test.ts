import { describe, expect, it } from "vitest";
import { decidePayment, describeDecision, type PaymentPolicy } from "@/lib/policy";

const policy: PaymentPolicy = { depositPercent: 50, prepayDays: ["sat", "sun"], requirePaymentForNewCustomers: false };
const TUESDAY = "2026-10-20" as const;
const SATURDAY = "2026-10-17" as const;
const regular = { payFirst: false, trusted: false };

describe("decidePayment", () => {
  it("weekday: pay at the venue or pay now", () => {
    expect(decidePayment(policy, { date: TUESDAY, pricePaise: 80_000 }, regular)).toMatchObject({ modes: ["venue", "full"], reason: "standard", depositPaise: 0 });
  });

  it("weekend: 50% now or the full amount, with exact figures", () => {
    expect(decidePayment(policy, { date: SATURDAY, pricePaise: 120_000 }, regular)).toEqual({
      modes: ["part", "full"],
      depositPaise: 60_000,
      balancePaise: 60_000,
      reason: "prepay-day",
    });
  });

  it("pay-first customers pay in full on any day, ahead of every other rule", () => {
    expect(decidePayment(policy, { date: TUESDAY, pricePaise: 80_000 }, { payFirst: true, trusted: true })).toMatchObject({ modes: ["full"], reason: "pay-first" });
  });

  it("trusted regulars may pay at the venue even at the weekend", () => {
    expect(decidePayment(policy, { date: SATURDAY, pricePaise: 80_000 }, { payFirst: false, trusted: true })).toMatchObject({ modes: ["venue", "full"], reason: "trusted" });
  });

  it("new customers pay a deposit only when the setting asks for it", () => {
    expect(decidePayment(policy, { date: TUESDAY, pricePaise: 80_000 }, null).reason).toBe("standard");
    expect(decidePayment({ ...policy, requirePaymentForNewCustomers: true }, { date: TUESDAY, pricePaise: 80_000 }, null)).toMatchObject({
      modes: ["part", "full"],
      reason: "new-customer",
    });
  });

  it("follows the deposit setting to the paisa", () => {
    expect(decidePayment({ ...policy, depositPercent: 30 }, { date: SATURDAY, pricePaise: 120_000 }, regular)).toMatchObject({ depositPaise: 36_000, balancePaise: 84_000 });
    expect(decidePayment({ ...policy, depositPercent: 33 }, { date: SATURDAY, pricePaise: 70_001 }, regular)).toMatchObject({ depositPaise: 23_100, balancePaise: 46_901 });
  });

  it("drops the part option when a deposit would be 0% or 100%", () => {
    expect(decidePayment({ ...policy, depositPercent: 100 }, { date: SATURDAY, pricePaise: 80_000 }, regular).modes).toEqual(["full"]);
    expect(decidePayment({ ...policy, depositPercent: 0 }, { date: SATURDAY, pricePaise: 80_000 }, regular).modes).toEqual(["full"]);
  });

  it("explains itself calmly", () => {
    const text = describeDecision(decidePayment(policy, { date: SATURDAY, pricePaise: 80_000 }, regular), policy);
    expect(text).toBe("Courts on Saturday and Sunday are held with a 50% deposit. Pay the rest at the venue.");
    expect(describeDecision(decidePayment(policy, { date: TUESDAY, pricePaise: 1 }, { payFirst: true, trusted: false }), policy)).toMatch(/^This booking needs payment up front/);
  });
});
