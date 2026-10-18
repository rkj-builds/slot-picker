/**
 * The money screens' rules, kept out of the components so they can be read
 * and tested on their own: which dates a range covers, what each filter
 * means, how a ledger line is signed and labelled, how lines group by day
 * and dues group by customer, and what the CSV holds.
 */
import { hrefFor } from "@/app/router";
import type { Customer, Due, Payment } from "@/data/types";
import { type Paise, sumPaise } from "@/lib/money";
import { addDays, compareDates, isPlainDate, type PlainDate, todayIn } from "@/lib/plain-date";
import { VENUE } from "@/lib/venue";

export type MoneyTab = "payments" | "dues" | "credits";

export const MONEY_PATH = "/desk/money";

export function tabOf(sub: readonly string[]): MoneyTab {
  return sub[0] === "dues" ? "dues" : sub[0] === "credits" ? "credits" : "payments";
}

export function tabPath(tab: MoneyTab): string {
  return tab === "payments" ? MONEY_PATH : `${MONEY_PATH}/${tab}`;
}

/* ── Date range ─────────────────────────────────────────────────────── */

export type RangePreset = "today" | "week" | "month";

export interface DateRange {
  from: PlainDate;
  to: PlainDate;
}

export const RANGE_PRESETS: readonly { id: RangePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Last 7 days" },
  { id: "month", label: "This month" },
];

export function presetRange(preset: RangePreset, today: PlainDate): DateRange {
  if (preset === "today") return { from: today, to: today };
  if (preset === "week") return { from: addDays(today, -6), to: today };
  return { from: `${today.slice(0, 8)}01` as PlainDate, to: today };
}

/** The range the URL asks for (`?from=…&to=…`); the last 7 days when it asks for none, or nonsense. */
export function rangeFromQuery(query: URLSearchParams, today: PlainDate): DateRange {
  const from = query.get("from") ?? "";
  const to = query.get("to") ?? "";
  if (isPlainDate(from) && isPlainDate(to) && compareDates(from, to) <= 0) return { from, to };
  return presetRange("week", today);
}

export function presetOf(range: DateRange, today: PlainDate): RangePreset | null {
  return RANGE_PRESETS.find((p) => {
    const r = presetRange(p.id, today);
    return r.from === range.from && r.to === range.to;
  })?.id ?? null;
}

/** The URL keeps a range only when it isn't the default, so plain links stay plain. */
export function rangeQuery(range: DateRange, today: PlainDate): { from: string | null; to: string | null } {
  return presetOf(range, today) === "week" ? { from: null, to: null } : { from: range.from, to: range.to };
}

/* ── What a ledger line is ──────────────────────────────────────────── */

export type Method = "cash" | "online";
/** In: money received. Refund: money handed back. Credit: money moved onto or off a customer's credit. */
export type KindGroup = "in" | "refund" | "credit";
/** What the money was for, as the desk thinks of it. */
export type What = "booking" | "programme" | "membership";
export type Approval = "waiting" | "approved";

export function kindGroupOf(p: Pick<Payment, "kind">): KindGroup {
  return p.kind === "cash" || p.kind === "online" ? "in" : p.kind === "refund" ? "refund" : "credit";
}

export function methodOf(p: Pick<Payment, "kind">): Method | null {
  return p.kind === "cash" || p.kind === "online" ? p.kind : null;
}

export function whatOf(p: Pick<Payment, "subject">): What | null {
  const t = p.subject.type;
  return t === "booking" ? "booking" : t === "enrolment" ? "programme" : t === "membership" ? "membership" : null;
}

export function approvalOf(p: Pick<Payment, "approved">): Approval {
  return p.approved ? "approved" : "waiting";
}

/**
 * How a line moves the venue's money, signed: what came in is positive;
 * a refund, or paid money turned into credit, is negative. Credit spent on a
 * booking pays it, so it is positive, though no new money arrived.
 */
export function signedPaise(p: Pick<Payment, "kind" | "amountPaise">): Paise {
  return p.kind === "refund" || p.kind === "credit-issued" ? -p.amountPaise : p.amountPaise;
}

export const KIND_LABEL: Record<Payment["kind"], string> = {
  cash: "Cash",
  online: "Online",
  refund: "Refund",
  "credit-issued": "To credit",
  "credit-applied": "From credit",
};

