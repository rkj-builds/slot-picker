/**
 * Seed for the mock backend's own tables, generated from a fixed seed
 * relative to "today" like the booking seed (src/lib/seed.ts). Every person
 * is invented; guardians are the booking seed's customers (cus_01…cus_24),
 * so a parent who books courts is the same person in both places. Prices
 * are mock values.
 */
import type { LedgerEntry } from "@/lib/booking";
import { seededRandom } from "@/lib/seed";
import { addDays, compareDates, type PlainDate, todayIn, weekdayOf } from "@/lib/plain-date";
import { instantAt } from "@/lib/time-zone";
import { VENUE } from "@/lib/venue";
import { DB_VERSION, type Tables } from "@/data/mock/db";
import type { Attendance, Conversation, Enrolment, Membership, Message, Programme, ProgrammeSession } from "@/data/types";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MINUTE = 60_000;

export const TEAM_IDS = { owner: "tm_owner", manager: "tm_manager", desk: "tm_desk", coach: "tm_coach", invited: "tm_invited" } as const;

const CHILDREN = [
  "Aanya", "Reyansh", "Myra", "Advik", "Kiara", "Vivaan", "Anika", "Shaurya", "Pari", "Atharv",
  "Navya", "Krish", "Sara", "Ayaan", "Ira", "Dhruv", "Avni", "Rudra",
];

/** Every session of a programme between two dates (inclusive). */
export function sessionsFor(programme: Programme, from: PlainDate, to: PlainDate): ProgrammeSession[] {
  const out: ProgrammeSession[] = [];
  const start = compareDates(from, programme.startsOn) < 0 ? programme.startsOn : from;
  const end = programme.endsOn && compareDates(programme.endsOn, to) < 0 ? programme.endsOn : to;
  for (let date = start; compareDates(date, end) <= 0; date = addDays(date, 1)) {
    if (!programme.weekdays.includes(weekdayOf(date))) continue;
    out.push({ id: `ses_${programme.id}_${date}`, programmeId: programme.id, date, startMinute: programme.startMinute, endMinute: programme.endMinute, status: "scheduled" });
  }
  return out;
}

