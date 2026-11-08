import { describe, expect, it } from "vitest";
import {
  assign,
  countAt,
  EVERY_DAY,
  freeResourcesAt,
  hostSlots,
  hoursOn,
  hoursSummary,
  invalidDays,
  isFree,
  linkSlots,
  type Resource,
  type ResourceBooking,
  type ResourceLink,
  upcomingCount,
  validateResource,
} from "@/lib/resources";

const ZONE = "Asia/Kolkata";
const MON: Resource["hours"] = { ...EVERY_DAY(6 * 60, 22 * 60), sat: { open: 6 * 60, close: 23 * 60, closed: false }, sun: { open: 6 * 60, close: 23 * 60, closed: false } };

const court = (id: string, name: string, extra: Partial<Resource> = {}): Resource => ({ id, name, kind: "court", atOnce: 1, people: 4, hours: MON, active: true, overrides: [], ...extra });
const COURTS: Resource[] = [court("court-1", "Court 1"), court("court-2", "Court 2")];
const LINK: ResourceLink = { id: "book-a-court", title: "Book a court", slug: "court", durationMinutes: 60, who: { kind: "resource", resourceIds: ["court-1", "court-2"] } };
/** Rahul's real test booking: Court 1, Monday 2 November 2026, 7 to 8 pm, from WhatsApp. */
const RAHUL: ResourceBooking = { id: "6BJQBEJ7", resourceId: "court-1", date: "2026-11-02", startMinute: 19 * 60, durationMinutes: 60, name: "Rahul", people: 4, source: "api", reference: "6BJQBEJ7" };

describe("a resource's hours", () => {
  it("keeps its own week, and an override closes a day", () => {
    const withOverride = court("c", "C", { overrides: [{ date: "2026-11-15", reason: "Tournament" }] });
    expect(hoursOn(withOverride, "2026-11-02")).toEqual({ open: 360, close: 1320, closed: false });
    expect(hoursOn(withOverride, "2026-11-14").close).toBe(23 * 60);
    expect(hoursOn(withOverride, "2026-11-15").closed).toBe(true);
  });

  it("summarises consecutive days with the same hours on one line", () => {
    const fmt = { day: (d: string) => d[0]!.toUpperCase() + d.slice(1), time: (m: number) => `${m / 60}h` };
    expect(hoursSummary(MON, fmt)).toEqual([
      { days: "Mon–Fri", hours: "6h – 22h" },
      { days: "Sat–Sun", hours: "6h – 23h" },
    ]);
    expect(hoursSummary({ ...MON, wed: { open: 0, close: 0, closed: true } }, fmt)).toEqual([
      { days: "Mon–Tue", hours: "6h – 22h" },
      { days: "Wed", hours: "Closed" },
      { days: "Thu–Fri", hours: "6h – 22h" },
      { days: "Sat–Sun", hours: "6h – 23h" },
    ]);
  });

  it("names the days that close before they open", () => {
    expect(invalidDays(MON)).toEqual([]);
    expect(invalidDays({ ...MON, tue: { open: 600, close: 600, closed: false } })).toEqual(["tue"]);
    expect(validateResource({ name: "Court 3", atOnce: 1, people: 4, hours: { ...MON, tue: { open: 600, close: 540, closed: false } } })).toMatch(/after opening/);
    expect(validateResource({ name: " ", atOnce: 1, people: 4, hours: MON })).toMatch(/name/);
    expect(validateResource({ name: "Court 3", atOnce: 0, people: 4, hours: MON })).toMatch(/at least one booking/);
    expect(validateResource({ name: "Court 3", atOnce: 1, people: 4, hours: MON })).toBeNull();
  });
});

