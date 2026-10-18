/**
 * The bookings list's views and filters, as plain data that lives in the URL
 * (#/desk/bookings/payment-due?court=court-1&via=desk), so a filtered list is
 * a link and Back undoes a filter. Pure, so the rules are tested without a
 * screen.
 */
import { dayOf } from "@/app/format";
import { type Booking, bookingEnd, type BookingSource, type Customer, customerById, deskState, type DeskState, duePaise, sortBookings } from "@/lib/booking";
import { addDays, compareDates, isPlainDate, type PlainDate } from "@/lib/plain-date";
import { isRecurringId } from "@/lib/recurring-blocks";
import { COURTS, type CourtId } from "@/lib/venue";

export type BookingsViewId = "upcoming" | "payment-due" | "past" | "cancelled";

export interface BookingsViewDef {
  id: BookingsViewId;
  label: string;
  /** The empty state when nothing is filtered: what is missing and when it appears. */
  empty: { title: string; description: string };
}

export const BOOKINGS_VIEWS: readonly BookingsViewDef[] = [
  { id: "upcoming", label: "Upcoming", empty: { title: "No upcoming bookings", description: "As soon as someone books a court, it shows up here." } },
  { id: "payment-due", label: "Payment due", empty: { title: "Nothing is owed", description: "Bookings with money still to collect show up here, past or upcoming." } },
  { id: "past", label: "Past", empty: { title: "No past bookings", description: "Bookings move here once their time is over." } },
  { id: "cancelled", label: "Cancelled", empty: { title: "No cancelled bookings", description: "Cancelled bookings stay here, with what happened to their money." } },
];

export function isBookingsView(value: string | undefined): value is BookingsViewId {
  return BOOKINGS_VIEWS.some((v) => v.id === value);
}

/** The path of a view: Upcoming is the list's home. */
export function viewPath(view: BookingsViewId): string {
  return view === "upcoming" ? "/desk/bookings" : `/desk/bookings/${view}`;
}

/** The dates a view reads when no date filter is set. Dues and history look back three months. */
export function viewWindow(view: BookingsViewId, today: PlainDate): { from: PlainDate; to: PlainDate } {
  switch (view) {
    case "upcoming":
      return { from: today, to: addDays(today, 60) };
    case "past":
      return { from: addDays(today, -90), to: today };
    default:
      return { from: addDays(today, -90), to: addDays(today, 60) };
  }
}

export function inView(view: BookingsViewId, b: Booking, now: number): boolean {
  const over = bookingEnd(b) <= now;
  const live = b.status !== "cancelled" && b.status !== "expired" && deskState(b, now) !== "expired";
  switch (view) {
    case "upcoming":
      return live && !over;
    case "past":
      return live && over;
    case "payment-due":
      return live && duePaise(b) > 0;
    case "cancelled":
      return b.status === "cancelled";
  }
}

/** Upcoming and dues read forwards (soonest, oldest debt first); history reads backwards. */
export function sortForView(view: BookingsViewId): (a: Booking, b: Booking) => number {
  return view === "past" || view === "cancelled" ? (a, b) => sortBookings(b, a) : sortBookings;
}

/* ── Filters ────────────────────────────────────────────────────────── */

export type FilterField = "court" | "status" | "via" | "dates";

export const STATUS_OPTIONS: readonly { value: DeskState; label: string }[] = [
  { value: "paid", label: "Paid" },
  { value: "part-paid", label: "Part-paid" },
  { value: "due", label: "Due at venue" },
  { value: "held", label: "Held" },
  { value: "no-show", label: "No-show" },
  { value: "coaching", label: "Coaching" },
  { value: "blocked", label: "Blocked" },
];

export const VIA_OPTIONS: readonly { value: BookingSource; label: string }[] = [
  { value: "self-serve", label: "Online" },
  { value: "desk", label: "Desk" },
];

export interface BookingFilters {
  q: string;
  courts: CourtId[];
  statuses: DeskState[];
  via: BookingSource[];
  /** Both set, or neither: a date range replaces the view's own window. */
  from: PlainDate | null;
  to: PlainDate | null;
}

