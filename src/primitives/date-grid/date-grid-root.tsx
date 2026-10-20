"use client";

import { useDirection } from "@base-ui/react/direction-provider";
import { useRender } from "@base-ui/react/use-render";
import * as React from "react";
import { addMonths, compareDates, type PlainDate, startOfMonth, todayIn, type Weekday, weekStartsOn as localeWeekStart } from "@/lib/plain-date";
import { localTimeZone } from "@/lib/time-zone";
import { DAY_ATTRIBUTE, type DateGridChangeDetails, DateGridRootContext, type DateGridRootContextValue } from "@/primitives/date-grid/date-grid-context";
import { DEFAULT_STATUS_TEXT, type DayInfo, type DayStatus, inRange, isDateGridKey, moveDate, sameMonth } from "@/primitives/date-grid/model";
import { type ClassNameProp, type StyleProp, stateProps, useControlled } from "@/primitives/utils";

export interface DateGridRootState extends Record<string, unknown> {
  disabled: boolean;
  /** No date is chosen yet. */
  empty: boolean;
}

export interface DateGridRootProps extends Omit<React.ComponentPropsWithRef<"div">, "className" | "style" | "defaultValue" | "onChange" | "dir"> {
  /** The chosen date (controlled). `null` chooses none. */
  value?: PlainDate | null;
  /** The initially chosen date (uncontrolled). */
  defaultValue?: PlainDate | null;
  onValueChange?: (date: PlainDate, details: DateGridChangeDetails) => void;
  /** Any date in the month shown (controlled). */
  month?: PlainDate;
  /** Any date in the month shown first (uncontrolled). Default: the value's month, else today's. */
  defaultMonth?: PlainDate;
  /** Called with the first of the month whenever the grid pages. */
  onMonthChange?: (month: PlainDate) => void;
  /** Days before `min` or after `max` are shown, focusable and announced, but cannot be chosen; keys stop at them. */
  min?: PlainDate | null;
  max?: PlainDate | null;
  /** The date to mark as today. Default: today in `timeZone`. */
  today?: PlainDate;
  /** Whose today it is, when `today` is not given. Default: the viewer's zone. */
  timeZone?: string;
  locale?: string;
  /** Default: the locale's own first day (`Intl.Locale` week info). */
  weekStartsOn?: Weekday;
  /** What each day carries: a status, a label (a price), a badge, a spoken description. */
  getDayInfo?: (date: PlainDate) => DayInfo | undefined;
  /** The words appended to a day's name for each status. English by default. */
  statusText?: Partial<Record<DayStatus, string>>;
  disabled?: boolean;
  render?: useRender.RenderProp<DateGridRootState>;
  className?: ClassNameProp<DateGridRootState>;
  style?: StyleProp<DateGridRootState>;
}

/**
 * A month of dates to choose from, with its own date logic (no date-picker
 * dependency) so each day can carry what scheduling needs: whether it can be
 * booked, how full it is, a short label such as a price. Holds the value, the
 * visible month and the one tab stop; renders a `div`.
 */
