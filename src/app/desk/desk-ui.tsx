"use client";

import * as React from "react";
import type { PlainDate } from "@/lib/plain-date";
import type { CourtId } from "@/lib/venue";

export interface NewBookingPrefill {
  courtId: CourtId;
  date: PlainDate;
  startMinute: number;
}

/** One date of a repeating block, as clicked on the day grid. */
export interface RepeatRef {
  blockId: string;
  date: PlainDate;
}

/** Which overlay is open on the desk. One host renders them all, so any screen can open any of them. */
export interface DeskUi {
  openBooking: (id: string) => void;
  recordCash: (id: string) => void;
  cancel: (id: string) => void;
  newBooking: (prefill: NewBookingPrefill) => void;
  /** A repeating block's schedule: skip a date, end it. */
  openRepeat: (ref: RepeatRef) => void;
  /** Block courts from a date: once, or on a repeating schedule. */
  blockCourts: (date: PlainDate) => void;
  /** The booking whose Record cash / Cancel dialog is open, if any. */
  cashId: string | null;
  cancelId: string | null;
  closeCash: () => void;
  closeCancel: () => void;
}

export const DeskUiContext = React.createContext<DeskUi | null>(null);

export function useDeskUi(): DeskUi {
  const value = React.useContext(DeskUiContext);
  if (!value) throw new Error("useDeskUi must be used inside the desk");
  return value;
}

/**
 * Where a desk view puts its anchored controls: a bar anchored to the bottom
 * of the desk's main area (DeskViewFooter, Settings' save bar).
 */
export interface DeskSlots {
  footer: HTMLElement | null;
}

export const DeskSlotsContext = React.createContext<DeskSlots>({ footer: null });
