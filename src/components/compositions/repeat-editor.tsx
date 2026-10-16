"use client";

import { CalendarIcon, RepeatIcon } from "lucide-react";
import * as React from "react";
import { LazyCalendar } from "@/components/booking/lazy-calendar";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { Label } from "@/components/ui/label";
import { NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput } from "@/components/ui/number-field";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem, ToggleGroupSeparator } from "@/components/ui/toggle-group";
import { formatDay, formatDayLong } from "@/lib/format";
import { addDays, fromLocalDate, type PlainDate, toLocalDate } from "@/lib/plain-date";
import { cn } from "@/lib/utils";
import { describeLength, formatWallRange, type RecurrenceEnd, type RecurrenceRule, useRecurrence, WEEK, weekdayName } from "@/primitives/recurrence";

export interface RepeatEditorProps {
  value: RecurrenceRule;
  onValueChange: (rule: RecurrenceRule) => void;
  locale?: string;
  /** Start times offered, in minutes from midnight (the venue's opening hours, by the half hour). */
  times?: readonly number[];
  /** How many upcoming dates to list, each skippable. 0 hides the list. */
  preview?: number;
  /** Only the hours: for a one-off block that uses the same editor. */
  timesOnly?: boolean;
  className?: string;
}

const PROBLEM_TEXT = {
  "no-weekdays": "Pick at least one day.",
  "ends-before-it-starts": "The end time must be after the start time.",
  "until-before-start": "The last date is before the first.",
  "bad-count": "Repeat at least once.",
  "bad-interval": "Repeat at least every week.",
} as const;

const DEFAULT_TIMES = Array.from({ length: 35 }, (_, i) => 6 * 60 + i * 30);

/**
 * "Repeat": the Recurrence primitive's `useRecurrence` model, composed from
 * coss parts. Days are a multiple ToggleGroup, the interval a NumberField,
 * the hours two Selects, the end a RadioGroup with a Calendar or a count,
 * and the next dates can be skipped one by one (exceptions). The summary
 * line reads the rule back as a sentence.
 */
