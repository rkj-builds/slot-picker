"use client";

import { useDirection } from "@base-ui/react/direction-provider";
import { useRender } from "@base-ui/react/use-render";
import * as React from "react";
import { isSlotGridKey, nextIndex, type NavigationItem, type SlotGridOrientation } from "@/primitives/slot-grid/navigation";
import {
  CELL_ATTRIBUTE,
  type CellMeta,
  GROUP_ATTRIBUTE,
  ROW_ATTRIBUTE,
  type SlotGridChangeDetails,
  SlotGridRootContext,
  type SlotGridRootContextValue,
  type SlotGridSelectionMode,
} from "@/primitives/slot-grid/slot-grid-context";
import { type ClassNameProp, type StyleProp, stateProps, useControlled } from "@/primitives/utils";

export interface SlotGridRootState extends Record<string, unknown> {
  orientation: SlotGridOrientation;
  disabled: boolean;
  /** Nothing is selected yet (single mode). */
  empty: boolean;
}

export interface SlotGridRootProps extends Omit<React.ComponentPropsWithRef<"div">, "className" | "style" | "defaultValue" | "onChange" | "dir"> {
  /** The selected cell's value (controlled). `null` selects nothing. */
  value?: string | null;
  /** The initially selected value (uncontrolled). */
  defaultValue?: string | null;
  onValueChange?: (value: string, details: SlotGridChangeDetails) => void;
  /**
   * - single (default): one value is chosen; the grid is a radiogroup and each cell a radio.
   * - none: cells are actions (open a booking, start a new one); the grid is a group of buttons.
   */
  selectionMode?: SlotGridSelectionMode;
  /** Arrowing onto an enabled cell selects it, as native radios do. Default true. */
  selectOnFocus?: boolean;
  /** Which way cells flow inside a group. Default "horizontal". */
  orientation?: SlotGridOrientation;
  /** Left/Right wrap from the last cell to the first (horizontal). Default true. */
  loop?: boolean;
  /** Columns used for Up/Down when the grid has no layout to measure (tests, SSR). Default 4. */
  columns?: number;
  /** The cell that gets the tab stop when nothing is selected. Default: the first enabled cell. */
  defaultHighlightedValue?: string | null;
  disabled?: boolean;
  render?: useRender.RenderProp<SlotGridRootState>;
  className?: ClassNameProp<SlotGridRootState>;
  style?: StyleProp<SlotGridRootState>;
}

interface Snapshot {
  elements: HTMLElement[];
  metas: CellMeta[];
  items: NavigationItem[];
}

/**
 * The grid's state and its one tab stop. It renders a `div`; every other part
 * of the grid lives inside it.
 */
