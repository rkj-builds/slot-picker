import { describe, expect, it } from "vitest";
import { TEST_NOW } from "@/app/test-utils";
import type { DataClient } from "@/data/client";
import { isDataError } from "@/data/errors";
import { createMockClient, MockDb, seedTables } from "@/data/mock";
import { TEAM_IDS } from "@/data/mock/seed";
import { customerById, paidPaise } from "@/lib/booking";
import { addDays, todayIn } from "@/lib/plain-date";
import { seedState } from "@/lib/seed";
import { type AppState, reducer } from "@/lib/store";

const TODAY = todayIn("Asia/Kolkata", TEST_NOW);

function setup(): { client: DataClient; state: () => AppState; as: (id: string) => void } {
  let state = seedState(TEST_NOW);
  let member: string = TEAM_IDS.owner;
  const client = createMockClient({
    db: new MockDb(seedTables(TEST_NOW)),
    bridge: { read: () => state, apply: (action) => (state = reducer(state, action)) },
    now: () => TEST_NOW,
    wait: () => Promise.resolve(),
    memberId: () => member,
    takeFailure: () => false,
    later: () => undefined,
  });
  return { client, state: () => state, as: (id) => (member = id) };
}

async function refusal(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (isDataError(error)) return `${error.code}: ${error.message} ${JSON.stringify(error.fields)}`;
    throw error;
  }
  throw new Error("expected a refusal");
}

describe("mock backend: one booking's detail", () => {
  it("says when it was checked in and when the last reminder went", async () => {
    const { client } = setup();
    const b = await client.bookings.create({ courtId: "court-1", date: addDays(TODAY, 30), startMinute: 9 * 60, durationMinutes: 60, customer: { id: "cus_05" }, notes: "", payment: null });
    expect((await client.bookings.get(b.id)).checkedInAt).toBeNull();
    await client.bookings.checkIn(b.id, true);
    await client.bookings.sendReminder(b.id);
    const detail = await client.bookings.get(b.id);
    expect(detail.checkedInAt).toBe(TEST_NOW);
    expect(detail.lastReminderAt).toBe(TEST_NOW);
    expect(detail.activity.map((a) => a.text)).toEqual(expect.arrayContaining(["Checked in", "Sent a WhatsApp reminder"]));
  });

  it("names who has the court when a move clashes", async () => {
    const { client } = setup();
    const date = addDays(TODAY, 31);
    await client.bookings.create({ courtId: "court-2", date, startMinute: 10 * 60, durationMinutes: 60, customer: { id: "cus_05" }, notes: "", payment: null });
    const mine = await client.bookings.create({ courtId: "court-1", date, startMinute: 10 * 60, durationMinutes: 60, customer: { id: "cus_06" }, notes: "", payment: null });
    expect(await refusal(client.bookings.update(mine.id, { courtId: "court-2" }))).toMatch(/^clash: Court 2 is taken then by Kabir Singh\./);
  });

  it("asks why when the price changes, and refuses a role without money", async () => {
    const { client, as } = setup();
    const b = await client.bookings.create({ courtId: "court-1", date: addDays(TODAY, 32), startMinute: 9 * 60, durationMinutes: 60, customer: { id: "cus_05" }, notes: "", payment: null });
    expect(await refusal(client.bookings.update(b.id, { pricePaise: 50_000 }))).toContain('"priceReason":"Required"');
    const saved = await client.bookings.update(b.id, { pricePaise: 50_000, priceReason: "Regular's discount" });
    expect(saved.pricePaise).toBe(50_000);
    as(TEAM_IDS.desk);
    expect(await refusal(client.bookings.update(b.id, { pricePaise: 40_000, priceReason: "x" }))).toMatch(/^forbidden: Front desk can't take or record money/);
  });

  it("needs a reason to cancel", async () => {
    const { client } = setup();
    const b = await client.bookings.create({ courtId: "court-1", date: addDays(TODAY, 33), startMinute: 9 * 60, durationMinutes: 60, customer: { id: "cus_05" }, notes: "", payment: null });
    expect(await refusal(client.bookings.cancel(b.id, { resolution: "credit", reason: " " }))).toMatch(/^validation: Pick a reason/);
  });

  it("putting back a cancellation takes its credit back, so the money isn't counted twice", async () => {
    const { client, state } = setup();
    const b = await client.bookings.create({
      courtId: "court-1",
      date: addDays(TODAY, 34),
      startMinute: 9 * 60,
      durationMinutes: 60,
      customer: { id: "cus_05" },
      notes: "",
      payment: { method: "cash", amountPaise: 30_000 },
    });
    const before = customerById(state().customers, "cus_05")!.creditPaise;
    await client.bookings.cancel(b.id, { resolution: "credit", reason: "Customer asked" });
    expect(customerById(state().customers, "cus_05")!.creditPaise).toBe(before + 30_000);
    const back = await client.bookings.restore(b.id);
    expect(back.status).toBe("confirmed");
    expect(paidPaise(back)).toBe(30_000);
    expect(back.ledger.some((e) => e.kind === "credit-issued")).toBe(false);
    expect(customerById(state().customers, "cus_05")!.creditPaise).toBe(before);
  });

  it("won't put back a cancellation whose credit has been spent", async () => {
    const { client, state } = setup();
    const b = await client.bookings.create({
      courtId: "court-1",
      date: addDays(TODAY, 35),
      startMinute: 9 * 60,
      durationMinutes: 60,
      customer: { id: "cus_07" },
      notes: "",
      payment: { method: "cash", amountPaise: 30_000 },
    });
    await client.bookings.cancel(b.id, { resolution: "credit", reason: "Customer asked" });
    const credit = customerById(state().customers, "cus_07")!.creditPaise;
    await client.money.adjustCredit("cus_07", { amountPaise: -credit, reason: "Paid out at the desk", kind: "refund" });
    expect(await refusal(client.bookings.restore(b.id))).toMatch(/^validation: The ₹300 credit from this booking has been used/);
  });

  it("only checks in a confirmed booking", async () => {
    const { client } = setup();
    const b = await client.bookings.create({ courtId: "court-1", date: addDays(TODAY, 36), startMinute: 9 * 60, durationMinutes: 60, customer: { id: "cus_05" }, notes: "", payment: null });
    await client.bookings.cancel(b.id, { resolution: "credit", reason: "Rain or weather" });
    expect(await refusal(client.bookings.checkIn(b.id, true))).toMatch(/^validation: Only a confirmed booking/);
  });
});
