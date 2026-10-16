/**
 * Weekly recurrence, as pure functions. The shape is RFC 5545's weekly RRULE
 * (FREQ=WEEKLY;INTERVAL;BYDAY;UNTIL|COUNT, plus EXDATE), cut down to what a
 * venue actually repeats: the same wall-clock hours on chosen weekdays.
 *
 * Times are a wall clock in the rule's zone (the venue's), never instants:
 * "4 – 5 pm in Kolkata" stays 4 – 5 pm on every date, and each occurrence
 * becomes an instant only when it is expanded. That is what makes a viewer in
 * New York see the same block move from 6:30 to 5:30 am across 1 November
 * while the venue's clock never changes.
 */
import { formatDuration } from "@/lib/duration";
import { addDays, compareDates, type PlainDate, parsePlainDate, type Weekday, weekdayOf } from "@/lib/plain-date";
import { instantAt } from "@/lib/time-zone";

export type { Weekday };

/** Monday first, as RFC 5545's default week start (WKST=MO) and ISO 8601. */
export const WEEK: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export type RecurrenceEnd = { type: "never" } | { type: "until"; date: PlainDate } | { type: "count"; count: number };

export interface RecurrenceRule {
  /** Every `interval` weeks (INTERVAL). At least 1. */
  interval: number;
  /** The days it happens on (BYDAY). */
  weekdays: readonly Weekday[];
  /** The first date it may happen on (DTSTART's date). */
  startDate: PlainDate;
  /** Wall-clock minutes from midnight in `timeZone`. */
  startMinute: number;
  endMinute: number;
  /** The zone the wall clock belongs to: the venue's. */
  timeZone: string;
  end: RecurrenceEnd;
  /** Dates skipped (EXDATE). Per RFC 5545 they are removed after COUNT is applied. */
  exceptions: readonly PlainDate[];
}

export interface Occurrence {
  date: PlainDate;
  /** Epoch milliseconds. */
  start: number;
  end: number;
}

export type RuleProblem = "no-weekdays" | "bad-interval" | "ends-before-it-starts" | "until-before-start" | "bad-count";

/** What is wrong with a rule, if anything. An editor shows these; expansion of a broken rule returns nothing. */
export function validateRule(rule: RecurrenceRule): RuleProblem[] {
  const problems: RuleProblem[] = [];
  if (rule.weekdays.length === 0) problems.push("no-weekdays");
  if (!Number.isInteger(rule.interval) || rule.interval < 1) problems.push("bad-interval");
  if (rule.endMinute <= rule.startMinute) problems.push("ends-before-it-starts");
  if (rule.end.type === "until" && compareDates(rule.end.date, rule.startDate) < 0) problems.push("until-before-start");
  if (rule.end.type === "count" && (!Number.isInteger(rule.end.count) || rule.end.count < 1)) problems.push("bad-count");
  return problems;
}

function daysBetween(a: PlainDate, b: PlainDate): number {
  const pa = parsePlainDate(a);
  const pb = parsePlainDate(b);
  return Math.round((Date.UTC(pb.year, pb.month - 1, pb.day) - Date.UTC(pa.year, pa.month - 1, pa.day)) / 86_400_000);
}

function mondayOf(date: PlainDate): PlainDate {
  return addDays(date, -WEEK.indexOf(weekdayOf(date)));
}

/** The instant a wall-clock minute (which may be 24:00) happens on `date` in `timeZone`. */
function instantOf(date: PlainDate, minute: number, timeZone: string): number {
  return instantAt(addDays(date, Math.floor(minute / 1440)), minute % 1440, timeZone);
}

/** Whether `date` is one of the rule's dates, ignoring its end and exceptions. */
export function matchesPattern(rule: RecurrenceRule, date: PlainDate): boolean {
  if (compareDates(date, rule.startDate) < 0 || !rule.weekdays.includes(weekdayOf(date))) return false;
  const week = Math.floor(daysBetween(mondayOf(rule.startDate), date) / 7);
  return week % Math.max(1, rule.interval) === 0;
}

