/**
 * Resources: things people book that are not people. A court, a room, a desk,
 * a pair of racquets. Each keeps its own week of hours, a capacity and its own
 * bookings; a link books "any free one" of a list, and the booking lands on
 * the one that took it. No React in here: the composition draws it and the
 * tests pin it down.
 *
 * Under the hood a resource is host-shaped: the schedule a Cal.com user has,
 * minus the calendar and the login, plus "how many at once". Round robin's
 * "least recently booked" fallback decides which free one a booking lands on.
 */
import type { Slot } from "@/lib/availability";
import { type PlainDate, type Weekday, weekdayOf } from "@/lib/plain-date";
import { instantAt } from "@/lib/time-zone";

export type ResourceKind = "court" | "room" | "desk" | "equipment" | "vehicle" | "other";

export const RESOURCE_KINDS: readonly { value: ResourceKind; label: string }[] = [
  { value: "court", label: "Court" },
  { value: "room", label: "Room" },
  { value: "desk", label: "Desk" },
  { value: "equipment", label: "Equipment" },
  { value: "vehicle", label: "Vehicle" },
  { value: "other", label: "Other" },
];

/** One day of a resource's week, in minutes from midnight; the same shape as a user's weekly hours. */
export interface ResourceHours {
  open: number;
  close: number;
  closed: boolean;
}

export type ResourceWeek = Record<Weekday, ResourceHours>;

/** A date the week's hours don't apply: a tournament, a repair, a holiday. */
export interface ResourceOverride {
  date: PlainDate;
  reason: string;
}

export interface Resource {
  id: string;
  name: string;
  kind: ResourceKind;
  /** How many bookings it takes at one time. A court takes one; a pair of racquets, two. */
  atOnce: number;
  /** How many people one booking brings, at most. Shown to the person booking; never a lock. */
  people: number;
  /** Its own week, not the host's. */
  hours: ResourceWeek;
  /** A paused resource keeps its bookings but is not offered. */
  active: boolean;
  overrides: readonly ResourceOverride[];
}

export type BookingSource = "page" | "api" | "desk";

export interface ResourceBooking {
  id: string;
  resourceId: string;
  date: PlainDate;
  startMinute: number;
  durationMinutes: number;
  /** Who booked, by first name. */
  name: string;
  /** How many are coming. */
  people: number;
  /** Where it came from: the booking page, an API client (an agent), or the host at the desk. */
  source: BookingSource;
  reference?: string;
}

/** Who a link books: the host's own calendar, as today, or any free one of some resources. */
export type LinkWho = { kind: "person" } | { kind: "resource"; resourceIds: readonly string[] };

export interface ResourceLink {
  id: string;
  title: string;
  slug: string;
  durationMinutes: number;
  who: LinkWho;
}

export const WEEK_ORDER: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const EVERY_DAY = (open: number, close: number): ResourceWeek =>
  Object.fromEntries(WEEK_ORDER.map((d) => [d, { open, close, closed: false }])) as ResourceWeek;

export function sameHours(a: ResourceHours, b: ResourceHours): boolean {
  return a.closed === b.closed && (a.closed || (a.open === b.open && a.close === b.close));
}

/** The hours a resource keeps on a date: the week's row, unless an override closes the day. */
export function hoursOn(resource: Resource, date: PlainDate): ResourceHours {
  const override = resource.overrides.find((o) => o.date === date);
  if (override) return { open: 0, close: 0, closed: true };
  return resource.hours[weekdayOf(date)];
}

/** Open for the whole span, on that date, and not paused. */
export function isOpen(resource: Resource, date: PlainDate, startMinute: number, durationMinutes: number): boolean {
  if (!resource.active) return false;
  const day = hoursOn(resource, date);
  return !day.closed && startMinute >= day.open && startMinute + durationMinutes <= day.close;
}

function overlaps(b: ResourceBooking, startMinute: number, endMinute: number): boolean {
  return b.startMinute < endMinute && startMinute < b.startMinute + b.durationMinutes;
}

/** Bookings on one resource on one day, in time order. */
export function bookingsOn(bookings: readonly ResourceBooking[], resourceId: string, date: PlainDate): ResourceBooking[] {
  return bookings.filter((b) => b.resourceId === resourceId && b.date === date).sort((a, b) => a.startMinute - b.startMinute);
}

