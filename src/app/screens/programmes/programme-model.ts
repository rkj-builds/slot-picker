/**
 * The rules the programme screens share, kept pure so the list, the
 * programme page, the register and the enrolments table all agree on what
 * "to chase", "ending this week" or "open" mean, and tests can call them.
 */
import { dayOf, timeRangeOf } from "@/app/format";
import type { BadgeProps } from "@/components/ui/badge";
import { enrolmentDue, needsChasing } from "@/data/money";
import type { Customer, Enrolment, Programme, ProgrammePlan, ProgrammeSession, ProgrammeStatus } from "@/data/types";
import { makeId } from "@/lib/booking";
import { formatInr } from "@/lib/money";
import { addDays, compareDates, type PlainDate } from "@/lib/plain-date";
import { COURTS, WEEKDAY_LABEL, WEEKDAYS } from "@/lib/venue";

export const STATUS_META: Record<ProgrammeStatus, { label: string; badge: NonNullable<BadgeProps["variant"]>; line: string }> = {
  open: { label: "Open", badge: "success", line: "Taking sign-ups" },
  closed: { label: "Closed", badge: "secondary", line: "Running, not taking sign-ups" },
  draft: { label: "Draft", badge: "warning", line: "Only the team can see it" },
  finished: { label: "Finished", badge: "outline", line: "Over; kept for its records" },
};

/** "Sat, Sun" (short, for rows) or "Saturday and Sunday". */
export function daysLine(p: Pick<Programme, "weekdays">): string {
  const days = WEEKDAYS.filter((d) => p.weekdays.includes(d));
  if (days.length === 7) return "Every day";
  if (days.length === 5 && !days.includes("sat") && !days.includes("sun")) return "Mon to Fri";
  return days.map((d) => WEEKDAY_LABEL[d].short).join(", ");
}

export function timesLine(p: Pick<Programme, "startMinute" | "endMinute" | "startsOn">): string {
  return timeRangeOf({ date: p.startsOn, startMinute: p.startMinute, durationMinutes: p.endMinute - p.startMinute });
}

export function courtsLine(p: Pick<Programme, "courtIds">): string {
  const names = COURTS.filter((c) => p.courtIds.includes(c.id)).map((c) => c.name.replace("Court ", ""));
  if (names.length === 0) return "No court";
  return `${names.length === 1 ? "Court" : "Courts"} ${new Intl.ListFormat("en-IN", { type: "conjunction" }).format(names)}`;
}

/** "Sat, Sun · 4:00 – 5:00 pm · Courts 1 and 2" */
export function scheduleLine(p: Programme): string {
  return `${daysLine(p)} · ${timesLine(p)} · ${courtsLine(p)}`;
}

export function agesLine(p: Pick<Programme, "ageMin" | "ageMax">): string {
  if (p.ageMin !== null && p.ageMax !== null) return `Ages ${p.ageMin}–${p.ageMax}`;
  if (p.ageMin !== null) return `${p.ageMin} and over`;
  if (p.ageMax !== null) return `Up to ${p.ageMax}`;
  return "All ages";
}

export function datesLine(p: Pick<Programme, "startsOn" | "endsOn">): string {
  return p.endsOn ? `${dayOf(p.startsOn)} to ${dayOf(p.endsOn)}` : `From ${dayOf(p.startsOn)}, no end date`;
}

export const PLAN_KIND_LABEL: Record<ProgrammePlan["kind"], string> = {
  month: "Every session for a month",
  pack: "A pack of sessions",
  "drop-in": "One session",
};

/** "₹2,500 · every session for a month" */
export function planLine(plan: ProgrammePlan): string {
  const what = plan.kind === "month" ? "every session for a month" : plan.kind === "pack" ? `${plan.sessions ?? 0} sessions within a month` : "one session";
  return `${formatInr(plan.pricePaise)} · ${what}`;
}

export function activePlans(p: Programme): ProgrammePlan[] {
  return p.plans.filter((plan) => !plan.retired);
}

export function planOf(p: Programme | undefined, planId: string): ProgrammePlan | undefined {
  return p?.plans.find((plan) => plan.id === planId);
}

/* ── Enrolments ─────────────────────────────────────────────────────── */

