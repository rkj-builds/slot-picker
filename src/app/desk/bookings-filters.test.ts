import { describe, expect, it } from "vitest";
import { activeFields, bookingsFor, filterQuery, groupByDay, inView, NO_FILTERS, readFilters, viewWindow } from "@/app/desk/bookings-filters";
import { TEST_NOW } from "@/app/test-utils";
import type { Booking, Customer } from "@/lib/booking";

const customers: Customer[] = [
  { id: "c1", name: "Kabir Singh", phone: "+919000000105", payFirst: false, trusted: false, creditPaise: 0, createdAt: 0 },
  { id: "c2", name: "Meera Nair", phone: "+919000000106", payFirst: false, trusted: false, creditPaise: 0, createdAt: 0 },
];

function booking(id: string, overrides: Partial<Booking> = {}): Booking {
  return {
    id,
    courtId: "court-1",
    date: "2026-10-15",
    startMinute: 19 * 60,
    durationMinutes: 60,
    customerId: "c1",
    kind: "booking",
    title: "",
    players: 4,
    notes: "",
    source: "desk",
    status: "confirmed",
    payMode: "venue",
    pricePaise: 80_000,
    holdExpiresAt: null,
    createdAt: 0,
    cancelledAt: null,
    ledger: [],
    ...overrides,
  };
}

const paid = [{ id: "le", at: 0, kind: "cash" as const, amountPaise: 80_000, note: "" }];

describe("bookings views", () => {
  it("upcoming is what hasn't ended; past is what has; dues are any date", () => {
    const later = booking("later");
    const earlier = booking("earlier", { startMinute: 7 * 60 });
    expect(inView("upcoming", later, TEST_NOW)).toBe(true);
    expect(inView("upcoming", earlier, TEST_NOW)).toBe(false);
    expect(inView("past", earlier, TEST_NOW)).toBe(true);
    expect(inView("payment-due", earlier, TEST_NOW)).toBe(true);
    expect(inView("payment-due", booking("settled", { ledger: paid }), TEST_NOW)).toBe(false);
    expect(inView("cancelled", booking("gone", { status: "cancelled" }), TEST_NOW)).toBe(true);
    expect(inView("upcoming", booking("gone", { status: "cancelled" }), TEST_NOW)).toBe(false);
  });

  it("each view reads its own window of dates", () => {
    expect(viewWindow("upcoming", "2026-10-15")).toEqual({ from: "2026-10-15", to: "2026-12-14" });
    expect(viewWindow("past", "2026-10-15")).toEqual({ from: "2026-07-17", to: "2026-10-15" });
  });

  it("history reads newest first; upcoming soonest first; repeating blocks stay out", () => {
    const rows = [booking("a", { date: "2026-10-16" }), booking("b", { date: "2026-10-18" }), booking("rb:osc:2026-10-17:court-1", { date: "2026-10-17", kind: "blocked", title: "Club" })];
    expect(bookingsFor("upcoming", rows, customers, NO_FILTERS, TEST_NOW).map((b) => b.id)).toEqual(["a", "b"]);
    const old = [booking("x", { date: "2026-10-10" }), booking("y", { date: "2026-10-12" })];
    expect(bookingsFor("past", old, customers, NO_FILTERS, TEST_NOW).map((b) => b.id)).toEqual(["y", "x"]);
  });
});

describe("bookings filters", () => {
  it("round-trip through the URL, dropping anything unknown", () => {
    const filters = readFilters(new URLSearchParams("q=kab&court=court-2,court-9&status=due&via=desk&from=2026-10-01&to=2026-10-07"));
    expect(filters).toEqual({ q: "kab", courts: ["court-2"], statuses: ["due"], via: ["desk"], from: "2026-10-01", to: "2026-10-07" });
    expect(filterQuery(filters)).toEqual({ q: "kab", court: "court-2", status: "due", via: "desk", from: "2026-10-01", to: "2026-10-07" });
    expect(activeFields(filters)).toEqual(["court", "status", "via", "dates"]);
    // A range backwards is no range.
    expect(readFilters(new URLSearchParams("from=2026-10-07&to=2026-10-01")).from).toBeNull();
  });

  it("filter by court, how it was booked, status and search", () => {
    const rows = [
      booking("k1"),
      booking("k2", { courtId: "court-2", source: "self-serve" }),
      booking("m1", { customerId: "c2", startMinute: 20 * 60, ledger: paid }),
    ];
    const run = (q: string): string[] => bookingsFor("upcoming", rows, customers, readFilters(new URLSearchParams(q)), TEST_NOW).map((b) => b.id);
    expect(run("court=court-2")).toEqual(["k2"]);
    expect(run("via=desk")).toEqual(["k1", "m1"]);
    expect(run("status=paid")).toEqual(["m1"]);
    expect(run("q=meera")).toEqual(["m1"]);
    // Three digits or more of a phone number.
    expect(run("q=0106")).toEqual(["m1"]);
  });

  it("groups consecutive rows by day, naming today and tomorrow", () => {
    const groups = groupByDay([booking("a"), booking("b"), booking("c", { date: "2026-10-16" }), booking("d", { date: "2026-10-20" })], "2026-10-15");
    expect(groups.map((g) => [g.label, g.rows.length])).toEqual([
      ["Today", 2],
      ["Tomorrow", 1],
      ["Tue, 20 Oct", 1],
    ]);
  });
});
