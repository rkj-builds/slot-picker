import { makeId } from "@/lib/booking";
import type { Paise } from "@/lib/money";
import { addDays, compareDates, type PlainDate } from "@/lib/plain-date";
import { customerByPhone, newCustomer } from "@/lib/store";
import type { EnrolmentsApi, MembershipsApi, PayMethod, ProgrammesApi } from "@/data/client";
import { DataError } from "@/data/errors";
import type { MockContext } from "@/data/mock/context";
import { patchRow } from "@/data/mock/db";
import { sessionsFor } from "@/data/mock/seed";
import { collected, enrolmentDue, ledgerPaid, membershipDue } from "@/data/money";
import type { Enrolment, Membership, Programme } from "@/data/types";

function payEntry(paid: { method: PayMethod; amountPaise: Paise } | null, at: number, note: string) {
  return paid && paid.amountPaise > 0 ? [{ id: makeId("le"), at, kind: paid.method, amountPaise: paid.amountPaise, note }] : [];
}

/** The day a new period ends: a month (less a day) from its start. */
function periodEnd(startsOn: PlainDate): PlainDate {
  const [y = 0, m = 1, d = 1] = startsOn.split("-").map(Number);
  const next = new Date(Date.UTC(y, m, d));
  return addDays(next.toISOString().slice(0, 10) as PlainDate, -1);
}

function validateProgramme(p: Partial<Programme>): void {
  const fields: Record<string, string> = {};
  if (p.name !== undefined && !p.name.trim()) fields.name = "Give it a name";
  if (p.capacity !== undefined && p.capacity < 1) fields.capacity = "At least 1";
  if (p.startMinute !== undefined && p.endMinute !== undefined && p.endMinute <= p.startMinute) fields.endMinute = "After the start";
  if (p.weekdays?.length === 0) fields.weekdays = "Pick at least one day";
  if (p.courtIds?.length === 0) fields.courtIds = "Pick at least one court";
  if (p.plans?.filter((x) => !x.retired).length === 0) fields.plans = "Add a way to pay";
  else if (p.plans?.some((x) => !x.retired && (!x.name.trim() || x.pricePaise <= 0 || (x.kind === "pack" && !x.sessions)))) fields.plans = "Every plan needs a name, a price and, for a pack, how many sessions";
  if (Object.keys(fields).length) throw new DataError("validation", "Some details need fixing.", { fields });
}

