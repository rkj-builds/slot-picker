"use client";

import { CalendarOffIcon, Columns3Icon, ListIcon } from "lucide-react";
import * as React from "react";
import { DayStepper } from "@/components/booking/day-stepper";
import { SegmentedControl, SegmentedControlItem } from "@/components/compositions/segmented-control";
import { useResources } from "@/components/compositions/resources/context";
import { Pane } from "@/components/compositions/resources/kit";
import { bookingTitle, dayLabel, minuteLabel, SOURCE_LABEL, spanLabel } from "@/components/compositions/resources/words";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Popover, PopoverDescription, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import type { PlainDate } from "@/lib/plain-date";
import { hoursOn, type Resource, type ResourceBooking } from "@/lib/resources";
import { cn } from "@/lib/utils";
import { SlotGrid } from "@/primitives/slot-grid";

type View = "list" | "resources";

const STEP = 30;
const ROW_REM = 2.5;

/**
 * Cal.com's Bookings page with one more way to see the day: by resource, the
 * venue's evening court by court. The same bookings as the list, turned sideways.
 */
export function ResourceBookings(): React.ReactElement {
  const { resources, bookings, date: initial, timeZone, locale, now } = useResources("ResourceBookings");
  const [date, setDate] = React.useState<PlainDate>(initial);
  const [view, setView] = React.useState<View>("resources");
  const onDay = bookings.filter((b) => b.date === date).sort((a, b) => a.startMinute - b.startMinute);

  return (
    <Pane data-screen="bookings">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value="upcoming">
          <TabsList aria-label="Bookings" size="sm">
            <TabsTab value="upcoming">Upcoming</TabsTab>
            <TabsTab disabled value="unconfirmed">
              Unconfirmed
            </TabsTab>
            <TabsTab disabled value="recurring">
              Recurring
            </TabsTab>
            <TabsTab disabled value="past">
              Past
            </TabsTab>
            <TabsTab disabled value="canceled">
              Canceled
            </TabsTab>
          </TabsList>
        </Tabs>
        <SegmentedControl<View> aria-label="View" onValueChange={setView} size="sm" value={view}>
          <SegmentedControlItem<View> value="list">
            <ListIcon aria-hidden="true" />
            List
          </SegmentedControlItem>
          <SegmentedControlItem<View> value="resources">
            <Columns3Icon aria-hidden="true" />
            By resource
          </SegmentedControlItem>
        </SegmentedControl>
      </div>
      <DayStepper locale={locale} now={now} onValueChange={setDate} timeZone={timeZone} value={date} />
      {view === "list" ? (
        onDay.length === 0 ? (
          <Empty className="rounded-xl border border-dashed py-10 md:py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarOffIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Nothing on {dayLabel(date, locale)}</EmptyTitle>
              <EmptyDescription>Bookings on any resource show here, and court by court under By resource.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul aria-label={`Bookings on ${dayLabel(date, locale)}`} className="flex flex-col divide-y rounded-xl border">
            {onDay.map((b) => (
              <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3" key={b.id}>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium text-sm">
                    <bdi>{bookingTitle(b)}</bdi>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    <span className="tabular-nums">{spanLabel(b, timeZone, locale)}</span> · {resources.find((r) => r.id === b.resourceId)?.name ?? b.resourceId} · {SOURCE_LABEL[b.source]}
                  </span>
                </span>
                {b.reference && <span className="font-mono text-muted-foreground text-xs">{b.reference}</span>}
              </li>
            ))}
          </ul>
        )
      ) : (
        <ResourceDayGrid bookings={onDay} date={date} resources={resources} />
      )}
    </Pane>
  );
}