/** What a negative or credit amount means, said beside it so the sign is never the only cue. */
export const AMOUNT_NOTE: Partial<Record<Payment["kind"], string>> = {
  refund: "refunded",
  "credit-issued": "kept as credit",
  "credit-applied": "paid from credit",
};

/** Where a line's subject lives. Other screens own these pages; this only points at them. */
export function subjectHref(subject: Payment["subject"]): string {
  if (subject.type === "booking") return hrefFor(`/desk/bookings/${subject.id}`);
  if (subject.type === "enrolment") return hrefFor(subject.programmeId ? `/desk/programmes/${subject.programmeId}` : "/desk/enrolments");
  if (subject.type === "membership") return hrefFor("/desk/members");
  return hrefFor(tabPath("credits"));
}

/* ── Filters ────────────────────────────────────────────────────────── */

export interface PaymentFilters {
  method: Method[];
  kind: KindGroup[];
  approval: Approval[];
  what: What[];
}

export type FacetId = keyof PaymentFilters;

export interface Facet<K extends FacetId = FacetId> {
  id: K;
  label: string;
  options: readonly { value: PaymentFilters[K][number]; label: string }[];
}

export const FACETS: readonly Facet[] = [
  { id: "method", label: "Method", options: [{ value: "cash", label: "Cash" }, { value: "online", label: "Online" }] },
  { id: "kind", label: "Kind", options: [{ value: "in", label: "Money in" }, { value: "refund", label: "Refunds" }, { value: "credit", label: "Credit" }] },
  { id: "approval", label: "Approval", options: [{ value: "waiting", label: "Waiting" }, { value: "approved", label: "Approved" }] },
  { id: "what", label: "For", options: [{ value: "booking", label: "Bookings" }, { value: "programme", label: "Programmes" }, { value: "membership", label: "Memberships" }] },
];

export const NO_FILTERS: PaymentFilters = { method: [], kind: [], approval: [], what: [] };

/** `?method=cash&kind=in,refund`: known values only, in the facet's own order. */
export function filtersFromQuery(query: URLSearchParams): PaymentFilters {
  const pick = <K extends FacetId>(facet: Facet<K>): PaymentFilters[K] => {
    const asked = new Set((query.get(facet.id) ?? "").split(",").filter(Boolean));
    return facet.options.filter((o) => asked.has(o.value)).map((o) => o.value) as PaymentFilters[K];
  };
  return Object.fromEntries(FACETS.map((f) => [f.id, pick(f)])) as unknown as PaymentFilters;
}

export function filtersQuery(filters: PaymentFilters): Record<FacetId, string | null> {
  return Object.fromEntries(FACETS.map((f) => [f.id, filters[f.id].length ? filters[f.id].join(",") : null])) as Record<FacetId, string | null>;
}

export function filterCount(filters: PaymentFilters): number {
  return FACETS.filter((f) => filters[f.id].length > 0).length;
}

/** "Cash, Online" for a chip. */
export function facetValueLabel(facet: Facet, values: readonly string[]): string {
  return facet.options.filter((o) => values.includes(o.value)).map((o) => o.label).join(", ");
}

export function customerName(customers: readonly Customer[], id: string | null): string {
  if (!id) return "No customer";
  return customers.find((c) => c.id === id)?.name ?? "Unknown customer";
}

/** A facet with nothing ticked lets everything through; within a facet any ticked value matches. */
export function matchesFilters(p: Payment, filters: PaymentFilters, search: string, customers: readonly Customer[]): boolean {
  const facet = <T extends string>(picked: readonly T[], value: T | null): boolean => picked.length === 0 || (value !== null && picked.includes(value));
  if (!facet(filters.method, methodOf(p))) return false;
  if (!facet(filters.kind, kindGroupOf(p))) return false;
  if (!facet(filters.approval, approvalOf(p))) return false;
  if (!facet(filters.what, whatOf(p))) return false;
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const customer = customers.find((c) => c.id === p.customerId);
  const digits = q.replaceAll(/\D/g, "");
  if (!customer) return false;
  return customer.name.toLowerCase().includes(q) || (digits.length >= 3 && customer.phone.includes(digits));
}

/* ── Grouping and totals ────────────────────────────────────────────── */

export function dayOfInstant(at: number): PlainDate {
  return todayIn(VENUE.timeZone, at);
}