/** How many bookings cover a minute of a day on a resource. */
export function countAt(bookings: readonly ResourceBooking[], resourceId: string, date: PlainDate, minute: number): number {
  return bookings.filter((b) => b.resourceId === resourceId && b.date === date && overlaps(b, minute, minute + 1)).length;
}

/** Open for the span, and with room for one more booking at every minute of it. */
export function isFree(resource: Resource, bookings: readonly ResourceBooking[], date: PlainDate, startMinute: number, durationMinutes: number): boolean {
  if (!isOpen(resource, date, startMinute, durationMinutes)) return false;
  const end = startMinute + durationMinutes;
  const onDay = bookings.filter((b) => b.resourceId === resource.id && b.date === date && overlaps(b, startMinute, end));
  // Each booking's start and the span's own start are the only minutes where the count can rise.
  const edges = new Set<number>([startMinute, ...onDay.map((b) => b.startMinute)]);
  for (const minute of edges) {
    if (minute < startMinute || minute >= end) continue;
    if (onDay.filter((b) => overlaps(b, minute, minute + 1)).length >= resource.atOnce) return false;
  }
  return true;
}

/** The resources a link may use, in the link's order, that exist. */
export function linkResources(resources: readonly Resource[], link: ResourceLink): Resource[] {
  if (link.who.kind !== "resource") return [];
  const byId = new Map(resources.map((r) => [r.id, r]));
  return link.who.resourceIds.map((id) => byId.get(id)).filter((r): r is Resource => r !== undefined);
}

/** Which of a link's resources are free for a slot: the `"19:00": { resources: [...] }` line of the slots API. */
export function freeResourcesAt(resources: readonly Resource[], bookings: readonly ResourceBooking[], link: ResourceLink, date: PlainDate, startMinute: number): Resource[] {
  return linkResources(resources, link).filter((r) => isFree(r, bookings, date, startMinute, link.durationMinutes));
}

/**
 * The resource a booking lands on: of the free ones, the least recently
 * booked, as round robin picks a host. A resource that has never been booked
 * comes first; a tie keeps the link's order.
 */
export function assign(resources: readonly Resource[], bookings: readonly ResourceBooking[], link: ResourceLink, date: PlainDate, startMinute: number, timeZone: string): Resource | null {
  const free = freeResourcesAt(resources, bookings, link, date, startMinute);
  if (free.length === 0) return null;
  const lastBookedAt = (r: Resource): number => {
    const own = bookings.filter((b) => b.resourceId === r.id);
    return own.length === 0 ? Number.NEGATIVE_INFINITY : Math.max(...own.map((b) => instantAt(b.date, b.startMinute, timeZone)));
  };
  return free.reduce((best, r) => (lastBookedAt(r) < lastBookedAt(best) ? r : best));
}

export interface LinkSlot extends Slot {
  /** The resources free at this start, in the link's order. Empty unless the slot is available. */
  resources: string[];
}

/**
 * A day of starts for a link that books a resource, in the booking page's
 * shape: a slot is available while any one of the link's resources is free
 * for the link's duration. A start inside hours but with no room is "booked";
 * one the duration runs past closing on every open resource is "closing".
 */
export function linkSlots(
  resources: readonly Resource[],
  bookings: readonly ResourceBooking[],
  link: ResourceLink,
  date: PlainDate,
  { timeZone, stepMinutes = 30, now = Number.NEGATIVE_INFINITY }: { timeZone: string; stepMinutes?: number; now?: number },
): LinkSlot[] {
  const open = linkResources(resources, link)
    .filter((r) => r.active)
    .map((r) => hoursOn(r, date))
    .filter((h) => !h.closed);
  if (open.length === 0) return [];
  const first = Math.min(...open.map((h) => h.open));
  const last = Math.max(...open.map((h) => h.close));
  const slots: LinkSlot[] = [];
  for (let minute = first; minute < last; minute += stepMinutes) {
    const covering = open.filter((h) => minute >= h.open && minute < h.close);
    if (covering.length === 0) continue;
    const start = instantAt(date, minute, timeZone);
    const end = instantAt(date, minute + link.durationMinutes, timeZone);
    const pad = (n: number): string => String(n).padStart(2, "0");
    const base = { id: `${date}T${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`, start, end, minuteOfDay: minute };
    if (start < now) {
      slots.push({ ...base, status: "past", resources: [] });
      continue;
    }
    const free = freeResourcesAt(resources, bookings, link, date, minute);
    if (free.length > 0) {
      slots.push({ ...base, status: "available", resources: free.map((r) => r.id) });
      continue;
    }
    const fits = covering.some((h) => minute + link.durationMinutes <= h.close);
    slots.push({ ...base, status: fits ? "booked" : "closing", resources: [] });
  }
  return slots;
}