export const NO_FILTERS: BookingFilters = { q: "", courts: [], statuses: [], via: [], from: null, to: null };

function list<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  return (raw ?? "")
    .split(",")
    .filter((v): v is T => (allowed as readonly string[]).includes(v));
}

export function readFilters(query: URLSearchParams): BookingFilters {
  const from = query.get("from") ?? "";
  const to = query.get("to") ?? "";
  const range = isPlainDate(from) && isPlainDate(to) && compareDates(from, to) <= 0;
  return {
    q: query.get("q") ?? "",
    courts: list(query.get("court"), COURTS.map((c) => c.id)),
    statuses: list(
      query.get("status"),
      STATUS_OPTIONS.map((s) => s.value),
    ),
    via: list(
      query.get("via"),
      VIA_OPTIONS.map((v) => v.value),
    ),
    from: range ? from : null,
    to: range ? to : null,
  };
}

/** The filters as query parameters; empty ones drop out of the URL. */
export function filterQuery(filters: BookingFilters): Record<string, string | null> {
  return {
    q: filters.q.trim() || null,
    court: filters.courts.join(",") || null,
    status: filters.statuses.join(",") || null,
    via: filters.via.join(",") || null,
    from: filters.from,
    to: filters.to,
  };
}

/** Which chips are on: a field with a value. */
export function activeFields(filters: BookingFilters): FilterField[] {
  const out: FilterField[] = [];
  if (filters.courts.length) out.push("court");
  if (filters.statuses.length) out.push("status");
  if (filters.via.length) out.push("via");
  if (filters.from && filters.to) out.push("dates");
  return out;
}

export function isFiltered(filters: BookingFilters): boolean {
  return Boolean(filters.q.trim()) || activeFields(filters).length > 0;
}

/** Search by name, block title, or three or more digits of a phone number. */
export function matchesSearch(b: Booking, customers: readonly Customer[], q: string): boolean {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  const digits = query.replaceAll(/\D/g, "");
  const customer = customerById(customers, b.customerId);
  const name = (b.kind === "booking" ? (customer?.name ?? b.title) : b.title).toLowerCase();
  return name.includes(query) || (digits.length >= 3 && Boolean(customer?.phone.includes(digits)));
}

/**
 * The rows a view shows: the view's own rule, then each filter. Repeating
 * blocks are left out; they are managed (and listed) in Availability.
 */
export function bookingsFor(view: BookingsViewId, bookings: readonly Booking[], customers: readonly Customer[], filters: BookingFilters, now: number): Booking[] {
  return bookings
    .filter((b) => !isRecurringId(b.id))
    .filter((b) => inView(view, b, now))
    .filter((b) => filters.courts.length === 0 || filters.courts.includes(b.courtId))
    .filter((b) => filters.statuses.length === 0 || filters.statuses.includes(deskState(b, now)))
    .filter((b) => filters.via.length === 0 || (b.kind === "booking" && filters.via.includes(b.source)))
    .filter((b) => !filters.from || !filters.to || (compareDates(b.date, filters.from) >= 0 && compareDates(b.date, filters.to) <= 0))
    .filter((b) => matchesSearch(b, customers, filters.q))
    .sort(sortForView(view));
}

export interface DayGroup {
  date: PlainDate;
  label: string;
  rows: Booking[];
}

/** "Today", "Tomorrow", "Yesterday", else "Sat, 17 Oct". */
export function dayLabel(date: PlainDate, today: PlainDate): string {
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  if (date === addDays(today, -1)) return "Yesterday";
  return dayOf(date);
}

/** Consecutive rows on the same day, in the order given. */
export function groupByDay(rows: readonly Booking[], today: PlainDate): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const b of rows) {
    const last = groups.at(-1);
    if (last?.date === b.date) last.rows.push(b);
    else groups.push({ date: b.date, label: dayLabel(b.date, today), rows: [b] });
  }
  return groups;
}
