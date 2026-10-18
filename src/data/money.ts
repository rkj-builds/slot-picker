/**
 * Money on enrolments and memberships. Unlike a cancelled booking, whose
 * credit stays on its ledger as history, money given back from a period
 * leaves it: credit moves to the customer, a refund goes back to them.
 */
import type { LedgerEntry } from "@/lib/booking";
import { type Paise, sumPaise } from "@/lib/money";
import { addDays, compareDates, type PlainDate } from "@/lib/plain-date";
import type { Enrolment, Membership } from "@/data/types";

export function ledgerPaid(ledger: readonly LedgerEntry[]): Paise {
  return sumPaise(
    ledger.map((e) =>
      e.kind === "online" || e.kind === "cash" || e.kind === "credit-applied" ? e.amountPaise : e.kind === "refund" || e.kind === "credit-issued" ? -e.amountPaise : 0,
    ),
  );
}

export function enrolmentDue(e: Pick<Enrolment, "status" | "pricePaise" | "ledger">): Paise {
  if (e.status === "waitlist" || e.status === "stopped") return 0;
  return Math.max(0, e.pricePaise - ledgerPaid(e.ledger));
}

export function membershipDue(m: Pick<Membership, "pricePaise" | "ledger">): Paise {
  return Math.max(0, m.pricePaise - ledgerPaid(m.ledger));
}

/** Money in (positive) from the desk or checkout, the number "collected" means. */
export function collected(ledger: readonly LedgerEntry[]): Paise {
  return sumPaise(ledger.filter((e) => e.kind === "online" || e.kind === "cash").map((e) => e.amountPaise));
}

/** "To chase": running, and either owing money or with a period that has run out (or runs out within `days`). */
export function needsChasing(e: Enrolment, today: PlainDate, days = 3): boolean {
  if (e.status !== "running") return false;
  if (enrolmentDue(e) > 0) return true;
  return compareDates(e.paidUntil, addDays(today, days)) <= 0;
}
