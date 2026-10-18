import { type Booking, bookingStart, customerById, duePaise, findConflict, makeId, paidPaise } from "@/lib/booking";
import { addDays, compareDates, type PlainDate } from "@/lib/plain-date";
import { bookingsWithBlocks, isRecurringId } from "@/lib/recurring-blocks";
import { customerByPhone, newCustomer } from "@/lib/store";
import { COURTS, priceFor } from "@/lib/venue";
import type { AvailabilityApi, BookingsApi, CustomersApi } from "@/data/client";
import { DataError } from "@/data/errors";
import type { MockContext } from "@/data/mock/context";
import type { ActivityEntry, CustomerSummary } from "@/data/types";

const HOUR = 3_600_000;

function inRange(date: PlainDate, from: PlainDate, to: PlainDate): boolean {
  return compareDates(date, from) >= 0 && compareDates(date, to) <= 0;
}

function courtName(courtId: string): string {
  return COURTS.find((c) => c.id === courtId)?.name ?? courtId;
}

export function mockBookings(ctx: MockContext): BookingsApi {
  const find = (id: string): Booking => {
    const booking = ctx.bridge.read().bookings.find((b) => b.id === id);
    if (!booking) throw new DataError("not-found", "This booking no longer exists. It may have been removed.");
    return booking;
  };
  const writable = (id: string): Booking => {
    ctx.require("writeBookings");
    if (isRecurringId(id) || id.startsWith("demo:")) throw new DataError("validation", "This is part of a repeating block. Change the block in Availability.");
    return find(id);
  };
  const who = (b: Booking): string => customerById(ctx.bridge.read().customers, b.customerId)?.name ?? b.title ?? "Walk-in";

  return {
    async list({ from, to }) {
      await ctx.trip();
      const state = ctx.bridge.read();
      const bookings = bookingsWithBlocks(state, from, to).filter((b) => inRange(b.date, from, to));
      return { bookings, customers: state.customers };
    },

    async get(id) {
      await ctx.trip();
      const state = ctx.bridge.read();
      const booking = state.bookings.find((b) => b.id === id);
      if (!booking) throw new DataError("not-found", "This booking no longer exists. It may have been removed.");
      const customer = customerById(state.customers, booking.customerId) ?? null;
      const subject = { type: "booking" as const, id };
      const derived: ActivityEntry[] = [
        { id: `${id}:created`, at: booking.createdAt, text: booking.source === "desk" ? "Booked at the desk" : "Booked online", actor: booking.source === "desk" ? "Front desk" : (customer?.name ?? "Customer"), subject },
        ...booking.ledger.map((e) => ({ id: e.id, at: e.at, text: `${ctx.inr(e.amountPaise)} · ${e.note}`, actor: e.kind === "online" ? (customer?.name ?? "Customer") : "Front desk", subject })),
        ...(booking.cancelledAt ? [{ id: `${id}:cancelled`, at: booking.cancelledAt, text: "Cancelled", actor: "Front desk", subject }] : []),
      ];
      const logged = ctx.db.read().activity.filter((a) => a.subject.type === "booking" && a.subject.id === id);
      const activity = [...logged, ...derived.filter((d) => !logged.some((l) => l.id === d.id))].sort((a, b) => b.at - a.at);
      const tables = ctx.db.read();
      return { booking, customer, activity, checkedInAt: tables.checkIns[id] ?? null, lastReminderAt: tables.reminders[id] ?? null };
    },

    async dayCounts(month) {
      await ctx.trip();
      const from = `${month}-01` as PlainDate;
      const [year = 0, mon = 1] = month.split("-").map(Number);
      const nextMonth = (mon === 12 ? `${year + 1}-01-01` : `${year}-${String(mon + 1).padStart(2, "0")}-01`) as PlainDate;
      const to = addDays(nextMonth, -1);
      const counts: Record<PlainDate, number> = {};
      for (const b of bookingsWithBlocks(ctx.bridge.read(), from, to)) {
        if (b.kind !== "booking" || b.status === "cancelled" || b.status === "expired" || !inRange(b.date, from, to)) continue;
        counts[b.date] = (counts[b.date] ?? 0) + 1;
      }
      return counts;
    },

    async create(input) {
      await ctx.trip();
      ctx.require("writeBookings");
      const state = ctx.bridge.read();
      const now = ctx.now();
      const clash = findConflict(bookingsWithBlocks(state, input.date), input, now);
      if (clash) throw new DataError("clash", `${courtName(input.courtId)} is taken then by ${clash.kind === "booking" ? (customerById(state.customers, clash.customerId)?.name ?? "another booking") : clash.title}. Pick another court or time.`);
      if (input.payment && !ctx.viewer().can.handleMoney) ctx.require("handleMoney");
      let customer = "id" in input.customer ? customerById(state.customers, input.customer.id) : customerByPhone(state, input.customer.phone);
      const fresh = customer ? undefined : "name" in input.customer ? newCustomer(input.customer.name, input.customer.phone, now) : undefined;
      customer ??= fresh;
      if (!customer) throw new DataError("validation", "Pick a customer or enter a name and phone.", { fields: { customer: "Required" } });
      const booking: Booking = {
        id: makeId("bk"),
        courtId: input.courtId,
        date: input.date,
        startMinute: input.startMinute,
        durationMinutes: input.durationMinutes,
        customerId: customer.id,
        kind: "booking",
        title: "",
        players: 4,
        notes: input.notes,
        source: "desk",
        status: "confirmed",
        payMode: input.payment ? (input.payment.amountPaise >= priceFor(state.settings, input.date, input.startMinute, input.durationMinutes) ? "full" : "part") : "venue",
        pricePaise: priceFor(state.settings, input.date, input.startMinute, input.durationMinutes),
        holdExpiresAt: null,
        createdAt: now,
        cancelledAt: null,
        ledger: input.payment ? [{ id: makeId("le"), at: now, kind: input.payment.method, amountPaise: input.payment.amountPaise, note: input.payment.method === "cash" ? "Cash at the desk" : "Paid online at the desk" }] : [],
      };
      ctx.bridge.apply({ type: "create", booking, customer: fresh });
      ctx.log(`Booked ${courtName(booking.courtId)} for ${customer.name}`, { type: "booking", id: booking.id });
      return booking;
    },

    async update(id, patch) {
      await ctx.trip();
      const booking = writable(id);
      const next = { ...booking, ...patch };
      const repriced = patch.pricePaise !== undefined && patch.pricePaise !== booking.pricePaise;
      if (repriced) {
        ctx.require("handleMoney");
        if (!Number.isSafeInteger(patch.pricePaise) || (patch.pricePaise ?? 0) < 0) throw new DataError("validation", "Enter a price of ₹0 or more.", { fields: { price: "₹0 or more" } });
        if (!patch.priceReason?.trim()) throw new DataError("validation", "Say why the price changed; it goes in the activity log.", { fields: { priceReason: "Required" } });
      }
      const moved = patch.courtId !== undefined || patch.date !== undefined || patch.startMinute !== undefined || patch.durationMinutes !== undefined;
      if (moved) {
        const clash = findConflict(bookingsWithBlocks(ctx.bridge.read(), next.date), next, ctx.now(), id);
        if (clash) throw new DataError("clash", `${courtName(next.courtId)} is taken then by ${who(clash)}. Pick another court or time.`);
      }
      const { priceReason, ...rest } = patch;
      ctx.bridge.apply({ type: "update-booking", bookingId: id, patch: rest });
      if (moved) ctx.log(`Moved to ${courtName(next.courtId)}, ${next.date}`, { type: "booking", id });
      if (repriced && patch.pricePaise !== undefined) ctx.log(`Price changed to ${ctx.inr(patch.pricePaise)}${priceReason ? ` · ${priceReason}` : ""}`, { type: "booking", id });
      if (patch.notes !== undefined && patch.notes !== booking.notes) ctx.log("Notes updated", { type: "booking", id });
      return find(id);
    },

    async recordPayment(id, { method, amountPaise, note }) {
      await ctx.trip();
      const booking = writable(id);
      ctx.require("handleMoney");
      if (amountPaise <= 0) throw new DataError("validation", "Enter an amount above ₹0.", { fields: { amount: "Above ₹0" } });
      if (amountPaise > duePaise(booking)) throw new DataError("validation", `That's more than the ${ctx.inr(duePaise(booking))} still due.`, { fields: { amount: "Too much" } });
      const entryId = makeId("le");
      if (method === "cash") ctx.bridge.apply({ type: "record-cash", bookingId: id, amountPaise, at: ctx.now(), entryId });
      else ctx.bridge.apply({ type: "record-online", bookingId: id, amountPaise, at: ctx.now(), entryId, note: note?.trim() ? note.trim() : "Paid online at the desk" });
      ctx.log(`Recorded ${ctx.inr(amountPaise)} ${method}`, { type: "booking", id });
      return find(id);
    },

    async checkIn(id, value) {
      await ctx.trip();
      const booking = writable(id);
      if (value && (booking.kind !== "booking" || booking.status !== "confirmed")) throw new DataError("validation", "Only a confirmed booking can be checked in.");
      ctx.db.write((t) => {
        const checkIns = Object.fromEntries(Object.entries(t.checkIns).filter(([key]) => key !== id));
        return { ...t, checkIns: value ? { ...checkIns, [id]: ctx.now() } : checkIns };
      });
      ctx.log(value ? "Checked in" : "Check-in undone", { type: "booking", id });
      return find(id);
    },

    async markNoShow(id) {
      await ctx.trip();
      const booking = writable(id);
      if (bookingStart(booking) > ctx.now()) throw new DataError("validation", "It hasn't started yet. Mark a no-show once the time has passed.");
      ctx.bridge.apply({ type: "mark-no-show", bookingId: id });
      ctx.log(`Marked ${who(booking)} as a no-show`, { type: "booking", id });
      return find(id);
    },

    async cancel(id, { resolution, reason }) {
      await ctx.trip();
      const booking = writable(id);
      if (booking.status === "cancelled") throw new DataError("conflict", "This booking is already cancelled.");
      if (!reason.trim()) throw new DataError("validation", "Pick a reason for cancelling.", { fields: { reason: "Required" } });
      if (paidPaise(booking) > 0) ctx.require("refund");
      ctx.bridge.apply({ type: "cancel", bookingId: id, resolution, at: ctx.now(), entryId: makeId("le") });
      ctx.log(`Cancelled · ${reason}`, { type: "booking", id });
      return find(id);
    },

    async restore(id) {
      await ctx.trip();
      const booking = writable(id);
      const clash = findConflict(bookingsWithBlocks(ctx.bridge.read(), booking.date), booking, ctx.now(), id);
      if (clash) throw new DataError("clash", "Someone else has that court now, so it can't be put back.");
      // Credit the cancellation gave goes back onto the booking, so the money isn't counted twice.
      // A refund stays on the ledger: that money went back, so the balance is due again.
      const credit = booking.status === "cancelled" ? booking.ledger.findLast((e) => e.kind === "credit-issued") : undefined;
      const customer = customerById(ctx.bridge.read().customers, booking.customerId);
      if (credit && customer && customer.creditPaise < credit.amountPaise) {
        throw new DataError("validation", `The ${ctx.inr(credit.amountPaise)} credit from this booking has been used, so it can't be put back. Make a new booking instead.`);
      }
      ctx.bridge.apply({ type: "restore", booking: { ...booking, status: "confirmed", cancelledAt: null, ledger: credit ? booking.ledger.filter((e) => e.id !== credit.id) : booking.ledger } });
      if (credit && customer) ctx.bridge.apply({ type: "adjust-credit", customerId: customer.id, amountPaise: -credit.amountPaise });
      ctx.log(booking.status === "no-show" ? "No-show undone" : "Put back", { type: "booking", id });
      return find(id);
    },

    async sendReminder(id) {
      await ctx.trip();
      const booking = writable(id);
      const last = ctx.db.read().reminders[id];
      const now = ctx.now();
      if (last && now - last < HOUR) throw new DataError("cooldown", "A reminder went less than an hour ago.", { retryAt: last + HOUR });
      if (!booking.customerId) throw new DataError("validation", "There's no customer to remind.");
      ctx.db.write((t) => ({ ...t, reminders: { ...t.reminders, [id]: now } }));
      ctx.log("Sent a WhatsApp reminder", { type: "booking", id });
      return { sentAt: now };
    },
  };
}

