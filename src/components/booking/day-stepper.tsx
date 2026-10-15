"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { describeDayRelative, formatDay, formatDayLong } from "@/lib/format";
import { addDays, compareDates, type PlainDate } from "@/lib/plain-date";
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
  className?: string;
}

/**
 * Walk one day at a time. Either end is a real state: a button at the limit
 * is disabled rather than hidden, so the face never jumps as you step.
 * The face is a live region, so the new date is read out after each step;
 * the buttons name where they go, so the control works without seeing it.
 */
export function DayStepper({
  value,
  onValueChange,
  timeZone,
  minDate,
  maxDate,
  locale,
  now,
  className,
}: DayStepperProps): React.ReactElement {
  const previous = addDays(value, -1);
  const next = addDays(value, 1);
  const canGoBack = !minDate || compareDates(previous, minDate) >= 0;
  const canGoForward = !maxDate || compareDates(next, maxDate) <= 0;
  const relative = describeDayRelative(value, { locale, timeZone, now });

  return (
    <div
      aria-label="Day"
      className={cn("flex items-center gap-1", className)}
      data-slot="day-stepper"
      role="group"
    >
      <StepButton
        disabled={!canGoBack}
        label={`Previous day, ${formatDayLong(previous, locale)}`}
        onClick={() => onValueChange(previous)}
        tip={formatDay(previous, locale)}
      >
        <ChevronLeftIcon aria-hidden="true" />
      </StepButton>

      <div aria-atomic="true" aria-live="polite" className="flex min-w-36 flex-col items-center leading-tight" data-slot="day-stepper-face">
        <span className="font-medium text-sm">
          <span className="sr-only">{formatDayLong(value, locale)}</span>
          <span aria-hidden="true">{formatDay(value, locale)}</span>
        </span>
        <span className="min-h-4 text-muted-foreground text-xs">{relative}</span>
      </div>

      <StepButton
        disabled={!canGoForward}
        label={`Next day, ${formatDayLong(next, locale)}`}
        onClick={() => onValueChange(next)}
        tip={formatDay(next, locale)}
      >
        <ChevronRightIcon aria-hidden="true" />
      </StepButton>
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
      <TooltipTrigger
        render={<Button aria-label={label} disabled={disabled} onClick={onClick} size="icon" variant="outline" />}
      >
        {children}
      </TooltipTrigger>
      <TooltipPopup>{tip}</TooltipPopup>
    </Tooltip>
  );
}
