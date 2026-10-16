"use client";

import * as React from "react";
import type { PlainDate } from "@/lib/plain-date";
import {
  expandRecurrence,
  nextOccurrences,
  type Occurrence,
  type RecurrenceEnd,
  type RecurrenceRule,
  type RuleProblem,
  summarizeRecurrence,
  validateRule,
  WEEK,
  type Weekday,
} from "@/primitives/recurrence/rule";
import { useControlled } from "@/primitives/utils";

export interface UseRecurrenceParameters {
  /** The rule (controlled). */
  value?: RecurrenceRule;
  /** The starting rule (uncontrolled). */
  defaultValue: RecurrenceRule;
  onValueChange?: (rule: RecurrenceRule) => void;
  /** For the summary and anything formatted. */
  locale?: string;
}

export interface UseRecurrenceReturnValue {
  rule: RecurrenceRule;
  problems: RuleProblem[];
  valid: boolean;
  /** "Every Sat and Sun, 4 – 5 pm, until 30 Nov" */
  summary: string;
  setRule: (patch: Partial<RecurrenceRule>) => void;
  toggleWeekday: (day: Weekday) => void;
  setInterval: (weeks: number) => void;
  setTimes: (startMinute: number, endMinute: number) => void;
  setEnd: (end: RecurrenceEnd) => void;
  /** Skip a date, or bring a skipped one back. */
  toggleException: (date: PlainDate) => void;
  expand: (range: { from: PlainDate; to: PlainDate }) => Occurrence[];
  next: (from: PlainDate, count: number) => Occurrence[];
  /** Props for a native checkbox per weekday: the bare, unstyled editor needs nothing else. */
  getWeekdayProps: (day: Weekday) => { type: "checkbox"; checked: boolean; onChange: () => void; value: Weekday };
}

/**
 * The headless model behind a "Repeat" editor: the rule, edits that keep it
 * well formed, validation, the summary and the expansion. No markup: the
 * same hook drives plain HTML inputs and coss's ToggleGroup / NumberField /
 * Select / Calendar.
 */
export function useRecurrence({ value, defaultValue, onValueChange, locale }: UseRecurrenceParameters): UseRecurrenceReturnValue {
  const [rule, setInner] = useControlled<RecurrenceRule>(value, defaultValue);
  // The latest rule for edits made in one event (toggle two days before a re-render).
  const ruleRef = React.useRef(rule);
  React.useLayoutEffect(() => {
    ruleRef.current = rule;
  }, [rule]);

  const setRule = React.useCallback(
    (patch: Partial<RecurrenceRule>) => {
      const next = { ...ruleRef.current, ...patch };
      ruleRef.current = next;
      setInner(next);
      onValueChange?.(next);
    },
    [setInner, onValueChange],
  );

  const problems = React.useMemo(() => validateRule(rule), [rule]);
  const summary = React.useMemo(() => summarizeRecurrence(rule, locale), [rule, locale]);

  return {
    rule,
    problems,
    valid: problems.length === 0,
    summary,
    setRule,
    toggleWeekday: (day) => {
      const has = ruleRef.current.weekdays.includes(day);
      setRule({ weekdays: WEEK.filter((d) => (d === day ? !has : ruleRef.current.weekdays.includes(d))) });
    },
    setInterval: (weeks) => setRule({ interval: Math.max(1, Math.round(weeks)) }),
    setTimes: (startMinute, endMinute) => setRule({ startMinute, endMinute }),
    setEnd: (end) => setRule({ end }),
    toggleException: (date) => {
      const list = ruleRef.current.exceptions;
      setRule({ exceptions: list.includes(date) ? list.filter((d) => d !== date) : [...list, date] });
    },
    expand: (range) => expandRecurrence(rule, range),
    next: (from, count) => nextOccurrences(rule, from, count),
    getWeekdayProps: (day) => ({
      type: "checkbox",
      checked: rule.weekdays.includes(day),
      onChange: () => {
        const has = ruleRef.current.weekdays.includes(day);
        setRule({ weekdays: WEEK.filter((d) => (d === day ? !has : ruleRef.current.weekdays.includes(d))) });
      },
      value: day,
    }),
  };
}
