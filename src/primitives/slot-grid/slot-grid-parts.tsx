"use client";

import { useRender } from "@base-ui/react/use-render";
import * as React from "react";
import { CELL_ATTRIBUTE, type CellMeta, GROUP_ATTRIBUTE, ROW_ATTRIBUTE, useSlotGridRootContext } from "@/primitives/slot-grid/slot-grid-context";
import { type ClassNameProp, type StyleProp, stateProps, visuallyHidden } from "@/primitives/utils";

export interface SlotGridGroupState extends Record<string, unknown> {
  /** The selected cell is in this group. */
  hasSelected: boolean;
}

export interface SlotGridGroupProps extends Omit<React.ComponentPropsWithRef<"div">, "className" | "style"> {
  render?: useRender.RenderProp<SlotGridGroupState>;
  className?: ClassNameProp<SlotGridGroupState>;
  style?: StyleProp<SlotGridGroupState>;
}

/**
 * A labelled band of cells: a period of the day (Morning, Afternoon) or a
 * court. Page Up / Page Down move between groups. Name it with `aria-label`
 * or `aria-labelledby`.
 */
export function SlotGridGroup({ render, className, style, ref, ...elementProps }: SlotGridGroupProps): React.ReactElement {
  const context = useSlotGridRootContext("Group");
  const localRef = React.useRef<HTMLDivElement | null>(null);
  const [hasSelected, setHasSelected] = React.useState(false);
  // After every commit: a cell may have moved in or out of this group. The equality check ends the chain.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useLayoutEffect(() => {
    const selected = context.value;
    const next = selected !== null && Boolean(localRef.current?.querySelector(`[${CELL_ATTRIBUTE}][data-selected]`));
    if (next !== hasSelected) setHasSelected(next);
  });
  return useRender({
    defaultTagName: "div",
    render,
    state: { hasSelected },
    stateAttributesMapping: { hasSelected: (v) => (v ? { "data-has-selected": "" } : null) },
    ref: [localRef, ref ?? null],
    props: { ...stateProps(className, style, { hasSelected }), role: "group", [GROUP_ATTRIBUTE]: "", ...elementProps },
  });
}

export interface SlotGridRowState extends Record<string, unknown> {
  orientation: "horizontal" | "vertical";
}

export interface SlotGridRowProps extends Omit<React.ComponentPropsWithRef<"div">, "className" | "style"> {
  render?: useRender.RenderProp<SlotGridRowState>;
  className?: ClassNameProp<SlotGridRowState>;
  style?: StyleProp<SlotGridRowState>;
}

/**
 * The run of cells that wraps into lines. Up / Down count the cells on its
 * first line to find the column, so a CSS grid that reflows with the
 * viewport keeps a correct keyboard model. Layout only: no role.
 */
export function SlotGridRow({ render, className, style, ref, ...elementProps }: SlotGridRowProps): React.ReactElement {
  const context = useSlotGridRootContext("Row");
  return useRender({
    defaultTagName: "div",
    render,
    state: { orientation: context.orientation },
    ...(ref ? { ref } : {}),
    props: { ...stateProps(className, style, { orientation: context.orientation }), [ROW_ATTRIBUTE]: "", ...elementProps },
  });
}

export interface SlotGridCellState extends Record<string, unknown> {
  /** This cell is the chosen value (single mode). */
  selected: boolean;
  /** Not selectable; still focusable, so it can say why. */
  disabled: boolean;
  /** This cell has focus. */
  highlighted: boolean;
  /** Why the cell cannot be chosen ("booked", "ends after closing"), if it cannot. */
  unavailableReason: string | undefined;
}

export interface SlotGridCellProps extends Omit<React.ComponentPropsWithRef<"button">, "className" | "style" | "value"> {
  /** What choosing this cell sets the grid's value to. Unique within the grid. */
  value: string;
  /** Not selectable, but stays in the keyboard path and announces `reason`. */
  disabled?: boolean;
  /** Why it is unavailable: appended to the accessible name ("7:30 pm, booked") and exposed as `data-unavailable-reason`. */
  reason?: string | undefined;
  /** The accessible name, when the visible content says more or less than it should. `reason` is appended to it. */
  label?: string | undefined;
  /** The interval the cell stands for, in any unit (minutes, epoch ms). Lets Left/Right find "the same time" in the next column. */
  start?: number | undefined;
  end?: number | undefined;
  render?: useRender.RenderProp<SlotGridCellState>;
  className?: ClassNameProp<SlotGridCellState>;
  style?: StyleProp<SlotGridCellState>;
}

/**
 * One slot. Renders a `button`; in single mode it is a radio
 * (`aria-checked`), otherwise a plain button whose click is the action.
 * Disabled cells use `aria-disabled`, never `disabled`, so focus can reach
 * them and the reason is read out.
 */
export function SlotGridCell(props: SlotGridCellProps): React.ReactElement {
  const { value, disabled: disabledProp = false, reason, label, start, end, render, className, style, ref, children, onClick, onFocus, onBlur, onKeyDown, ...elementProps } = props;
  const context = useSlotGridRootContext("Cell");
  const disabled = disabledProp || context.disabled;
  const single = context.selectionMode === "single";
  const selected = single && context.value === value;
  const highlighted = context.highlighted === value;

  // Register with the Root on every commit, so the keyboard model always reads current meta.
  const elementRef = React.useRef<HTMLElement | null>(null);
  const { register } = context;
  React.useLayoutEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    const meta: CellMeta = { value, disabled, start, end };
    return register(el, meta);
  }, [register, value, disabled, start, end]);

  const state: SlotGridCellState = { selected, disabled, highlighted, unavailableReason: reason === "" ? undefined : reason };

  const name = label !== undefined ? (reason ? `${label}, ${reason}` : label) : undefined;
  const content =
    name === undefined && reason ? (
      <>
        {children}
        <span style={visuallyHidden}>{`, ${reason}`}</span>
      </>
    ) : (
      children
    );

  return useRender({
    defaultTagName: "button",
    render,
    state,
    stateAttributesMapping: { unavailableReason: (v: unknown) => (typeof v === "string" && v ? { "data-unavailable-reason": v } : null) },
    ref: [elementRef, (ref as React.Ref<HTMLElement> | undefined) ?? null],
    props: {
      ...stateProps(className, style, state),
      type: render ? undefined : "button",
      role: single ? "radio" : undefined,
      "aria-checked": single ? selected : undefined,
      "aria-disabled": disabled || undefined,
      "aria-label": name,
      tabIndex: context.tabStop === value ? 0 : -1,
      [CELL_ATTRIBUTE]: "",
      ...elementProps,
      children: content,
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!disabled && single && !event.defaultPrevented) context.select(value, { reason: "pointer", event });
      },
      onFocus: (event: React.FocusEvent<HTMLButtonElement>) => {
        onFocus?.(event);
        context.onCellFocus(value);
      },
      onBlur: (event: React.FocusEvent<HTMLButtonElement>) => {
        onBlur?.(event);
        context.onCellBlur(event);
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented) context.onCellKeyDown(event, value);
      },
    },
  });
}
