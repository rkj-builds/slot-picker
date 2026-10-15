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
 * A keyboard-navigable grid of start times, exposed as one radio group.
 *
 * The keyboard model:
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
  const rootRef = React.useRef<HTMLDivElement>(null);
  const groups = React.useMemo(() => groupByPeriod(slots), [slots]);
  const order = React.useMemo(() => groups.flatMap((g) => g.slots), [groups]);

  // Roving tabindex: the selected slot carries the tab stop, else the first available, else the first.
  const [focusedId, setFocusedId] = React.useState<string | null>(null);
  const tabStopId =
    (focusedId && order.some((s) => s.id === focusedId) ? focusedId : null) ??
    value ??
    order.find((s) => s.status === "available")?.id ??
    order[0]?.id ??
    null;

  const showViewerTime = Boolean(
    viewerTimeZone && viewerTimeZone !== timeZone && order[0] && !sameWallClock(order[0].start, timeZone, viewerTimeZone),
  );

  const focusSlot = React.useCallback(
    (slot: Slot | undefined): void => {
      if (!slot) return;
      setFocusedId(slot.id);
      const el = rootRef.current?.querySelector<HTMLElement>(`[data-slot-id="${slot.id}"]`);
      el?.focus();
      if (slot.status === "available" && slot.id !== value) onValueChange(slot.id, slot);
    },
    [onValueChange, value],
  );

  const measuredColumns = (slot: Slot): number => {
    const group = groups.find((g) => g.slots.includes(slot));
    const root = rootRef.current;
    if (!group || !root) return columns;
    const first = root.querySelector<HTMLElement>(`[data-slot-id="${group.slots[0]?.id}"]`);
    if (!first || first.offsetWidth === 0) return columns;
    let count = 0;
    for (const s of group.slots) {
      const el = root.querySelector<HTMLElement>(`[data-slot-id="${s.id}"]`);
      if (el?.offsetTop === first.offsetTop) count += 1;
      else break;
    }
    return Math.max(1, count);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, slot: Slot): void => {
    const index = order.indexOf(slot);
    const groupIndex = groups.findIndex((g) => g.slots.includes(slot));
    const group = groups[groupIndex];
    if (!group) return;
    const inGroup = group.slots.indexOf(slot);
    const cols = measuredColumns(slot);

    let target: Slot | undefined;
    switch (event.key) {
      case "ArrowRight":
        target = order[(index + 1) % order.length];
        break;
      case "ArrowLeft":
        target = order[(index - 1 + order.length) % order.length];
        break;
      case "ArrowDown": {
        const next = inGroup + cols;
        target = next < group.slots.length ? group.slots[next] : groups[groupIndex + 1]?.slots[Math.min(inGroup % cols, (groups[groupIndex + 1]?.slots.length ?? 1) - 1)];
        break;
      }
      case "ArrowUp": {
        const prev = inGroup - cols;
        if (prev >= 0) target = group.slots[prev];
        else {
          const above = groups[groupIndex - 1];
          const firstAbove = above?.slots[0];
          if (above && firstAbove) {
            const aboveCols = measuredColumns(firstAbove);
            const lastRowStart = Math.floor((above.slots.length - 1) / aboveCols) * aboveCols;
            target = above.slots[Math.min(lastRowStart + (inGroup % cols), above.slots.length - 1)];
          }
        }
        break;
      }
      case "Home":
        target = order[0];
        break;
      case "End":
        target = order[order.length - 1];
        break;
      case "PageDown":
        target = groups[groupIndex + 1]?.slots[0];
        break;
      case "PageUp":
        target = groups[groupIndex - 1]?.slots[0];
        break;
      case " ":
      case "Enter":
        event.preventDefault();
        if (slot.status === "available") onValueChange(slot.id, slot);
        return;
      default:
        return;
    }
    event.preventDefault();
    focusSlot(target);
  };

  const groupProps = {
    "aria-label": ariaLabelledBy ? undefined : (ariaLabel ?? "Start time"),
    "aria-labelledby": ariaLabelledBy,
    className: cn("flex flex-col gap-5", className),
    "data-slot": "slot-grid",
    ref: rootRef,
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

  return (
    <div {...groupProps} data-status="ready" role="radiogroup">
      {groups.map(({ period, slots: periodSlots }) => (
        <div className="flex flex-col gap-2" data-period={period} data-slot="slot-grid-period" key={period} role="group" aria-label={PERIOD_LABEL[period]}>
          <div aria-hidden="true" className="flex items-baseline gap-2 text-muted-foreground text-xs">
            <span className="font-medium uppercase tracking-wide">{PERIOD_LABEL[period]}</span>
            <span className="tabular-nums">{periodSlots.filter((s) => s.status === "available").length} free</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2" data-slot="slot-grid-row">
            {periodSlots.map((slot) => {
              const reason = describeSlotStatus(slot, locale);
              const time = formatTime(slot.start, { locale, timeZone });
              const viewerTime = showViewerTime && viewerTimeZone ? formatTime(slot.start, { locale, timeZone: viewerTimeZone }) : null;
              const checked = slot.id === value;
              const available = slot.status === "available";
              return (
                <Button
                  aria-checked={checked}
                  aria-disabled={available ? undefined : true}
                  aria-label={reason ? `${time}, ${reason}` : time}
                  className={cn(
                    "h-auto min-h-10 flex-col gap-0 px-2 py-1.5 font-normal tabular-nums sm:h-auto",
                    available ? "cursor-pointer" : "cursor-not-allowed",
                    !checked && SLOT_STYLE[slot.status],
                  )}
                  data-slot="slot"
                  data-slot-id={slot.id}
                  data-status={slot.status}
                  key={slot.id}
                  onClick={() => {
                    setFocusedId(slot.id);
                    if (available) onValueChange(slot.id, slot);
                  }}
                  onFocus={() => setFocusedId(slot.id)}
                  onKeyDown={(event) => onKeyDown(event, slot)}
                  role="radio"
                  tabIndex={slot.id === tabStopId ? 0 : -1}
                  title={reason ? `${time} · ${reason}` : undefined}
                  variant={checked ? "default" : available ? "outline" : "ghost"}
                >
                  <span className={cn("font-medium", slot.status === "booked" && "line-through decoration-muted-foreground/40")}>{time}</span>
                  {viewerTime && (
                    <span className={cn("text-[11px] leading-tight", checked ? "text-primary-foreground/72" : "text-muted-foreground/80")}>
                      {viewerTime}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