/** Courts across, half hours down: the SlotGrid primitive in a third skin, one tab stop, a booking per cell. */
export function ResourceDayGrid({ resources, bookings, date }: { resources: readonly Resource[]; bookings: readonly ResourceBooking[]; date: PlainDate }): React.ReactElement {
  const { timeZone, locale } = useResources("ResourceDayGrid");
  const open = resources.map((r) => ({ r, h: hoursOn(r, date) })).filter(({ h }) => !h.closed);
  const first = open.length > 0 ? Math.min(...open.map(({ h }) => h.open)) : 0;
  const last = open.length > 0 ? Math.max(...open.map(({ h }) => h.close)) : 0;
  const rows = Array.from({ length: Math.max(0, (last - first) / STEP) }, (_, i) => first + i * STEP);
  const frame = React.useRef<HTMLDivElement | null>(null);

  // Open on the first booking of the day (an hour above it), else on 5 pm; nobody wants to scroll past the empty morning.
  React.useEffect(() => {
    const viewport = frame.current?.querySelector<HTMLElement>("[data-slot=scroll-area-viewport]");
    if (!viewport) return;
    const target = bookings[0] ? bookings[0].startMinute - 60 : 17 * 60;
    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    viewport.scrollTop = Math.max(0, ((target - first) / STEP) * ROW_REM * rem);
  }, [bookings, first, date]);

  if (open.length === 0) {
    return (
      <Empty className="rounded-xl border border-dashed py-10 md:py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarOffIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Closed on {dayLabel(date, locale)}</EmptyTitle>
          <EmptyDescription>Every resource is closed that day.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border" data-slot="resource-day-grid" ref={frame}>
      <ScrollArea className="h-96" scrollFade>
        <SlotGrid.Root
          aria-label={`Bookings by resource, ${dayLabel(date, locale)}`}
          className="relative grid min-w-[30rem]"
          defaultHighlightedValue={bookings[0]?.id ?? null}
          orientation="vertical"
          selectionMode="none"
          style={{ gridTemplateColumns: `4rem repeat(${resources.length}, minmax(0, 1fr))` }}
        >
          <div className="sticky top-0 z-10 col-span-full grid grid-cols-subgrid border-b bg-background">
            <span className="px-3 py-2 text-muted-foreground text-xs">Time</span>
            {resources.map((r) => (
              <span className="flex items-center gap-2 border-s px-3 py-2 font-medium text-sm" key={r.id}>
                <bdi className="truncate">{r.name}</bdi>
                {!r.active && (
                  <Badge size="sm" variant="warning">
                    Paused
                  </Badge>
                )}
              </span>
            ))}
          </div>
          <div aria-hidden="true" className="relative" style={{ height: `${rows.length * ROW_REM}rem` }}>
            {rows.map((minute, i) =>
              minute % 60 === 0 ? (
                <span className={cn("absolute end-2 text-[11px] text-muted-foreground tabular-nums", i === 0 ? "translate-y-1" : "-translate-y-1/2")} key={minute} style={{ top: `${i * ROW_REM}rem` }}>
                  {minuteLabel(minute, timeZone, locale, date)}
                </span>
              ) : null,
            )}
          </div>
          {resources.map((r) => {
            const hours = hoursOn(r, date);
            const own = bookings.filter((b) => b.resourceId === r.id);
            return (
              <SlotGrid.Group aria-label={r.name} className="relative border-s" key={r.id} style={{ height: `${rows.length * ROW_REM}rem` }}>
                {rows.map((minute, i) => (
                  <span
                    aria-hidden="true"
                    className={cn("absolute inset-x-0 border-t", minute % 60 === 0 ? "border-border" : "border-dashed border-border/40", (hours.closed || minute < hours.open || minute >= hours.close) && "bg-muted/60")}
                    key={minute}
                    style={{ top: `${i * ROW_REM}rem`, height: `${ROW_REM}rem` }}
                  />
                ))}
                {own.map((b) => (
                  <BookingCell booking={b} first={first} key={b.id} resource={r} />
                ))}
              </SlotGrid.Group>
            );
          })}
        </SlotGrid.Root>
      </ScrollArea>
    </div>
  );
}

function BookingCell({ booking, resource, first }: { booking: ResourceBooking; resource: Resource; first: number }): React.ReactElement {
  const { timeZone, locale } = useResources("BookingCell");
  const when = spanLabel(booking, timeZone, locale);
  return (
    <Popover>
      <PopoverTrigger
        render={
          <SlotGrid.Cell
            end={booking.startMinute + booking.durationMinutes}
            label={`${resource.name}, ${when}, ${bookingTitle(booking)}, ${SOURCE_LABEL[booking.source]}`}
            render={
              <Button
                className="absolute inset-x-1 z-[1] h-auto flex-col items-start justify-start gap-0.5 overflow-hidden border-s-[3px] border-s-foreground px-2 py-1.5 text-start font-normal text-xs motion-safe:animate-fade-in sm:h-auto sm:text-xs"
                data-slot="resource-booking"
                variant="outline"
              />
            }
            start={booking.startMinute}
            value={booking.id}
          />
        }
        style={{ top: `${((booking.startMinute - first) / STEP) * ROW_REM + 0.125}rem`, height: `${(booking.durationMinutes / STEP) * ROW_REM - 0.25}rem` }}
      >
        <span className="w-full truncate font-medium">
          <bdi>{bookingTitle(booking)}</bdi>
        </span>
        <span className="w-full truncate text-muted-foreground">
          <span className="tabular-nums">{when}</span> · {SOURCE_LABEL[booking.source]}
        </span>
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-64">
        <PopoverTitle>
          <bdi>{bookingTitle(booking)}</bdi>
        </PopoverTitle>
        <PopoverDescription>
          {resource.name} · <span className="tabular-nums">{when}</span>
          <br />
          {SOURCE_LABEL[booking.source]}
          {booking.reference ? (
            <>
              {" · "}
              <span className="font-mono">{booking.reference}</span>
            </>
          ) : null}
        </PopoverDescription>
      </PopoverPopup>
    </Popover>
  );
}