/**
 * Every occurrence whose date falls in [from, to] (venue calendar dates,
 * inclusive), in order. A broken rule has none.
 */
export function expandRecurrence(rule: RecurrenceRule, range: { from: PlainDate; to: PlainDate }, limit = 1000): Occurrence[] {
  if (validateRule(rule).length > 0 || compareDates(range.to, range.from) < 0) return [];
  const out: Occurrence[] = [];
  const skipped = new Set(rule.exceptions);
  const last = rule.end.type === "until" && compareDates(rule.end.date, range.to) < 0 ? rule.end.date : range.to;
  // COUNT is counted from the start; otherwise jump straight to the window.
  let cursor = rule.end.type === "count" || compareDates(range.from, rule.startDate) < 0 ? rule.startDate : range.from;
  let counted = 0;
  while (compareDates(cursor, last) <= 0 && out.length < limit) {
    if (matchesPattern(rule, cursor)) {
      counted += 1;
      if (rule.end.type === "count" && counted > rule.end.count) break;
      if (compareDates(cursor, range.from) >= 0 && !skipped.has(cursor)) {
        out.push({ date: cursor, start: instantOf(cursor, rule.startMinute, rule.timeZone), end: instantOf(cursor, rule.endMinute, rule.timeZone) });
      }
    }
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** The next `count` occurrences on or after `from`. */
export function nextOccurrences(rule: RecurrenceRule, from: PlainDate, count: number): Occurrence[] {
  // A weekly rule with an interval of n weeks repeats within n weeks; a year is ample headroom.
  return expandRecurrence(rule, { from, to: addDays(from, Math.max(366, rule.interval * 7 * (count + 1))) }, count);
}

/** Does the rule have an occurrence on `date`? */
export function occursOn(rule: RecurrenceRule, date: PlainDate): boolean {
  return expandRecurrence(rule, { from: date, to: date }).length > 0;
}

/** The last date the rule can occur on, if it ends. */
export function lastDate(rule: RecurrenceRule): PlainDate | null {
  if (rule.end.type === "never") return null;
  if (rule.end.type === "until") return rule.end.date;
  const all = expandRecurrence({ ...rule, exceptions: [] }, { from: rule.startDate, to: addDays(rule.startDate, rule.end.count * rule.interval * 7 + 7) });
  return all.at(-1)?.date ?? null;
}

// --- Summary --------------------------------------------------------------------------

interface Messages {
  /** Weekday names: "short" reads "Sat and Sun" in English; French reads better long. */
  weekdayWidth: "short" | "long";
  everyDay: string;
  every: (days: string) => string;
  everyNWeeks: (n: string, days: string) => string;
  until: (date: string) => string;
  times: (n: number, formatted: string, plural: Intl.LDMLPluralRule) => string;
  except: (dates: string) => string;
}

const ENGLISH: Messages = {
  weekdayWidth: "short",
  everyDay: "Every day",
  every: (days) => `Every ${days}`,
  everyNWeeks: (n, days) => `Every ${n} weeks on ${days}`,
  until: (date) => `until ${date}`,
  times: (n, formatted, plural) => (n === 1 ? "once" : plural === "one" ? `${formatted} time` : `${formatted} times`),
  except: (dates) => `except ${dates}`,
};

const MESSAGES: Record<string, Messages> = {
  en: ENGLISH,
  fr: {
    weekdayWidth: "long",
    everyDay: "Tous les jours",
    every: (days) => `Chaque ${days}`,
    everyNWeeks: (n, days) => `Toutes les ${n} semaines, ${days}`,
    until: (date) => `jusqu’au ${date}`,
    times: (_n, formatted) => `${formatted} fois`,
    except: (dates) => `sauf le ${dates}`,
  },
};

function messagesFor(locale: string | undefined): Messages {
  const language = new Intl.Locale(locale ?? new Intl.DateTimeFormat().resolvedOptions().locale).language;
  return MESSAGES[language] ?? ENGLISH;
}

/** Weekday names in the locale, from a known Monday (1 Jan 2024), so no translation table is needed. */
export function weekdayName(day: Weekday, locale: string | undefined, width: "short" | "long" | "narrow" = "short"): string {
  const monday = Date.UTC(2024, 0, 1);
  return new Intl.DateTimeFormat(locale, { weekday: width, timeZone: "UTC" }).format(monday + WEEK.indexOf(day) * 86_400_000);
}

/**
 * "4 – 5 pm" (en-IN), "4:30 – 6:00 pm", "16:00 – 17:00" (fr): a wall-clock range in `timeZone`.
 * On a 12-hour clock a range on the hour drops its ":00"; a 24-hour clock keeps the minutes,
 * because "16 – 17" alone does not read as a time.
 */
export function formatWallRange(startMinute: number, endMinute: number, locale: string | undefined, timeZone: string, date: PlainDate = "2026-01-05"): string {
  const formatter = new Intl.DateTimeFormat(locale, { timeZone, hour: "numeric", minute: "2-digit" });
  const twelveHour = ["h11", "h12"].includes(formatter.resolvedOptions().hourCycle ?? "");
  const text = formatter.formatRange(instantOf(date, startMinute, timeZone), instantOf(date, endMinute, timeZone)).replace(/\s*[–-]\s*/, " – ");
  return twelveHour && startMinute % 60 === 0 && endMinute % 60 === 0 ? text.replaceAll(":00", "") : text;
}

function formatDate(date: PlainDate, locale: string | undefined, withYear: boolean): string {
  const { year, month, day } = parsePlainDate(date);
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" }).format(Date.UTC(year, month - 1, day));
}

export interface SummaryOptions {
  /** Add the year to end and exception dates when it differs from this date's year (default: the rule's start). */
  relativeTo?: PlainDate;
  /** Leave out the exceptions. */
  omitExceptions?: boolean;
}

/**
 * The rule in one line, in the reader's language:
 * en-IN "Every Sat and Sun, 4 – 5 pm, until 30 Nov"; fr "Chaque samedi et dimanche, 16 – 17 h, jusqu’au 30 nov."
 * Only `Intl` formats the parts (weekday names, list joining, times, dates, plurals);
 * the few connecting words come from a two-language table with English as the fallback.
 */
export function summarizeRecurrence(rule: RecurrenceRule, locale?: string, options: SummaryOptions = {}): string {
  const m = messagesFor(locale);
  const days = WEEK.filter((d) => rule.weekdays.includes(d));
  const list = new Intl.ListFormat(locale, { type: "conjunction" });
  const names = list.format(days.map((d) => weekdayName(d, locale, m.weekdayWidth)));
  const n = new Intl.NumberFormat(locale).format(rule.interval);
  const head = rule.interval > 1 ? m.everyNWeeks(n, names) : days.length === 7 ? m.everyDay : m.every(names);
  const parts = [head, formatWallRange(rule.startMinute, rule.endMinute, locale, rule.timeZone, rule.startDate)];

  const yearOf = (d: PlainDate): number => parsePlainDate(d).year;
  const relativeYear = yearOf(options.relativeTo ?? rule.startDate);
  if (rule.end.type === "until") parts.push(m.until(formatDate(rule.end.date, locale, yearOf(rule.end.date) !== relativeYear)));
  if (rule.end.type === "count") {
    const plural = new Intl.PluralRules(locale).select(rule.end.count);
    parts.push(m.times(rule.end.count, new Intl.NumberFormat(locale).format(rule.end.count), plural));
  }
  if (!options.omitExceptions && rule.exceptions.length > 0) {
    const sorted = [...rule.exceptions].sort(compareDates);
    parts.push(m.except(list.format(sorted.map((d) => formatDate(d, locale, yearOf(d) !== relativeYear)))));
  }
  return parts.join(", ");
}

/** How long each occurrence lasts, never as a decimal: "1 hour 30 minutes". */
export function describeLength(rule: Pick<RecurrenceRule, "startMinute" | "endMinute">, locale?: string): string {
  return formatDuration(Math.max(0, rule.endMinute - rule.startMinute), { locale });
}
