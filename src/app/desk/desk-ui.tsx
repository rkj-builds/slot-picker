"use client";

import * as React from "react";
import type { PlainDate } from "@/lib/plain-date";
import type { CourtId } from "@/lib/venue";

export interface NewBookingPrefill {
  courtId: CourtId;
  date: PlainDate;
  startMinute: number;
}

/** Which overlay is open on the desk. One host renders them all, so any screen can open any of them. */
export interface DeskUi {
  openBooking: (id: string) => void;
  recordCash: (id: string) => void;
  cancel: (id: string) => void;
  newBooking: (prefill: NewBookingPrefill) => void;
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
