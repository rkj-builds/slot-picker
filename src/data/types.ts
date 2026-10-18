/**
 * The dashboard's domain: everything a screen can read or change, in one
 * vocabulary. Money is always paise, dates are venue-local `PlainDate`s,
 * times of day are minutes after midnight, instants are epoch ms.
 *
 * Bookings, customers, venue settings and repeating blocks reuse the types
 * the booking flow already has (src/lib); the rest is defined here. A real
 * backend plugs in by implementing `DataClient` (src/data/client.ts) and
 * mapping its own records onto these shapes.
 */
import type { Booking, Customer, LedgerEntry } from "@/lib/booking";
import type { Paise } from "@/lib/money";
import type { PlainDate, Weekday } from "@/lib/plain-date";
import type { RecurringBlock } from "@/lib/recurring-blocks";
import type { CourtId, VenueSettings } from "@/lib/venue";

export type { Booking, Customer, LedgerEntry, RecurringBlock, VenueSettings };

/* ── People and permissions ─────────────────────────────────────────── */

export type Role = "admin" | "manager" | "staff" | "coach";

/** The areas a role can be given. Admin always has all of them. */
export type Feature = "bookings" | "availability" | "programmes" | "customers" | "members" | "payments" | "inbox" | "team" | "settings";

export const FEATURES: readonly Feature[] = ["bookings", "availability", "programmes", "customers", "members", "payments", "inbox", "team", "settings"];

/** Who is looking, and what they may do. Screens hide nothing silently: a refused action says why. */
export interface Viewer {
  memberId: string;
  name: string;
  role: Role;
  features: Feature[];
  can: {
    writeBookings: boolean;
    handleMoney: boolean;
    refund: boolean;
    editProgrammes: boolean;
    manageTeam: boolean;
    editSettings: boolean;
  };
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "invited" | "disabled";
  /** Coaches see only the programmes they run. */
  programmeIds: string[];
  lastSeenAt: number | null;
  invitedAt: number;
}

/** Which features each non-admin role has. */
export type RoleAccess = Record<Exclude<Role, "admin">, Feature[]>;

export interface DeviceSession {
  id: string;
  memberId: string;
  device: string;
  city: string;
  lastSeenAt: number;
  current: boolean;
}

/* ── Activity ───────────────────────────────────────────────────────── */

export interface ActivityEntry {
  id: string;
  at: number;
  /** "Rahul recorded ₹700 cash" — written for a person, past tense. */
  text: string;
  actor: string;
  subject: { type: "booking" | "enrolment" | "membership" | "customer" | "programme" | "conversation"; id: string };
}

/* ── Bookings ───────────────────────────────────────────────────────── */

export interface BookingQuery {
  from: PlainDate;
  to: PlainDate;
}

export interface BookingDetail {
  booking: Booking;
  customer: Customer | null;
  activity: ActivityEntry[];
}

export interface NewBookingInput {
  courtId: CourtId;
  date: PlainDate;
  startMinute: number;
  durationMinutes: number;
  customer: { id: string } | { name: string; phone: string };
  notes: string;
  /** What the desk took when it made the booking. */
  payment: { method: "cash" | "online"; amountPaise: Paise } | null;
}

export interface BookingPatch {
  courtId?: CourtId;
  date?: PlainDate;
  startMinute?: number;
  durationMinutes?: number;
  notes?: string;
  pricePaise?: Paise;
  priceReason?: string;
}

/* ── Availability ───────────────────────────────────────────────────── */

export interface Closure {
  id: string;
  date: PlainDate;
  /** null = the whole day. */
  startMinute: number | null;
  endMinute: number | null;
  reason: string;
  createdAt: number;
}

/* ── Customers ──────────────────────────────────────────────────────── */

export interface CustomerSummary {
  customer: Customer;
  bookings: number;
  spentPaise: Paise;
  noShows: number;
  cancellations: number;
  firstVisit: PlainDate | null;
  lastVisit: PlainDate | null;
  /** Enrolled children or a court-hour membership. */
  tags: ("member" | "programme" | "lead")[];
}

export type CustomerFilter = "all" | "customers" | "leads" | "pay-first" | "credit";

/* ── Programmes ─────────────────────────────────────────────────────── */

export type ProgrammeStatus = "open" | "closed" | "draft" | "finished";

/** A way to pay for a programme: by the month, or a pack of sessions. */
export interface ProgrammePlan {
  id: string;
  name: string;
  pricePaise: Paise;
  /** "month": every session for a month. "pack": `sessions` sessions within a month. "drop-in": one session. */
  kind: "month" | "pack" | "drop-in";
  sessions: number | null;
  retired: boolean;
}

