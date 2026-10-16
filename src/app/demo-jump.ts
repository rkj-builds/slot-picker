"use client";

import * as React from "react";
import { EMPTY_DRAFT, writeDraft } from "@/app/book/flow";
import { useClock } from "@/app/clock";
import type { DemoState } from "@/app/demo-states";
import { navigate } from "@/app/router";
import { type DemoScenarios, useStore } from "@/app/store";
import { firstFreeCourt, makeId } from "@/lib/booking";
import { bookingsWithBlocks } from "@/lib/recurring-blocks";
import type { Alternative } from "@/lib/checkout";
import type { AppState } from "@/lib/store";
import { formatPhone } from "@/lib/phone";
import { addDays, type PlainDate, todayIn, weekdayOf } from "@/lib/plain-date";
import { COURTS, VENUE, type VenueSettings } from "@/lib/venue";

/** The book page listens for this to pick up a draft written from outside the flow. */
export const DRAFT_EVENT = "demo:draft";
/** Every jump fires this just before it navigates: a screen already open starts over, so it reads its handoff. */
export const JUMP_EVENT = "demo:jump";

/** A payment outcome the jump already produced, for the pay step to open on. */
export type PayOutcome = { kind: "declined" } | { kind: "race"; alternatives: Alternative[] };
let pendingOutcome: { bookingId: string; outcome: PayOutcome } | null = null;

/** The outcome waiting for this booking, once: the pay step reads it on mount. */
export function takePayOutcome(bookingId: string): PayOutcome | null {
  if (pendingOutcome?.bookingId !== bookingId) return null;
  const { outcome } = pendingOutcome;
  pendingOutcome = null;
  return outcome;
}

let pendingSubmitted = false;
/** Whether the details step should open as if submitted once, once: the step reads it on mount. */
export function takeSubmittedDetails(): boolean {
  const submitted = pendingSubmitted;
  pendingSubmitted = false;
  return submitted;
}

let pendingSettings: Partial<VenueSettings> | null = null;
/** Edits for the settings draft to open with, unsaved, once: the settings view reads them on mount. */
export function takeUnsavedSettings(): Partial<VenueSettings> | null {
  const edits = pendingSettings;
  pendingSettings = null;
  return edits;
}

/** Drop any handoff a screen has not picked up yet (Turn all off, Reset demo data, the next jump). */
export function clearHandoffs(): void {
  pendingOutcome = null;
  pendingSubmitted = false;
  pendingSettings = null;
}

const DEMO_CUSTOMER = { name: "Asha Rao", phone: "+919876543210" };

/** The first hour from 7 am that some court has free on `date` (blocks and the demo's own presets included). */
function freeStart(state: AppState, date: PlainDate, now: number): number {
  const courts = COURTS.map((c) => c.id);
  for (let m = 7 * 60; m <= 21 * 60; m += 30) {
    if (firstFreeCourt(bookingsWithBlocks(state, date), courts, { date, startMinute: m, durationMinutes: 60 }, now)) return m;
  }
  return 7 * 60;
}

function nextWeekday(from: PlainDate): PlainDate {
  for (let i = 1; i <= 7; i += 1) if (!["sat", "sun"].includes(weekdayOf(addDays(from, i)))) return addDays(from, i);
  return addDays(from, 1);
}

function nextSaturday(from: PlainDate): PlainDate {
  for (let i = 1; i <= 7; i += 1) if (weekdayOf(addDays(from, i)) === "sat") return addDays(from, i);
  return from;
}

/**
 * Put the app in one state and open its screen: clear every demo preset,
 * switch on the state's own, set up a draft or a booking if it needs one,
 * then navigate. Everything it creates is ordinary demo data, which Reset
 * demo data clears.
 */
export function useJumpToState(): (state: DemoState) => Promise<void> {
  const store = useStore();
  const { now } = useClock();
  const { clearScenarios, setScenario, holdSlot, pay, commit, failNextLoad, state } = store;
  return React.useCallback(
    async (target: DemoState) => {
      clearScenarios();
      clearHandoffs();
      pendingSubmitted = target.opensSubmitted ?? false;
      pendingSettings = target.unsavedSettings ?? null;
      for (const [key, value] of Object.entries(target.presets ?? {})) setScenario(key as keyof DemoScenarios, value);
      const today = todayIn(VENUE.timeZone, now());
      const saturday = nextSaturday(today);
      const date = target.day === "weekend" ? saturday : target.day === "weekday" ? nextWeekday(today) : addDays(today, 1);
      const hash = target.hash.replace("{saturday}", saturday);

      if (target.hash.startsWith("#/book")) {
        let draft = { ...EMPTY_DRAFT };
        if (target.setup) {
          const { name, phone } = target.fill ?? { name: DEMO_CUSTOMER.name, phone: formatPhone(DEMO_CUSTOMER.phone).replace(/^\+91 /, "") };
          draft = { ...draft, date, startMinute: freeStart(state, date, now()), durationMinutes: 60, name, phone };
        }
        if (target.setup && target.setup !== "draft") {
          let held = await holdSlot({ courtId: null, date, startMinute: draft.startMinute ?? 7 * 60, durationMinutes: 60, players: 4, name: DEMO_CUSTOMER.name, phone: DEMO_CUSTOMER.phone, notes: "" });
          if (!held.ok && held.alternatives[0]) {
            const alt = held.alternatives[0];
            held = await holdSlot({ ...alt, courtId: alt.courtId, players: 4, name: DEMO_CUSTOMER.name, phone: DEMO_CUSTOMER.phone, notes: "" });
          }
          if (held.ok) {
            draft = { ...draft, bookingId: held.booking.id, verifiedPhone: DEMO_CUSTOMER.phone, startMinute: held.booking.startMinute };
            if (target.opensOutcome) {
              // The first attempt is the one the preset spoils: run it here so the screen opens on the result.
              const attempt = await pay(held.booking.id, "full", "upi");
              if (!attempt.ok && attempt.reason === "payment-failed") pendingOutcome = { bookingId: held.booking.id, outcome: { kind: "declined" } };
              if (!attempt.ok && attempt.reason === "slot-taken") pendingOutcome = { bookingId: held.booking.id, outcome: { kind: "race", alternatives: attempt.alternatives } };
            }
            if (target.setup !== "hold") {
              await pay(held.booking.id, "full", "upi");
              if (target.setup === "cancel-credit" || target.setup === "cancel-refund") {
                await commit({ type: "cancel", bookingId: held.booking.id, resolution: target.setup === "cancel-credit" ? "credit" : "refund", at: now(), entryId: makeId("le") });
              }
            }
          }
        }
        writeDraft(draft);
        window.dispatchEvent(new Event(DRAFT_EVENT));
      }
      window.dispatchEvent(new Event(JUMP_EVENT));
      navigate(hash.slice(1).split("?")[0] ?? "/", Object.fromEntries(new URLSearchParams(hash.split("?")[1] ?? "")));
      if (target.setup === "fail-load") failNextLoad();
    },
    [clearScenarios, setScenario, holdSlot, pay, commit, failNextLoad, now, state],
  );
}

