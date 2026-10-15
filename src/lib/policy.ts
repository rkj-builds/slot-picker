/**
 * The payment policy: what a customer is asked to pay before a court is held.
 *
 * The rule came from data. At Project 831, self-serve bookings with nothing
 * paid were cancelled 45% of the time, with ten no-shows; bookings paid in
 * full or in part were cancelled 7% of the time, with none. So the engine
 * asks for money where an empty court is most likely and most expensive,
 * and nowhere else:
 *
 *   1. A customer flagged pay-first (they have ghosted before) pays in full.
 *   2. A trusted regular may always pay at the venue.
 *   3. On prepay days (weekends by default), a deposit or the full amount.
 *   4. Optionally, a first-time customer pays a deposit on any day.
 *   5. Otherwise, pay now or pay at the venue.
 */
import { type Paise, splitPaise } from "@/lib/money";
import { type PlainDate, type Weekday, weekdayOf } from "@/lib/plain-date";
import type { PayMode } from "@/lib/booking";
import { listDays } from "@/lib/venue";

export interface PaymentPolicy {
  depositPercent: number;
  prepayDays: readonly Weekday[];
  requirePaymentForNewCustomers: boolean;
}

export interface PolicyCustomer {
  payFirst: boolean;
  trusted: boolean;
}

export type PaymentReason = "pay-first" | "trusted" | "prepay-day" | "new-customer" | "standard";

export interface PaymentDecision {
  /** The options to offer, in the order to show them. Never empty. */
  modes: PayMode[];
  /** What "part" charges now; 0 when part payment is not offered. */
  depositPaise: Paise;
  /** What "part" leaves to pay at the venue. */
  balancePaise: Paise;
  reason: PaymentReason;
}

/**
 * @param customer the known customer, or null for someone booking for the first time
 */
export function decidePayment(
  policy: PaymentPolicy,
  slot: { date: PlainDate; pricePaise: Paise },
  customer: PolicyCustomer | null,
): PaymentDecision {
  const { now: deposit, later: balance } = splitPaise(slot.pricePaise, policy.depositPercent);
  // A 0% or 100% deposit is not a part payment; nor is one on a free slot.
  const partPossible = deposit > 0 && balance > 0;
  const withDeposit = (reason: PaymentReason): PaymentDecision =>
    partPossible
      ? { modes: ["part", "full"], depositPaise: deposit, balancePaise: balance, reason }
      : { modes: ["full"], depositPaise: 0, balancePaise: 0, reason };

  if (customer?.payFirst) return { modes: ["full"], depositPaise: 0, balancePaise: 0, reason: "pay-first" };
  if (customer?.trusted) return { modes: ["venue", "full"], depositPaise: 0, balancePaise: 0, reason: "trusted" };
  if (policy.prepayDays.includes(weekdayOf(slot.date))) return withDeposit("prepay-day");
  if (!customer && policy.requirePaymentForNewCustomers) return withDeposit("new-customer");
  return { modes: ["venue", "full"], depositPaise: 0, balancePaise: 0, reason: "standard" };
}

/** One calm sentence a customer reads above the options. Never punitive. */
export function describeDecision(decision: PaymentDecision, policy: PaymentPolicy): string {
  switch (decision.reason) {
    case "pay-first":
      return "This booking needs payment up front. Once it is paid, the court is yours.";
    case "trusted":
      return "You can pay at the venue, or pay now and skip the counter.";
    case "prepay-day":
      return decision.modes.includes("part")
        ? `Courts on ${listDays(policy.prepayDays)} are held with a ${policy.depositPercent}% deposit. Pay the rest at the venue.`
        : `Courts on ${listDays(policy.prepayDays)} are paid for when booked.`;
    case "new-customer":
      return "First bookings are held with a deposit. Pay the rest at the venue.";
    case "standard":
      return "Pay now, or pay at the venue when you arrive.";
  }
}

/** For the desk: why a booking was asked for money, in a few words. */
export const REASON_LABEL: Record<PaymentReason, string> = {
  "pay-first": "Pay-first customer",
  trusted: "Trusted regular",
  "prepay-day": "Prepay day",
  "new-customer": "New customer",
  standard: "Standard",
};