describe("free or not", () => {
  it("is taken while a booking covers any minute of the span", () => {
    expect(isFree(COURTS[0]!, [RAHUL], "2026-11-02", 19 * 60, 60)).toBe(false);
    expect(isFree(COURTS[0]!, [RAHUL], "2026-11-02", 18 * 60 + 30, 60)).toBe(false);
    expect(isFree(COURTS[0]!, [RAHUL], "2026-11-02", 20 * 60, 60)).toBe(true);
    expect(isFree(COURTS[1]!, [RAHUL], "2026-11-02", 19 * 60, 60)).toBe(true);
    expect(countAt([RAHUL], "court-1", "2026-11-02", 19 * 60 + 15)).toBe(1);
  });

  it("takes as many at once as its capacity says", () => {
    const racquets = court("racquets", "Racquets", { kind: "equipment", atOnce: 2, people: 1 });
    const one: ResourceBooking = { ...RAHUL, id: "a", resourceId: "racquets" };
    const two: ResourceBooking = { ...RAHUL, id: "b", resourceId: "racquets", startMinute: 19 * 60 + 30 };
    expect(isFree(racquets, [one], "2026-11-02", 19 * 60, 60)).toBe(true);
    // 7 to 8 pm: both pairs are out from 7:30. 6:30 to 7:30 overlaps only the first.
    expect(isFree(racquets, [one, two], "2026-11-02", 19 * 60, 60)).toBe(false);
    expect(isFree(racquets, [one, two], "2026-11-02", 18 * 60 + 30, 60)).toBe(true);
    expect(isFree(racquets, [one, two], "2026-11-02", 20 * 60, 60)).toBe(true);
  });

  it("is never free outside its hours, on a closed date, or while paused", () => {
    expect(isFree(COURTS[0]!, [], "2026-11-02", 21 * 60 + 30, 60)).toBe(false);
    expect(isFree(COURTS[0]!, [], "2026-11-07", 22 * 60, 60)).toBe(true);
    expect(isFree(court("p", "P", { active: false }), [], "2026-11-02", 10 * 60, 60)).toBe(false);
    expect(isFree(court("o", "O", { overrides: [{ date: "2026-11-02", reason: "Repair" }] }), [], "2026-11-02", 10 * 60, 60)).toBe(false);
  });
});

