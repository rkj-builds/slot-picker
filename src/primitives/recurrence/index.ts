/**
 * Recurrence: a headless weekly-rule model. Pure functions expand a rule in
 * its zone and summarise it in the reader's language; `useRecurrence` is the
 * state behind any "Repeat" editor.
 */
export {
  describeLength,
  expandRecurrence,
  formatWallRange,
  lastDate,
  matchesPattern,
  nextOccurrences,
  type Occurrence,
  occursOn,
  type RecurrenceEnd,
  type RecurrenceRule,
  type RuleProblem,
  type SummaryOptions,
  summarizeRecurrence,
  validateRule,
  WEEK,
  type Weekday,
  weekdayName,
} from "@/primitives/recurrence/rule";
export { useRecurrence, type UseRecurrenceParameters, type UseRecurrenceReturnValue } from "@/primitives/recurrence/use-recurrence";