export function RepeatEditor({ value, onValueChange, locale = "en-IN", times = DEFAULT_TIMES, preview = 4, timesOnly = false, className }: RepeatEditorProps): React.ReactElement {
  const r = useRecurrence({ value, defaultValue: value, onValueChange, locale });
  const { rule } = r;
  const id = React.useId();
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const timeLabel = (minute: number): string => formatWallRange(minute, minute, locale, rule.timeZone).split(" – ")[0] ?? "";
  const endTimes = [...times.slice(1), (times.at(-1) ?? 0) + 30];
  const upcoming = preview > 0 ? r.next(rule.startDate, preview + rule.exceptions.length).slice(0, preview) : [];
  const skipped = [...rule.exceptions].sort();

  const setEndType = (type: RecurrenceEnd["type"]): void => {
    if (type === "never") r.setEnd({ type: "never" });
    if (type === "until") r.setEnd({ type: "until", date: rule.end.type === "until" ? rule.end.date : addDays(rule.startDate, 6 * 7) });
    if (type === "count") r.setEnd({ type: "count", count: rule.end.type === "count" ? rule.end.count : 8 });
  };

  return (
    // A container query, not the viewport: the editor lives in a dialog, a narrow card or a wide page.
    <div className={cn("@container flex flex-col gap-5", className)} data-slot="repeat-editor">
      {!timesOnly && (
      <Field invalid={r.problems.includes("no-weekdays")}>
        <FieldLabel id={`${id}-days`}>On</FieldLabel>
        <ToggleGroup aria-labelledby={`${id}-days`} className="w-full @sm:w-fit" multiple onValueChange={(days) => r.setRule({ weekdays: WEEK.filter((d) => days.includes(d)) })} size="sm" value={[...rule.weekdays]} variant="outline">
          {WEEK.map((day, i) => (
            <React.Fragment key={day}>
              {i > 0 && <ToggleGroupSeparator />}
              <ToggleGroupItem aria-label={weekdayName(day, locale, "long")} className="min-w-0 flex-1 px-0 @sm:min-w-10 @sm:px-2" value={day}>
                {/* Narrow containers get one-letter names; the accessible name is always the full day. */}
                <span aria-hidden="true" className="@sm:hidden">
                  {weekdayName(day, locale, "narrow")}
                </span>
                <span aria-hidden="true" className="hidden @sm:inline">
                  {weekdayName(day, locale, "short")}
                </span>
              </ToggleGroupItem>
            </React.Fragment>
          ))}
        </ToggleGroup>
        {r.problems.includes("no-weekdays") && <FieldError match>{PROBLEM_TEXT["no-weekdays"]}</FieldError>}
      </Field>
      )}

      <div className={cn("grid gap-4", timesOnly ? "grid-cols-2" : "grid-cols-2 @md:grid-cols-[auto_1fr_1fr]")}>
        {!timesOnly && (
        <NumberField className="col-span-2 gap-2 @md:col-span-1" id={`${id}-interval`} max={8} min={1} onValueChange={(v) => r.setInterval(v ?? 1)} value={rule.interval}>
          <Label htmlFor={`${id}-interval`}>Every</Label>
          <div className="flex items-center gap-2">
            <NumberFieldGroup className="w-28">
              <NumberFieldDecrement aria-label="Fewer weeks between" />
              <NumberFieldInput />
              <NumberFieldIncrement aria-label="More weeks between" />
            </NumberFieldGroup>
            <span className="text-muted-foreground text-sm">{rule.interval === 1 ? "week" : "weeks"}</span>
          </div>
        </NumberField>
        )}
        <Field>
          <FieldLabel>From</FieldLabel>
          <Select<number>
            items={times.map((m) => ({ label: timeLabel(m), value: m }))}
            onValueChange={(v) => v !== null && r.setTimes(v, Math.max(rule.endMinute, v + 30))}
            value={rule.startMinute}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {times.map((m) => (
                <SelectItem key={m} value={m}>
                  {timeLabel(m)}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Field>
        <Field invalid={r.problems.includes("ends-before-it-starts")}>
          <FieldLabel>To</FieldLabel>
          <Select<number> items={endTimes.map((m) => ({ label: timeLabel(m), value: m }))} onValueChange={(v) => v !== null && r.setTimes(rule.startMinute, v)} value={rule.endMinute}>
            <SelectTrigger className="w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {endTimes.map((m) => (
                <SelectItem disabled={m <= rule.startMinute} key={m} value={m}>
                  {timeLabel(m)}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          {r.problems.includes("ends-before-it-starts") ? <FieldError match>{PROBLEM_TEXT["ends-before-it-starts"]}</FieldError> : <FieldDescription>Each time: {describeLength(rule, locale)}</FieldDescription>}
        </Field>
      </div>

      {!timesOnly && (
      <Fieldset className="flex flex-col gap-2">
        <FieldsetLegend className="font-medium text-sm">Ends</FieldsetLegend>
        <RadioGroup className="gap-2" onValueChange={(v) => setEndType(v as RecurrenceEnd["type"])} value={rule.end.type}>
          <Label className="min-h-8 font-normal">
            <Radio value="never" />
            Never, until it is ended
          </Label>
          <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1.5">
            <Label className="font-normal">
              <Radio value="until" />
              On
            </Label>
            <Popover onOpenChange={setCalendarOpen} open={calendarOpen}>
              <PopoverTrigger
                render={
                  <Button
                    aria-label={rule.end.type === "until" ? `Last date, ${formatDayLong(rule.end.date, locale)}` : "Last date"}
                    className="tabular-nums"
                    disabled={rule.end.type !== "until"}
                    size="sm"
                    variant="outline"
                  />
                }
              >
                <CalendarIcon aria-hidden="true" />
                {rule.end.type === "until" ? formatDay(rule.end.date, locale) : "Pick a date"}
              </PopoverTrigger>
              <PopoverPopup aria-label="Last date">
                <LazyCalendar
                  defaultMonth={toLocalDate(rule.end.type === "until" ? rule.end.date : rule.startDate)}
                  disabled={{ before: toLocalDate(rule.startDate) }}
                  mode="single"
                  onSelect={(date: Date) => {
                    r.setEnd({ type: "until", date: fromLocalDate(date) });
                    setCalendarOpen(false);
                  }}
                  required
                  selected={rule.end.type === "until" ? toLocalDate(rule.end.date) : undefined}
                />
              </PopoverPopup>
            </Popover>
          </div>
          <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1.5">
            <Label className="font-normal">
              <Radio value="count" />
              After
            </Label>
            <span className="flex items-center gap-2">
            <NumberField
              aria-label="Number of times"
              disabled={rule.end.type !== "count"}
              max={104}
              min={1}
              onValueChange={(v) => r.setEnd({ type: "count", count: v ?? 1 })}
              size="sm"
              value={rule.end.type === "count" ? rule.end.count : 8}
            >
              <NumberFieldGroup className="w-28">
                <NumberFieldDecrement aria-label="Fewer times" />
                <NumberFieldInput aria-label="Number of times" />
                <NumberFieldIncrement aria-label="More times" />
              </NumberFieldGroup>
            </NumberField>
            <span className="text-muted-foreground text-sm">times</span>
            </span>
          </div>
        </RadioGroup>
      </Fieldset>
      )}

      {!timesOnly && upcoming.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-medium text-sm" id={`${id}-next`}>
            Next dates
          </span>
          <ul aria-labelledby={`${id}-next`} className="flex flex-wrap gap-1.5">
            {[...upcoming.map((o) => o.date), ...skipped]
              .sort()
              .filter((d, i, all) => all.indexOf(d) === i)
              .slice(0, preview + skipped.length)
              .map((date: PlainDate) => {
                const isSkipped = rule.exceptions.includes(date);
                return (
                  <li key={date}>
                    <Toggle
                      aria-label={`${isSkipped ? "Skipped" : "Skip"} ${formatDayLong(date, locale)}`}
                      className={cn("tabular-nums", isSkipped && "line-through")}
                      onPressedChange={() => r.toggleException(date)}
                      pressed={isSkipped}
                      size="sm"
                      variant="outline"
                    >
                      {formatDay(date, locale)}
                    </Toggle>
                  </li>
                );
              })}
          </ul>
          <p className="text-muted-foreground text-xs">Press a date to skip it (a holiday, a tournament); press again to bring it back.</p>
        </div>
      )}

      {!timesOnly && (
      <p aria-live="polite" className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm" data-slot="repeat-summary">
        <RepeatIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 opacity-72" />
        <span>{r.valid ? r.summary : r.problems.map((p) => PROBLEM_TEXT[p]).join(" ")}</span>
      </p>
      )}
    </div>
  );
}