export function DateGridRoot(props: DateGridRootProps): React.ReactElement {
  const {
    value: valueProp,
    defaultValue = null,
    onValueChange,
    month: monthProp,
    defaultMonth,
    onMonthChange,
    min = null,
    max = null,
    today: todayProp,
    timeZone,
    locale,
    weekStartsOn,
    getDayInfo,
    statusText: statusTextProp,
    disabled = false,
    render,
    className,
    style,
    ref,
    ...elementProps
  } = props;

  const today = React.useMemo(() => todayProp ?? todayIn(timeZone ?? localTimeZone()), [todayProp, timeZone]);
  const [value, setValue] = useControlled<PlainDate | null>(valueProp, defaultValue);
  const [monthState, setMonthState] = useControlled<PlainDate>(monthProp === undefined ? undefined : startOfMonth(monthProp), startOfMonth(defaultMonth ?? value ?? today));
  const month = startOfMonth(monthState);
  const firstDay = weekStartsOn ?? localeWeekStart(locale);
  const [focused, setFocused] = React.useState<PlainDate>(() => value ?? today);
  const [highlighted, setHighlighted] = React.useState<PlainDate | null>(null);
  const [direction, setDirection] = React.useState<"next" | "prev" | null>(null);
  const moveFocus = React.useRef(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const titleId = React.useId();
  const textDirection = useDirection();
  const statusText = React.useMemo(() => ({ ...DEFAULT_STATUS_TEXT, ...statusTextProp }), [statusTextProp]);

  // The tab stop stays inside the visible month: the focused day, else the value, else today, else the first day in range.
  const firstInMonth = min && sameMonth(min, month) && compareDates(min, month) > 0 ? min : month;
  const tabStop = sameMonth(focused, month) ? focused : value && sameMonth(value, month) ? value : sameMonth(today, month) ? today : firstInMonth;

  // After a key moved focus to another month, the grid has re-rendered with the new days: focus the target.
  React.useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    rootRef.current?.querySelector<HTMLElement>(`[${DAY_ATTRIBUTE}="${focused}"]`)?.focus();
  });

  const showMonth = React.useCallback(
    (target: PlainDate) => {
      const next = startOfMonth(target);
      const cmp = compareDates(next, month);
      if (cmp === 0) return;
      setDirection(cmp > 0 ? "next" : "prev");
      setMonthState(next);
      onMonthChange?.(next);
    },
    [month, setMonthState, onMonthChange, setDirection],
  );

  const infoFor = React.useCallback((date: PlainDate) => getDayInfo?.(date), [getDayInfo]);
  const isBlocked = React.useCallback(
    (date: PlainDate) => {
      if (disabled || !inRange(date, min, max)) return true;
      const status = getDayInfo?.(date)?.status;
      return status === "full" || status === "unavailable";
    },
    [disabled, min, max, getDayInfo],
  );

  const select = React.useCallback(
    (date: PlainDate, details: DateGridChangeDetails) => {
      if (isBlocked(date)) return;
      setFocused(date);
      if (date === value) return;
      setValue(date);
      onValueChange?.(date, details);
    },
    [isBlocked, value, setValue, onValueChange, setFocused],
  );

  const onDayKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLElement>, date: PlainDate) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select(date, { reason: "keyboard", event });
        return;
      }
      if (!isDateGridKey(event.key)) return;
      event.preventDefault();
      const next = moveDate(date, event.key, { weekStartsOn: firstDay, shiftKey: event.shiftKey, direction: textDirection, min, max });
      if (next === date) return;
      setFocused(next);
      showMonth(next);
      moveFocus.current = true;
    },
    [select, firstDay, textDirection, min, max, showMonth, setFocused],
  );

  const page = React.useCallback(
    (step: -1 | 1) => {
      showMonth(addMonths(month, step));
    },
    [month, showMonth],
  );

  const onDayFocus = React.useCallback((date: PlainDate) => {
    setFocused(date);
    setHighlighted(date);
  }, [setFocused, setHighlighted]);

  const onDayBlur = React.useCallback((event: React.FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    if (!next || !rootRef.current?.contains(next)) setHighlighted(null);
  }, [setHighlighted]);

  const clearDirection = React.useCallback(() => setDirection(null), [setDirection]);

  const context = React.useMemo<DateGridRootContextValue>(
    () => ({
      month,
      value,
      today,
      locale,
      weekStartsOn: firstDay,
      min,
      max,
      disabled,
      tabStop,
      highlighted,
      direction,
      clearDirection,
      titleId,
      statusText,
      infoFor,
      isBlocked,
      select,
      page,
      onDayFocus,
      onDayBlur,
      onDayKeyDown,
    }),
    [month, value, today, locale, firstDay, min, max, disabled, tabStop, highlighted, direction, clearDirection, titleId, statusText, infoFor, isBlocked, select, page, onDayFocus, onDayBlur, onDayKeyDown],
  );

  const state: DateGridRootState = { disabled, empty: value === null };

  const element = useRender({
    defaultTagName: "div",
    render,
    state,
    ref: [rootRef, ref ?? null],
    props: { ...stateProps(className, style, state), ...elementProps },
  });

  return <DateGridRootContext.Provider value={context}>{element}</DateGridRootContext.Provider>;
}
