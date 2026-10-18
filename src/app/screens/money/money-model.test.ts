import { describe, expect, it } from "vitest";
import {
  filtersFromQuery,
  filtersQuery,
  groupByDay,
  groupDues,
  matchesFilters,
  NO_FILTERS,
  paymentsCsvRows,
  presetOf,
  presetRange,
  rangeFromQuery,
  signedPaise,
  subjectHref,
} from "@/app/screens/money/money-model";
import type { Customer, Due, Payment } from "@/data/types";
import { instantAt } from "@/lib/time-zone";

const TODAY = "2026-10-15" as const;
const at = (date: `${number}-${number}-${number}`, minute: number): number => instantAt(date, minute, "Asia/Kolkata");
const customers: Customer[] = [
  { id: "c1", name: "Kabir Singh", phone: "+919000000104", payFirst: false, trusted: false, creditPaise: 0, createdAt: 0 },
  { id: "c2", name: "Diya Patel", phone: "+919000000101", payFirst: false, trusted: false, creditPaise: 0, createdAt: 0 },
];
const line = (over: Partial<Payment>): Payment => ({
  id: "p",
  at: at(TODAY, 600),
  kind: "cash",
  amountPaise: 70_000,
  customerId: "c1",
  subject: { type: "booking", id: "bk_1", label: "Court 1 · Thu, 15 Oct, 10:00 am" },
  note: "",
  approved: false,
  ...over,
});

describe("money model", () => {
  it("reads a range from the URL, and falls back to the last 7 days on nonsense", () => {
    expect(rangeFromQuery(new URLSearchParams("from=2026-10-01&to=2026-10-03"), TODAY)).toEqual({ from: "2026-10-01", to: "2026-10-03" });
    expect(rangeFromQuery(new URLSearchParams("from=2026-10-05&to=2026-10-01"), TODAY)).toEqual({ from: "2026-10-09", to: TODAY });
    expect(presetRange("month", TODAY)).toEqual({ from: "2026-10-01", to: TODAY });
    expect(presetOf({ from: TODAY, to: TODAY }, TODAY)).toBe("today");
  });

  it("keeps only known filter values, and writes back only the facets that are on", () => {
    const filters = filtersFromQuery(new URLSearchParams("method=online,bogus,cash&what=programme"));
    expect(filters).toEqual({ method: ["cash", "online"], kind: [], approval: [], what: ["programme"] });
    expect(filtersQuery(filters)).toEqual({ method: "cash,online", kind: null, approval: null, what: "programme" });
  });

  it("matches within a facet by any value, across facets by all, and searches names and numbers", () => {
    const cash = line({});
    const refund = line({ id: "r", kind: "refund", approved: true, customerId: "c2" });
    expect(matchesFilters(cash, { ...NO_FILTERS, kind: ["in", "refund"] }, "", customers)).toBe(true);
    expect(matchesFilters(refund, { ...NO_FILTERS, method: ["cash"] }, "", customers)).toBe(false);
    expect(matchesFilters(cash, { ...NO_FILTERS, approval: ["waiting"], what: ["booking"] }, "", customers)).toBe(true);
    expect(matchesFilters(refund, NO_FILTERS, "diya", customers)).toBe(true);
    expect(matchesFilters(cash, NO_FILTERS, "0104", customers)).toBe(true);
    expect(matchesFilters(cash, NO_FILTERS, "diya", customers)).toBe(false);
  });

  it("signs money that left or became credit as negative", () => {
    expect(signedPaise(line({ kind: "refund" }))).toBe(-70_000);
    expect(signedPaise(line({ kind: "credit-issued" }))).toBe(-70_000);
    expect(signedPaise(line({ kind: "credit-applied" }))).toBe(70_000);
  });

  it("groups by venue day, newest first, with each day's money in", () => {
    const groups = groupByDay([
      line({ id: "a", at: at("2026-10-14", 600), kind: "online" }),
      line({ id: "b", at: at(TODAY, 1430) }),
      line({ id: "c", at: at(TODAY, 30), kind: "refund", amountPaise: 20_000 }),
    ]);
    expect(groups.map((g) => g.date)).toEqual([TODAY, "2026-10-14"]);
    expect(groups[0]?.payments.map((p) => p.id)).toEqual(["b", "c"]);
    expect(groups[0]?.totals).toEqual({ cashPaise: 70_000, onlinePaise: 0, inPaise: 70_000, refundedPaise: 20_000 });
  });

  it("groups dues by customer, sorted by amount or by age", () => {
    const due = (id: string, customerId: string | null, duePaise: number, since: Due["since"]): Due => ({ subject: { type: "booking", id, label: id }, customerId, duePaise, since });
    const dues = [due("a", "c1", 50_000, "2026-10-10"), due("b", "c1", 20_000, "2026-09-01"), due("c", "c2", 90_000, "2026-10-12"), due("d", null, 10_000, "2026-10-14")];
    const byAmount = groupDues(dues, customers, "amount");
    expect(byAmount.map((g) => [g.name, g.totalPaise, g.since])).toEqual([
      ["Diya Patel", 90_000, "2026-10-12"],
      ["Kabir Singh", 70_000, "2026-09-01"],
      ["No customer", 10_000, "2026-10-14"],
    ]);
    expect(groupDues(dues, customers, "age").map((g) => g.name)).toEqual(["Kabir Singh", "Diya Patel", "No customer"]);
  });

  it("links each subject to the screen that owns it", () => {
    expect(subjectHref({ type: "booking", id: "bk_1", label: "" })).toBe("#/desk/bookings/bk_1");
    expect(subjectHref({ type: "enrolment", id: "enr_1", label: "", programmeId: "prg_juniors" })).toBe("#/desk/programmes/prg_juniors");
    expect(subjectHref({ type: "membership", id: "mem_1", label: "" })).toBe("#/desk/members");
    expect(subjectHref({ type: "credit", id: "c1", label: "" })).toBe("#/desk/money/credits");
  });

  it("writes the CSV with ISO dates and signed bare rupees", () => {
    const rows = paymentsCsvRows([line({ kind: "refund", approved: true, note: "Rain" })], customers, () => "10:00 am");
    expect(rows[1]).toEqual([TODAY, "10:00 am", "Kabir Singh", "+919000000104", "Court 1 · Thu, 15 Oct, 10:00 am", "Refund", "Refund", -700, "Approved", "Rain"]);
  });
});
