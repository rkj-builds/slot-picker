"use client";

import * as React from "react";
import { DayStepper } from "@/components/booking/day-stepper";
import { DurationPicker } from "@/components/booking/duration-picker";
import { SlotGrid, type SlotGridStatus } from "@/components/booking/slot-grid";
import { TimeZoneHint } from "@/components/booking/time-zone-hint";
import { TimeZoneCombobox } from "@/components/compositions/time-zone-combobox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl, SegmentedControlItem } from "@/components/compositions/segmented-control";
import { computeDaySlots, nextAvailableDate, type Reservation, type Slot, type VenueSchedule } from "@/lib/availability";
import { formatDuration } from "@/lib/duration";
import { formatDay, formatTime } from "@/lib/format";
import { addDays, isPlainDate, type PlainDate, todayIn } from "@/lib/plain-date";
import { instantAt } from "@/lib/time-zone";
import { cn } from "@/lib/utils";

export interface Space {
  id: string;
  name: string;
}

export interface BookingSelection {
  spaceId: string;
  date: PlainDate;
  durationMinutes: number;
  slot: Slot;
}

export interface BookingSlotPickerProps {
  schedule: VenueSchedule;
  spaces: readonly Space[];
  reservations: readonly Reservation[];
  viewerTimeZone: string;
  /** Let the viewer pick the zone their own times are shown in (the venue's stay as they are). */
  onViewerTimeZoneChange?: (timeZone: string) => void;
  locale?: string;
  /** Epoch milliseconds; defaults to the real clock. */
  now?: number;
  /** Lets a host show its own fetching state while the data is being loaded. */
  status?: SlotGridStatus;
  /** Initial duration; defaults to the schedule's first. */
  defaultDurationMinutes?: number;
  /** Initial start, as a slot id ("2026-10-18T19:00"); it also sets the day. */
  defaultSlotId?: string;
  /** Initial day when no slot is seeded; defaults to today. */
  defaultDate?: PlainDate;
  /** Last day the stepper may reach. */
  maxDate?: PlainDate;
  /** The section's heading; defaults to "Book a court". */
  heading?: string;
  /** The summary's button; defaults to "Continue". */
  confirmLabel?: string;
  /** Extra detail for the summary line, such as the price of the selection. */
  renderSummaryExtra?: (selection: BookingSelection) => React.ReactNode;
  onRetry?: () => void;
  onConfirm?: (selection: BookingSelection) => void;
  /** Called whenever the chosen start changes (null when nothing is chosen), so a host can read it back in its own action bar. */
  onSelectionChange?: (selection: BookingSelection | null) => void;
  /** Show the built-in summary and confirm button under the times; a host with its own action bar turns it off. Defaults to true. */
  showSummary?: boolean;
  className?: string;
}

/**
 * The composed picker: space, day, duration, start time, then a summary that
 * reads back the whole booking in one line. State lives here; every part
 * below is controlled.
 */
