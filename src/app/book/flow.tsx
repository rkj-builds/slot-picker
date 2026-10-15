"use client";

/**
 * The booking flow's draft: what the customer has chosen so far, kept in
 * sessionStorage so a reload (or a shared step link) picks up where it was.
 * The step in the URL is a request; the flow decides how far it may go.
 */
import * as React from "react";
import type { Booking } from "@/lib/booking";
import type { PlainDate } from "@/lib/plain-date";
import type { CourtId } from "@/lib/venue";

export const STEPS = [
  { id: "court", label: "Court", title: "Pick a court" },
  { id: "when", label: "When", title: "Pick a time" },
  { id: "you", label: "You", title: "Your details" },
  { id: "pay", label: "Pay", title: "Hold and pay" },
  { id: "done", label: "Done", title: "You are booked" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export function stepIndex(id: StepId): number {
  return STEPS.findIndex((s) => s.id === id);
}

export function isStepId(value: string | undefined): value is StepId {
  return STEPS.some((s) => s.id === value);
}

export interface Draft {
  courtId: CourtId | "any";
  players: number;
  date: PlainDate | null;
  startMinute: number | null;
  durationMinutes: number;
  name: string;
  phone: string;
  notes: string;
  /** The number (E.164) whose WhatsApp code was entered this visit, so it is asked once. */
  verifiedPhone: string;
  /** The held (then confirmed) booking, once there is one. */
  bookingId: string | null;
}

export const EMPTY_DRAFT: Draft = {
  courtId: "any",
  players: 4,
  date: null,
  startMinute: null,
  durationMinutes: 60,
  name: "",
  phone: "",
  notes: "",
  verifiedPhone: "",
  bookingId: null,
};

const DRAFT_KEY = "project-831:draft";

export function readDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<Draft>) } : EMPTY_DRAFT;
  } catch {
    return EMPTY_DRAFT;
  }
}

export function writeDraft(draft: Draft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage may be blocked; the flow still works for this visit */
  }
}

/** The furthest step this draft and booking allow. */
export function furthestStep(draft: Draft, booking: Booking | undefined): StepId {
  if (booking && (booking.status === "confirmed" || booking.status === "cancelled")) return "done";
  if (booking && (booking.status === "held" || booking.status === "expired")) return "pay";
  if (draft.date !== null && draft.startMinute !== null) return "you";
  return "when";
}

interface FlowValue {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  goTo: (step: StepId) => void;
  booking: Booking | undefined;
}

export const FlowContext = React.createContext<FlowValue | null>(null);

export function useFlow(): FlowValue {
  const value = React.useContext(FlowContext);
  if (!value) throw new Error("useFlow must be used inside the booking flow");
  return value;
}