export function mockAvailability(ctx: MockContext): AvailabilityApi {
  return {
    async settings() {
      await ctx.trip();
      return ctx.bridge.read().settings;
    },
    async updateSettings(settings) {
      await ctx.trip();
      ctx.require("editSettings");
      ctx.bridge.apply({ type: "update-settings", settings });
      return settings;
    },
    async closures({ from, to }) {
      await ctx.trip();
      return ctx.db.read().closures.filter((c) => inRange(c.date, from, to)).sort((a, b) => compareDates(a.date, b.date));
    },
    async addClosure(input) {
      await ctx.trip();
      ctx.require("editSettings");
      if (!input.reason.trim()) throw new DataError("validation", "Say why the venue is closed; customers see it.", { fields: { reason: "Required" } });
      if (input.startMinute !== null && (input.endMinute === null || input.endMinute <= input.startMinute)) throw new DataError("validation", "The end has to be after the start.", { fields: { endMinute: "After the start" } });
      const closure = { ...input, reason: input.reason.trim(), id: makeId("cls"), createdAt: ctx.now() };
      ctx.db.write((t) => ({ ...t, closures: [...t.closures, closure] }));
      return closure;
    },
    async removeClosure(id) {
      await ctx.trip();
      ctx.require("editSettings");
      ctx.db.write((t) => ({ ...t, closures: t.closures.filter((c) => c.id !== id) }));
    },
    async blocks() {
      await ctx.trip();
      return ctx.bridge.read().recurringBlocks;
    },
    async putBlock(block) {
      await ctx.trip();
      ctx.require("editSettings");
      ctx.bridge.apply({ type: "put-recurring-block", block });
      return block;
    },
    async removeBlock(id) {
      await ctx.trip();
      ctx.require("editSettings");
      ctx.bridge.apply({ type: "remove-recurring-block", blockId: id });
    },
  };
}

