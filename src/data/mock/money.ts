import { type Booking, bookingStart, customerById, duePaise } from "@/lib/booking";
import { formatDay, formatTime } from "@/lib/format";
import { makeId } from "@/lib/booking";
import { addDays, compareDates, todayIn } from "@/lib/plain-date";
import { instantAt } from "@/lib/time-zone";
import { COURTS, VENUE } from "@/lib/venue";
import type { InboxApi, MoneyApi, SettingsApi, TeamApi } from "@/data/client";
import { DataError } from "@/data/errors";
import type { MockContext } from "@/data/mock/context";
import { patchRow } from "@/data/mock/db";
import { enrolmentDue, membershipDue } from "@/data/money";
import type { Conversation, CreditLine, Due, Message, Payment, Role } from "@/data/types";

const PAGE = 30;

export function mockMoney(ctx: MockContext): MoneyApi {
  // "Court 2 · Thu, 15 Oct, 7:00 pm": a person reads it in a list, so it is written the way the desk says it.
  const bookingLabel = (b: Booking): string =>
    `${COURTS.find((c) => c.id === b.courtId)?.name ?? "Court"} · ${formatDay(b.date, "en-IN")}, ${formatTime(bookingStart(b), { locale: "en-IN", timeZone: VENUE.timeZone })}`;

  /** Every ledger line in the venue, newest first. */
  const allPayments = (): Payment[] => {
    const tables = ctx.db.read();
    const approved = new Set(tables.approvedPayments);
    const programmes = new Map(tables.programmes.map((p) => [p.id, p.name]));
    const plans = new Map(tables.membershipPlans.map((p) => [p.id, p.name]));
    // Approval is a manager confirming the desk's cash reached the drawer. Online money is confirmed by
    // the gateway, and credit moves and payouts are made by people who may approve, so only cash waits.
    // Cash from before the last two days was checked before the demo's history begins.
    const settledBefore = instantAt(addDays(tables.seededOn, -2), 0, VENUE.timeZone);
    const isApproved = (e: { id: string; kind: Payment["kind"]; at: number }): boolean => approved.has(e.id) || e.kind !== "cash" || e.at < settledBefore;
    const out: Payment[] = [];
    for (const b of ctx.bridge.read().bookings) {
      for (const e of b.ledger) out.push({ id: e.id, at: e.at, kind: e.kind, amountPaise: e.amountPaise, customerId: b.customerId, subject: { type: "booking", id: b.id, label: bookingLabel(b) }, note: e.note, approved: isApproved(e) });
    }
    for (const en of tables.enrolments) {
      const label = `${programmes.get(en.programmeId) ?? "Programme"}${en.participantName ? ` · ${en.participantName}` : ""}`;
      for (const e of en.ledger) out.push({ id: e.id, at: e.at, kind: e.kind, amountPaise: e.amountPaise, customerId: en.customerId, subject: { type: "enrolment", id: en.id, label, programmeId: en.programmeId }, note: e.note, approved: isApproved(e) });
    }
    for (const m of tables.memberships) {
      for (const e of m.ledger) out.push({ id: e.id, at: e.at, kind: e.kind, amountPaise: e.amountPaise, customerId: m.customerId, subject: { type: "membership", id: m.id, label: plans.get(m.planId) ?? "Membership" }, note: e.note, approved: isApproved(e) });
    }
    for (const a of tables.creditAdjustments) out.push({ ...a, approved: approved.has(a.id) || a.approved });
    return out.sort((a, b) => b.at - a.at);
  };

  return {
    async payments({ from, to }) {
      await ctx.trip();
      ctx.requireFeature("payments");
      // A line timestamped after now (the seed's prepayments for later bookings) hasn't happened yet.
      const now = ctx.now();
      const payments = allPayments().filter((p) => {
        if (p.at > now) return false;
        const day = todayIn(VENUE.timeZone, p.at);
        return compareDates(day, from) >= 0 && compareDates(day, to) <= 0;
      });
      return { payments, customers: ctx.bridge.read().customers };
    },

    async approve(ids) {
      await ctx.trip();
      const role: Role = ctx.viewer().role;
      if (role !== "admin" && role !== "manager") throw new DataError("forbidden", "Only an admin or a manager can approve payments.");
      ctx.db.write((t) => ({ ...t, approvedPayments: [...new Set([...t.approvedPayments, ...ids])] }));
      ctx.log(`Approved ${ids.length} ${ids.length === 1 ? "payment" : "payments"}`, { type: "customer", id: "payments" });
    },

    async dues() {
      await ctx.trip();
      ctx.requireFeature("payments");
      const today = ctx.today();
      const tables = ctx.db.read();
      const programmes = new Map(tables.programmes.map((p) => [p.id, p.name]));
      const plans = new Map(tables.membershipPlans.map((p) => [p.id, p.name]));
      const dues: Due[] = [
        ...ctx.bridge
          .read()
          .bookings.filter((b) => compareDates(b.date, today) <= 0 && b.status === "confirmed" && duePaise(b) > 0)
          .map((b): Due => ({ subject: { type: "booking", id: b.id, label: bookingLabel(b) }, customerId: b.customerId, duePaise: duePaise(b), since: b.date })),
        ...tables.enrolments
          .filter((e) => enrolmentDue(e) > 0)
          .map((e): Due => ({ subject: { type: "enrolment", id: e.id, label: `${programmes.get(e.programmeId) ?? "Programme"}${e.participantName ? ` · ${e.participantName}` : ""}`, programmeId: e.programmeId }, customerId: e.customerId, duePaise: enrolmentDue(e), since: e.startsOn })),
        ...tables.memberships
          .filter((m) => membershipDue(m) > 0)
          .map((m): Due => ({ subject: { type: "membership", id: m.id, label: plans.get(m.planId) ?? "Membership" }, customerId: m.customerId, duePaise: membershipDue(m), since: m.startsOn })),
      ].sort((a, b) => compareDates(a.since, b.since));
      return { dues, customers: ctx.bridge.read().customers };
    },

    async credits() {
      await ctx.trip();
      ctx.requireFeature("payments");
      const customers = ctx.bridge.read().customers;
      const payments = allPayments();
      const credits: CreditLine[] = customers
        .filter((c) => c.creditPaise > 0 || payments.some((p) => p.customerId === c.id && (p.kind === "credit-issued" || p.kind === "credit-applied")))
        .map((c) => ({ customerId: c.id, creditPaise: c.creditPaise, history: payments.filter((p) => p.customerId === c.id && (p.kind === "credit-issued" || p.kind === "credit-applied" || p.subject.type === "credit")) }))
        .sort((a, b) => b.creditPaise - a.creditPaise);
      return { credits, customers };
    },

    async adjustCredit(customerId, { amountPaise, reason, kind }) {
      await ctx.trip();
      ctx.require("refund");
      const customer = customerById(ctx.bridge.read().customers, customerId);
      if (!customer) throw new DataError("not-found", "This customer no longer exists.");
      if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) throw new DataError("validation", "Enter an amount above ₹0.", { fields: { amount: "Above ₹0" } });
      if (!reason.trim()) throw new DataError("validation", "Say why, for the accounts.", { fields: { reason: "Required" } });
      const delta = kind === "credit-issued" ? Math.abs(amountPaise) : -Math.abs(amountPaise);
      if (delta < 0 && -delta > customer.creditPaise) throw new DataError("validation", `${customer.name} only has ${ctx.inr(customer.creditPaise)} of credit.`, { fields: { amount: "Too much" } });
      ctx.bridge.apply({ type: "adjust-credit", customerId, amountPaise: delta });
      const line: Payment = { id: makeId("adj"), at: ctx.now(), kind, amountPaise: Math.abs(amountPaise), customerId, subject: { type: "credit", id: customerId, label: kind === "credit-issued" ? "Credit added" : "Credit paid out" }, note: reason.trim(), approved: true };
      ctx.db.write((t) => ({ ...t, creditAdjustments: [line, ...t.creditAdjustments] }));
      ctx.log(`${delta > 0 ? "Added" : "Paid out"} ${ctx.inr(Math.abs(amountPaise))} credit · ${reason.trim()}`, { type: "customer", id: customerId });
      const next = customerById(ctx.bridge.read().customers, customerId);
      if (!next) throw new DataError("not-found", "This customer no longer exists.");
      return next;
    },
  };
}

