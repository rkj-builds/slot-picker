"use client";

import type * as React from "react";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { formatDuration } from "@/lib/duration";
import { cn } from "@/lib/utils";

export interface DurationPickerProps {
  /** Durations in minutes, e.g. [60, 90, 120]. */
  durations: readonly number[];
  value: number;
  onValueChange: (minutes: number) => void;
  locale?: string;
  disabled?: boolean;
  className?: string;
  /** Accessible name for the group. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/**
 * A segmented choice of booking durations. The visible label is the short
 * form ("1 hr 30 min"); the accessible name is the long one ("1 hour 30
 * minutes"), so a screen reader never hears an abbreviation it has to guess.
 */
export function DurationPicker({
  durations,
  value,
  onValueChange,
  locale,
  disabled,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: DurationPickerProps): React.ReactElement {
  return (
    <SegmentedControl<number>
      aria-label={ariaLabelledBy ? undefined : (ariaLabel ?? "Duration")}
      aria-labelledby={ariaLabelledBy}
      className={cn(className)}
      data-slot="duration-picker"
      disabled={disabled}
      onValueChange={(next) => onValueChange(next)}
      value={value}
    >
      {durations.map((minutes) => (
        <SegmentedControlItem<number>
          aria-label={formatDuration(minutes, { locale, style: "long" })}
          data-slot="duration-picker-item"
          key={minutes}
          value={minutes}
        >
          {formatDuration(minutes, { locale, style: "short" })}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}
