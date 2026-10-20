"use client";

import { useRender } from "@base-ui/react/use-render";
import * as React from "react";
import { addMonths, type PlainDate, parsePlainDate, type Weekday, weekdayOf } from "@/lib/plain-date";
import { DAY_ATTRIBUTE, DateGridCellContext, useDateGridRootContext } from "@/primitives/date-grid/date-grid-context";
import { canPage, type DayStatus, formatPlainDate, inRange, monthWeeks, sameMonth, spokenDay } from "@/primitives/date-grid/model";
import { type ClassNameProp, type StyleProp, stateProps } from "@/primitives/utils";

// --- Title ------------------------------------------------------------------------------

export interface DateGridTitleState extends Record<string, unknown> {
  /** Which way the last month change went, until its animation ends. */
  direction: "next" | "prev" | null;
}

export interface DateGridTitleProps extends Omit<React.ComponentPropsWithRef<"div">, "className" | "style"> {
  render?: useRender.RenderProp<DateGridTitleState>;
  className?: ClassNameProp<DateGridTitleState>;
  style?: StyleProp<DateGridTitleState>;
}

/**
 * The visible month, "October 2026", in the locale. It names the grid and is
 * a polite live region, so paging is announced. Children replace the text.
 */
export function DateGridTitle({ render, className, style, children, ...elementProps }: DateGridTitleProps): React.ReactElement {
  const context = useDateGridRootContext("Title");
  const state: DateGridTitleState = { direction: context.direction };
  return useRender({
    defaultTagName: "div",
    render,
    state,
    props: {
      ...stateProps(className, style, state),
      id: context.titleId,
      "aria-live": "polite",
      ...elementProps,
      children: children ?? formatPlainDate(context.month, context.locale, { month: "long", year: "numeric" }),
    },
  });
}

// --- Previous / next month ------------------------------------------------------------

export interface DateGridPageButtonState extends Record<string, unknown> {
  /** Paging would leave [min, max]. */
  disabled: boolean;
}

export interface DateGridPageButtonProps extends Omit<React.ComponentPropsWithRef<"button">, "className" | "style"> {
  render?: useRender.RenderProp<DateGridPageButtonState>;
  className?: ClassNameProp<DateGridPageButtonState>;
  style?: StyleProp<DateGridPageButtonState>;
}

function usePageButton(step: -1 | 1, part: string, { render, className, style, onClick, ...elementProps }: DateGridPageButtonProps): React.ReactElement {
  const context = useDateGridRootContext(part);
  const disabled = context.disabled || !canPage(context.month, step, context.min, context.max);
  const target = formatPlainDate(addMonths(context.month, step), context.locale, { month: "long", year: "numeric" });
  const state: DateGridPageButtonState = { disabled };
  return useRender({
    defaultTagName: "button",
    render,
    state,
    props: {
      ...stateProps(className, style, state),
      type: render ? undefined : "button",
      "aria-label": `${step < 0 ? "Previous" : "Next"} month, ${target}`,
      disabled,
      ...elementProps,
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented && !disabled) context.page(step);
      },
    },
  });
}

/** Shows the month before. Named "Previous month, September 2026"; disabled when it would pass `min`. */
export function DateGridPreviousMonth(props: DateGridPageButtonProps): React.ReactElement {
  return usePageButton(-1, "PreviousMonth", props);
}

/** Shows the month after. Named "Next month, November 2026"; disabled when it would pass `max`. */
export function DateGridNextMonth(props: DateGridPageButtonProps): React.ReactElement {
  return usePageButton(1, "NextMonth", props);
}

// --- Grid -----------------------------------------------------------------------------

export interface DateGridGridState extends Record<string, unknown> {
  /** Which way the month just changed, until `animationend`: style a slide from it, under motion-safe only. */
  direction: "next" | "prev" | null;
  /** Some day this month has a label or badge: cells need room for a second line. */
  labelled: boolean;
}

export interface DateGridGridProps extends Omit<React.ComponentPropsWithRef<"table">, "className" | "style"> {
  render?: useRender.RenderProp<DateGridGridState>;
  className?: ClassNameProp<DateGridGridState>;
  style?: StyleProp<DateGridGridState>;
}

/**
 * The month as a WAI-ARIA grid: a `table` with `role="grid"`, named by the
 * Title unless given an `aria-label`. It is re-mounted on every month change,
 * so a CSS animation keyed on `data-direction` replays.
 */