export function BookingSlotPicker({
  schedule,
  spaces,
  reservations,
  viewerTimeZone,
  onViewerTimeZoneChange,
  locale,
  now: nowProp,
  status = "ready",
  defaultDurationMinutes,
  defaultSlotId,
  defaultDate: defaultDateProp,
  maxDate,
  heading = "Book a court",
  confirmLabel = "Continue",
  renderSummaryExtra,
  onRetry,
  onConfirm,
  onSelectionChange,
  showSummary = true,
  className,
}: BookingSlotPickerProps): React.ReactElement {
  // Read the clock once per mount, so a re-render never silently moves "now".
  const [mounted] = React.useState(() => Date.now());
  const now = nowProp ?? mounted;
  const today = todayIn(schedule.timeZone, now);
  const [spaceId, setSpaceId] = React.useState<string>(spaces[0]?.id ?? "");
  const defaultDate = defaultSlotId?.slice(0, 10);
  const [date, setDate] = React.useState<PlainDate>(
    defaultDate && isPlainDate(defaultDate) && defaultDate >= today ? defaultDate : defaultDateProp && defaultDateProp >= today ? defaultDateProp : today,
  );
  const [durationMinutes, setDurationMinutes] = React.useState<number>(
    defaultDurationMinutes && schedule.durationsMinutes.includes(defaultDurationMinutes)
      ? defaultDurationMinutes
      : (schedule.durationsMinutes[0] ?? 60),
  );
  const [slotId, setSlotId] = React.useState<string | null>(defaultSlotId ?? null);

  const slots = React.useMemo(
    () => computeDaySlots({ schedule, date, spaceId, durationMinutes, reservations, now }),
    [schedule, date, spaceId, durationMinutes, reservations, now],
  );
  const selected = slots.find((s) => s.id === slotId && s.status === "available") ?? null;

  const nextDay = React.useMemo(
    () =>
      slots.some((s) => s.status === "available")
        ? null
        : nextAvailableDate({ schedule, spaceId, durationMinutes, reservations, now, from: addDays(date, 1) }),
    [slots, schedule, spaceId, durationMinutes, reservations, now, date],
  );

  const space = spaces.find((s) => s.id === spaceId);

  // Tell the host what is chosen. Keyed on the choice, not the object, so a re-render with the same choice stays quiet.
  const selectionKey = selected ? `${spaceId}|${selected.id}|${durationMinutes}` : "";
  const reportSelection = React.useEffectEvent(() => {
    onSelectionChange?.(selected ? { spaceId, date, durationMinutes, slot: selected } : null);
  });
  React.useEffect(() => {
    reportSelection();
  }, [selectionKey]);

  const headingId = React.useId();
  const durationId = React.useId();
  const timesId = React.useId();
  const zoneId = React.useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cn("flex flex-col gap-6", className)}
      data-slot="booking-slot-picker"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-base" id={headingId}>
            {heading}
          </h2>
          <TimeZoneHint
            end={selected?.end}
            locale={locale}
            now={now}
            start={selected?.start}
            timeZone={schedule.timeZone}
            viewerTimeZone={viewerTimeZone}
          />
          {onViewerTimeZoneChange && (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1" data-slot="viewer-zone">
              <label className="text-muted-foreground text-xs" htmlFor={zoneId}>
                Also show times in
              </label>
              <TimeZoneCombobox
                // Offsets as they are on the day being looked at, so a DST change (1 Nov in New York) shows on the right day.
                at={instantAt(date, 12 * 60, schedule.timeZone)}
                className="w-56"
                id={zoneId}
                locale={locale}
                onValueChange={onViewerTimeZoneChange}
                size="sm"
                value={viewerTimeZone}
              />
            </div>
          )}
        </div>
        <DayStepper
          locale={locale}
          maxDate={maxDate}
          minDate={today}
          now={now}
          onValueChange={(next) => {
            setDate(next);
            setSlotId(null);
          }}
          timeZone={schedule.timeZone}
          value={date}
        />
      </header>

      <div className="flex flex-wrap items-end justify-between gap-4">
        {spaces.length > 1 && (
          <SegmentedControl<string>
            aria-label="Court"
            onValueChange={(next) => {
              setSpaceId(next);
              setSlotId(null);
            }}
            value={spaceId}
          >
            {spaces.map((s) => (
              <SegmentedControlItem<string> key={s.id} value={s.id}>
                {s.name}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        )}
        <div className="flex flex-col gap-1.5">
          <span className="font-medium text-sm" id={durationId}>
            Duration
          </span>
          <DurationPicker
            aria-labelledby={durationId}
            durations={schedule.durationsMinutes}
            locale={locale}
            onValueChange={(next) => {
              setDurationMinutes(next);
              setSlotId(null);
            }}
            value={durationMinutes}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-medium text-sm" id={timesId}>
          Start time
        </span>
        <SlotGrid
          aria-labelledby={timesId}
          locale={locale}
          nextAvailableLabel={nextDay ? formatDay(nextDay, locale) : null}
          onNextAvailable={nextDay ? () => setDate(nextDay) : undefined}
          onRetry={onRetry}
          onValueChange={setSlotId}
          slots={slots}
          status={status}
          timeZone={schedule.timeZone}
          value={selected?.id ?? null}
          viewerTimeZone={viewerTimeZone}
        />
      </div>

      {showSummary && (
      <Card
        aria-live="polite"
        className="min-h-12 flex-row flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 before:rounded-[calc(var(--radius-xl)-1px)]"
        data-slot="booking-summary"
        render={<footer />}
      >
        {selected && space ? (
          <>
            <p className="text-sm tabular-nums" data-slot="booking-summary-line">
              <span className="font-medium">{space.name}</span>
              <Separator />
              {formatDay(date, locale)}
              <Separator />
              {formatTime(selected.start, { locale, timeZone: schedule.timeZone })} –{" "}
              {formatTime(selected.end, { locale, timeZone: schedule.timeZone })}
              <Separator />
              {formatDuration(durationMinutes, { locale })}
              {renderSummaryExtra && (
                <>
                  <Separator />
                  {renderSummaryExtra({ spaceId, date, durationMinutes, slot: selected })}
                </>
              )}
            </p>
            <Button
              onClick={() => onConfirm?.({ spaceId, date, durationMinutes, slot: selected })}
            >
              {confirmLabel}
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Pick a start time to continue.</p>
        )}
      </Card>
      )}
    </section>
  );
}

function Separator(): React.ReactElement {
  return (
    <span aria-hidden="true" className="text-muted-foreground/60">
      {" · "}
    </span>
  );
}
