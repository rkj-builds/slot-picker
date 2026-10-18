/**
 * Court-hour memberships, sorted the way the desk acts on them. Segments are
 * live rules over the current data, recomputed on every read, never saved
 * lists: a member who buys more hours leaves "Low on hours" at once.
 */
import { dayOf } from "@/app/format";
import { membershipDue } from "@/data/money";
import type { Membership, MembershipPlan } from "@/data/types";
import { formatInr } from "@/lib/money";
import { addDays, compareDates, type PlainDate } from "@/lib/plain-date";

export type Segment = "active" | "low-hours" | "expiring" | "owes" | "paused" | "expired";

export const SEGMENTS: { id: Segment; label: string; empty: string }[] = [
  { id: "active", label: "Active", empty: "Nobody has an active membership." },
  { id: "low-hours", label: "Low on hours", empty: "Every active member has more than 3 hours (and a fifth of their pack) left." },
  { id: "expiring", label: "Expiring in 14 days", empty: "No active membership runs out in the next 14 days." },
  { id: "owes", label: "Owes", empty: "Nobody owes money on a membership." },
  { id: "paused", label: "Paused", empty: "Nobody is paused." },
  { id: "expired", label: "Expired", empty: "No memberships have expired." },
];

export function hoursLeft(m: Pick<Membership, "hoursTotal" | "hoursUsed">): number {
  return Math.max(0, m.hoursTotal - m.hoursUsed);
}

/** What the member's state is today: an active membership past its date is expired, whatever the record says. */
export function effectiveStatus(m: Membership, today: PlainDate): Membership["status"] {
  if (m.status === "active" && compareDates(m.expiresOn, today) < 0) return "expired";
  return m.status;
}

export function inSegment(m: Membership, segment: Segment, today: PlainDate): boolean {
  const status = effectiveStatus(m, today);
  switch (segment) {
    case "active":
      return status === "active";
    case "low-hours":
      return status === "active" && (hoursLeft(m) <= 3 || hoursLeft(m) <= m.hoursTotal * 0.2);
    case "expiring":
      return status === "active" && compareDates(m.expiresOn, addDays(today, 14)) <= 0;
    case "owes":
      return membershipDue(m) > 0;
    case "paused":
      return status === "paused";
    case "expired":
      return status === "expired";
  }
}

/** "Expires today", "In 3 days", "Expired 2 days ago", "Sat, 14 Nov". */
export function expiryLine(m: Membership, today: PlainDate): { text: string; soon: boolean } {
  const days = Math.round((Date.parse(m.expiresOn) - Date.parse(today)) / 86_400_000);
  if (days < 0) return { text: `Expired ${dayOf(m.expiresOn)}`, soon: false };
  if (days === 0) return { text: "Expires today", soon: true };
  if (days <= 14) return { text: `${dayOf(m.expiresOn)} · in ${days} ${days === 1 ? "day" : "days"}`, soon: true };
  return { text: dayOf(m.expiresOn), soon: false };
}

export function planSummary(plan: MembershipPlan): string {
  return `${plan.hours} hours · valid ${plan.validDays} days · ${formatInr(plan.pricePaise)}`;
}