export function DateGridGrid({ render, className, style, onAnimationEnd, ...elementProps }: DateGridGridProps): React.ReactElement {
  const context = useDateGridRootContext("Grid");
  const labelled = monthWeeks(context.month, context.weekStartsOn)
    .flat()
    .some((d) => {
      if (!sameMonth(d, context.month)) return false;
      const info = context.infoFor(d);
      return Boolean(info?.label) || Boolean(info?.badge);
    });
  const state: DateGridGridState = { direction: context.direction, labelled };
  const element = useRender({
    defaultTagName: "table",
    render,
    state,
    props: {
      ...stateProps(className, style, state),
      role: "grid",
      "aria-labelledby": elementProps["aria-label"] ? undefined : context.titleId,
      ...elementProps,
      onAnimationEnd: (event: React.AnimationEvent<HTMLTableElement>) => {
        onAnimationEnd?.(event);
        context.clearDirection();
      },
    },
  });
  return <React.Fragment key={context.month}>{element}</React.Fragment>;
}

// --- Head -----------------------------------------------------------------------------

export interface DateGridWeekday {
  day: Weekday;
  /** "Mon", in the locale. */
  short: string;
  /** "Monday": the header's `abbr`, which screen readers read for the column. */
  long: string;
}

export interface DateGridHeadProps extends Omit<React.ComponentPropsWithRef<"thead">, "children"> {
  /** One header cell per weekday, in the week's order. Default: a plain `HeadCell`. */
  children?: (weekday: DateGridWeekday) => React.ReactNode;
}

/** The weekday names, starting on the locale's (or `weekStartsOn`'s) first day. */
export function DateGridHead({ children, ...elementProps }: DateGridHeadProps): React.ReactElement {
  const context = useDateGridRootContext("Head");
  const week = monthWeeks(context.month, context.weekStartsOn)[0] ?? [];
  const weekdays: DateGridWeekday[] = week.map((d) => ({
    day: weekdayOf(d),
    short: formatPlainDate(d, context.locale, { weekday: "short" }),
    long: formatPlainDate(d, context.locale, { weekday: "long" }),
  }));
  return (
    <thead {...elementProps}>
      <tr>{weekdays.map((w) => (children ? <React.Fragment key={w.day}>{children(w)}</React.Fragment> : <DateGridHeadCell key={w.day} weekday={w} />))}</tr>
    </thead>
  );
}

export interface DateGridHeadCellProps extends Omit<React.ComponentPropsWithRef<"th">, "className" | "style"> {
  weekday: DateGridWeekday;
  render?: useRender.RenderProp<DateGridWeekday & Record<string, unknown>>;
  className?: ClassNameProp<DateGridWeekday & Record<string, unknown>>;
  style?: StyleProp<DateGridWeekday & Record<string, unknown>>;
}

/** A column header: the short name shown, the long name in `abbr`. */
export function DateGridHeadCell({ weekday, render, className, style, children, ...elementProps }: DateGridHeadCellProps): React.ReactElement {
  const state = { ...weekday };
  return useRender({
    defaultTagName: "th",
    render,
    state,
    stateAttributesMapping: { day: (v: unknown) => ({ "data-weekday": String(v) }), short: () => null, long: () => null },
    props: { ...stateProps(className, style, state), scope: "col", abbr: weekday.long, ...elementProps, children: children ?? weekday.short },
  });
}

// --- Body -----------------------------------------------------------------------------

export interface DateGridBodyProps extends Omit<React.ComponentPropsWithRef<"tbody">, "children"> {
  /** One cell per date in the visible month. Days outside it are empty grid cells, so the grid keeps six even rows. */
  children?: (date: PlainDate) => React.ReactNode;
  /** Props for the empty cells either side of the month. */
  outsideCellProps?: React.ComponentProps<"td">;
}

/** Six weeks of the month, always six rows, so the grid never changes height. */
export function DateGridBody({ children, outsideCellProps, ...elementProps }: DateGridBodyProps): React.ReactElement {
  const context = useDateGridRootContext("Body");
  const weeks = monthWeeks(context.month, context.weekStartsOn);
  return (
    <tbody {...elementProps}>
      {weeks.map((week) => (
        <tr key={week[0]}>
          {week.map((d) =>
            sameMonth(d, context.month) ? (
              <React.Fragment key={d}>
                {children ? (
                  children(d)
                ) : (
                  <DateGridCell date={d}>
                    <DateGridDay />
                  </DateGridCell>
                )}
              </React.Fragment>
            ) : (
              <td data-outside-month="" key={d} role="gridcell" {...outsideCellProps} />
            ),
          )}
        </tr>
      ))}
    </tbody>
  );
}

// --- Cell and Day ---------------------------------------------------------------------

