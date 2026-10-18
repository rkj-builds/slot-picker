/**
 * The one door between the screens and the data. Screens never fetch: they
 * call these methods through the query hooks (src/data/queries), so a
 * backend is swapped by passing a different `DataClient` to `DataProvider`.
 *
 * - The demo passes the mock client (src/data/mock), which keeps everything
 *   in the browser with fake names and a simulated round trip.
 * - A real venue passes its own adapter that maps its API onto these types.
 *
 * Every method is async. Writes resolve with the changed record or reject
 * with a `DataError` (src/data/errors.ts) that says why, so the refusal a
 * person sees is the backend's, not a guess.
 */
import type { Booking, Customer, LedgerEntry } from "@/lib/booking";
import type { Paise } from "@/lib/money";
import type { PlainDate } from "@/lib/plain-date";
import type { RecurringBlock } from "@/lib/recurring-blocks";
import type { VenueSettings } from "@/lib/venue";
import type {
  ActivityEntry,
  Attendance,
  AttendanceMark,
  BookingDetail,
  BookingPatch,
  BookingQuery,
  Closure,
  Conversation,
  ConversationTab,
  CreditLine,
  CustomerFilter,
  CustomerSummary,
  DeviceSession,
  Due,
  Enrolment,
  LoggedAction,
  Membership,
  MembershipPlan,
  Message,
  NewBookingInput,
  NotificationPrefs,
  Payment,
  Programme,
  ProgrammeSession,
  Role,
  RoleAccess,
  TeamMember,
  VenueProfile,
  Viewer,
} from "@/data/types";

export type PayMethod = "cash" | "online";

export interface BookingsApi {
  list(query: BookingQuery): Promise<{ bookings: Booking[]; customers: Customer[] }>;
  get(id: string): Promise<BookingDetail>;
  /** How many live bookings each day of a month has (for the date picker's dots). */
  dayCounts(month: `${number}-${number}`): Promise<Record<PlainDate, number>>;
  create(input: NewBookingInput): Promise<Booking>;
  update(id: string, patch: BookingPatch): Promise<Booking>;
  recordPayment(id: string, payment: { method: PayMethod; amountPaise: Paise; note?: string }): Promise<Booking>;
  checkIn(id: string, value: boolean): Promise<Booking>;
  markNoShow(id: string): Promise<Booking>;
  /** Money already in becomes credit on the customer, or goes back. */
  cancel(id: string, input: { resolution: "credit" | "refund"; reason: string }): Promise<Booking>;
  restore(id: string): Promise<Booking>;
  /** A WhatsApp reminder; refused with `cooldown` within an hour of the last one. */
  sendReminder(id: string): Promise<{ sentAt: number }>;
}

export interface AvailabilityApi {
  settings(): Promise<VenueSettings>;
  updateSettings(settings: VenueSettings): Promise<VenueSettings>;
  closures(range: { from: PlainDate; to: PlainDate }): Promise<Closure[]>;
  addClosure(input: Omit<Closure, "id" | "createdAt">): Promise<Closure>;
  removeClosure(id: string): Promise<void>;
  blocks(): Promise<RecurringBlock[]>;
  putBlock(block: RecurringBlock): Promise<RecurringBlock>;
  removeBlock(id: string): Promise<void>;
}

export interface CustomersApi {
  list(query: { filter: CustomerFilter; q: string }): Promise<CustomerSummary[]>;
  get(id: string): Promise<{ summary: CustomerSummary; bookings: Booking[]; enrolments: Enrolment[]; memberships: Membership[] }>;
  setFlag(id: string, flag: "payFirst" | "trusted", value: boolean, reason?: string): Promise<Customer>;
}

export interface ProgrammesApi {
  list(): Promise<{ programmes: Programme[]; stats: Record<string, { enrolled: number; owedPaise: Paise; collectedPaise: Paise }> }>;
  get(id: string): Promise<{ programme: Programme; sessions: ProgrammeSession[]; enrolments: Enrolment[] }>;
  create(input: Omit<Programme, "id" | "createdAt">): Promise<Programme>;
  update(id: string, patch: Partial<Omit<Programme, "id" | "createdAt">>): Promise<Programme>;
  setSessionStatus(sessionId: string, status: ProgrammeSession["status"]): Promise<ProgrammeSession>;
  attendance(sessionId: string): Promise<{ session: ProgrammeSession; programme: Programme; expected: Enrolment[]; attendance: Attendance }>;
  saveAttendance(sessionId: string, marks: Record<string, AttendanceMark>): Promise<Attendance>;
}