export function summarize(ctx: MockContext, customerId: string): CustomerSummary | null {
  const state = ctx.bridge.read();
  const customer = customerById(state.customers, customerId);
  if (!customer) return null;
  const mine = state.bookings.filter((b) => b.customerId === customerId && b.kind === "booking");
  const visits = mine.filter((b) => b.status === "confirmed" && bookingStart(b) <= ctx.now()).map((b) => b.date).sort(compareDates);
  const tables = ctx.db.read();
  const tags: CustomerSummary["tags"] = [];
  if (tables.memberships.some((m) => m.customerId === customerId && m.status !== "expired")) tags.push("member");
  if (tables.enrolments.some((e) => e.customerId === customerId && e.status !== "stopped")) tags.push("programme");
  if (mine.length === 0 && tags.length === 0) tags.push("lead");
  return {
    customer,
    bookings: mine.filter((b) => b.status !== "cancelled" && b.status !== "expired").length,
    spentPaise: mine.reduce((sum, b) => sum + paidPaise(b), 0),
    noShows: mine.filter((b) => b.status === "no-show").length,
    cancellations: mine.filter((b) => b.status === "cancelled").length,
    firstVisit: visits[0] ?? null,
    lastVisit: visits.at(-1) ?? null,
    tags,
  };
}