export interface Totals {
  cashPaise: Paise;
  onlinePaise: Paise;
  /** Cash and online together: the money that arrived. */
  inPaise: Paise;
  refundedPaise: Paise;
}

export function totalsOf(payments: readonly Payment[]): Totals {
  const of = (kind: Payment["kind"]): Paise => sumPaise(payments.filter((p) => p.kind === kind).map((p) => p.amountPaise));
  const cashPaise = of("cash");
  const onlinePaise = of("online");
  return { cashPaise, onlinePaise, inPaise: cashPaise + onlinePaise, refundedPaise: of("refund") };
}

export interface DayGroup {
  date: PlainDate;
  payments: Payment[];
  totals: Totals;
}

/** Newest day first, newest line first within a day. */
export function groupByDay(payments: readonly Payment[]): DayGroup[] {
  const days = new Map<PlainDate, Payment[]>();
  for (const p of [...payments].sort((a, b) => b.at - a.at)) {
    const day = dayOfInstant(p.at);
    days.set(day, [...(days.get(day) ?? []), p]);
  }
  return [...days].map(([date, list]) => ({ date, payments: list, totals: totalsOf(list) }));
}

export interface CustomerDues {
  customerId: string | null;
  name: string;
  totalPaise: Paise;
  /** The oldest item's date: how long they have owed. */
  since: PlainDate;
  items: Due[];
}

export type DuesSort = "amount" | "age";

export function groupDues(dues: readonly Due[], customers: readonly Customer[], sort: DuesSort): CustomerDues[] {
  const groups = new Map<string, Due[]>();
  for (const d of dues) groups.set(d.customerId ?? "", [...(groups.get(d.customerId ?? "") ?? []), d]);
  const out = [...groups].map(([key, items]): CustomerDues => {
    const sorted = [...items].sort((a, b) => compareDates(a.since, b.since));
    return {
      customerId: key || null,
      name: customerName(customers, key || null),
      totalPaise: sumPaise(items.map((d) => d.duePaise)),
      since: sorted[0]?.since ?? "1970-01-01",
      items: sorted,
    };
  });
  return out.sort((a, b) => (sort === "amount" ? b.totalPaise - a.totalPaise || compareDates(a.since, b.since) : compareDates(a.since, b.since) || b.totalPaise - a.totalPaise));
}

/** Whole days between two venue dates. */
export function daysBetween(from: PlainDate, to: PlainDate): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

/** The oldest waiting payment's day, so a link to "everything waiting" covers all of it. */
export function oldestWaiting(payments: readonly Payment[]): PlainDate | null {
  const waiting = payments.filter((p) => !p.approved).map((p) => dayOfInstant(p.at));
  return waiting.sort(compareDates)[0] ?? null;
}

/* ── CSV ────────────────────────────────────────────────────────────── */

/** The visible list, one line each: ISO dates, bare rupee numbers (signed), so a spreadsheet can add them up. */
export function paymentsCsvRows(payments: readonly Payment[], customers: readonly Customer[], timeOf: (at: number) => string): (string | number)[][] {
  const header = ["Date", "Time", "Customer", "Phone", "For", "Type", "Method", "Amount (INR)", "Approval", "Note"];
  const rows = payments.map((p) => {
    const customer = customers.find((c) => c.id === p.customerId);
    return [
      dayOfInstant(p.at),
      timeOf(p.at),
      customerName(customers, p.customerId),
      customer?.phone ?? "",
      p.subject.label,
      { in: "In", refund: "Refund", credit: "Credit" }[kindGroupOf(p)],
      KIND_LABEL[p.kind],
      signedPaise(p) / 100,
      p.approved ? "Approved" : "Waiting",
      p.note,
    ];
  });
  return [header, ...rows];
}

/* ── Credit ─────────────────────────────────────────────────────────── */

/** How a line moved a customer's credit: added (a cancellation kept as credit, goodwill), used on a booking, or paid out. */
export function creditDelta(p: Pick<Payment, "kind" | "amountPaise">): Paise {
  return p.kind === "credit-issued" ? p.amountPaise : -p.amountPaise;
}

export function creditVerb(p: Pick<Payment, "kind">): string {
  return p.kind === "credit-issued" ? "Added" : p.kind === "credit-applied" ? "Used" : "Paid out";
}