export function mockProgrammes(ctx: MockContext): ProgrammesApi {
  const visible = (): Programme[] => {
    const viewer = ctx.viewer();
    const all = ctx.db.read().programmes;
    if (viewer.role !== "coach") return all;
    const mine = ctx.db.read().team.find((m) => m.id === viewer.memberId)?.programmeIds ?? [];
    return all.filter((p) => mine.includes(p.id));
  };
  const find = (id: string): Programme => {
    const programme = visible().find((p) => p.id === id);
    if (!programme) throw new DataError("not-found", "This programme doesn't exist, or you don't have access to it.");
    return programme;
  };

  return {
    async list() {
      await ctx.trip();
      ctx.requireFeature("programmes");
      const programmes = visible();
      const enrolments = ctx.db.read().enrolments;
      const stats = Object.fromEntries(
        programmes.map((p) => {
          const mine = enrolments.filter((e) => e.programmeId === p.id);
          return [
            p.id,
            {
              enrolled: mine.filter((e) => e.status === "running" || e.status === "paused").length,
              owedPaise: mine.reduce((sum, e) => sum + enrolmentDue(e), 0),
              collectedPaise: mine.reduce((sum, e) => sum + collected(e.ledger), 0),
            },
          ];
        }),
      );
      return { programmes, stats };
    },

    async get(id) {
      await ctx.trip();
      const programme = find(id);
      const tables = ctx.db.read();
      return {
        programme,
        sessions: tables.sessions.filter((s) => s.programmeId === id).sort((a, b) => compareDates(a.date, b.date)),
        enrolments: tables.enrolments.filter((e) => e.programmeId === id),
      };
    },

    async create(input) {
      await ctx.trip();
      ctx.require("editProgrammes");
      validateProgramme(input);
      const programme: Programme = { ...input, name: input.name.trim(), id: makeId("prg"), createdAt: ctx.now() };
      const sessions = sessionsFor(programme, programme.startsOn, addDays(ctx.today(), 42));
      ctx.db.write((t) => ({ ...t, programmes: [...t.programmes, programme], sessions: [...t.sessions, ...sessions] }));
      ctx.log(`Created ${programme.name}`, { type: "programme", id: programme.id });
      return programme;
    },

    async update(id, patch) {
      await ctx.trip();
      ctx.require("editProgrammes");
      const before = find(id);
      validateProgramme(patch);
      const after: Programme = { ...before, ...patch };
      const scheduleChanged = ["weekdays", "startMinute", "endMinute", "startsOn", "endsOn"].some((k) => k in patch);
      ctx.db.write((t) => {
        let sessions = t.sessions;
        if (scheduleChanged) {
          // Past sessions keep their attendance; future ones follow the new schedule.
          const today = ctx.today();
          const kept = sessions.filter((s) => s.programmeId !== id || compareDates(s.date, today) < 0);
          sessions = [...kept, ...sessionsFor(after, today, addDays(today, 42))];
        }
        return { ...t, programmes: patchRow(t.programmes, id, () => after), sessions };
      });
      ctx.log(patch.status && patch.status !== before.status ? `${after.name} is now ${patch.status}` : `Edited ${after.name}`, { type: "programme", id });
      return after;
    },

    async setSessionStatus(sessionId, status) {
      await ctx.trip();
      ctx.require("editProgrammes");
      const session = ctx.db.read().sessions.find((s) => s.id === sessionId);
      if (!session) throw new DataError("not-found", "This session doesn't exist.");
      const next = { ...session, status };
      ctx.db.write((t) => ({ ...t, sessions: patchRow(t.sessions, sessionId, () => next) }));
      ctx.log(`${status === "cancelled" ? "Cancelled" : "Restored"} the session on ${session.date}`, { type: "programme", id: session.programmeId });
      return next;
    },

    async attendance(sessionId) {
      await ctx.trip();
      const tables = ctx.db.read();
      const session = tables.sessions.find((s) => s.id === sessionId);
      if (!session) throw new DataError("not-found", "This session doesn't exist.");
      const programme = find(session.programmeId);
      const attendance = tables.attendance.find((a) => a.sessionId === sessionId) ?? { sessionId, marks: {}, savedAt: null, savedBy: null };
      const expected = tables.enrolments.filter(
        (e) =>
          e.programmeId === programme.id &&
          (e.id in attendance.marks ||
            (e.status !== "waitlist" &&
              compareDates(e.startsOn, session.date) <= 0 &&
              !(e.stoppedOn && compareDates(e.stoppedOn, session.date) <= 0) &&
              !(e.pausedFrom && e.pausedUntil && compareDates(e.pausedFrom, session.date) <= 0 && compareDates(session.date, e.pausedUntil) <= 0))),
      );
      return { session, programme, expected, attendance };
    },

    async saveAttendance(sessionId, marks) {
      await ctx.trip();
      const viewer = ctx.viewer();
      const session = ctx.db.read().sessions.find((s) => s.id === sessionId);
      if (!session) throw new DataError("not-found", "This session doesn't exist.");
      find(session.programmeId);
      if (!viewer.features.includes("programmes")) ctx.requireFeature("programmes");
      if (compareDates(session.date, ctx.today()) > 0) throw new DataError("validation", "This session hasn't happened yet. Take the register on the day.");
      const attendance = { sessionId, marks, savedAt: ctx.now(), savedBy: viewer.memberId };
      ctx.db.write((t) => ({ ...t, attendance: [...t.attendance.filter((a) => a.sessionId !== sessionId), attendance] }));
      const present = Object.values(marks).filter((m) => m === "present").length;
      ctx.log(`Took the register: ${present} present`, { type: "programme", id: session.programmeId });
      return attendance;
    },
  };
}