export function mockInbox(ctx: MockContext): InboxApi {
  const find = (id: string): Conversation => {
    const c = ctx.db.read().conversations.find((x) => x.id === id);
    if (!c) throw new DataError("not-found", "This conversation no longer exists.");
    return c;
  };
  const save = (id: string, change: (c: Conversation) => Conversation): Conversation => {
    const next = change(find(id));
    ctx.db.write((t) => ({ ...t, conversations: patchRow(t.conversations, id, () => next) }));
    return next;
  };
  const setDelivery = (messageId: string, delivery: Message["delivery"]): void => {
    if (!ctx.db.read().messages.some((m) => m.id === messageId)) return;
    ctx.db.write((t) => ({ ...t, messages: patchRow(t.messages, messageId, (m) => ({ ...m, delivery })) }));
  };

  return {
    async conversations({ tab, q }) {
      await ctx.trip();
      ctx.requireFeature("inbox");
      const query = q.trim().toLowerCase();
      const digits = query.replace(/\D/g, "");
      return ctx.db
        .read()
        .conversations.filter((c) => c.tab === tab)
        .filter((c) => !query || c.name.toLowerCase().includes(query) || (digits.length >= 3 && c.phone.includes(digits)))
        .sort((a, b) => {
          // Leads: whoever has waited longest comes first; everything else by latest message.
          if (tab === "leads" && (a.waitingSince ?? Infinity) !== (b.waitingSince ?? Infinity)) return (a.waitingSince ?? Infinity) - (b.waitingSince ?? Infinity);
          return b.lastMessageAt - a.lastMessageAt;
        });
    },

    async messages(conversationId, before) {
      await ctx.trip();
      find(conversationId);
      const all = ctx.db
        .read()
        .messages.filter((m) => m.conversationId === conversationId && (before === undefined || m.at < before))
        .sort((a, b) => a.at - b.at);
      return { messages: all.slice(-PAGE), hasMore: all.length > PAGE };
    },

    async send(conversationId, body) {
      await ctx.trip();
      const text = body.trim();
      if (!text) throw new DataError("validation", "Write a message first.", { fields: { body: "Required" } });
      if (text.length > 4096) throw new DataError("validation", "WhatsApp messages can be up to 4,096 characters.", { fields: { body: "Too long" } });
      const c = find(conversationId);
      if (!c.manual) throw new DataError("validation", "The bot is answering this chat. Turn on Reply by hand first.");
      const viewer = ctx.viewer();
      const message: Message = { id: makeId("msg"), conversationId, direction: "out", body: text, at: ctx.now(), author: viewer.name.split(" ")[0] ?? viewer.name, delivery: "sent", failure: null };
      ctx.db.write((t) => ({
        ...t,
        messages: [...t.messages, message],
        conversations: patchRow(t.conversations, conversationId, (x) => ({ ...x, lastMessage: text, lastMessageAt: message.at, waitingSince: null, unread: 0, assignedTo: x.assignedTo ?? viewer.memberId })),
      }));
      ctx.later(() => setDelivery(message.id, "delivered"), 1500);
      ctx.later(() => setDelivery(message.id, "read"), 4000);
      return message;
    },

    async setManual(conversationId, manual) {
      await ctx.trip();
      const role = ctx.viewer().role;
      if (role !== "admin" && role !== "manager" && role !== "staff") throw new DataError("forbidden", "Only the desk can take a chat over from the bot.");
      const next = save(conversationId, (c) => ({ ...c, manual }));
      ctx.log(manual ? `Took over the chat with ${next.name}` : `Handed ${next.name} back to the bot`, { type: "conversation", id: conversationId });
      return next;
    },

    async claim(conversationId, claim) {
      await ctx.trip();
      const viewer = ctx.viewer();
      const c = find(conversationId);
      if (claim && c.assignedTo && c.assignedTo !== viewer.memberId) {
        const owner = ctx.db.read().team.find((m) => m.id === c.assignedTo)?.name ?? "someone else";
        throw new DataError("conflict", `${owner} already has this one.`);
      }
      return save(conversationId, (x) => ({ ...x, assignedTo: claim ? viewer.memberId : null }));
    },

    async logAction(conversationId, { action, note }) {
      await ctx.trip();
      const words = { called: "Called", texted: "Texted", replied: "Replied on WhatsApp", "walk-in": "Came in person", none: "No action needed" }[action];
      const next = save(conversationId, (c) => ({ ...c, waitingSince: null, status: "done", unread: 0 }));
      ctx.log(`${words}${note.trim() ? ` · ${note.trim()}` : ""}`, { type: "conversation", id: conversationId });
      return next;
    },

    async reopen(conversationId) {
      await ctx.trip();
      return save(conversationId, (c) => ({ ...c, status: "open", waitingSince: c.waitingSince ?? ctx.now() }));
    },

    async markRead(conversationId) {
      await ctx.trip();
      save(conversationId, (c) => ({ ...c, unread: 0 }));
    },
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function mockTeam(ctx: MockContext): TeamApi {
  const admins = (): number => ctx.db.read().team.filter((m) => m.role === "admin" && m.status === "active").length;
  return {
    async viewer() {
      await ctx.trip();
      return ctx.viewer();
    },
    async members() {
      await ctx.trip();
      ctx.requireFeature("team");
      return ctx.db.read().team;
    },
    async invite({ name, email, role, programmeIds }) {
      await ctx.trip();
      ctx.require("manageTeam");
      const fields: Record<string, string> = {};
      if (!name.trim()) fields.name = "Who are you inviting?";
      if (!EMAIL.test(email.trim())) fields.email = "Enter an email like name@example.com";
      else if (ctx.db.read().team.some((m) => m.email.toLowerCase() === email.trim().toLowerCase())) fields.email = "Someone on the team already uses this email";
      if (role === "coach" && programmeIds.length === 0) fields.programmeIds = "A coach needs at least one programme";
      if (Object.keys(fields).length) throw new DataError("validation", "Some details need fixing.", { fields });
      const member = { id: makeId("tm"), name: name.trim(), email: email.trim(), role, status: "invited" as const, programmeIds, lastSeenAt: null, invitedAt: ctx.now() };
      ctx.db.write((t) => ({ ...t, team: [...t.team, member] }));
      ctx.log(`Invited ${member.name}`, { type: "customer", id: member.id });
      return member;
    },
    async update(id, patch) {
      await ctx.trip();
      ctx.require("manageTeam");
      const member = ctx.db.read().team.find((m) => m.id === id);
      if (!member) throw new DataError("not-found", "This person is no longer on the team.");
      const losesAdmin = member.role === "admin" && member.status === "active" && ((patch.role !== undefined && patch.role !== "admin") || (patch.status !== undefined && patch.status !== "active"));
      if (losesAdmin && admins() <= 1) throw new DataError("validation", "The venue needs at least one active admin. Make someone else an admin first.");
      if (id === ctx.viewer().memberId && patch.status === "disabled") throw new DataError("validation", "You can't turn off your own access.");
      const next = { ...member, ...patch };
      ctx.db.write((t) => ({ ...t, team: patchRow(t.team, id, () => next) }));
      return next;
    },
    async remove(id) {
      await ctx.trip();
      ctx.require("manageTeam");
      const member = ctx.db.read().team.find((m) => m.id === id);
      if (!member) return;
      if (id === ctx.viewer().memberId) throw new DataError("validation", "You can't remove yourself.");
      if (member.role === "admin" && admins() <= 1) throw new DataError("validation", "The venue needs at least one active admin.");
      ctx.db.write((t) => ({ ...t, team: t.team.filter((m) => m.id !== id), deviceSessions: t.deviceSessions.filter((s) => s.memberId !== id) }));
    },
    async access() {
      await ctx.trip();
      return ctx.db.read().access;
    },
    async saveAccess(access) {
      await ctx.trip();
      ctx.require("manageTeam");
      ctx.db.write((t) => ({ ...t, access }));
      return access;
    },
    async sessions() {
      await ctx.trip();
      ctx.require("manageTeam");
      return [...ctx.db.read().deviceSessions].sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    },
    async revokeSession(id) {
      await ctx.trip();
      ctx.require("manageTeam");
      const session = ctx.db.read().deviceSessions.find((s) => s.id === id);
      if (session?.current) throw new DataError("validation", "That's the device you're using now.");
      ctx.db.write((t) => ({ ...t, deviceSessions: t.deviceSessions.filter((s) => s.id !== id) }));
    },
  };
}

export function mockSettings(ctx: MockContext): SettingsApi {
  return {
    async profile() {
      await ctx.trip();
      return ctx.db.read().profile;
    },
    async saveProfile(profile) {
      await ctx.trip();
      ctx.require("editSettings");
      const fields: Record<string, string> = {};
      if (!profile.name.trim()) fields.name = "The venue needs a name";
      if (!EMAIL.test(profile.contactEmail.trim())) fields.contactEmail = "Enter an email like hello@example.com";
      if (Object.keys(fields).length) throw new DataError("validation", "Some details need fixing.", { fields });
      ctx.db.write((t) => ({ ...t, profile }));
      return profile;
    },
    async notifications() {
      await ctx.trip();
      return ctx.db.read().notifications;
    },
    async saveNotifications(prefs) {
      await ctx.trip();
      ctx.db.write((t) => ({ ...t, notifications: prefs }));
      return prefs;
    },
    async activity({ limit }) {
      await ctx.trip();
      return ctx.db.read().activity.slice(0, limit);
    },
  };
}