export function seedTables(now: number): Tables {
  const random = seededRandom(1831);
  const today = todayIn(VENUE.timeZone, now);
  const at = (date: PlainDate, minute: number): number => instantAt(date, minute, VENUE.timeZone);
  const cus = (n: number): string => `cus_${String(n).padStart(2, "0")}`;
  let n = 0;
  const id = (prefix: string): string => `${prefix}_s${(n += 1).toString(36)}`;
  const entry = (kind: LedgerEntry["kind"], amountPaise: number, when: number, note: string): LedgerEntry => ({ id: id("le"), kind, amountPaise, at: when, note });

  // --- Programmes -----------------------------------------------------------------
  const juniors: Programme = {
    id: "prg_juniors",
    name: "Off-Screen Club Juniors",
    description: "Pickleball for 8 to 14 year olds on weekend evenings. Rackets and balls provided.",
    status: "open",
    coachId: TEAM_IDS.coach,
    ageMin: 8,
    ageMax: 14,
    capacity: 24,
    courtIds: ["court-1", "court-2"],
    weekdays: ["sat", "sun"],
    startMinute: 16 * 60,
    endMinute: 17 * 60,
    startsOn: addDays(today, -70),
    endsOn: null,
    plans: [
      { id: "pln_month", name: "Every session, one month", pricePaise: 250_000, kind: "month", sessions: null, retired: false },
      { id: "pln_pack4", name: "4 sessions within a month", pricePaise: 160_000, kind: "pack", sessions: 4, retired: false },
      { id: "pln_dropin", name: "One session", pricePaise: 50_000, kind: "drop-in", sessions: 1, retired: false },
    ],
    createdAt: at(addDays(today, -80), 11 * 60),
  };
  const beginners: Programme = {
    id: "prg_beginners",
    name: "Adult beginners",
    description: "Six weeks from first serve to first game. Tuesday and Thursday mornings.",
    status: "open",
    coachId: TEAM_IDS.coach,
    ageMin: 16,
    ageMax: null,
    capacity: 8,
    courtIds: ["court-1"],
    weekdays: ["tue", "thu"],
    startMinute: 7 * 60,
    endMinute: 8 * 60,
    startsOn: addDays(today, -21),
    endsOn: addDays(today, 21),
    plans: [{ id: "pln_course", name: "Full course, 12 sessions", pricePaise: 360_000, kind: "pack", sessions: 12, retired: false }],
    createdAt: at(addDays(today, -35), 18 * 60),
  };
  const camp: Programme = {
    id: "prg_camp",
    name: "Summer camp",
    description: "Two weeks of mornings for school holidays.",
    status: "finished",
    coachId: TEAM_IDS.coach,
    ageMin: 7,
    ageMax: 13,
    capacity: 16,
    courtIds: ["court-1", "court-2"],
    weekdays: ["mon", "tue", "wed", "thu", "fri"],
    startMinute: 8 * 60,
    endMinute: 10 * 60,
    startsOn: addDays(today, -140),
    endsOn: addDays(today, -127),
    plans: [{ id: "pln_camp", name: "Two weeks", pricePaise: 300_000, kind: "pack", sessions: 10, retired: false }],
    createdAt: at(addDays(today, -170), 12 * 60),
  };
  const league: Programme = {
    id: "prg_league",
    name: "Women's morning league",
    description: "Doubles ladder, Wednesday mornings. Not open for sign-ups yet.",
    status: "draft",
    coachId: null,
    ageMin: 18,
    ageMax: null,
    capacity: 16,
    courtIds: ["court-1", "court-2"],
    weekdays: ["wed"],
    startMinute: 6 * 60 + 30,
    endMinute: 8 * 60,
    startsOn: addDays(today, 18),
    endsOn: null,
    plans: [{ id: "pln_season", name: "Season, 8 weeks", pricePaise: 240_000, kind: "pack", sessions: 8, retired: false }],
    createdAt: at(addDays(today, -3), 21 * 60),
  };
  const programmes = [juniors, beginners, camp, league];
  const sessions = programmes.flatMap((p) => sessionsFor(p, addDays(today, -70), addDays(today, 42)));

  // --- Enrolments -----------------------------------------------------------------
  const enrolments: Enrolment[] = [];
  const juniorStatuses: { status: Enrolment["status"]; owes: "none" | "part" | "all"; plan: string }[] = [
    { status: "running", owes: "none", plan: "pln_month" },
    { status: "running", owes: "none", plan: "pln_month" },
    { status: "running", owes: "none", plan: "pln_pack4" },
    { status: "running", owes: "all", plan: "pln_month" },
    { status: "running", owes: "none", plan: "pln_month" },
    { status: "running", owes: "part", plan: "pln_month" },
    { status: "running", owes: "none", plan: "pln_pack4" },
    { status: "running", owes: "none", plan: "pln_month" },
    { status: "running", owes: "all", plan: "pln_pack4" },
    { status: "running", owes: "none", plan: "pln_month" },
    { status: "paused", owes: "none", plan: "pln_month" },
    { status: "running", owes: "none", plan: "pln_month" },
    { status: "stopped", owes: "none", plan: "pln_month" },
    { status: "running", owes: "none", plan: "pln_pack4" },
    { status: "waitlist", owes: "none", plan: "pln_month" },
  ];
  juniorStatuses.forEach((spec, i) => {
    const plan = juniors.plans.find((p) => p.id === spec.plan) ?? juniors.plans[0];
    if (!plan) return;
    const startsOn = addDays(today, -Math.floor(10 + random() * 50));
    // Some periods run out this week, so "renew" and "to chase" have people in them.
    const paidUntil = i % 4 === 0 ? addDays(today, Math.floor(random() * 5) - 2) : addDays(today, Math.floor(6 + random() * 24));
    const paidAt = at(startsOn, 17 * 60);
    const ledger: LedgerEntry[] = [];
    if (spec.owes === "none" && spec.status !== "waitlist") ledger.push(entry(random() < 0.6 ? "cash" : "online", plan.pricePaise, paidAt, "Paid for the month"));
    if (spec.owes === "part") ledger.push(entry("cash", Math.round(plan.pricePaise / 2), paidAt, "Half now, half next week"));
    const child = CHILDREN[i] ?? `Child ${i + 1}`;
    enrolments.push({
      id: `enr_j${i + 1}`,
      programmeId: juniors.id,
      planId: plan.id,
      participantName: `${child} ${(["Sharma", "Patel", "Verma", "Iyer", "Singh", "Nair", "Mehta", "Gupta", "Reddy", "Banerjee", "Kulkarni", "Hembram", "Malhotra", "Soren", "Rao"][i] ?? "")}`.trim(),
      participantAge: 8 + Math.floor(random() * 7),
      customerId: cus(i + 1),
      status: spec.status,
      startsOn,
      paidUntil,
      pausedFrom: spec.status === "paused" ? addDays(today, -6) : null,
      pausedUntil: spec.status === "paused" ? addDays(today, 8) : null,
      stoppedOn: spec.status === "stopped" ? addDays(today, -9) : null,
      stopReason: spec.status === "stopped" ? "Moved to another city" : null,
      pricePaise: plan.pricePaise,
      ledger,
      followUp: i === 3 ? "Father said he'll pay on Saturday" : null,
      createdAt: paidAt,
    });
  });
  // A second child for one parent, so the register shows siblings.
  enrolments.push({
    id: "enr_j16",
    programmeId: juniors.id,
    planId: "pln_month",
    participantName: "Kian Sharma",
    participantAge: 9,
    customerId: cus(1),
    status: "running",
    startsOn: addDays(today, -30),
    paidUntil: addDays(today, 12),
    pausedFrom: null,
    pausedUntil: null,
    stoppedOn: null,
    stopReason: null,
    pricePaise: 250_000,
    ledger: [entry("online", 250_000, at(addDays(today, -30), 17 * 60), "Paid for the month")],
    followUp: null,
    createdAt: at(addDays(today, -30), 17 * 60),
  });
  // The last one (unpaid) is cus_12, who also owes for two court bookings: one person owing in two places.
  [16, 18, 20, 22, 12].forEach((c, i) => {
    enrolments.push({
      id: `enr_b${i + 1}`,
      programmeId: beginners.id,
      planId: "pln_course",
      participantName: "",
      participantAge: null,
      customerId: cus(c),
      status: "running",
      startsOn: beginners.startsOn,
      paidUntil: beginners.endsOn ?? addDays(today, 21),
      pausedFrom: null,
      pausedUntil: null,
      stoppedOn: null,
      stopReason: null,
      pricePaise: 360_000,
      ledger: i === 4 ? [] : [entry("online", 360_000, at(addDays(beginners.startsOn, -3), 20 * 60), "Paid for the course")],
      followUp: null,
      createdAt: at(addDays(beginners.startsOn, -3), 20 * 60),
    });
  });

  // --- Attendance: every past session marked, except the most recent juniors one. ------
  const attendance: Attendance[] = [];
  const pastSessions = sessions.filter((s) => compareDates(s.date, today) < 0);
  const lastJuniors = pastSessions.filter((s) => s.programmeId === juniors.id).at(-1);
  for (const session of pastSessions) {
    if (session.id === lastJuniors?.id) continue;
    const expected = enrolments.filter((e) => e.programmeId === session.programmeId && e.status !== "waitlist" && compareDates(e.startsOn, session.date) <= 0);
    if (expected.length === 0) continue;
    const marks: Attendance["marks"] = {};
    for (const e of expected) marks[e.id] = random() < 0.84 ? "present" : "absent";
    attendance.push({ sessionId: session.id, marks, savedAt: at(session.date, session.endMinute + 10), savedBy: TEAM_IDS.coach });
  }

  // --- Court-hour memberships ---------------------------------------------------------
  const membershipPlans = [
    { id: "mpl_10", name: "10 hours", hours: 10, validDays: 30, pricePaise: 600_000, retired: false },
    { id: "mpl_25", name: "25 hours", hours: 25, validDays: 90, pricePaise: 1_400_000, retired: false },
    { id: "mpl_founding", name: "Founding 50 hours", hours: 50, validDays: 180, pricePaise: 2_500_000, retired: true },
  ];
  const memberships: Membership[] = [
    { c: 2, plan: "mpl_25", started: -40, used: 11, status: "active", owes: false, seen: -2 },
    { c: 6, plan: "mpl_10", started: -24, used: 9, status: "active", owes: false, seen: -1 },
    { c: 9, plan: "mpl_10", started: -27, used: 4, status: "active", owes: true, seen: -19 },
    { c: 11, plan: "mpl_25", started: -10, used: 2, status: "active", owes: false, seen: -3 },
    { c: 14, plan: "mpl_founding", started: -150, used: 41, status: "paused", owes: false, seen: -33 },
    { c: 19, plan: "mpl_10", started: -45, used: 10, status: "expired", owes: false, seen: -16 },
  ].map((m, i) => {
    const plan = membershipPlans.find((p) => p.id === m.plan) ?? membershipPlans[0];
    const startsOn = addDays(today, m.started);
    const price = plan?.pricePaise ?? 0;
    return {
      id: `mem_${i + 1}`,
      customerId: cus(m.c),
      planId: m.plan,
      status: m.status as Membership["status"],
      startsOn,
      expiresOn: addDays(startsOn, plan?.validDays ?? 30),
      hoursTotal: plan?.hours ?? 10,
      hoursUsed: m.used,
      pricePaise: price,
      ledger: m.owes ? [entry("cash", Math.round(price / 2), at(startsOn, 18 * 60), "Half at signing")] : [entry(i % 2 ? "cash" : "online", price, at(startsOn, 18 * 60), "Paid in full")],
      lastVisitOn: addDays(today, m.seen),
    };
  });

  // --- Inbox ---------------------------------------------------------------------------
  const conversations: Conversation[] = [];
  const messages: Message[] = [];
  const thread = (
    convo: Omit<Conversation, "lastMessage" | "lastMessageAt" | "unread">,
    lines: { dir: "in" | "out"; ago: number; body: string; author?: string | null; delivery?: Message["delivery"]; failure?: string }[],
  ): void => {
    lines.forEach((line, i) => {
      messages.push({
        id: `msg_${convo.id}_${i}`,
        conversationId: convo.id,
        direction: line.dir,
        body: line.body,
        at: now - line.ago,
        author: line.dir === "out" ? (line.author === undefined ? null : line.author) : null,
        delivery: line.delivery ?? (line.dir === "out" ? "read" : "delivered"),
        failure: line.failure ?? null,
      });
    });
    const last = lines.at(-1);
    const unread = lines.filter((l, i) => l.dir === "in" && lines.slice(i + 1).every((x) => x.dir === "in")).length;
    conversations.push({ ...convo, lastMessage: last?.body ?? "", lastMessageAt: now - (last?.ago ?? 0), unread });
  };
  thread(
    { id: "cnv_1", name: "Harsh Vardhan", phone: "+919000000201", customerId: null, tab: "leads", waitingSince: now - 5 * HOUR, assignedTo: null, manual: false, status: "open" },
    [
      { dir: "in", ago: 5 * HOUR + 2 * MINUTE, body: "Hi, do you have coaching for adults? Complete beginner." },
      { dir: "out", ago: 5 * HOUR, body: "Hi Harsh! Our Adult beginners course runs Tue and Thu, 7 – 8 AM. Want me to hold a place?", author: null },
      { dir: "in", ago: 5 * HOUR - MINUTE, body: "Is there anything in the evening? Mornings are hard for me." },
    ],
  );
  thread(
    { id: "cnv_2", name: "Pooja Rathi", phone: "+919000000202", customerId: null, tab: "leads", waitingSince: now - 70 * MINUTE, assignedTo: null, manual: false, status: "open" },
    [{ dir: "in", ago: 70 * MINUTE, body: "Can I book both courts for a birthday party next Sunday, 10 kids?" }],
  );
  thread(
    { id: "cnv_3", name: "Sameer Joshi", phone: "+919000000203", customerId: null, tab: "leads", waitingSince: now - 12 * MINUTE, assignedTo: TEAM_IDS.desk, manual: true, status: "open" },
    [
      { dir: "in", ago: 20 * MINUTE, body: "What's the price for an hour on Saturday evening?" },
      { dir: "out", ago: 18 * MINUTE, body: "₹800 an hour at the weekend. Shall I send the booking link?", author: "Sunil" },
      { dir: "in", ago: 12 * MINUTE, body: "Yes please, and do you rent paddles?" },
    ],
  );
  thread(
    { id: "cnv_4", name: "Diya Patel", phone: "+919000000101", customerId: cus(2), tab: "customers", waitingSince: null, assignedTo: null, manual: false, status: "open" },
    [
      // A regular's long history, so the chat has older messages to load.
      ...Array.from({ length: 18 }, (_, week) => [
        { dir: "in" as const, ago: (60 - week * 3) * DAY + 2 * HOUR, body: week % 3 === 0 ? "Hi, is Court 2 free on Saturday evening?" : "Same time as last week please." },
        { dir: "out" as const, ago: (60 - week * 3) * DAY + 2 * HOUR - 3 * MINUTE, body: "Done. Booked Court 2, 7:00 – 8:00 PM. See you there!", author: null },
      ]).flat(),
      { dir: "out", ago: 26 * HOUR, body: "Your booking is confirmed: Court 2, today 7:00 – 8:00 PM.", author: null },
      { dir: "in", ago: 25 * HOUR, body: "Thanks! See you there." },
    ],
  );
  thread(
    { id: "cnv_5", name: "Ishaan Verma", phone: "+919000000102", customerId: cus(3), tab: "customers", waitingSince: null, assignedTo: null, manual: true, status: "open" },
    [
      { dir: "in", ago: 3 * HOUR, body: "Can I move tomorrow's booking to 8 PM?" },
      { dir: "out", ago: 2 * HOUR + 50 * MINUTE, body: "Done, moved to 8:00 – 9:00 PM on Court 1.", author: "Vikram" },
      { dir: "out", ago: 2 * HOUR + 49 * MINUTE, body: "Here's the updated receipt.", author: "Vikram", delivery: "failed", failure: "WhatsApp couldn't deliver this. The number may have blocked business messages." },
    ],
  );
  thread(
    { id: "cnv_6", name: "Ananya Iyer", phone: "+919000000103", customerId: cus(4), tab: "customers", waitingSince: now - 26 * HOUR, assignedTo: null, manual: false, status: "open" },
    [
      { dir: "out", ago: 30 * HOUR, body: "Reminder: Myra's month of Juniors ends on Sunday. Renew to keep her place.", author: null },
      { dir: "in", ago: 26 * HOUR, body: "Can I pay in two parts this time?" },
    ],
  );
  thread(
    { id: "cnv_7", name: "Kabir Singh", phone: "+919000000104", customerId: cus(5), tab: "customers", waitingSince: null, assignedTo: null, manual: false, status: "done" },
    [
      { dir: "in", ago: 4 * DAY, body: "Lost a water bottle on court 1 yesterday, blue one." },
      { dir: "out", ago: 4 * DAY - 30 * MINUTE, body: "Found it, it's at the desk.", author: "Sunil" },
    ],
  );
  thread(
    { id: "cnv_8", name: "Neha Rawat", phone: "+919000000301", customerId: null, tab: "team", waitingSince: null, assignedTo: null, manual: true, status: "open" },
    [{ dir: "in", ago: 40 * MINUTE, body: "Running 10 min late for Juniors, can someone set out the nets?" }],
  );

  // --- Team ----------------------------------------------------------------------------
  const team = [
    { id: TEAM_IDS.owner, name: "Asha Kumar", email: "asha@example.com", role: "admin" as const, status: "active" as const, programmeIds: [], lastSeenAt: now - 4 * MINUTE, invitedAt: now - 200 * DAY },
    { id: TEAM_IDS.manager, name: "Vikram Das", email: "vikram@example.com", role: "manager" as const, status: "active" as const, programmeIds: [], lastSeenAt: now - 2 * HOUR, invitedAt: now - 150 * DAY },
    { id: TEAM_IDS.desk, name: "Sunil Tudu", email: "sunil@example.com", role: "staff" as const, status: "active" as const, programmeIds: [], lastSeenAt: now - 15 * MINUTE, invitedAt: now - 90 * DAY },
    { id: TEAM_IDS.coach, name: "Neha Rawat", email: "neha@example.com", role: "coach" as const, status: "active" as const, programmeIds: [juniors.id, beginners.id], lastSeenAt: now - 20 * HOUR, invitedAt: now - 80 * DAY },
    { id: TEAM_IDS.invited, name: "Farhan Ali", email: "farhan@example.com", role: "staff" as const, status: "invited" as const, programmeIds: [], lastSeenAt: null, invitedAt: now - 2 * DAY },
  ];

  return {
    version: DB_VERSION,
    seededOn: today,
    closures: [
      { id: "cls_1", date: addDays(today, 9), startMinute: null, endMinute: null, reason: "Festival holiday", createdAt: now - 6 * DAY },
      { id: "cls_2", date: addDays(today, 4), startMinute: 6 * 60, endMinute: 9 * 60, reason: "Court resurfacing", createdAt: now - 2 * DAY },
    ],
    programmes,
    sessions,
    enrolments,
    attendance,
    membershipPlans,
    memberships,
    conversations,
    messages,
    team,
    access: {
      manager: ["bookings", "availability", "programmes", "customers", "members", "payments", "inbox", "team"],
      // The front desk takes cash, so it sees Payments; approving and moving credit stay with managers.
      staff: ["bookings", "customers", "payments", "inbox"],
      coach: ["programmes"],
    },
    deviceSessions: [
      { id: "dev_1", memberId: TEAM_IDS.owner, device: "Chrome on Mac", city: "Jamshedpur", lastSeenAt: now - 4 * MINUTE, current: true },
      { id: "dev_2", memberId: TEAM_IDS.owner, device: "Safari on iPhone", city: "Jamshedpur", lastSeenAt: now - 9 * HOUR, current: false },
      { id: "dev_3", memberId: TEAM_IDS.desk, device: "Chrome on Android", city: "Jamshedpur", lastSeenAt: now - 15 * MINUTE, current: false },
      { id: "dev_4", memberId: TEAM_IDS.manager, device: "Edge on Windows", city: "Ranchi", lastSeenAt: now - 3 * DAY, current: false },
    ],
    // A few things the team did recently, newest first, so Settings › Activity has a history.
    activity: [
      { id: "act_s1", at: now - 18 * MINUTE, text: "Replied to Sameer Joshi on WhatsApp", actor: "Sunil Tudu", subject: { type: "conversation", id: "cnv_3" } },
      { id: "act_s2", at: now - 2 * HOUR - 50 * MINUTE, text: "Took over the chat with Ishaan Verma", actor: "Vikram Das", subject: { type: "conversation", id: "cnv_5" } },
      { id: "act_s3", at: now - 20 * HOUR, text: "Saved attendance for Off-Screen Club Juniors", actor: "Neha Rawat", subject: { type: "programme", id: juniors.id } },
      { id: "act_s4", at: now - 2 * DAY, text: "Invited Farhan Ali", actor: "Asha Kumar", subject: { type: "customer", id: TEAM_IDS.invited } },
      { id: "act_s5", at: now - 4 * DAY + 30 * MINUTE, text: "Kabir Singh came in person · Collected the water bottle", actor: "Sunil Tudu", subject: { type: "conversation", id: "cnv_7" } },
    ],
    creditAdjustments: [],
    approvedPayments: [],
    reminders: {},
    checkIns: {},
    profile: { name: VENUE.name, city: VENUE.city, address: VENUE.address, timeZone: VENUE.timeZone, currency: "INR", contactEmail: "hello@example.com" },
    notifications: { newBooking: true, cancellation: true, paymentFailed: true, leadWaiting: true, dailySummary: false },
  };
}