export function SlotGridRoot(props: SlotGridRootProps): React.ReactElement {
  const {
    value: valueProp,
    defaultValue = null,
    onValueChange,
    selectionMode = "single",
    selectOnFocus = true,
    orientation = "horizontal",
    loop = true,
    columns = 4,
    defaultHighlightedValue = null,
    disabled = false,
    render,
    className,
    style,
    ref,
    ...elementProps
  } = props;

  const [value, setValue] = useControlled<string | null>(valueProp, defaultValue);
  const [highlighted, setHighlighted] = React.useState<string | null>(null);
  const [tabStop, setTabStop] = React.useState<string | null>(null);
  const lastFocused = React.useRef<string | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const registry = React.useRef(new Map<Element, CellMeta>());
  const direction = useDirection();

  const snapshot = React.useCallback((): Snapshot => {
    const root = rootRef.current;
    const elements = root ? Array.from(root.querySelectorAll<HTMLElement>(`[${CELL_ATTRIBUTE}]`)).filter((el) => registry.current.has(el)) : [];
    const groupIndex = new Map<Element | null, number>();
    const metas: CellMeta[] = [];
    const items: NavigationItem[] = elements.map((el) => {
      const meta = registry.current.get(el) ?? { value: "", disabled: true };
      metas.push(meta);
      const group = el.closest(`[${GROUP_ATTRIBUTE}]`);
      if (!groupIndex.has(group)) groupIndex.set(group, groupIndex.size);
      return { group: groupIndex.get(group) ?? 0, start: meta.start, end: meta.end };
    });
    return { elements, metas, items };
  }, []);

  // The roving tab stop: the focused cell, else the selected one, else the hinted one, else the first enabled, else the first.
  // Read after every commit, because cells come and go with the data; the equality check ends the chain.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useLayoutEffect(() => {
    const { metas } = snapshot();
    const has = (v: string | null): v is string => v !== null && metas.some((m) => m.value === v);
    const next =
      (has(lastFocused.current) ? lastFocused.current : null) ??
      (has(value) ? value : null) ??
      (has(defaultHighlightedValue) ? defaultHighlightedValue : null) ??
      metas.find((m) => !m.disabled)?.value ??
      metas[0]?.value ??
      null;
    if (next !== tabStop) setTabStop(next);
  });

  const select = React.useCallback(
    (next: string, details: SlotGridChangeDetails) => {
      if (selectionMode !== "single" || disabled || next === value) return;
      setValue(next);
      onValueChange?.(next, details);
    },
    [selectionMode, disabled, value, setValue, onValueChange],
  );

  const columnsAt = React.useCallback(
    (elements: HTMLElement[]) =>
      (index: number): number => {
        const el = elements[index];
        if (!el) return columns;
        // The wrapped row is the cell's Row (else its Group, else the grid): count the cells on the row's first line.
        const container = el.closest(`[${ROW_ATTRIBUTE}]`) ?? el.closest(`[${GROUP_ATTRIBUTE}]`) ?? rootRef.current;
        const peers = elements.filter((p) => (p.closest(`[${ROW_ATTRIBUTE}]`) ?? p.closest(`[${GROUP_ATTRIBUTE}]`) ?? rootRef.current) === container);
        const first = peers[0];
        if (!first || first.offsetWidth === 0) return columns;
        let count = 0;
        for (const p of peers) {
          if (p.offsetTop === first.offsetTop) count += 1;
          else break;
        }
        return Math.max(1, count);
      },
    [columns],
  );

  const onCellKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLElement>, cellValue: string) => {
      const { elements, metas, items } = snapshot();
      const current = metas.findIndex((m) => m.value === cellValue);
      if (current < 0) return;
      const meta = metas[current];

      if (selectionMode === "single" && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        if (meta && !meta.disabled) select(cellValue, { reason: "keyboard", event });
        return;
      }
      if (!isSlotGridKey(event.key)) return;
      const target = nextIndex(items, current, event.key, {
        orientation,
        loop,
        columnsAt: columnsAt(elements),
        direction,
        modifier: event.ctrlKey || event.metaKey,
      });
      event.preventDefault();
      if (target === null || target === current) return;
      const el = elements[target];
      const targetMeta = metas[target];
      if (!el || !targetMeta) return;
      lastFocused.current = targetMeta.value;
      setTabStop(targetMeta.value);
      el.focus();
      if (selectOnFocus && !targetMeta.disabled) select(targetMeta.value, { reason: "focus", event });
    },
    [snapshot, selectionMode, select, orientation, loop, columnsAt, direction, selectOnFocus],
  );

  const onCellFocus = React.useCallback((cellValue: string) => {
    lastFocused.current = cellValue;
    setHighlighted(cellValue);
    setTabStop(cellValue);
  }, []);

  const onCellBlur = React.useCallback((event: React.FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    if (!next || !rootRef.current?.contains(next)) setHighlighted(null);
  }, []);

  const register = React.useCallback((element: Element, meta: CellMeta) => {
    registry.current.set(element, meta);
    return () => {
      if (registry.current.get(element) === meta) registry.current.delete(element);
    };
  }, []);

  const context = React.useMemo<SlotGridRootContextValue>(
    () => ({ selectionMode, orientation, disabled, value, tabStop, highlighted, select, onCellFocus, onCellBlur, onCellKeyDown, register }),
    [selectionMode, orientation, disabled, value, tabStop, highlighted, select, onCellFocus, onCellBlur, onCellKeyDown, register],
  );

  const state: SlotGridRootState = { orientation, disabled, empty: value === null };

  const element = useRender({
    defaultTagName: "div",
    render,
    state,
    ref: [rootRef, ref ?? null],
    props: {
      ...stateProps(className, style, state),
      role: selectionMode === "single" ? "radiogroup" : "group",
      "aria-disabled": disabled || undefined,
      ...elementProps,
    },
  });

  return <SlotGridRootContext.Provider value={context}>{element}</SlotGridRootContext.Provider>;
}
