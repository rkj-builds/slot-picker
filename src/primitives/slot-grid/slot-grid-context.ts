"use client";

import * as React from "react";
import type { SlotGridOrientation } from "@/primitives/slot-grid/navigation";

export type SlotGridSelectionMode = "single" | "none";

export interface SlotGridChangeDetails {
  /** What chose the value: a click, a key press, or arrowing onto it (selection follows focus). */
  reason: "pointer" | "keyboard" | "focus";
  event: React.SyntheticEvent | Event;
}

export interface CellMeta {
  value: string;
  disabled: boolean;
  start?: number | undefined;
  end?: number | undefined;
}

export interface SlotGridRootContextValue {
  selectionMode: SlotGridSelectionMode;
  orientation: SlotGridOrientation;
  disabled: boolean;
  /** The selected value (single mode). */
  value: string | null;
  /** The cell that carries the grid's one tab stop. */
  tabStop: string | null;
  /** The cell that has focus, while focus is inside the grid. */
  highlighted: string | null;
  select: (value: string, details: SlotGridChangeDetails) => void;
  onCellFocus: (value: string) => void;
  onCellBlur: (event: React.FocusEvent) => void;
  onCellKeyDown: (event: React.KeyboardEvent<HTMLElement>, value: string) => void;
  register: (element: Element, meta: CellMeta) => () => void;
}

export const SlotGridRootContext = React.createContext<SlotGridRootContextValue | null>(null);

export function useSlotGridRootContext(part: string): SlotGridRootContextValue {
  const context = React.useContext(SlotGridRootContext);
  if (!context) throw new Error(`SlotGrid.${part} must be placed inside <SlotGrid.Root>.`);
  return context;
}

/** Attributes the Root reads back from the DOM to find cells, groups and rows in document order. */
export const CELL_ATTRIBUTE = "data-slot-grid-cell";
export const GROUP_ATTRIBUTE = "data-slot-grid-group";
export const ROW_ATTRIBUTE = "data-slot-grid-row";
