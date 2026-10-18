import { describe, expect, it } from "vitest";
import { TEST_NOW } from "@/app/test-utils";
import type { DataClient } from "@/data/client";
import { isDataError } from "@/data/errors";
import { createMockClient, MockDb, seedTables } from "@/data/mock";
import { TEAM_IDS } from "@/data/mock/seed";
import { enrolmentDue, ledgerPaid } from "@/data/money";
import { addDays, todayIn } from "@/lib/plain-date";
import { seedState } from "@/lib/seed";
import { type AppState, reducer } from "@/lib/store";

const TODAY = todayIn("Asia/Kolkata", TEST_NOW);

function setup(memberId: string = TEAM_IDS.owner): { client: DataClient; db: MockDb; state: () => AppState; as: (id: string) => void } {
  let state = seedState(TEST_NOW);
  let member = memberId;
  const db = new MockDb(seedTables(TEST_NOW));
  const client = createMockClient({
    db,
    bridge: { read: () => state, apply: (action) => (state = reducer(state, action)) },
    now: () => TEST_NOW,
    wait: () => Promise.resolve(),
    memberId: () => member,
    takeFailure: () => false,
    later: () => undefined,
  });
  return { client, db, state: () => state, as: (id) => (member = id) };
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

describe("mock backend: bookings", () => {
  it("refuses a booking on a taken court and names who has it", async () => {
    const { client } = setup();
    const first = await client.bookings.create({ courtId: "court-1", date: addDays(TODAY, 40), startMinute: 10 * 60, durationMinutes: 60, customer: { id: "cus_05" }, notes: "", payment: null });
    expect(first.status).toBe("confirmed");
    const message = await refusal(client.bookings.create({ courtId: "court-1", date: addDays(TODAY, 40), startMinute: 10 * 60 + 30, durationMinutes: 60, customer: { id: "cus_06" }, notes: "", payment: null }));
    expect(message).toMatch(/^clash: Court 1 is taken then by Kabir Singh/);
  });

  it("takes part payments and refuses more than is due", async () => {
    const { client } = setup();
    const b = await client.bookings.create({ courtId: "court-2", date: addDays(TODAY, 41), startMinute: 9 * 60, durationMinutes: 60, customer: { id: "cus_05" }, notes: "", payment: null });
    const after = await client.bookings.recordPayment(b.id, { method: "cash", amountPaise: 20_000 });
    expect(after.ledger).toHaveLength(1);
    expect(await refusal(client.bookings.recordPayment(b.id, { method: "online", amountPaise: b.pricePaise }))).toMatch(/^validation: That's more than the ₹/);
  });

  it("allows one reminder an hour", async () => {
    const { client } = setup();
    const b = await client.bookings.create({ courtId: "court-2", date: addDays(TODAY, 42), startMinute: 18 * 60, durationMinutes: 60, customer: { id: "cus_07" }, notes: "", payment: null });
    await client.bookings.sendReminder(b.id);
    expect(await refusal(client.bookings.sendReminder(b.id))).toMatch(/^cooldown:/);
  });

  it("says which role is refused, and why", async () => {
    const { client } = setup(TEAM_IDS.coach);
    expect(await refusal(client.bookings.create({ courtId: "court-1", date: TODAY, startMinute: 20 * 60, durationMinutes: 60, customer: { id: "cus_01" }, notes: "", payment: null }))).toBe(
      "forbidden: Coach can't change bookings. Ask an admin.",
    );
  });
});

describe("mock backend: programmes and enrolments", () => {
  it("shows a coach only their programmes", async () => {
    const { client, as } = setup();
    expect((await client.programmes.list()).programmes).toHaveLength(4);
    as(TEAM_IDS.coach);
    expect((await client.programmes.list()).programmes.map((p) => p.id)).toEqual(["prg_juniors", "prg_beginners"]);
  });

  it("expects running children on the register, not paused, stopped or waitlisted ones", async () => {
    const { client, db } = setup();
    const session = db.read().sessions.find((s) => s.programmeId === "prg_juniors" && s.date >= TODAY);
    if (!session) throw new Error("no upcoming juniors session");
    const { expected } = await client.programmes.attendance(session.id);
    expect(expected.every((e) => e.status === "running")).toBe(true);
    expect(expected.some((e) => e.status === "paused" || e.status === "waitlist")).toBe(false);
  });

  it("takes the due before renewing, then applies credit to the new period", async () => {
    const { client, db, state } = setup();
    const owing = db.read().enrolments.find((e) => e.status === "running" && enrolmentDue(e) > 0);
    if (!owing) throw new Error("seed has nobody owing");
    expect(await refusal(client.enrolments.renew(owing.id, { planId: owing.planId, startsOn: TODAY, paid: null }))).toMatch(/still owes/);

    const paidUp = db.read().enrolments.find((e) => e.status === "running" && enrolmentDue(e) === 0 && e.participantName);
    if (!paidUp) throw new Error("seed has nobody paid up");
    const creditBefore = state().customers.find((c) => c.id === paidUp.customerId)?.creditPaise ?? 0;
    const back = await client.enrolments.previewGiveBack(paidUp.id);
    await client.enrolments.giveBack(paidUp.id, { as: "credit", amountPaise: 30_000 });
    const preview = await client.enrolments.previewRenew(paidUp.id, { planId: paidUp.planId, startsOn: addDays(paidUp.paidUntil, 1) });
    expect(back.basis).toMatch(/of 30 days unused/);
    const applied = Math.min(creditBefore + 30_000, preview.pricePaise);
    expect(preview.creditAppliedPaise).toBe(applied);
    expect(preview.duePaise).toBe(preview.pricePaise - applied);
  });

  it("puts a child on the waitlist when the programme is full", async () => {
    const { client } = setup();
    await client.programmes.update("prg_juniors", { capacity: 1 });
    const e = await client.enrolments.add({ programmeId: "prg_juniors", planId: "pln_month", participantName: "Tia Roy", participantAge: 10, guardian: { name: "Mitali Roy", phone: "+919000000299" }, startsOn: TODAY, paid: null });
    expect(e.status).toBe("waitlist");
  });

  it("refuses a child outside the age range, on the field", async () => {
    const { client } = setup();
    try {
      await client.enrolments.add({ programmeId: "prg_juniors", planId: "pln_month", participantName: "Tia Roy", participantAge: 17, guardian: { id: "cus_03" }, startsOn: TODAY, paid: null });
      throw new Error("expected a refusal");
    } catch (error) {
      expect(isDataError(error) && error.fields.participantAge).toBe("This programme is for ages 8 to 14");
    }
  });
});

describe("mock backend: money, inbox, team", () => {
  it("lists dues from bookings, enrolments and memberships", async () => {
    const { client } = setup();
    const { dues } = await client.money.dues();
    expect(new Set(dues.map((d) => d.subject.type))).toEqual(new Set(["enrolment", "membership", "booking"]));
  });

  it("won't pay out more credit than a customer has", async () => {
    const { client } = setup();
    await client.money.adjustCredit("cus_08", { amountPaise: 50_000, reason: "Goodwill for the floodlight outage", kind: "credit-issued" });
    expect(await refusal(client.money.adjustCredit("cus_08", { amountPaise: 60_000, reason: "Cash back", kind: "refund" }))).toMatch(/only has ₹500/);
  });

  it("asks the desk to take a chat over before replying by hand", async () => {
    const { client } = setup(TEAM_IDS.desk);
    expect(await refusal(client.inbox.send("cnv_2", "Yes, both courts are free"))).toMatch(/Turn on Reply by hand/);
    await client.inbox.setManual("cnv_2", true);
    const sent = await client.inbox.send("cnv_2", "Yes, both courts are free");
    expect(sent.author).toBe("Sunil");
    const [convo] = await client.inbox.conversations({ tab: "leads", q: "pooja" });
    expect(convo?.waitingSince).toBeNull();
  });

  it("keeps at least one admin", async () => {
    const { client } = setup();
    expect(await refusal(client.team.update(TEAM_IDS.owner, { role: "manager" }))).toMatch(/at least one active admin/);
  });

  it("removes given-back money from the period's paid total", () => {
    const paid = ledgerPaid([
      { id: "a", at: 0, kind: "cash", amountPaise: 100_000, note: "" },
      { id: "b", at: 0, kind: "credit-issued", amountPaise: 30_000, note: "" },
    ]);
    expect(paid).toBe(70_000);
  });
});
