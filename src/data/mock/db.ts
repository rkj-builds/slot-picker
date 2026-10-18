/**
 * The mock backend's tables for everything the booking store does not hold:
 * programmes, enrolments, attendance, court-hour memberships, the inbox,
 * the team, closures and activity. Bookings, customers, venue settings and
 * repeating blocks stay in the booking store (src/lib/store.ts) and are
 * reached through the bridge, so the booking flow and the dashboard always
 * see the same courts.
 *
 * Plain data, changed only through `MockDb.write`, which bumps a version and
 * tells subscribers (the query cache) to refresh.
 */
import type { PlainDate } from "@/lib/plain-date";
import type {
  ActivityEntry,
  Attendance,
  Closure,
  Conversation,
  DeviceSession,
  Enrolment,
  Membership,
  MembershipPlan,
  Message,
  NotificationPrefs,
  Payment,
  Programme,
  ProgrammeSession,
  Role,
  RoleAccess,
  TeamMember,
  VenueProfile,
} from "@/data/types";

/** Bump whenever the seed or a table changes shape: a stored copy from an older version is thrown away and reseeded. */
export const DB_VERSION = 2;

export interface Tables {
  version: number;
  /** The venue day the tables were seeded for; a new day reseeds the demo. */
  seededOn: PlainDate;
  closures: Closure[];
  programmes: Programme[];
  sessions: ProgrammeSession[];
  enrolments: Enrolment[];
  attendance: Attendance[];
  membershipPlans: MembershipPlan[];
  memberships: Membership[];
  conversations: Conversation[];
  messages: Message[];
  team: TeamMember[];
  access: RoleAccess;
  deviceSessions: DeviceSession[];
  activity: ActivityEntry[];
  /** Credit moved by hand (added, or paid out), outside any booking or enrolment. */
  creditAdjustments: Payment[];
  /** Payment ids a manager has approved. */
  approvedPayments: string[];
  /** Booking id → when the last reminder went. */
  reminders: Record<string, number>;
  /** Booking id → when the customer checked in. */
  checkIns: Record<string, number>;
  /** Customer id → why they were asked to pay first. Optional: tables saved before it existed have none. */
  flagReasons?: Record<string, string>;
  profile: VenueProfile;
  notifications: NotificationPrefs;
}

export class MockDb {
  private tables: Tables;
  private readonly listeners = new Set<() => void>();

  constructor(tables: Tables) {
    this.tables = tables;
  }

  read(): Readonly<Tables> {
    return this.tables;
  }

  /** Change the tables; the recipe returns the new tables (never mutate in place). */
  write(recipe: (tables: Tables) => Tables): void {
    this.tables = recipe(this.tables);
    this.emit();
  }

  replace(tables: Tables): void {
    this.tables = tables;
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(): void {
    for (const listener of this.listeners) listener();
  }
}

/** Replace one row by id. */
export function patchRow<T extends { id: string }>(rows: readonly T[], id: string, change: (row: T) => T): T[] {
  return rows.map((row) => (row.id === id ? change(row) : row));
}

export function parseStoredTables(raw: string | null, today: PlainDate): Tables | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Tables>;
    if (parsed.version !== DB_VERSION || parsed.seededOn !== today) return null;
    return parsed as Tables;
  } catch {
    return null;
  }
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  staff: "Front desk",
  coach: "Coach",
};
