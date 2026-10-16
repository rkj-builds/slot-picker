/**
 * The demo's data: invented customers and about two months of bookings,
 * generated in the browser from a fixed seed relative to "today", so every
 * visit looks alive and nothing here is a real person or a real payment.
 *
 * The history is shaped to match what Project 831 actually saw: self-serve
 * bookings with nothing paid were cancelled about 45% of the time (with ten
 * no-shows); bookings paid in full or in part about 7% (with none). The
 * pay-first policy switches on four weeks ago, so unpaid bookings thin out.
 */
import { type Booking, type BookingSource, type Customer, type LedgerEntry, type PayMode, bookingStart } from "@/lib/booking";
import { splitPaise } from "@/lib/money";
import { addDays, type PlainDate, todayIn, weekdayOf } from "@/lib/plain-date";
import { decidePayment } from "@/lib/policy";
import { STATE_VERSION, type AppState } from "@/lib/store";
import { offScreenClubJuniors } from "@/lib/recurring-blocks";
import { instantAt } from "@/lib/time-zone";
import { occursOn } from "@/primitives/recurrence";
import { type CourtId, DEFAULT_SETTINGS, priceFor, VENUE, type VenueSettings } from "@/lib/venue";

const NAMES = [
  "Aarav Sharma", "Diya Patel", "Ishaan Verma", "Ananya Iyer", "Kabir Singh", "Meera Nair",
  "Rohan Mehta", "Saanvi Gupta", "Vihaan Reddy", "Tara Banerjee", "Arjun Kulkarni", "Nisha Hembram",
  "Dev Malhotra", "Priya Soren", "Aditya Rao", "Kavya Menon", "Yash Agarwal", "Ira Chatterjee",
  "Neil D'Souza", "Zoya Khan", "Siddharth Jain", "Riya Das", "Omkar Pandey", "Leela Murmu",
];
const PAY_FIRST = new Set(["Rohan Mehta", "Yash Agarwal"]);
const TRUSTED = new Set(["Aarav Sharma", "Meera Nair"]);