export function mockEnrolments(ctx: MockContext): EnrolmentsApi {
  const find = (id: string): Enrolment => {
    const e = ctx.db.read().enrolments.find((x) => x.id === id);
    if (!e) throw new DataError("not-found", "This enrolment no longer exists.");
    return e;
  };
  const save = (id: string, change: (e: Enrolment) => Enrolment, text: string): Enrolment => {
    const next = change(find(id));
    ctx.db.write((t) => ({ ...t, enrolments: patchRow(t.enrolments, id, () => next) }));
    ctx.log(text, { type: "enrolment", id });
    return next;
  };
  const planOf = (programmeId: string, planId: string) => {
    const plan = ctx.db.read().programmes.find((p) => p.id === programmeId)?.plans.find((p) => p.id === planId);
    if (!plan) throw new DataError("validation", "Pick a plan.", { fields: { planId: "Required" } });
    return plan;
  };
  const credit = (customerId: string): Paise => ctx.bridge.read().customers.find((c) => c.id === customerId)?.creditPaise ?? 0;
  const name = (e: Enrolment): string => {
    if (e.participantName) return e.participantName;
    return ctx.bridge.read().customers.find((c) => c.id === e.customerId)?.name ?? "Someone";
  };

  /** Unused share of the current period, by days left of a 30-day month. */
  const unused = (e: Enrolment): { amountPaise: Paise; basis: string } => {
    const paid = Math.max(0, ledgerPaid(e.ledger));
    const today = ctx.today();
    const from = compareDates(e.startsOn, today) > 0 ? e.startsOn : today;
    const left = Math.min(30, Math.max(0, Math.round((Date.parse(e.paidUntil) - Date.parse(from)) / 86_400_000) + 1));
    return { amountPaise: Math.round((paid * left) / 30 / 100) * 100, basis: `${left} of 30 days unused` };
  };

  return {
    async list({ programmeId }) {
      await ctx.trip();
      ctx.requireFeature("programmes");
      const tables = ctx.db.read();
      // A coach sees the children in their own programmes, as they see only those programmes.
      const viewer = ctx.viewer();
      const mine = viewer.role === "coach" ? (tables.team.find((m) => m.id === viewer.memberId)?.programmeIds ?? []) : null;
      const programmes = mine ? tables.programmes.filter((p) => mine.includes(p.id)) : tables.programmes;
      const ids = new Set(programmes.map((p) => p.id));
      return {
        enrolments: tables.enrolments.filter((e) => ids.has(e.programmeId) && (!programmeId || e.programmeId === programmeId)),
        customers: ctx.bridge.read().customers,
        programmes,
      };
    },

    async add(input) {
      await ctx.trip();
      ctx.require("writeBookings");
      if (input.paid) ctx.require("handleMoney");
      const programme = ctx.db.read().programmes.find((p) => p.id === input.programmeId);
      if (!programme) throw new DataError("not-found", "That programme doesn't exist.");
      const plan = planOf(input.programmeId, input.planId);
      const fields: Record<string, string> = {};
      if (!input.participantName.trim() && programme.ageMax !== null) fields.participantName = "Who's joining?";
      if (input.participantAge !== null && ((programme.ageMin !== null && input.participantAge < programme.ageMin) || (programme.ageMax !== null && input.participantAge > programme.ageMax)))
        fields.participantAge = `This programme is for ages ${programme.ageMin ?? "any"} to ${programme.ageMax ?? "any"}`;
      if (Object.keys(fields).length) throw new DataError("validation", "Some details need fixing.", { fields });
      const state = ctx.bridge.read();
      const guardian = input.guardian;
      let customer = "id" in guardian ? state.customers.find((c) => c.id === guardian.id) : customerByPhone(state, guardian.phone);
      if (!customer && "name" in guardian) {
        customer = newCustomer(guardian.name, guardian.phone, ctx.now());
        ctx.bridge.apply({ type: "add-customer", customer });
      }
      if (!customer) throw new DataError("validation", "Add the parent's name and WhatsApp number.", { fields: { guardian: "Required" } });
      const full = ctx.db.read().enrolments.filter((e) => e.programmeId === programme.id && (e.status === "running" || e.status === "paused")).length >= programme.capacity;
      const enrolment: Enrolment = {
        id: makeId("enr"),
        programmeId: programme.id,
        planId: plan.id,
        participantName: input.participantName.trim(),
        participantAge: input.participantAge,
        customerId: customer.id,
        status: full ? "waitlist" : "running",
        startsOn: input.startsOn,
        paidUntil: periodEnd(input.startsOn),
        pausedFrom: null,
        pausedUntil: null,
        stoppedOn: null,
        stopReason: null,
        pricePaise: plan.pricePaise,
        ledger: payEntry(input.paid, ctx.now(), "Paid at sign-up"),
        followUp: null,
        createdAt: ctx.now(),
      };
      ctx.db.write((t) => ({ ...t, enrolments: [...t.enrolments, enrolment] }));
      ctx.log(`${full ? "Waitlisted" : "Enrolled"} ${enrolment.participantName || customer.name} in ${programme.name}`, { type: "enrolment", id: enrolment.id });
      return enrolment;
    },

    async previewRenew(id, { planId, startsOn }) {
      await ctx.trip();
      const e = find(id);
      const plan = planOf(e.programmeId, planId);
      const creditAppliedPaise = Math.min(credit(e.customerId), plan.pricePaise);
      return { paidUntil: periodEnd(startsOn), pricePaise: plan.pricePaise, creditAppliedPaise, duePaise: plan.pricePaise - creditAppliedPaise };
    },

    async renew(id, { planId, startsOn, paid }) {
      await ctx.trip();
      ctx.require("handleMoney");
      const e = find(id);
      if (enrolmentDue(e) > 0) throw new DataError("validation", `${name(e)} still owes ${ctx.inr(enrolmentDue(e))} for this period. Take that first.`);
      const plan = planOf(e.programmeId, planId);
      const creditUsed = Math.min(credit(e.customerId), plan.pricePaise);
      if (creditUsed > 0) ctx.bridge.apply({ type: "adjust-credit", customerId: e.customerId, amountPaise: -creditUsed });
      const now = ctx.now();
      return save(
        id,
        (x) => ({
          ...x,
          planId,
          status: "running",
          startsOn,
          paidUntil: periodEnd(startsOn),
          pricePaise: plan.pricePaise,
          stoppedOn: null,
          stopReason: null,
          ledger: [...(creditUsed > 0 ? [{ id: makeId("le"), at: now, kind: "credit-applied" as const, amountPaise: creditUsed, note: "Credit from last period" }] : []), ...payEntry(paid, now, "Paid for the new period")],
          followUp: null,
        }),
        `Renewed ${name(e)} until ${periodEnd(startsOn)}`,
      );
    },

    async recordPayment(id, { method, amountPaise }) {
      await ctx.trip();
      ctx.require("handleMoney");
      const e = find(id);
      const due = enrolmentDue(e);
      if (amountPaise <= 0) throw new DataError("validation", "Enter an amount above ₹0.", { fields: { amount: "Above ₹0" } });
      if (amountPaise > due) throw new DataError("validation", `That's more than the ${ctx.inr(due)} still due.`, { fields: { amount: "Too much" } });
      return save(id, (x) => ({ ...x, ledger: [...x.ledger, ...payEntry({ method, amountPaise }, ctx.now(), method === "cash" ? "Cash at the desk" : "Paid online")] }), `Took ${ctx.inr(amountPaise)} ${method} for ${name(e)}`);
    },

    async previewPause(id, { from, until }) {
      await ctx.trip();
      const e = find(id);
      if (compareDates(until, from) < 0) throw new DataError("validation", "The pause has to end after it starts.", { fields: { until: "After the start" } });
      const days = Math.round((Date.parse(until) - Date.parse(from)) / 86_400_000) + 1;
      return { paidUntil: addDays(e.paidUntil, days) };
    },

    async pause(id, { from, until }) {
      const { paidUntil } = await this.previewPause(id, { from, until });
      ctx.require("writeBookings");
      const e = find(id);
      if (e.status !== "running") throw new DataError("validation", "Only a running enrolment can be paused.");
      return save(id, (x) => ({ ...x, status: "paused", pausedFrom: from, pausedUntil: until, paidUntil }), `Paused ${name(e)} until ${until}`);
    },

    async resume(id) {
      await ctx.trip();
      ctx.require("writeBookings");
      const e = find(id);
      return save(id, (x) => ({ ...x, status: "running", pausedFrom: null, pausedUntil: null }), `Resumed ${name(e)}`);
    },

    async stop(id, { on, reason }) {
      await ctx.trip();
      ctx.require("writeBookings");
      if (!reason.trim()) throw new DataError("validation", "Say why they're stopping, so the team doesn't chase them.", { fields: { reason: "Required" } });
      const e = find(id);
      return save(id, (x) => ({ ...x, status: "stopped", stoppedOn: on, stopReason: reason.trim(), followUp: null }), `Stopped ${name(e)} from ${on} · ${reason.trim()}`);
    },

    async undoStop(id) {
      await ctx.trip();
      ctx.require("writeBookings");
      const e = find(id);
      return save(id, (x) => ({ ...x, status: "running", stoppedOn: null, stopReason: null }), `Put ${name(e)} back on the register`);
    },

    async previewGiveBack(id) {
      await ctx.trip();
      return unused(find(id));
    },

    async giveBack(id, { as, amountPaise }) {
      await ctx.trip();
      ctx.require("refund");
      const e = find(id);
      const max = Math.max(0, ledgerPaid(e.ledger));
      if (amountPaise <= 0 || amountPaise > max) throw new DataError("validation", `Enter an amount up to ${ctx.inr(max)}, what was paid.`, { fields: { amount: "Out of range" } });
      if (as === "credit") ctx.bridge.apply({ type: "adjust-credit", customerId: e.customerId, amountPaise });
      return save(
        id,
        (x) => ({ ...x, ledger: [...x.ledger, { id: makeId("le"), at: ctx.now(), kind: as === "credit" ? "credit-issued" : "refund", amountPaise, note: as === "credit" ? "Kept as credit for next time" : "Handed back" }] }),
        `${as === "credit" ? "Gave" : "Refunded"} ${ctx.inr(amountPaise)}${as === "credit" ? " as credit" : ""} to ${name(e)}`,
      );
    },

    async setFollowUp(id, note) {
      await ctx.trip();
      const e = find(id);
      const text = note?.trim() ?? "";
      return save(id, (x) => ({ ...x, followUp: text === "" ? null : text }), text ? `Follow-up for ${name(e)}: ${text}` : `Cleared the follow-up for ${name(e)}`);
    },
  };
}