/**
 * The same day as Cal.com sees it today, when the link books the host: one
 * calendar, so any booking at a time, on any resource, makes the host busy
 * for every link at once. The host keeps the union of the resources' hours.
 * This is the wall the proposal takes down; it is here so the two can be
 * shown side by side.
 */
export function hostSlots(
  resources: readonly Resource[],
  bookings: readonly ResourceBooking[],
  link: ResourceLink,
  date: PlainDate,
  { timeZone, stepMinutes = 30, now = Number.NEGATIVE_INFINITY }: { timeZone: string; stepMinutes?: number; now?: number },
): LinkSlot[] {
  const open = resources.map((r) => hoursOn(r, date)).filter((h) => !h.closed);
  if (open.length === 0) return [];
  const first = Math.min(...open.map((h) => h.open));
  const last = Math.max(...open.map((h) => h.close));
  const onDay = bookings.filter((b) => b.date === date);
  const slots: LinkSlot[] = [];
  for (let minute = first; minute < last; minute += stepMinutes) {
    const start = instantAt(date, minute, timeZone);
    const end = instantAt(date, minute + link.durationMinutes, timeZone);
    const pad = (n: number): string => String(n).padStart(2, "0");
    const base = { id: `${date}T${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`, start, end, minuteOfDay: minute, resources: [] as string[] };
    if (start < now) slots.push({ ...base, status: "past" });
    else if (onDay.some((b) => overlaps(b, minute, minute + link.durationMinutes))) slots.push({ ...base, status: "booked" });
    else if (minute + link.durationMinutes > last) slots.push({ ...base, status: "closing" });
    else slots.push({ ...base, status: "available" });
  }
  return slots;
}

/** Bookings on a resource from a date on, for the list's "2 upcoming". */
export function upcomingCount(bookings: readonly ResourceBooking[], resourceId: string, from: PlainDate): number {
  return bookings.filter((b) => b.resourceId === resourceId && b.date >= from).length;
}

export interface HoursSegment {
  /** "Mon–Fri", "Sat–Sun", "Wed". */
  days: string;
  /** "6:00 am – 10:00 pm", or "Closed". */
  hours: string;
}

/**
 * The week in as few lines as it takes: consecutive days with the same hours
 * share a line. "Mon–Fri 6:00 am – 10:00 pm · Sat–Sun 6:00 am – 11:00 pm".
 */
export function hoursSummary(week: ResourceWeek, format: { day: (day: Weekday) => string; time: (minute: number) => string; closed?: string }): HoursSegment[] {
  const segments: { from: Weekday; to: Weekday; hours: ResourceHours }[] = [];
  for (const day of WEEK_ORDER) {
    const hours = week[day];
    const last = segments.at(-1);
    if (last && sameHours(last.hours, hours)) last.to = day;
    else segments.push({ from: day, to: day, hours });
  }
  return segments.map(({ from, to, hours }) => ({
    days: from === to ? format.day(from) : `${format.day(from)}–${format.day(to)}`,
    hours: hours.closed ? (format.closed ?? "Closed") : `${format.time(hours.open)} – ${format.time(hours.close)}`,
  }));
}

/** The days whose hours cannot be: closing at or before opening. */
export function invalidDays(week: ResourceWeek): Weekday[] {
  return WEEK_ORDER.filter((d) => !week[d].closed && week[d].close <= week[d].open);
}

/** Why a resource cannot be saved, or null. */
export function validateResource(resource: Pick<Resource, "name" | "atOnce" | "people" | "hours">): string | null {
  if (resource.name.trim() === "") return "Give it a name.";
  if (!Number.isInteger(resource.atOnce) || resource.atOnce < 1) return "It has to take at least one booking at a time.";
  if (!Number.isInteger(resource.people) || resource.people < 1) return "A booking brings at least one person.";
  if (invalidDays(resource.hours).length > 0) return "Closing time has to be after opening time.";
  return null;
}
