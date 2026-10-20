"use client";

import * as React from "react";
import type { PlainDate, Weekday } from "@/lib/plain-date";
import type { DayInfo, DayStatus } from "@/primitives/date-grid/model";

export interface DateGridChangeDetails {
  /** What chose the date: a click or a key press. */
  reason: "pointer" | "keyboard";
  event: React.SyntheticEvent | Event;
}

export interface DateGridRootContextValue {
  /** The first of the visible month. */
  month: PlainDate;
  value: PlainDate | null;
  today: PlainDate;
  locale: string | undefined;
  weekStartsOn: Weekday;
  min: PlainDate | null;
  max: PlainDate | null;
  disabled: boolean;
  /** The day that carries the grid's one tab stop. */
  tabStop: PlainDate;
  /** The day that has focus, while focus is inside the grid. */
  highlighted: PlainDate | null;
  /** Which way the last month change went, until its animation ends. */
  direction: "next" | "prev" | null;
  clearDirection: () => void;
  titleId: string;
  statusText: Readonly<Record<DayStatus, string>>;
  infoFor: (date: PlainDate) => DayInfo | undefined;
  isBlocked: (date: PlainDate) => boolean;
  select: (date: PlainDate, details: DateGridChangeDetails) => void;
  page: (step: -1 | 1) => void;
  onDayFocus: (date: PlainDate) => void;
  onDayBlur: (event: React.FocusEvent) => void;
  onDayKeyDown: (event: React.KeyboardEvent<HTMLElement>, date: PlainDate) => void;
}

export const DateGridRootContext = React.createContext<DateGridRootContextValue | null>(null);

export function useDateGridRootContext(part: string): DateGridRootContextValue {
  const context = React.useContext(DateGridRootContext);
  if (!context) throw new Error(`DateGrid.${part} must be placed inside <DateGrid.Root>.`);
  return context;
}

/** The date a Cell stands for, read by the Day inside it. */
export const DateGridCellContext = React.createContext<PlainDate | null>(null);

/** Attribute the Root reads back to find a day's button after a month change. */
export const DAY_ATTRIBUTE = "data-date";
