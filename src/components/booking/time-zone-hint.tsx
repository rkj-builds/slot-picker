"use client";

import { GlobeIcon } from "lucide-react";
import * as React from "react";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDay, formatTimeRange } from "@/lib/format";
import { sameWallClock, wallClockIn, zoneCityLabel, zoneOffsetLabel } from "@/lib/time-zone";
import { toPlainDate } from "@/lib/plain-date";
import { cn } from "@/lib/utils";

export interface TimeZoneHintProps {
  /** The venue's zone: what every printed time means. */
  timeZone: string;
  /** The viewer's zone, usually `localTimeZone()`. */
  viewerTimeZone: string;
  /** The chosen slot, if any; the hint then shows its local equivalent. */
  start?: number | null;
  end?: number | null;
  /** The instant used to compute offsets when no slot is chosen. */
  now?: number;
  locale?: string;
  className?: string;
}

/**
 * A small line saying what the printed times mean for the viewer.
 *
 * Same wall clock (Kolkata viewed from Colombo): says so and stops.
 * Different clocks, nothing chosen: names both zones with their offsets.
 * Different clocks, a slot chosen: the slot's range on the viewer's clock,
 * with the day named when it is not the same calendar day over there.
 */
export function TimeZoneHint({
  timeZone,
  viewerTimeZone,
  start,
  end,
  now,
  locale,
  className,
}: TimeZoneHintProps): React.ReactElement {
  // A render-stable fallback: the clock is read once, not on every render.
  const [mounted] = React.useState(() => Date.now());
  const at = start ?? now ?? mounted;
  const same = sameWallClock(at, timeZone, viewerTimeZone);
  const venue = zoneCityLabel(timeZone);
  const viewer = zoneCityLabel(viewerTimeZone);
  const venueOffset = zoneOffsetLabel(at, timeZone, locale);
  const viewerOffset = zoneOffsetLabel(at, viewerTimeZone, locale);

  let text: React.ReactNode;
  if (same) {
    text = (
      <>
        Times are in {venue} time{timeZone === viewerTimeZone ? "" : ", the same as yours"}.
      </>
    );
  } else if (start != null && end != null) {
    const venueDay = toPlainDate(dayOf(wallClockIn(start, timeZone)));
    const viewerDay = toPlainDate(dayOf(wallClockIn(start, viewerTimeZone)));
    text = (
      <>
        <span className="font-medium text-foreground tabular-nums">
          {formatTimeRange(start, end, { locale, timeZone: viewerTimeZone })}
        </span>{" "}
        in {viewer}
        {venueDay !== viewerDay && <>, {formatDay(viewerDay, locale)}</>}
      </>
    );
  } else {
    text = (
      <>
        Times are in {venue} time ({venueOffset}). You are in {viewer} ({viewerOffset}).
      </>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          "inline-flex max-w-full cursor-default items-center gap-1.5 rounded-md text-muted-foreground text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
        data-slot="time-zone-hint"
        render={<p />}
      >
        <GlobeIcon aria-hidden="true" className="size-3.5 shrink-0 opacity-80" />
        <span className="min-w-0">{text}</span>
      </TooltipTrigger>
      <TooltipPopup>
        <span className="block tabular-nums">
          {venue} {venueOffset} · {viewer} {viewerOffset}
        </span>
      </TooltipPopup>
    </Tooltip>
  );
}

function dayOf(wall: { year: number; month: number; day: number }): { year: number; month: number; day: number } {
  return { year: wall.year, month: wall.month, day: wall.day };
}
