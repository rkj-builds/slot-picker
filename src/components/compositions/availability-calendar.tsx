"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { parsePlainDate } from "@/lib/plain-date";
import { cn } from "@/lib/utils";
import { DateGrid, type DateGridRootProps } from "@/primitives/date-grid";

export interface AvailabilityCalendarProps extends Omit<DateGridRootProps, "render" | "className" | "children"> {
  className?: string;
  /** Names the grid; by default the month title does. */
  "aria-label"?: string;
}

/**
 * A month for booking: the DateGrid primitive in coss's look, with coss
 * Buttons to page. Each day shows its number; a label (a price) or badge sits
 * under it, outside the button and hidden from screen readers, because it is
 * already in the button's spoken name, so the button's visible text matches
 * its name (WCAG 2.5.3). A limited day carries a dot and the words "few times
 * left"; a full day is struck through and says "fully booked". The slide
 * between months runs under motion-safe only.
 */
export function AvailabilityCalendar({ className, "aria-label": ariaLabel, ...props }: AvailabilityCalendarProps): React.ReactElement {
  return (
    <DateGrid.Root className={cn("w-fit select-none", className)} data-slot="availability-calendar" {...props}>
      <div className="mb-2 flex items-center justify-between gap-2 ps-1">
        <DateGrid.Title className="font-medium text-base sm:text-sm" data-slot="availability-calendar-title" />
        <div className="flex gap-1">
          <DateGrid.PreviousMonth render={<Button size="icon-sm" variant="ghost" />}>
            <ChevronLeftIcon aria-hidden="true" className="rtl:-scale-x-100" />
          </DateGrid.PreviousMonth>
          <DateGrid.NextMonth render={<Button size="icon-sm" variant="ghost" />}>
            <ChevronRightIcon aria-hidden="true" className="rtl:-scale-x-100" />
          </DateGrid.NextMonth>
        </div>
      </div>
      <DateGrid.Grid
        aria-label={ariaLabel}
        className={(s) =>
          cn(
            "group/grid border-separate border-spacing-0.5",
            s.labelled ? "[--cell-h:--spacing(12)] [--cell-w:--spacing(10)] sm:[--cell-w:--spacing(11)]" : "[--cell-h:--spacing(9)] [--cell-w:--spacing(9)]",
            s.direction === "next" && "motion-safe:animate-calendar-next",
            s.direction === "prev" && "motion-safe:animate-calendar-prev",
          )
        }
        data-slot="availability-calendar-grid"
      >
        <DateGrid.Head>{(w) => <DateGrid.HeadCell className="h-7 font-normal text-muted-foreground text-xs" key={w.day} weekday={w} />}</DateGrid.Head>
        <DateGrid.Body outsideCellProps={{ className: "p-0" }}>
          {(date) => (
            <DateGrid.Cell className="relative p-0" date={date}>
              {(s) => (
                <>
                  <DateGrid.Day
                    className={cn(
                      "relative flex h-(--cell-h) w-(--cell-w) flex-col items-center rounded-lg text-sm tabular-nums outline-none transition-colors",
                      // When any day this month has a label, every number sits at the top, so the rows line up.
                      "justify-center group-data-labelled/grid:justify-start group-data-labelled/grid:pt-2",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                      !s.disabled && !s.selected && "hover:bg-accent",
                      s.disabled && "cursor-default text-muted-foreground/64",
                      s.status === "full" && "line-through decoration-muted-foreground/48",
                      s.selected && "bg-primary text-primary-foreground",
                      s.today && !s.selected && "font-semibold",
                    )}
                    data-slot="availability-calendar-day"
                  >
                    <span>{parsePlainDate(date).day}</span>
                    {s.today && !s.selected && <span aria-hidden="true" className="absolute bottom-1 size-1 rounded-full bg-foreground" />}
                    {s.status === "limited" && !s.selected && <span aria-hidden="true" className="absolute end-1 top-1 size-1.5 rounded-full bg-warning" />}
                  </DateGrid.Day>
                  {(Boolean(s.badge) || Boolean(s.label)) && (
                    // Outside the button and already in its spoken name; clicks pass through to the button.
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute inset-x-0 top-7.5 text-center text-[0.625rem] tabular-nums leading-none",
                        s.badge
                          ? s.selected
                            ? "font-semibold text-primary-foreground"
                            : "font-semibold text-success-foreground"
                          : s.selected
                            ? "text-primary-foreground/80"
                            : s.disabled
                              ? "text-muted-foreground/64"
                              : "text-muted-foreground",
                        s.status === "full" && "line-through decoration-muted-foreground/48",
                      )}
                    >
                      {s.badge ?? s.label}
                    </span>
                  )}
                </>
              )}
            </DateGrid.Cell>
          )}
        </DateGrid.Body>
      </DateGrid.Grid>
    </DateGrid.Root>
  );
}