export function mockMemberships(ctx: MockContext): MembershipsApi {
  const find = (id: string): Membership => {
    const m = ctx.db.read().memberships.find((x) => x.id === id);
    if (!m) throw new DataError("not-found", "This membership no longer exists.");
    return m;
  };
  const save = (id: string, change: (m: Membership) => Membership, text: string): Membership => {
    const next = change(find(id));
    ctx.db.write((t) => ({ ...t, memberships: patchRow(t.memberships, id, () => next) }));
    ctx.log(text, { type: "membership", id });
    return next;
  };
  const planOf = (planId: string) => {
    const plan = ctx.db.read().membershipPlans.find((p) => p.id === planId);
    if (!plan) throw new DataError("validation", "Pick a plan.", { fields: { planId: "Required" } });
    return plan;
  };
  const who = (m: Membership): string => ctx.bridge.read().customers.find((c) => c.id === m.customerId)?.name ?? "Member";

  return {
    async list() {
      await ctx.trip();
      ctx.requireFeature("members");
      const tables = ctx.db.read();
      return { memberships: tables.memberships, plans: tables.membershipPlans, customers: ctx.bridge.read().customers };
    },
    async get(id) {
      await ctx.trip();
      const membership = find(id);
      const customer = ctx.bridge.read().customers.find((c) => c.id === membership.customerId);
      if (!customer) throw new DataError("not-found", "This member no longer exists.");
      const activity = ctx.db.read().activity.filter((a) => a.subject.type === "membership" && a.subject.id === id);
      return { membership, plan: planOf(membership.planId), customer, activity };
    },
    async sell({ customer: who, planId, startsOn, paid }) {
      await ctx.trip();
      ctx.require("handleMoney");
      const plan = planOf(planId);
      if (plan.retired) throw new DataError("validation", "This plan is no longer on sale.");
      const state = ctx.bridge.read();
      let customer = "id" in who ? state.customers.find((c) => c.id === who.id) : customerByPhone(state, who.phone);
      if (!customer && "name" in who) {
        customer = newCustomer(who.name, who.phone, ctx.now());
        ctx.bridge.apply({ type: "add-customer", customer });
      }
      if (!customer) throw new DataError("validation", "Pick a customer.", { fields: { customer: "Required" } });
      if (ctx.db.read().memberships.some((m) => m.customerId === customer.id && m.status === "active")) throw new DataError("validation", `${customer.name} already has an active membership. Renew or add hours instead.`);
      const membership: Membership = {
        id: makeId("mem"),
        customerId: customer.id,
        planId,
        status: "active",
        startsOn,
        expiresOn: addDays(startsOn, plan.validDays),
        hoursTotal: plan.hours,
        hoursUsed: 0,
        pricePaise: plan.pricePaise,
        ledger: payEntry(paid, ctx.now(), "Paid at signing"),
        lastVisitOn: null,
      };
      ctx.db.write((t) => ({ ...t, memberships: [...t.memberships, membership] }));
      ctx.log(`Sold ${plan.name} to ${customer.name}`, { type: "membership", id: membership.id });
      return membership;
    },
    async renew(id, { planId, paid }) {
      await ctx.trip();
      ctx.require("handleMoney");
      const plan = planOf(planId);
      const m = find(id);
      const startsOn = compareDates(m.expiresOn, ctx.today()) > 0 && m.status !== "expired" ? m.expiresOn : ctx.today();
      const carried = Math.max(0, m.hoursTotal - m.hoursUsed);
      return save(
        id,
        (x) => ({ ...x, planId, status: "active", startsOn, expiresOn: addDays(startsOn, plan.validDays), hoursTotal: plan.hours + (x.status === "expired" ? 0 : carried), hoursUsed: 0, pricePaise: plan.pricePaise, ledger: payEntry(paid, ctx.now(), "Paid for the renewal") }),
        `Renewed ${who(m)} on ${plan.name}`,
      );
    },
    async addHours(id, { hours, pricePaise }) {
      await ctx.trip();
      ctx.require("handleMoney");
      if (hours <= 0) throw new DataError("validation", "Add at least one hour.", { fields: { hours: "At least 1" } });
      const m = find(id);
      return save(id, (x) => ({ ...x, hoursTotal: x.hoursTotal + hours, pricePaise: x.pricePaise + pricePaise }), `Added ${hours} hours for ${who(m)}`);
    },
    async setPaused(id, paused) {
      await ctx.trip();
      ctx.require("writeBookings");
      const m = find(id);
      if (m.status === "expired") throw new DataError("validation", "This membership has expired. Renew it instead.");
      return save(id, (x) => ({ ...x, status: paused ? "paused" : "active" }), `${paused ? "Paused" : "Resumed"} ${who(m)}'s membership`);
    },
    async recordPayment(id, { method, amountPaise }) {
      await ctx.trip();
      ctx.require("handleMoney");
      const m = find(id);
      const due = membershipDue(m);
      if (amountPaise <= 0 || amountPaise > due) throw new DataError("validation", `Enter an amount up to ${ctx.inr(due)}, what's still due.`, { fields: { amount: "Out of range" } });
      return save(id, (x) => ({ ...x, ledger: [...x.ledger, ...payEntry({ method, amountPaise }, ctx.now(), method === "cash" ? "Cash at the desk" : "Paid online")] }), `Took ${ctx.inr(amountPaise)} ${method} from ${who(m)}`);
    },
    async refund(id, { amountPaise, reason }) {
      await ctx.trip();
      ctx.require("refund");
      const m = find(id);
      const max = Math.max(0, ledgerPaid(m.ledger));
      if (amountPaise <= 0 || amountPaise > max) throw new DataError("validation", `Enter an amount up to ${ctx.inr(max)}.`, { fields: { amount: "Out of range" } });
      if (!reason.trim()) throw new DataError("validation", "Say why, for the accounts.", { fields: { reason: "Required" } });
      return save(id, (x) => ({ ...x, status: "expired", ledger: [...x.ledger, { id: makeId("le"), at: ctx.now(), kind: "refund", amountPaise, note: reason.trim() }] }), `Refunded ${ctx.inr(amountPaise)} to ${who(m)} · ${reason.trim()}`);
    },
    async savePlan(plan) {
      await ctx.trip();
      ctx.require("editSettings");
      const fields: Record<string, string> = {};
      if (!plan.name.trim()) fields.name = "Give it a name";
      if (plan.hours <= 0) fields.hours = "At least 1";
      if (plan.validDays <= 0) fields.validDays = "At least 1";
      if (plan.pricePaise <= 0) fields.pricePaise = "Above ₹0";
      if (Object.keys(fields).length) throw new DataError("validation", "Some details need fixing.", { fields });
      const exists = ctx.db.read().membershipPlans.some((p) => p.id === plan.id);
      const saved = exists ? plan : { ...plan, id: plan.id || makeId("mpl") };
      ctx.db.write((t) => ({ ...t, membershipPlans: exists ? patchRow(t.membershipPlans, plan.id, () => saved) : [...t.membershipPlans, saved] }));
      return saved;
    },
  };
}
