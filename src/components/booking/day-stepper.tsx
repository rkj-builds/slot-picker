"use client";

import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";
import { LazyCalendar } from "@/components/booking/lazy-calendar";
import { Button } from "@/components/ui/button";
import { Group, GroupSeparator } from "@/components/ui/group";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { describeDayRelative, formatDay, formatDayLong } from "@/lib/format";
import { addDays, compareDates, fromLocalDate, type PlainDate, toLocalDate, todayIn } from "@/lib/plain-date";
import { cn } from "@/lib/utils";

export interface DayStepperProps {
  value: PlainDate;
  onValueChange: (date: PlainDate) => void;
  /** The venue's zone, which decides what "today" means. */
  timeZone: string;
  /** Earliest date the stepper may reach; defaults to no limit. */
  minDate?: PlainDate;
  maxDate?: PlainDate;
  locale?: string;
  /** Epoch milliseconds; defaults to the real clock. */
  now?: number;
  /** Add a "Today" button to the group (the desk, which moves around a lot). */
  showToday?: boolean;
  className?: string;
}

/**
 * Walk one day at a time, or jump with a calendar. A coss Group of Buttons:
 * previous, the date itself (coss's date-picker particle: a Popover holding
 * a Calendar), next, and optionally Today. A button at a limit is disabled
 * rather than hidden, so the group never jumps as you step; the buttons name
 * where they go, and the new date is announced after each step.
 */
export function DayStepper({
  value,
  onValueChange,
  timeZone,
  minDate,
  maxDate,
  locale,
  now,
  showToday = false,
  className,
}: DayStepperProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const today = todayIn(timeZone, now);
  const previous = addDays(value, -1);
  const next = addDays(value, 1);
  const canGoBack = !minDate || compareDates(previous, minDate) >= 0;
  const canGoForward = !maxDate || compareDates(next, maxDate) <= 0;
  const relative = describeDayRelative(value, { locale, timeZone, now });
  const disabled: ({ before: Date } | { after: Date })[] = [];
  if (minDate) disabled.push({ before: toLocalDate(minDate) });
  if (maxDate) disabled.push({ after: toLocalDate(maxDate) });

  return (
    <div className={cn("flex items-center", className)} data-slot="day-stepper">
      <Group aria-label="Day">
        <StepButton
          disabled={!canGoBack}
          label={`Previous day, ${formatDayLong(previous, locale)}`}
          onClick={() => onValueChange(previous)}
          tip={formatDay(previous, locale)}
        >
          <ChevronLeftIcon aria-hidden="true" />
        </StepButton>
        <GroupSeparator />
        {showToday && (
          <>
            <Button disabled={value === today} onClick={() => onValueChange(today)} variant="outline">
              Today
            </Button>
            <GroupSeparator />
          </>
        )}
        <Popover onOpenChange={setOpen} open={open}>
          <PopoverTrigger
            render={
              <Button
                aria-label={`Choose a date, ${formatDayLong(value, locale)}${relative ? `, ${relative}` : ""}`}
                className="min-w-36 tabular-nums"
                variant="outline"
              />
            }
          >
            <CalendarIcon aria-hidden="true" />
            <span>{formatDay(value, locale)}</span>
            {relative && <span className="font-normal text-muted-foreground max-sm:hidden">{relative}</span>}
          </PopoverTrigger>
          <PopoverPopup aria-label="Choose a date">
            <LazyCalendar
              // The popover just opened from the date button: focus the chosen day, as a date picker should.
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              defaultMonth={toLocalDate(value)}
              disabled={disabled}
              endMonth={maxDate ? toLocalDate(maxDate) : undefined}
              mode="single"
              onSelect={(date: Date) => {
                onValueChange(fromLocalDate(date));
                setOpen(false);
              }}
              required
              selected={toLocalDate(value)}
              startMonth={minDate ? toLocalDate(minDate) : undefined}
              today={toLocalDate(today)}
            />
          </PopoverPopup>
        </Popover>
        <GroupSeparator />
        <StepButton
          disabled={!canGoForward}
          label={`Next day, ${formatDayLong(next, locale)}`}
          onClick={() => onValueChange(next)}
          tip={formatDay(next, locale)}
        >
          <ChevronRightIcon aria-hidden="true" />
        </StepButton>
      </Group>
      <span aria-atomic="true" aria-live="polite" className="sr-only" data-slot="day-stepper-face">
        {formatDayLong(value, locale)}
        {relative ? `, ${relative}` : ""}
      </span>
    </div>
  );
}

function StepButton({
  label,
  tip,
  disabled,
  onClick,
  children,
}: {
  label: string;
  tip: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button aria-label={label} disabled={disabled} onClick={onClick} size="icon" variant="outline" />}>{children}</TooltipTrigger>
      <TooltipPopup>{tip}</TooltipPopup>
    </Tooltip>
  );
}