/** mulberry32: small, fast, deterministic. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedCustomers(createdAt: number): Customer[] {
  return NAMES.map((name, i) => ({
    id: `cus_${String(i + 1).padStart(2, "0")}`,
    name,
    // Obviously fictional numbers: +91 90000 001xx.
    phone: `+9190000001${String(i).padStart(2, "0")}`,
    payFirst: PAY_FIRST.has(name),
    trusted: TRUSTED.has(name),
    creditPaise: 0,
    createdAt,
  }));
}

type Category = "unpaid" | "full" | "part" | "desk";
type Outcome = "attended" | "cancelled-credit" | "cancelled-refund" | "cancelled" | "no-show";

interface Spec {
  category: Category;
  outcome: Outcome;
}

function specs(): Spec[] {
  const out: Spec[] = [];
  const add = (category: Category, outcome: Outcome, count: number): void => {
    for (let i = 0; i < count; i += 1) out.push({ category, outcome });
  };
  // 60 unpaid self-serve: 27 cancelled (45%), 10 no-shows.
  add("unpaid", "cancelled", 27);
  add("unpaid", "no-show", 10);
  add("unpaid", "attended", 23);
  // 86 paid self-serve: 6 cancelled (7%), no no-shows.
  add("full", "cancelled-credit", 2);
  add("full", "cancelled-refund", 1);
  add("full", "attended", 47);
  add("part", "cancelled-credit", 2);
  add("part", "cancelled-refund", 1);
  add("part", "attended", 33);
  // Desk bookings (phone and walk-in), mostly settled in cash.
  add("desk", "cancelled", 4);
  add("desk", "attended", 46);
  return out;
}

const HISTORY_TIMES = [6, 7, 8, 9, 16, 17, 18, 19, 20, 21].map((h) => h * 60);

class Occupancy {
  private readonly taken = new Map<string, [number, number][]>();
  isFree(date: PlainDate, court: CourtId, start: number, duration: number): boolean {
    const spans = this.taken.get(`${date}|${court}`) ?? [];
    return spans.every(([s, e]) => start + duration <= s || e <= start);
  }
  take(date: PlainDate, court: CourtId, start: number, duration: number): void {
    const key = `${date}|${court}`;
    const spans = this.taken.get(key) ?? [];
    spans.push([start, start + duration]);
    this.taken.set(key, spans);
  }
}

export function seedState(now: number, settings: VenueSettings = DEFAULT_SETTINGS): AppState {
  const random = seededRandom(831);
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;
  const today = todayIn(VENUE.timeZone, now);
  const customers = seedCustomers(instantAt(addDays(today, -120), 10 * 60, VENUE.timeZone));
  const regulars = customers.filter((c) => !c.payFirst);
  const ghosts = customers.filter((c) => c.payFirst);
  const occupancy = new Occupancy();
  const bookings: Booking[] = [];
  let n = 0;
  const id = (prefix: string): string => `${prefix}_seed${(n += 1).toString(36)}`;

  const make = (fields: {
    court: CourtId;
    date: PlainDate;
    start: number;
    duration: number;
    customer: Customer | null;
    source: BookingSource;
    payMode: PayMode;
    kind?: Booking["kind"];
    title?: string;
  }): Booking => {
    occupancy.take(fields.date, fields.court, fields.start, fields.duration);
    const startAt = instantAt(fields.date, fields.start, VENUE.timeZone);
    return {
      id: id("bk"),
      courtId: fields.court,
      date: fields.date,
      startMinute: fields.start,
      durationMinutes: fields.duration,
      customerId: fields.customer?.id ?? null,
      kind: fields.kind ?? "booking",
      title: fields.title ?? "",
      players: pick([2, 4, 4, 4]),
      notes: "",
      source: fields.source,
      status: "confirmed",
      payMode: fields.payMode,
      pricePaise: fields.kind && fields.kind !== "booking" ? 0 : priceFor(settings, fields.date, fields.start, fields.duration),
      holdExpiresAt: null,
      createdAt: startAt - Math.floor(1 + random() * 3) * 86_400_000 - Math.floor(random() * 10) * 3_600_000,
      cancelledAt: null,
      ledger: [],
    };
  };
  const entry = (kind: LedgerEntry["kind"], amountPaise: number, at: number, note: string): LedgerEntry => ({
    id: id("le"),
    kind,
    amountPaise,
    at,
    note,
  });

  // --- History: eight weeks, finished days only. --------------------------------
  const all = specs();
  // Shuffle deterministically, then place unpaid bookings mostly before the policy and paid ones after it.
  for (let i = all.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = all[i];
    const b = all[j];
    if (a && b) [all[i], all[j]] = [b, a];
  }
  let ghostNoShows = 0;
  for (const spec of all) {
    const early = spec.category === "unpaid" ? random() < 0.8 : spec.category === "desk" ? random() < 0.5 : random() < 0.25;
    const dayOffset = early ? -56 + Math.floor(random() * 28) : -28 + Math.floor(random() * 24);
    let placed: Booking | null = null;
    for (let tries = 0; tries < 40 && !placed; tries += 1) {
      const date = addDays(today, dayOffset - (tries % 7));
      const court: CourtId = random() < 0.5 ? "court-1" : "court-2";
      const start = pick(HISTORY_TIMES);
      if (!occupancy.isFree(date, court, start, 60)) continue;
      const customer =
        spec.outcome === "no-show" && ghostNoShows < 7 ? (ghosts[(ghostNoShows += 1) % ghosts.length] ?? null) : pick(regulars);
      const payMode: PayMode = spec.category === "full" ? "full" : spec.category === "part" ? "part" : "venue";
      placed = make({ court, date, start, duration: 60, customer, source: spec.category === "desk" ? "desk" : "self-serve", payMode });
    }
    if (!placed) continue;
    const b = placed;
    const startAt = bookingStart(b);
    const { now: deposit, later: balance } = splitPaise(b.pricePaise, settings.depositPercent);
    if (spec.category === "full") b.ledger.push(entry("online", b.pricePaise, b.createdAt, "Paid in full by UPI"));
    if (spec.category === "part") b.ledger.push(entry("online", deposit, b.createdAt, "Deposit by UPI"));
    switch (spec.outcome) {
      case "attended":
        if (spec.category === "part") b.ledger.push(entry("cash", balance, startAt, "Cash at the desk"));
        if (spec.category === "unpaid" || spec.category === "desk") b.ledger.push(entry("cash", b.pricePaise, startAt, "Cash at the desk"));
        break;
      case "no-show":
        b.status = "no-show";
        break;
      case "cancelled":
      case "cancelled-credit":
      case "cancelled-refund": {
        b.status = "cancelled";
        b.cancelledAt = startAt - Math.floor(2 + random() * 20) * 3_600_000;
        const paid = b.ledger.reduce((sum, e) => sum + e.amountPaise, 0);
        if (paid > 0 && spec.outcome === "cancelled-credit") {
          b.ledger.push(entry("credit-issued", paid, b.cancelledAt, "Kept as credit for the next booking"));
          const c = customers.find((x) => x.id === b.customerId);
          if (c) c.creditPaise += paid;
        }
        if (paid > 0 && spec.outcome === "cancelled-refund") b.ledger.push(entry("refund", paid, b.cancelledAt, "Refunded to the original payment method"));
        break;
      }
    }
    bookings.push(b);
  }

  // --- The weekend hold: Off-Screen Club Juniors, both courts, from the first Saturday in the live window. ---
  let oscStart = addDays(today, -3);
  while (weekdayOf(oscStart) !== "sat") oscStart = addDays(oscStart, 1);
  const osc = offScreenClubJuniors(oscStart, instantAt(addDays(today, -10), 10 * 60, VENUE.timeZone));
  for (let d = -3; d <= 7; d += 1) {
    const date = addDays(today, d);
    if (!occursOn(osc.rule, date)) continue;
    for (const court of osc.courtIds) occupancy.take(date, court, osc.rule.startMinute, osc.rule.endMinute - osc.rule.startMinute);
  }

  // --- The live window: three days back to a week ahead. ---------------------------
  for (let d = -3; d <= 7; d += 1) {
    const date = addDays(today, d);
    const weekday = weekdayOf(date);
    const weekend = weekday === "sat" || weekday === "sun";
    // Juniors coaching, weekday mornings on Court 2.
    if (!weekend) {
      bookings.push(make({ court: "court-2", date, start: 6 * 60, duration: 60, customer: null, source: "desk", payMode: "venue", kind: "coaching", title: "Juniors coaching" }));
    }
    if (d === 4) {
      bookings.push(make({ court: "court-1", date, start: 12 * 60, duration: 120, customer: null, source: "desk", payMode: "venue", kind: "blocked", title: "Net and line repainting" }));
    }
    for (const court of ["court-1", "court-2"] as const) {
      let minute = 6 * 60;
      while (minute < 22 * 60) {
        const evening = minute >= 17 * 60;
        const chance = (evening ? 0.52 : 0.2) + (weekend ? 0.15 : 0);
        if (random() >= chance) {
          minute += 30;
          continue;
        }
        const duration = pick([60, 60, 90, 120]);
        if (minute + duration > 23 * 60 || !occupancy.isFree(date, court, minute, duration)) {
          minute += 30;
          continue;
        }
        const customer = pick(customers);
        const source: BookingSource = random() < 0.72 ? "self-serve" : "desk";
        const price = priceFor(settings, date, minute, duration);
        const decision = decidePayment(settings, { date, pricePaise: price }, { payFirst: customer.payFirst, trusted: customer.trusted });
        const roll = random();
        const payMode: PayMode = source === "desk" ? "venue" : decision.modes.includes("venue") && roll < 0.5 ? "venue" : decision.modes.includes("part") && roll < 0.8 ? "part" : "full";
        const b = make({ court, date, start: minute, duration, customer, source, payMode });
        const startAt = bookingStart(b);
        if (payMode === "full") b.ledger.push(entry("online", b.pricePaise, b.createdAt, "Paid in full by UPI"));
        if (payMode === "part") b.ledger.push(entry("online", decision.depositPaise || splitPaise(b.pricePaise, settings.depositPercent).now, b.createdAt, "Deposit by UPI"));
        const over = startAt + duration * 60_000 <= now;
        const prepaid = b.ledger.reduce((s, e) => s + e.amountPaise, 0);
        const unpaidSelfServe = source === "self-serve" && prepaid === 0;
        const outcome = random();
        // Past days follow the same odds as the history; future days only cancel occasionally.
        const cancelOdds = over ? (unpaidSelfServe ? 0.45 : 0.07) : 0.06;
        if (outcome < cancelOdds) {
          b.status = "cancelled";
          b.cancelledAt = Math.min(now, startAt) - 3_600_000;
          if (prepaid > 0) {
            b.ledger.push(entry("credit-issued", prepaid, b.cancelledAt, "Kept as credit for the next booking"));
            customer.creditPaise += prepaid;
          }
        } else if (over && unpaidSelfServe && outcome < 0.62) {
          b.status = "no-show";
        } else if (over && b.pricePaise > prepaid) {
          // Finished: the desk settled the balance in cash.
          b.ledger.push(entry("cash", b.pricePaise - prepaid, startAt, "Cash at the desk"));
        }
        bookings.push(b);
        minute += duration;
      }
    }
  }

  // --- One live hold, so the desk shows a countdown from the first visit. -------------
  const hold = firstFreeAfter(occupancy, today, now);
  if (hold) {
    const customer = customers.find((c) => c.name === "Ishaan Verma") ?? null;
    const b = make({ court: hold.court, date: hold.date, start: hold.start, duration: 60, customer, source: "self-serve", payMode: "part" });
    b.status = "held";
    b.holdExpiresAt = now + 9 * 60_000;
    b.createdAt = now - 6 * 60_000;
    bookings.push(b);
  }

  return { version: STATE_VERSION, seededOn: today, settings, customers, bookings, recurringBlocks: [osc] };
}

function firstFreeAfter(occupancy: Occupancy, today: PlainDate, now: number): { date: PlainDate; court: CourtId; start: number } | null {
  for (let d = 0; d < 3; d += 1) {
    const date = addDays(today, d);
    for (let start = 17 * 60; start <= 22 * 60; start += 30) {
      if (instantAt(date, start, VENUE.timeZone) < now + 30 * 60_000) continue;
      for (const court of ["court-1", "court-2"] as const) {
        if (occupancy.isFree(date, court, start, 60)) return { date, court, start };
      }
    }
  }
  return null;
}