export interface DateGridDayState extends Record<string, unknown> {
  date: PlainDate;
  /** The chosen date. */
  selected: boolean;
  /** Cannot be chosen (outside [min, max], full, unavailable, or the grid is disabled); still focusable. */
  disabled: boolean;
  today: boolean;
  status: DayStatus;
  /** This day has focus. */
  highlighted: boolean;
  /** Before `min` or after `max`. */
  outsideRange: boolean;
  label: string | undefined;
  badge: string | undefined;
}

function useDayState(date: PlainDate): DateGridDayState {
  const context = useDateGridRootContext("Day");
  const info = context.infoFor(date);
  return {
    date,
    selected: context.value === date,
    disabled: context.isBlocked(date),
    today: context.today === date,
    status: info?.status ?? "available",
    highlighted: context.highlighted === date,
    outsideRange: !inRange(date, context.min, context.max),
    label: info?.label,
    badge: info?.badge,
  };
}

const DAY_STATE_ATTRIBUTES = {
  date: () => null,
  label: () => null,
  badge: () => null,
  status: (v: unknown) => ({ "data-status": String(v) }),
  outsideRange: (v: unknown) => (v ? { "data-outside-range": "" } : null),
} as const;

export interface DateGridCellProps extends Omit<React.ComponentPropsWithRef<"td">, "className" | "style" | "children"> {
  date: PlainDate;
  /** The Day, and anything drawn beside it (a price under the number). A function receives the day's state. */
  children?: React.ReactNode | ((state: DateGridDayState) => React.ReactNode);
  render?: useRender.RenderProp<DateGridDayState>;
  className?: ClassNameProp<DateGridDayState>;
  style?: StyleProp<DateGridDayState>;
}

/** A `gridcell` for one date, with `aria-selected`. Carries the date for the Day inside it. */
export function DateGridCell({ date, render, className, style, children, ...elementProps }: DateGridCellProps): React.ReactElement {
  const state = useDayState(date);
  const element = useRender({
    defaultTagName: "td",
    render,
    state,
    stateAttributesMapping: DAY_STATE_ATTRIBUTES,
    props: {
      ...stateProps(className, style, state),
      role: "gridcell",
      "aria-selected": state.selected,
      ...elementProps,
      children: typeof children === "function" ? children(state) : children,
    },
  });
  return <DateGridCellContext.Provider value={date}>{element}</DateGridCellContext.Provider>;
}

export interface DateGridDayProps extends Omit<React.ComponentPropsWithRef<"button">, "className" | "style" | "children"> {
  /** What the button shows. Default: the day of the month. Keep it to the number, so the visible text matches the name. */
  children?: React.ReactNode | ((state: DateGridDayState) => React.ReactNode);
  render?: useRender.RenderProp<DateGridDayState>;
  className?: ClassNameProp<DateGridDayState>;
  style?: StyleProp<DateGridDayState>;
}

/**
 * The day's button: the grid's roving tab stop, the keyboard model, and its
 * whole spoken name ("Saturday, 31 October 2026, today, ₹800, few times left").
 * A blocked day uses `aria-disabled`, never `disabled`, so it can still be
 * reached and read.
 */
export function DateGridDay({ render, className, style, children, onClick, onFocus, onBlur, onKeyDown, ...elementProps }: DateGridDayProps): React.ReactElement {
  const context = useDateGridRootContext("Day");
  const date = React.useContext(DateGridCellContext);
  if (date === null) throw new Error("DateGrid.Day must be placed inside <DateGrid.Cell>.");
  const state = useDayState(date);
  const info = context.infoFor(date);
  const name = spokenDay(date, { locale: context.locale, isToday: state.today, info, inside: !state.outsideRange, statusText: context.statusText });
  return useRender({
    defaultTagName: "button",
    render,
    state,
    stateAttributesMapping: DAY_STATE_ATTRIBUTES,
    props: {
      ...stateProps(className, style, state),
      type: render ? undefined : "button",
      "aria-label": name,
      "aria-current": state.today ? "date" : undefined,
      "aria-disabled": state.disabled || undefined,
      tabIndex: context.tabStop === date ? 0 : -1,
      [DAY_ATTRIBUTE]: date,
      ...elementProps,
      children: typeof children === "function" ? children(state) : (children ?? parsePlainDate(date).day),
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) context.select(date, { reason: "pointer", event });
      },
      onFocus: (event: React.FocusEvent<HTMLButtonElement>) => {
        onFocus?.(event);
        context.onDayFocus(date);
      },
      onBlur: (event: React.FocusEvent<HTMLButtonElement>) => {
        onBlur?.(event);
        context.onDayBlur(event);
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented) context.onDayKeyDown(event, date);
      },
    },
  });
}
