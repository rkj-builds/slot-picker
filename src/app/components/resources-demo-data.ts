import { EVERY_DAY, type Resource, type ResourceBooking, type ResourceLink } from "@/lib/resources";

/** Sunday 1 November 2026, 10:00 am in Jamshedpur: the day before the booking the agent made. */
export const DEMO_NOW = Date.UTC(2026, 10, 1, 4, 30);
export const DEMO_DATE = "2026-11-02";
export const DEMO_ZONE = "Asia/Kolkata";
export const DEMO_LOCALE = "en-IN";

/** Project 831's real hours on Cal.com: weekdays to 10 pm, weekends to 11. */
const WEEK: Resource["hours"] = { ...EVERY_DAY(6 * 60, 22 * 60), sat: { open: 6 * 60, close: 23 * 60, closed: false }, sun: { open: 6 * 60, close: 23 * 60, closed: false } };

export const COURTS: readonly Resource[] = [
  { id: "court-1", name: "Court 1", kind: "court", atOnce: 1, people: 4, hours: WEEK, active: true, overrides: [] },
  { id: "court-2", name: "Court 2", kind: "court", atOnce: 1, people: 4, hours: WEEK, active: true, overrides: [] },
];

/** The booking the WhatsApp agent made on 1 November 2026: Court 1, Monday 2 November, 7 to 8 pm. */
export const RAHUL: ResourceBooking = { id: "6BJQBEJ7", resourceId: "court-1", date: DEMO_DATE, startMinute: 19 * 60, durationMinutes: 60, name: "Rahul", people: 4, source: "api", reference: "6BJQBEJ7" };

export const LINK: ResourceLink = { id: "court", title: "Book a court", slug: "court", durationMinutes: 60, who: { kind: "resource", resourceIds: ["court-1", "court-2"] } };