/** Who the register and the table name: the child, or the adult who signed up for themselves. */
export function enrolleeName(e: Enrolment, customers: readonly Customer[]): string {
  if (e.participantName !== "") return e.participantName;
  return customers.find((c) => c.id === e.customerId)?.name ?? "Someone";
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export type EnrolmentTab = "chase" | "running" | "paused" | "stopped" | "waitlist" | "everyone";

export const ENROLMENT_TABS: { id: EnrolmentTab; label: string; empty: string }[] = [
  { id: "chase", label: "To chase", empty: "Nobody owes money and no paid period runs out in the next 3 days." },
  { id: "running", label: "Running", empty: "Nobody is enrolled right now." },
  { id: "paused", label: "Paused", empty: "Nobody is on a pause." },
  { id: "stopped", label: "Stopped", empty: "Nobody has stopped." },
  { id: "waitlist", label: "Waitlist", empty: "Nobody is waiting for a place." },
  { id: "everyone", label: "Everyone", empty: "No enrolments yet." },
];

export function inTab(e: Enrolment, tab: EnrolmentTab, today: PlainDate): boolean {
  switch (tab) {
    case "chase":
      return needsChasing(e, today);
    case "everyone":
      return true;
    default:
      return e.status === tab;
  }
}

export type NextStep = "pay" | "renew" | "resume" | "open";

/** The one button a row offers: money first, then the period running out, then whatever else is useful. */
export function nextStep(e: Enrolment, today: PlainDate): NextStep {
  if (enrolmentDue(e) > 0) return "pay";
  if (e.status === "running" && needsChasing(e, today)) return "renew";
  if (e.status === "paused") return "resume";
  return "open";
}

/** "Ends today", "Ends in 3 days", "Ran out 2 days ago", "Until Sat, 24 Oct". */
export function paidUntilLine(e: Pick<Enrolment, "paidUntil">, today: PlainDate): { text: string; tone: "warning" | "error" | null } {
  const days = Math.round((Date.parse(e.paidUntil) - Date.parse(today)) / 86_400_000);
  if (days < 0) return { text: `Ran out ${-days === 1 ? "yesterday" : `${-days} days ago`}`, tone: "error" };
  if (days === 0) return { text: "Ends today", tone: "warning" };
  if (days <= 3) return { text: `Ends in ${days} ${days === 1 ? "day" : "days"}`, tone: "warning" };
  return { text: `Until ${dayOf(e.paidUntil)}`, tone: null };
}

/** Within the programme's age range? null when either side is unknown. */
export function ageFits(age: number | null, p: Pick<Programme, "ageMin" | "ageMax">): boolean | null {
  if (age === null) return null;
  if (p.ageMin !== null && age < p.ageMin) return false;
  if (p.ageMax !== null && age > p.ageMax) return false;
  return true;
}

/* ── Sessions ───────────────────────────────────────────────────────── */

/** The register to open for "take today's register": today's session, else the last one before it, else the next. */
export function registerSession(sessions: readonly ProgrammeSession[], today: PlainDate): ProgrammeSession | undefined {
  const live = sessions.filter((s) => s.status === "scheduled");
  const past = live.filter((s) => compareDates(s.date, today) <= 0);
  return past.at(-1) ?? live.find((s) => compareDates(s.date, today) > 0);
}

export function nextSession(sessions: readonly ProgrammeSession[], today: PlainDate): ProgrammeSession | undefined {
  return sessions.find((s) => s.status === "scheduled" && compareDates(s.date, today) > 0);
}

/** Periods that end within the week ahead (today included), for the programme's attention list. */
export function endingThisWeek(e: Enrolment, today: PlainDate): boolean {
  return e.status === "running" && compareDates(e.paidUntil, today) >= 0 && compareDates(e.paidUntil, addDays(today, 6)) <= 0;
}

/* ── Editing ────────────────────────────────────────────────────────── */

export type ProgrammeDraft = Pick<Programme, "name" | "description" | "weekdays" | "startMinute" | "endMinute" | "courtIds" | "ageMin" | "ageMax" | "capacity" | "startsOn" | "endsOn">;

export function draftOf(p: Programme): ProgrammeDraft {
  const { name, description, weekdays, startMinute, endMinute, courtIds, ageMin, ageMax, capacity, startsOn, endsOn } = p;
  return { name, description, weekdays, startMinute, endMinute, courtIds, ageMin, ageMax, capacity, startsOn, endsOn };
}

export function emptyDraft(today: PlainDate): ProgrammeDraft {
  return { name: "", description: "", weekdays: [], startMinute: 17 * 60, endMinute: 18 * 60, courtIds: ["court-1"], ageMin: null, ageMax: null, capacity: 12, startsOn: today, endsOn: null };
}

export function newPlan(): ProgrammePlan {
  return { id: makeId("pln"), name: "", pricePaise: 0, kind: "month", sessions: null, retired: false };
}

