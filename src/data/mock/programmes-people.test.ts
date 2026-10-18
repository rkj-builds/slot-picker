import { describe, expect, it } from "vitest";
import { TEST_NOW } from "@/app/test-utils";
import type { DataClient } from "@/data/client";
import { isDataError } from "@/data/errors";
import { createMockClient, MockDb, seedTables } from "@/data/mock";
import { TEAM_IDS } from "@/data/mock/seed";
import { seedState } from "@/lib/seed";
import { type AppState, reducer } from "@/lib/store";

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

async function refusal(promise: Promise<unknown>): Promise<{ code: string; message: string; fields: Record<string, string> }> {
  try {
    await promise;
  } catch (error) {
    if (isDataError(error)) return { code: error.code, message: error.message, fields: error.fields };
    throw error;
  }
  throw new Error("expected a refusal");
}

describe("mock backend: programme and people changes", () => {
  it("lists a coach only the enrolments and programmes they coach", async () => {
    const coach = setup(TEAM_IDS.coach);
    const { enrolments, programmes } = await coach.enrolments.list({});
    expect(programmes.map((p) => p.id)).toEqual(["prg_juniors", "prg_beginners"]);
    expect(new Set(enrolments.map((e) => e.programmeId))).toEqual(new Set(["prg_juniors", "prg_beginners"]));
    const owner = setup();
    expect((await owner.enrolments.list({})).programmes).toHaveLength(4);
  });

  it("asks why someone pays first, keeps the reason, and drops it when the flag goes", async () => {
    const client = setup();
    const missing = await refusal(client.customers.setFlag("cus_03", "payFirst", true, "  "));
    expect(missing).toEqual({ code: "validation", message: "Say why they pay first, so the next person on the desk knows.", fields: { reason: "Required" } });
    await client.customers.setFlag("cus_03", "payFirst", true, "Two no-shows in October");
    expect((await client.customers.get("cus_03")).summary.payFirstReason).toBe("Two no-shows in October");
    await client.customers.setFlag("cus_03", "payFirst", false);
    expect((await client.customers.get("cus_03")).summary.payFirstReason).toBeNull();
    // The seed's pay-first customers come with theirs.
    expect((await client.customers.get("cus_07")).summary.payFirstReason).toBe("Didn't turn up for two weekend bookings");
  });

  it("refuses a plan with no name or price, on the plans field", async () => {
    const client = setup();
    const { programme } = await client.programmes.get("prg_beginners");
    const blank = { id: "pln_blank", name: "", pricePaise: 0, kind: "month" as const, sessions: null, retired: false };
    const refused = await refusal(client.programmes.update("prg_beginners", { plans: [...programme.plans, blank] }));
    expect(refused.fields.plans).toBe("Every plan needs a name, a price and, for a pack, how many sessions");
  });
});
