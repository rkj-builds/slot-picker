/**
 * What every mock resource shares: the tables, the booking store behind the
 * bridge, the clock, the simulated round trip, who is asking, and the
 * activity log. A resource method always starts with `await ctx.trip()`, so
 * loading states are real and a "fail next request" preset can refuse it.
 */
import type { Action, AppState } from "@/lib/store";
import { makeId } from "@/lib/booking";
import { formatInr } from "@/lib/money";
import { type PlainDate, todayIn } from "@/lib/plain-date";
import { VENUE } from "@/lib/venue";
import { DataError } from "@/data/errors";
import { type MockDb, ROLE_LABELS } from "@/data/mock/db";
import type { ActivityEntry, Feature, Role, RoleAccess, TeamMember, Viewer } from "@/data/types";

export interface BookingBridge {
  /** The booking store's latest state, with demo presets laid over it. */
  read(): AppState;
  /** Apply an action to the booking store straight away. */
  apply(action: Action): void;
}

export interface MockOptions {
  db: MockDb;
  bridge: BookingBridge;
  now(): number;
  /** The simulated round trip (0 in tests). */
  wait(): Promise<void>;
  /** Which team member the demo is signed in as. */
  memberId(): string;
  /** True once per "fail the next request" preset: the next call rejects as unavailable. */
  takeFailure(): boolean;
  /** Run something later, as a server push would (delivery ticks). Tests run it never. */
  later(run: () => void, ms: number): void;
}

export type Capability = keyof Viewer["can"];

export interface MockContext extends MockOptions {
  today(): PlainDate;
  viewer(): Viewer;
  trip(): Promise<void>;
  /** Refuse with a sentence naming the role, unless the viewer can. */
  require(capability: Capability): void;
  requireFeature(feature: Feature): void;
  log(text: string, subject: ActivityEntry["subject"]): void;
  id(prefix: string): string;
  inr(paise: number): string;
}

const CAPABILITY_WORDS: Record<Capability, string> = {
  writeBookings: "change bookings",
  handleMoney: "take or record money",
  setPrices: "change prices",
  refund: "refund or give credit",
  editProgrammes: "change programmes",
  manageTeam: "manage the team",
  editSettings: "change settings",
};

export function viewerFor(member: TeamMember, access: RoleAccess): Viewer {
  const role: Role = member.role;
  const features: Feature[] =
    role === "admin" ? ["bookings", "availability", "programmes", "customers", "members", "payments", "inbox", "team", "settings"] : [...access[role]];
  const has = (f: Feature): boolean => features.includes(f);
  return {
    memberId: member.id,
    name: member.name,
    role,
    features,
    can: {
      writeBookings: role !== "coach" && has("bookings"),
      handleMoney: role === "admin" || role === "manager" || (role === "staff" && has("payments")),
      refund: role === "admin" || role === "manager",
      setPrices: role === "admin" || role === "manager",
      editProgrammes: role === "admin" || role === "manager",
      manageTeam: role === "admin",
      editSettings: role === "admin" || (role === "manager" && has("settings")),
    },
  };
}

export function createContext(options: MockOptions): MockContext {
  const ctx: MockContext = {
    ...options,
    today: () => todayIn(VENUE.timeZone, options.now()),
    viewer() {
      const tables = options.db.read();
      const member = tables.team.find((m) => m.id === options.memberId()) ?? tables.team[0];
      if (!member) throw new DataError("forbidden", "You're not signed in.");
      return viewerFor(member, tables.access);
    },
    async trip() {
      await options.wait();
      if (options.takeFailure()) throw new DataError("unavailable", "Couldn't reach the server. Check the connection and try again.");
    },
    require(capability) {
      const viewer = ctx.viewer();
      if (!viewer.can[capability]) {
        throw new DataError("forbidden", `${ROLE_LABELS[viewer.role]} can't ${CAPABILITY_WORDS[capability]}. Ask an admin.`);
      }
    },
    requireFeature(feature) {
      const viewer = ctx.viewer();
      if (!viewer.features.includes(feature)) throw new DataError("forbidden", `${ROLE_LABELS[viewer.role]} doesn't have access to ${feature}. Ask an admin.`);
    },
    log(text, subject) {
      const viewer = ctx.viewer();
      const entry: ActivityEntry = { id: makeId("act"), at: options.now(), text, actor: viewer.name, subject };
      options.db.write((t) => ({ ...t, activity: [entry, ...t.activity].slice(0, 500) }));
    },
    id: makeId,
    inr: formatInr,
  };
  return ctx;
}