export interface EnrolmentsApi {
  /** Every enrolment, across programmes (the register's "memberships" view). */
  list(query: { programmeId?: string }): Promise<{ enrolments: Enrolment[]; customers: Customer[]; programmes: Programme[] }>;
  add(input: {
    programmeId: string;
    planId: string;
    participantName: string;
    participantAge: number | null;
    guardian: { id: string } | { name: string; phone: string };
    startsOn: PlainDate;
    paid: { method: PayMethod; amountPaise: Paise } | null;
  }): Promise<Enrolment>;
  /** What renewing would do, before anything changes. */
  previewRenew(id: string, input: { planId: string; startsOn: PlainDate }): Promise<{ paidUntil: PlainDate; pricePaise: Paise; creditAppliedPaise: Paise; duePaise: Paise }>;
  renew(id: string, input: { planId: string; startsOn: PlainDate; paid: { method: PayMethod; amountPaise: Paise } | null }): Promise<Enrolment>;
  recordPayment(id: string, payment: { method: PayMethod; amountPaise: Paise }): Promise<Enrolment>;
  previewPause(id: string, input: { from: PlainDate; until: PlainDate }): Promise<{ paidUntil: PlainDate }>;
  pause(id: string, input: { from: PlainDate; until: PlainDate }): Promise<Enrolment>;
  resume(id: string): Promise<Enrolment>;
  stop(id: string, input: { on: PlainDate; reason: string }): Promise<Enrolment>;
  undoStop(id: string): Promise<Enrolment>;
  /** Unused share of the period, as credit (kept for next month) or handed back. */
  previewGiveBack(id: string): Promise<{ amountPaise: Paise; basis: string }>;
  giveBack(id: string, input: { as: "credit" | "refund"; amountPaise: Paise }): Promise<Enrolment>;
  setFollowUp(id: string, note: string | null): Promise<Enrolment>;
}

export interface MembershipsApi {
  list(): Promise<{ memberships: Membership[]; plans: MembershipPlan[]; customers: Customer[] }>;
  get(id: string): Promise<{ membership: Membership; plan: MembershipPlan; customer: Customer; activity: ActivityEntry[] }>;
  sell(input: { customer: { id: string } | { name: string; phone: string }; planId: string; startsOn: PlainDate; paid: { method: PayMethod; amountPaise: Paise } | null }): Promise<Membership>;
  renew(id: string, input: { planId: string; paid: { method: PayMethod; amountPaise: Paise } | null }): Promise<Membership>;
  addHours(id: string, input: { hours: number; pricePaise: Paise }): Promise<Membership>;
  setPaused(id: string, paused: boolean): Promise<Membership>;
  recordPayment(id: string, payment: { method: PayMethod; amountPaise: Paise }): Promise<Membership>;
  refund(id: string, input: { amountPaise: Paise; reason: string }): Promise<Membership>;
  savePlan(plan: MembershipPlan): Promise<MembershipPlan>;
}

export interface MoneyApi {
  payments(query: { from: PlainDate; to: PlainDate }): Promise<{ payments: Payment[]; customers: Customer[] }>;
  approve(paymentIds: string[]): Promise<void>;
  dues(): Promise<{ dues: Due[]; customers: Customer[] }>;
  credits(): Promise<{ credits: CreditLine[]; customers: Customer[] }>;
  /** Move credit by hand: positive adds, negative uses or pays out. */
  adjustCredit(customerId: string, input: { amountPaise: Paise; reason: string; kind: Extract<LedgerEntry["kind"], "credit-issued" | "refund"> }): Promise<Customer>;
}

export interface InboxApi {
  conversations(query: { tab: ConversationTab; q: string }): Promise<Conversation[]>;
  messages(conversationId: string, before?: number): Promise<{ messages: Message[]; hasMore: boolean }>;
  send(conversationId: string, body: string): Promise<Message>;
  setManual(conversationId: string, manual: boolean): Promise<Conversation>;
  claim(conversationId: string, claim: boolean): Promise<Conversation>;
  logAction(conversationId: string, input: { action: LoggedAction; note: string }): Promise<Conversation>;
  reopen(conversationId: string): Promise<Conversation>;
  markRead(conversationId: string): Promise<void>;
}

export interface TeamApi {
  viewer(): Promise<Viewer>;
  members(): Promise<TeamMember[]>;
  invite(input: { name: string; email: string; role: Role; programmeIds: string[] }): Promise<TeamMember>;
  update(id: string, patch: Partial<Pick<TeamMember, "name" | "role" | "status" | "programmeIds">>): Promise<TeamMember>;
  remove(id: string): Promise<void>;
  access(): Promise<RoleAccess>;
  saveAccess(access: RoleAccess): Promise<RoleAccess>;
  sessions(): Promise<DeviceSession[]>;
  revokeSession(id: string): Promise<void>;
}

export interface SettingsApi {
  profile(): Promise<VenueProfile>;
  saveProfile(profile: VenueProfile): Promise<VenueProfile>;
  notifications(): Promise<NotificationPrefs>;
  saveNotifications(prefs: NotificationPrefs): Promise<NotificationPrefs>;
  activity(query: { limit: number }): Promise<ActivityEntry[]>;
}

export interface DataClient {
  bookings: BookingsApi;
  availability: AvailabilityApi;
  customers: CustomersApi;
  programmes: ProgrammesApi;
  enrolments: EnrolmentsApi;
  memberships: MembershipsApi;
  money: MoneyApi;
  inbox: InboxApi;
  team: TeamApi;
  settings: SettingsApi;
  /** Called after any write so cached reads refresh. A real backend may also push here (websocket, polling). */
  subscribe(listener: () => void): () => void;
}