export interface Programme {
  id: string;
  name: string;
  description: string;
  status: ProgrammeStatus;
  coachId: string | null;
  ageMin: number | null;
  ageMax: number | null;
  capacity: number;
  courtIds: CourtId[];
  weekdays: Weekday[];
  startMinute: number;
  endMinute: number;
  startsOn: PlainDate;
  endsOn: PlainDate | null;
  plans: ProgrammePlan[];
  createdAt: number;
}

export interface ProgrammeSession {
  id: string;
  programmeId: string;
  date: PlainDate;
  startMinute: number;
  endMinute: number;
  status: "scheduled" | "cancelled";
}

export type EnrolmentStatus = "running" | "paused" | "stopped" | "waitlist";

export interface Enrolment {
  id: string;
  programmeId: string;
  planId: string;
  participantName: string;
  participantAge: number | null;
  /** The person who pays and gets the messages. */
  customerId: string;
  status: EnrolmentStatus;
  startsOn: PlainDate;
  /** End of the paid period. */
  paidUntil: PlainDate;
  pausedFrom: PlainDate | null;
  pausedUntil: PlainDate | null;
  stoppedOn: PlainDate | null;
  stopReason: string | null;
  /** Price of the current period and what has come in against it. */
  pricePaise: Paise;
  ledger: LedgerEntry[];
  followUp: string | null;
  createdAt: number;
}

export type AttendanceMark = "present" | "absent";

export interface Attendance {
  sessionId: string;
  marks: Record<string, AttendanceMark>;
  savedAt: number | null;
  savedBy: string | null;
}

/* ── Court-hour memberships ─────────────────────────────────────────── */

export interface MembershipPlan {
  id: string;
  name: string;
  hours: number;
  validDays: number;
  pricePaise: Paise;
  retired: boolean;
}

export interface Membership {
  id: string;
  customerId: string;
  planId: string;
  status: "active" | "paused" | "expired";
  startsOn: PlainDate;
  expiresOn: PlainDate;
  hoursTotal: number;
  hoursUsed: number;
  pricePaise: Paise;
  ledger: LedgerEntry[];
  lastVisitOn: PlainDate | null;
}

/* ── Money ──────────────────────────────────────────────────────────── */

export interface MoneySubject {
  type: "booking" | "enrolment" | "membership";
  id: string;
  label: string;
}

/** One line of money, drawn from every ledger: what came in, went back or became credit. */
export interface Payment {
  id: string;
  at: number;
  kind: LedgerEntry["kind"];
  amountPaise: Paise;
  customerId: string | null;
  subject: MoneySubject;
  note: string;
  approved: boolean;
}

/** Something still owed, wherever it lives. */
export interface Due {
  subject: MoneySubject;
  customerId: string | null;
  duePaise: Paise;
  /** When it became due: the booking's day, the period's start. */
  since: PlainDate;
}

export interface CreditLine {
  customerId: string;
  creditPaise: Paise;
  history: Payment[];
}

/* ── Inbox ──────────────────────────────────────────────────────────── */

export type ConversationTab = "leads" | "customers" | "team";
export type Delivery = "sending" | "sent" | "delivered" | "read" | "failed";

export interface Conversation {
  id: string;
  name: string;
  phone: string;
  customerId: string | null;
  tab: ConversationTab;
  lastMessage: string;
  lastMessageAt: number;
  unread: number;
  /** When a person started waiting on a reply; null when nobody is waiting. */
  waitingSince: number | null;
  assignedTo: string | null;
  /** The assignee's name, filled in on read so the inbox needn't read the team. */
  assigneeName?: string | null;
  /** Off: the booking bot answers. On: the team replies by hand. */
  manual: boolean;
  status: "open" | "done";
}

export interface Message {
  id: string;
  conversationId: string;
  direction: "in" | "out";
  body: string;
  at: number;
  /** Sent by a person on the team, or by the bot. */
  author: string | null;
  delivery: Delivery;
  failure: string | null;
}

export type LoggedAction = "called" | "texted" | "replied" | "walk-in" | "none";

/* ── Settings ───────────────────────────────────────────────────────── */

export interface NotificationPrefs {
  newBooking: boolean;
  cancellation: boolean;
  paymentFailed: boolean;
  leadWaiting: boolean;
  dailySummary: boolean;
}

export interface VenueProfile {
  name: string;
  city: string;
  address: string;
  timeZone: string;
  currency: "INR";
  contactEmail: string;
}

/* ── Paging ─────────────────────────────────────────────────────────── */

export interface Page<T> {
  items: T[];
  total: number;
}
