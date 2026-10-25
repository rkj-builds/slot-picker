"use client";

import { CalendarOffIcon, CloudAlertIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { describeSlotStatus, groupByPeriod, type Period, type Slot, type SlotStatus } from "@/lib/availability";
import { formatTime } from "@/lib/format";
import { sameWallClock } from "@/lib/time-zone";
import { cn } from "@/lib/utils";
import { SlotGrid as SlotGridPrimitive } from "@/primitives/slot-grid";

export type SlotGridStatus = "ready" | "loading" | "error";

export interface SlotGridProps {
  slots: readonly Slot[];
  /** The selected slot id, or null. */
  value: string | null;
  onValueChange: (id: string, slot: Slot) => void;
  /** The venue's zone: the clock every time is printed on. */
  timeZone: string;
  /** The viewer's zone. When it differs, each slot also shows the viewer's time. */
  viewerTimeZone?: string;
  locale?: string;
  status?: SlotGridStatus;
  /** For the empty state: a day with free slots, and what to do about it. */
  nextAvailableLabel?: string | null;
  onNextAvailable?: () => void;
  onRetry?: () => void;
  /** Column count used for Up/Down when the grid has not been laid out (tests, SSR). */
  columns?: number;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

const PERIOD_LABEL: Record<Period, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

/** Status texture on top of the coss Button variant: a taken slot must not look like a free one in greyscale. */
const SLOT_STYLE: Record<SlotStatus, string> = {
  available: "hover:border-ring/60",
  booked: "bg-muted text-muted-foreground/72 hover:bg-muted",
  held: "border-dashed border-input bg-hatch text-muted-foreground hover:bg-hatch",
  past: "text-muted-foreground/56 hover:bg-transparent",
  conflict: "bg-muted/60 text-muted-foreground/72 hover:bg-muted/60",
  closing: "bg-muted/60 text-muted-foreground/72 hover:bg-muted/60",
};

/**
 * The booking flow's start times: the SlotGrid primitive
 * (src/primitives/slot-grid) in the booking skin. The primitive owns the
 * semantics (one radio group, a radio per start time, periods as groups) and
 * the keyboard model; this file owns the look, the loading, error and empty
 * states, and what each cell says.
 *
 *   ← →            previous / next slot, wrapping within the day
 *   ↑ ↓            the slot above / below (measured from the rendered layout)
 *   Home / End     first / last slot of the day
 *   Page Up / Down first slot of the previous / next period (morning, afternoon, evening)
 *   Space / Enter  choose the focused slot
 *
 * Moving onto an available slot selects it, as a native radio group would.
 * Unavailable slots stay in the tab sequence so they can be reached and read
 * ("7:30 PM, booked"); moving onto one only moves focus.
 */
export function SlotGrid({
  slots,
  value,
  onValueChange,
  timeZone,
  viewerTimeZone,
  locale,
  status = "ready",
  nextAvailableLabel,
  onNextAvailable,
  onRetry,
  columns = 4,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: SlotGridProps): React.ReactElement {
  const groups = React.useMemo(() => groupByPeriod(slots), [slots]);
  const order = React.useMemo(() => groups.flatMap((g) => g.slots), [groups]);

  const showViewerTime = Boolean(
    viewerTimeZone && viewerTimeZone !== timeZone && order[0] && !sameWallClock(order[0].start, timeZone, viewerTimeZone),
  );

  const groupProps = {
    "aria-label": ariaLabelledBy ? undefined : (ariaLabel ?? "Start time"),
    "aria-labelledby": ariaLabelledBy,
    className: cn("flex flex-col gap-5", className),
    "data-slot": "slot-grid",
  } as const;

  if (status === "loading") {
    return (
      <div {...groupProps} aria-busy="true" data-status="loading" role="status">
        <span className="sr-only">Loading start times</span>
        {[6, 8, 5].map((count, g) => (
          <div className="flex flex-col gap-2" key={g}>
            <Skeleton className="h-3 w-16" />
            <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
              {Array.from({ length: count }, (_, i) => (
                <Skeleton className="h-10" key={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div {...groupProps} data-status="error" role="alert">
        <Empty className="animate-fade-in rounded-xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CloudAlertIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Could not load times</EmptyTitle>
            <EmptyDescription>Check your connection and try again.</EmptyDescription>
          </EmptyHeader>
          {onRetry && (
            <EmptyContent>
              <Button onClick={onRetry} variant="outline">
                Try again
              </Button>
            </EmptyContent>
          )}
        </Empty>
      </div>
    );
  }

  if (!order.some((s) => s.status === "available")) {
    return (
      <div {...groupProps} data-status="empty" role="status">
        <Empty className="animate-fade-in rounded-xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarOffIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{order.length === 0 ? "Closed today" : "No slots left today"}</EmptyTitle>
            <EmptyDescription>
              {nextAvailableLabel ? `The next free day is ${nextAvailableLabel}.` : "Try another day or a shorter duration."}
            </EmptyDescription>
          </EmptyHeader>
          {nextAvailableLabel && onNextAvailable && (
            <EmptyContent>
              <Button onClick={onNextAvailable} variant="outline">
                Go to {nextAvailableLabel}
              </Button>
            </EmptyContent>
          )}
        </Empty>
      </div>
    );
  }

  const byId = new Map(order.map((s) => [s.id, s]));
  return (
    <SlotGridPrimitive.Root
      {...groupProps}
      columns={columns}
      data-status="ready"
      onValueChange={(id) => {
        const slot = byId.get(id);
        if (slot) onValueChange(id, slot);
      }}
      value={value}
    >
      {groups.map(({ period, slots: periodSlots }) => (
        <SlotGridPrimitive.Group aria-label={PERIOD_LABEL[period]} className="flex flex-col gap-2" data-period={period} data-slot="slot-grid-period" key={period}>
          <div aria-hidden="true" className="flex items-baseline gap-2 text-muted-foreground text-xs">
            <span className="font-medium uppercase">{PERIOD_LABEL[period]}</span>
            <span className="tabular-nums">{periodSlots.filter((s) => s.status === "available").length} free</span>
          </div>
          <SlotGridPrimitive.Row className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2" data-slot="slot-grid-row">
            {periodSlots.map((slot) => {
              const reason = describeSlotStatus(slot, locale);
              const time = formatTime(slot.start, { locale, timeZone });
              const viewerTime = showViewerTime && viewerTimeZone ? formatTime(slot.start, { locale, timeZone: viewerTimeZone }) : null;
              const available = slot.status === "available";
              return (
                <SlotGridPrimitive.Cell
                  disabled={!available}
                  end={slot.end}
                  key={slot.id}
                  label={time}
                  reason={reason ?? undefined}
                  render={(props, state) => (
                    <Button
                      {...props}
                      className={cn(
                        "h-auto min-h-10 flex-col gap-0 px-2 py-1.5 font-normal tabular-nums sm:h-auto",
                        available ? "cursor-pointer" : "cursor-not-allowed",
                        !state.selected && SLOT_STYLE[slot.status],
                        props.className,
                      )}
                      variant={state.selected ? "default" : available ? "outline" : "ghost"}
                    />
                  )}
                  start={slot.start}
                  value={slot.id}
                  data-slot="slot"
                  data-slot-id={slot.id}
                  data-status={slot.status}
                  title={reason ? `${time} · ${reason}` : undefined}
                >
                  <span className={cn("font-medium", slot.status === "booked" && "line-through decoration-muted-foreground/40")}>{time}</span>
                  {viewerTime && (
                    <span className="text-[11px] text-muted-foreground/80 leading-tight in-data-selected:text-primary-foreground/72">{viewerTime}</span>
                  )}
                </SlotGridPrimitive.Cell>
              );
            })}
          </SlotGridPrimitive.Row>
        </SlotGridPrimitive.Group>
      ))}
    </SlotGridPrimitive.Root>
  );
}