describe("a link that books any free one", () => {
  it("says which resources are free at a start, in the link's order", () => {
    expect(freeResourcesAt(COURTS, [RAHUL], LINK, "2026-11-02", 19 * 60).map((r) => r.id)).toEqual(["court-2"]);
    expect(freeResourcesAt(COURTS, [RAHUL], LINK, "2026-11-02", 20 * 60).map((r) => r.id)).toEqual(["court-1", "court-2"]);
    expect(freeResourcesAt(COURTS, [RAHUL], { ...LINK, who: { kind: "person" } }, "2026-11-02", 20 * 60)).toEqual([]);
  });

  it("lands a booking on the least recently booked free resource", () => {
    expect(assign(COURTS, [RAHUL], LINK, "2026-11-02", 19 * 60, ZONE)?.id).toBe("court-2");
    // Both free: Court 2 has never been booked, so it goes first.
    expect(assign(COURTS, [RAHUL], LINK, "2026-11-02", 20 * 60, ZONE)?.id).toBe("court-2");
    // Both booked before: the one booked longer ago.
    const older: ResourceBooking = { ...RAHUL, id: "old", resourceId: "court-2", date: "2026-10-30" };
    expect(assign(COURTS, [RAHUL, older], LINK, "2026-11-02", 20 * 60, ZONE)?.id).toBe("court-2");
    const newer: ResourceBooking = { ...RAHUL, id: "new", resourceId: "court-2", date: "2026-11-03" };
    expect(assign(COURTS, [RAHUL, newer], LINK, "2026-11-02", 20 * 60, ZONE)?.id).toBe("court-1");
    // Nothing free.
    expect(assign(COURTS, [RAHUL, { ...RAHUL, id: "x", resourceId: "court-2" }], LINK, "2026-11-02", 19 * 60, ZONE)).toBeNull();
  });

  it("builds the day's slots: 7 pm stays available while a court is free", () => {
    const slots = linkSlots(COURTS, [RAHUL], LINK, "2026-11-02", { timeZone: ZONE });
    expect(slots[0]).toMatchObject({ id: "2026-11-02T06:00", minuteOfDay: 360, status: "available", resources: ["court-1", "court-2"] });
    const seven = slots.find((s) => s.minuteOfDay === 19 * 60);
    expect(seven).toMatchObject({ status: "available", resources: ["court-2"] });
    const half = slots.find((s) => s.minuteOfDay === 18 * 60 + 30);
    expect(half).toMatchObject({ status: "available", resources: ["court-2"] });
    // Closing at 10 pm: the last hour-long start is 9 pm; 9:30 pm runs past closing on both courts.
    expect(slots.at(-1)).toMatchObject({ minuteOfDay: 21 * 60 + 30, status: "closing" });
    expect(slots).toHaveLength(32);
  });

  it("marks a start taken on every resource as booked, and one that has passed as past", () => {
    const both = [RAHUL, { ...RAHUL, id: "y", resourceId: "court-2" }];
    const slots = linkSlots(COURTS, both, LINK, "2026-11-02", { timeZone: ZONE });
    expect(slots.find((s) => s.minuteOfDay === 19 * 60)).toMatchObject({ status: "booked", resources: [] });
    const later = linkSlots(COURTS, both, LINK, "2026-11-02", { timeZone: ZONE, now: Date.UTC(2026, 10, 2, 13, 30) }); // 7 pm IST
    expect(later.find((s) => s.minuteOfDay === 18 * 60)).toMatchObject({ status: "past" });
    expect(later.find((s) => s.minuteOfDay === 20 * 60)).toMatchObject({ status: "available" });
  });

  it("follows the union of the resources' hours, and leaves out paused ones", () => {
    const late = court("late", "Late court", { hours: EVERY_DAY(18 * 60, 23 * 60) });
    const link: ResourceLink = { ...LINK, who: { kind: "resource", resourceIds: ["court-1", "late"] } };
    const slots = linkSlots([COURTS[0]!, late], [], link, "2026-11-02", { timeZone: ZONE });
    expect(slots[0]?.minuteOfDay).toBe(6 * 60);
    expect(slots.at(-1)?.minuteOfDay).toBe(22 * 60 + 30);
    expect(slots.find((s) => s.minuteOfDay === 22 * 60)).toMatchObject({ status: "available", resources: ["late"] });
    const paused = linkSlots([COURTS[0]!, { ...late, active: false }], [], link, "2026-11-02", { timeZone: ZONE });
    expect(paused.at(-1)?.minuteOfDay).toBe(21 * 60 + 30);
    expect(linkSlots([{ ...late, active: false }], [], { ...link, who: { kind: "resource", resourceIds: ["late"] } }, "2026-11-02", { timeZone: ZONE })).toEqual([]);
  });

  it("shows the wall it takes down: as a person, one booking anywhere makes 7 pm busy", () => {
    const host = hostSlots(COURTS, [RAHUL], LINK, "2026-11-02", { timeZone: ZONE });
    expect(host.find((s) => s.minuteOfDay === 19 * 60)).toMatchObject({ status: "booked", resources: [] });
    expect(host.find((s) => s.minuteOfDay === 18 * 60 + 30)).toMatchObject({ status: "booked" });
    expect(host.find((s) => s.minuteOfDay === 20 * 60)).toMatchObject({ status: "available" });
    expect(host).toHaveLength(32);
    expect(linkSlots(COURTS, [RAHUL], LINK, "2026-11-02", { timeZone: ZONE }).find((s) => s.minuteOfDay === 19 * 60)?.status).toBe("available");
  });

  it("counts what is upcoming on a resource", () => {
    expect(upcomingCount([RAHUL], "court-1", "2026-11-02")).toBe(1);
    expect(upcomingCount([RAHUL], "court-1", "2026-11-03")).toBe(0);
    expect(upcomingCount([RAHUL], "court-2", "2026-11-01")).toBe(0);
  });
});
