import { describe, expect, it } from "vitest";
import { TEST_NOW } from "@/app/test-utils";
import type { DataClient } from "@/data/client";
import { isDataError } from "@/data/errors";
import { createMockClient, MockDb, seedTables } from "@/data/mock";
import { TEAM_IDS } from "@/data/mock/seed";
import { seedState } from "@/lib/seed";
import { type AppState, reducer } from "@/lib/store";

function setup(memberId: string = TEAM_IDS.owner): { client: DataClient; db: MockDb; as: (id: string) => void } {
  let state: AppState = seedState(TEST_NOW);
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
  return { client, db, as: (id) => (member = id) };
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

describe("mock backend: inbox", () => {
  it("gets one conversation with its assignee's name, for a role without Team access", async () => {
    const { client } = setup(TEAM_IDS.desk);
    const sameer = await client.inbox.get("cnv_3");
    expect(sameer.assigneeName).toBe("Sunil Tudu");
    expect((await client.inbox.get("cnv_1")).assigneeName).toBeNull();
    expect(await refusal(client.inbox.get("cnv_nope"))).toBe("not-found: This conversation no longer exists.");
  });

  it("pages a long thread: the latest 30, then the older ones before them", async () => {
    const { client } = setup();
    const latest = await client.inbox.messages("cnv_4");
    expect(latest.messages).toHaveLength(30);
    expect(latest.hasMore).toBe(true);
    const older = await client.inbox.messages("cnv_4", latest.messages[0]!.at);
    expect(older.hasMore).toBe(false);
    expect(older.messages.at(-1)!.at).toBeLessThan(latest.messages[0]!.at);
    expect(older.messages.length + latest.messages.length).toBe(38);
  });

  it("logs what the desk did as a sentence and closes the chat", async () => {
    const { client } = setup();
    const done = await client.inbox.logAction("cnv_1", { action: "called", note: "Wants evenings" });
    expect(done.status).toBe("done");
    expect(done.waitingSince).toBeNull();
    const [entry] = await client.settings.activity({ limit: 1 });
    expect(entry?.text).toBe("Called Harsh Vardhan · Wants evenings");
    expect(entry?.actor).toBe("Asha Kumar");
  });
});

describe("mock backend: team invites", () => {
  it("sends an invite again, only to someone still invited, only as an admin", async () => {
    const { client, as } = setup();
    const again = await client.team.resendInvite(TEAM_IDS.invited);
    expect(again.invitedAt).toBe(TEST_NOW);
    expect(await refusal(client.team.resendInvite(TEAM_IDS.desk))).toBe("validation: Sunil Tudu has already accepted their invite.");
    as(TEAM_IDS.manager);
    expect(await refusal(client.team.resendInvite(TEAM_IDS.invited))).toBe("forbidden: Manager can't manage the team. Ask an admin.");
  });
});