export function mockCustomers(ctx: MockContext): CustomersApi {
  return {
    async list({ filter, q }) {
      await ctx.trip();
      ctx.requireFeature("customers");
      const query = q.trim().toLowerCase();
      const digits = query.replace(/\D/g, "");
      return ctx.bridge
        .read()
        .customers.map((c) => summarize(ctx, c.id))
        .filter((s): s is CustomerSummary => s !== null)
        .filter((s) => {
          if (query && !s.customer.name.toLowerCase().includes(query) && !(digits.length >= 3 && s.customer.phone.includes(digits))) return false;
          switch (filter) {
            case "customers":
              return !s.tags.includes("lead");
            case "leads":
              return s.tags.includes("lead");
            case "pay-first":
              return s.customer.payFirst;
            case "credit":
              return s.customer.creditPaise > 0;
            default:
              return true;
          }
        })
        .sort((a, b) => (b.lastVisit ?? "").localeCompare(a.lastVisit ?? "") || a.customer.name.localeCompare(b.customer.name));
    },
    async get(id) {
      await ctx.trip();
      const summary = summarize(ctx, id);
      if (!summary) throw new DataError("not-found", "This customer no longer exists.");
      const tables = ctx.db.read();
      return {
        summary,
        bookings: ctx.bridge.read().bookings.filter((b) => b.customerId === id).sort((a, b) => bookingStart(b) - bookingStart(a)),
        enrolments: tables.enrolments.filter((e) => e.customerId === id),
        memberships: tables.memberships.filter((m) => m.customerId === id),
      };
    },
    async setFlag(id, flag, value, reason) {
      await ctx.trip();
      ctx.require("writeBookings");
      ctx.bridge.apply({ type: "set-customer-flag", customerId: id, flag, value });
      const customer = customerById(ctx.bridge.read().customers, id);
      if (!customer) throw new DataError("not-found", "This customer no longer exists.");
      ctx.log(`${value ? "Flagged" : "Cleared"} ${flag === "payFirst" ? "pay first" : "trusted"}${reason ? ` · ${reason}` : ""}`, { type: "customer", id });
      return customer;
    },
  };
}
