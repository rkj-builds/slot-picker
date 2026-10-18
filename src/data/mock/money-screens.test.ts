import { describe, expect, it } from "vitest";
import { TEST_NOW } from "@/app/test-utils";
import type { DataClient } from "@/data/client";
import { isDataError } from "@/data/errors";
import { createMockClient, MockDb, seedTables } from "@/data/mock";
import { TEAM_IDS } from "@/data/mock/seed";
import { addDays, todayIn } from "@/lib/plain-date";
import { seedState } from "@/lib/seed";
import { type AppState, reducer } from "@/lib/store";

const TODAY = todayIn("Asia/Kolkata", TEST_NOW);

function setup(memberId: string = TEAM_IDS.owner): DataClient {
  let state: AppState = seedState(TEST_NOW);
  return createMockClient({
    db: new MockDb(seedTables(TEST_NOW)),
    bridge: { read: () => state, apply: (action) => (state = reducer(state, action)) },
    now: () => TEST_NOW,
    wait: () => Promise.resolve(),
    memberId: () => memberId,
    takeFailure: () => false,
    later: () => undefined,
  });
}

async function refusal(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (isDataError(error)) return `${error.code}: ${error.message}`;
    throw error;
  }
  throw new Error("expected a refusal");
}

describe("mock backend: what the money screens need", () => {
  it("only recent cash waits for approval; online money and credit moves never do", async () => {
    const client = setup();
    const { payments } = await client.money.payments({ from: addDays(TODAY, -60), to: TODAY });
    const waiting = payments.filter((p) => !p.approved);
    expect(waiting.length).toBeGreaterThan(0);
    expect(waiting.every((p) => p.kind === "cash")).toBe(true);
    const oldest = Math.min(...waiting.map((p) => p.at));
    expect(todayIn("Asia/Kolkata", oldest) >= addDays(TODAY, -2)).toBe(true);
  });

  it("approves for a manager and refuses the front desk, naming who can", async () => {
    const client = setup(TEAM_IDS.desk);
    const { payments } = await client.money.payments({ from: addDays(TODAY, -6), to: TODAY });
    const ids = payments.filter((p) => !p.approved).map((p) => p.id);
    expect(await refusal(client.money.approve(ids))).toBe("forbidden: Only an admin or a manager can approve payments.");
    const manager = setup(TEAM_IDS.manager);
    await manager.money.approve(ids);
    const after = await manager.money.payments({ from: addDays(TODAY, -6), to: TODAY });
    expect(after.payments.filter((p) => ids.includes(p.id)).every((p) => p.approved)).toBe(true);
  });

  it("gives the front desk payments, but not the right to move credit", async () => {
    const client = setup(TEAM_IDS.desk);
    expect((await client.money.dues()).dues.length).toBeGreaterThan(0);
    expect(await refusal(client.money.adjustCredit("cus_14", { amountPaise: 10_000, reason: "Goodwill", kind: "credit-issued" }))).toBe("forbidden: Front desk can't refund or give credit. Ask an admin.");
  });

  it("links an enrolment's money to its programme, and labels bookings as the desk says them", async () => {
    const client = setup();
    const { dues } = await client.money.dues();
    const enrolment = dues.find((d) => d.subject.type === "enrolment");
    expect(enrolment?.subject.programmeId).toMatch(/^prg_/);
    const booking = dues.find((d) => d.subject.type === "booking");
    expect(booking?.subject.label).toMatch(/^Court \d · \w{3}, \d{1,2} \w{3}, \d{1,2}:\d{2} [ap]m$/);
  });

  it("has one customer owing for court bookings and an enrolment at once", async () => {
    const { dues } = await setup().money.dues();
    const kinds = new Set(dues.filter((d) => d.customerId === "cus_12").map((d) => d.subject.type));
    expect(kinds).toEqual(new Set(["booking", "enrolment"]));
  });

  it("records a hand adjustment as credit on the customer, not as a booking", async () => {
    const client = setup();
    await client.money.adjustCredit("cus_14", { amountPaise: 20_000, reason: "Floodlight outage", kind: "credit-issued" });
    const { credits } = await client.money.credits();
    const line = credits.find((c) => c.customerId === "cus_14")?.history.find((p) => p.note === "Floodlight outage");
    expect(line?.subject).toEqual({ type: "credit", id: "cus_14", label: "Credit added" });
    expect(await refusal(client.money.adjustCredit("cus_14", { amountPaise: 0, reason: "Nothing", kind: "credit-issued" }))).toBe("validation: Enter an amount above ₹0.");
  });
});
