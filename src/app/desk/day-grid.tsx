"use client";

import { RepeatIcon } from "lucide-react";
import * as React from "react";
import { BookingContextMenu } from "@/app/desk/booking-context-menu";
import { bookingTitle, STATE_META, stateLabel } from "@/app/desk/booking-visuals";
import { describeBooking } from "@/app/desk/desk-model";
import { useDeskUi } from "@/app/desk/desk-ui";
import { LOCALE, minuteLabel, timeRangeOf } from "@/app/format";
import { useStore } from "@/app/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { type Booking, type Customer, deskState, duePaise } from "@/lib/booking";
import { formatCountdown, holdRemainingMs } from "@/lib/holds";
import { formatInr } from "@/lib/money";
import type { PlainDate } from "@/lib/plain-date";
import { bookingStart } from "@/lib/booking";
import { parseRecurringId, type RecurringBlock } from "@/lib/recurring-blocks";
import { cn } from "@/lib/utils";
import { SlotGrid } from "@/primitives/slot-grid";
import { summarizeRecurrence } from "@/primitives/recurrence";
import { COURTS, hourlyRateAt, isPeak, type VenueSettings } from "@/lib/venue";

const ROW_REM = 2.75;
const STEP = 30;

/**
 * The day as the desk sees it: courts across, half hours down. Every empty
 * half hour is a button ("Court 2, 7:00 pm, empty, ₹800 an hour") that
 * opens New booking; every booking is a button that opens its panel; a
 * repeating block opens its schedule.
 *
 * The SlotGrid primitive in its desk skin: `selectionMode="none"` (cells are
 * actions, so a group of buttons, not a radiogroup) and
 * `orientation="vertical"` (each court is a column). One tab stop for the
 * whole grid; ↑ ↓ move by half an hour (a booking is one stop however long
 * it is), ← → to the other court at the same time, Home / End to the ends of
 * the court's day, Page Up / Down to the other court's first cell.
 */
export function DayGrid({
  date,
  open,
  close,
  bookings,
  cancelled,
  customers,
  settings,
  now,
}: {
  date: PlainDate;
  open: number;
  close: number;
  bookings: readonly Booking[];
  /** Shown as ghosts beside the live bookings when the toggle is on. */
  cancelled: readonly Booking[];
  customers: readonly Customer[];
  settings: VenueSettings;
  now: number;
}): React.ReactElement {
  const ui = useDeskUi();
  const { state } = useStore();
  const rows = React.useMemo(() => Array.from({ length: Math.max(0, (close - open) / STEP) }, (_, i) => open + i * STEP), [open, close]);
  const firstBooking = [...bookings].sort((a, b) => a.startMinute - b.startMinute || a.courtId.localeCompare(b.courtId))[0];
  const nowMinute = minuteOfDayIn(now, date);

  return (
    <Card className="overflow-hidden" data-slot="day-grid-frame">
      {/* coss ScrollArea: on a narrow window the two courts scroll sideways instead of squeezing. */}
      <ScrollArea scrollFade>
      <SlotGrid.Root
        aria-label="Courts by half hour"
        className="relative grid min-w-[34rem] grid-cols-[4.5rem_repeat(2,minmax(0,1fr))]"
        data-slot="day-grid"
        defaultHighlightedValue={firstBooking?.id ?? null}
        orientation="vertical"
        selectionMode="none"
      >
        <div className="col-span-3 grid grid-cols-subgrid border-b">
          <span className="px-3 py-2 text-muted-foreground text-xs">Time</span>
          {COURTS.map((c) => (
            <span className="border-s px-3 py-2 font-medium text-sm" key={c.id}>
              {c.name}
            </span>
          ))}
        </div>

        {/* Time gutter */}
        <div aria-hidden="true" className="relative" style={{ height: `${rows.length * ROW_REM}rem` }}>
          {rows.map((minute, i) =>
            minute % 60 === 0 ? (
              <span className={cn("absolute end-2 text-[11px] text-muted-foreground tabular-nums", i === 0 ? "translate-y-1" : "-translate-y-1/2")} key={minute} style={{ top: `${i * ROW_REM}rem` }}>
                {minuteLabel(minute, date)}
              </span>
            ) : null,
          )}
        </div>

        {COURTS.map((court) => {
          const onCourt = bookings.filter((b) => b.courtId === court.id);
          const placed = new Set<string>();
          return (
            <SlotGrid.Group aria-label={court.name} className="relative border-s" key={court.id} style={{ height: `${rows.length * ROW_REM}rem` }}>
              {/* Cells in time order, so the keyboard walks the court top to bottom. */}
              {rows.map((minute, row) => {
                const booking = onCourt.find((b) => b.startMinute <= minute && minute < b.startMinute + b.durationMinutes);
                if (booking) {
                  if (placed.has(booking.id)) return null;
                  placed.add(booking.id);
                  return (
                    <BookingBlock
                      booking={booking}
                      customers={customers}
                      key={booking.id}
                      narrow={cancelled.length > 0}
                      now={now}
                      onOpen={() => {
                        const recurring = parseRecurringId(booking.id);
                        if (recurring) ui.openRepeat(recurring);
                        else ui.openBooking(booking.id);
                      }}
                      open={open}
                      repeat={repeatSummary(state.recurringBlocks, booking.id)}
                    />
                  );
                }
                const rate = hourlyRateAt(settings, date, minute);
                const peak = isPeak(settings, date, minute);
                return (
                  <Tooltip key={minute}>
                    <TooltipTrigger
                      render={
                        <SlotGrid.Cell
                          end={minute + STEP}
                          label={`${court.name}, ${minuteLabel(minute, date)}, empty, ${formatInr(rate)} an hour`}
                          onClick={() => ui.newBooking({ courtId: court.id, date, startMinute: minute })}
                          render={
                            <Button
                              className={cn(
                                "group absolute inset-x-0 h-auto justify-end rounded-none px-2 font-normal focus-visible:z-10 focus-visible:ring-inset focus-visible:ring-offset-0 pointer-coarse:after:min-h-0 pointer-coarse:after:min-w-0 sm:h-auto",
                                minute % 60 === 0 ? "border-t-border" : "border-dashed border-t-border/40",
                                "border-x-0 border-b-0",
                                nowMinute !== null && minute + STEP <= nowMinute && "bg-muted/30",
                              )}
                              data-slot="day-grid-empty"
                              style={{ top: `${row * ROW_REM}rem`, height: `${ROW_REM}rem` }}
                              variant="ghost"
                            />
                          }
                          start={minute}
                          value={`empty:${court.id}:${minute}`}
                        />
                      }
                    >
                      <span aria-hidden="true" className="text-[11px] text-muted-foreground opacity-0 tabular-nums transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        + {formatInr(rate)}
                      </span>
                    </TooltipTrigger>
                    <TooltipPopup>
                      {minuteLabel(minute, date)} · {formatInr(rate)} an hour{peak ? " · peak" : ""}
                    </TooltipPopup>
                  </Tooltip>
                );
              })}

              {cancelled
                .filter((b) => b.courtId === court.id)
                .map((b) => (
                  <Button
                    aria-hidden="true"
                    className="absolute end-1 h-auto w-[28%] justify-start overflow-hidden rounded-md border-foreground/20 border-dashed bg-background/80 px-1.5 py-1 font-normal text-[11px] text-muted-foreground line-through sm:h-auto sm:text-[11px]"
                    data-slot="day-grid-ghost"
                    key={b.id}
                    onClick={() => ui.openBooking(b.id)}
                    style={blockStyle(b, open)}
                    tabIndex={-1}
                    variant="outline"
                  >
                    <span className="truncate">{bookingTitle(b, customers)}</span>
                  </Button>
                ))}
            </SlotGrid.Group>
          );
        })}

        {nowMinute !== null && nowMinute >= open && nowMinute <= close && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 z-20 col-start-2 col-end-4 flex items-center"
            data-slot="day-grid-now"
            style={{ top: `calc(2.3rem + ${((nowMinute - open) / STEP) * ROW_REM}rem)` }}
          >
            <span className="-ms-1 size-2 rounded-full bg-destructive" />
            <span className="h-px flex-1 bg-destructive" />
          </div>
        )}
      </SlotGrid.Root>
      </ScrollArea>
    </Card>
  );
}

/** "Every Sat and Sun, 4 – 5 pm" for an occurrence of a repeating block, else null. */
function repeatSummary(blocks: readonly RecurringBlock[], bookingId: string): string | null {
  const ref = parseRecurringId(bookingId);
  const block = ref ? blocks.find((b) => b.id === ref.blockId) : undefined;
  return block ? summarizeRecurrence(block.rule, LOCALE, { omitExceptions: true }) : null;
}

function blockStyle(b: Booking, open: number): React.CSSProperties {
  return { top: `${((b.startMinute - open) / STEP) * ROW_REM + 0.125}rem`, height: `${(b.durationMinutes / STEP) * ROW_REM - 0.25}rem` };
}

function BookingBlock({
  booking,
  customers,
  now,
  open,
  narrow,
  repeat,
  onOpen,
}: {
  booking: Booking;
  customers: readonly Customer[];
  now: number;
  open: number;
  narrow: boolean;
  /** The schedule, when this is a repeating block's occurrence. */
  repeat: string | null;
  onOpen: () => void;
}): React.ReactElement {
  const state = deskState(booking, now);
  const meta = STATE_META[state];
  const Icon = meta.icon;
  const due = duePaise(booking);
  const court = COURTS.find((c) => c.id === booking.courtId)?.name ?? "";
  const short = booking.durationMinutes <= 30;
  const placement = cn("absolute start-1 z-[1]", narrow ? "w-[calc(70%-0.25rem)]" : "end-1");
  const cell = (
    <SlotGrid.Cell
      end={booking.startMinute + booking.durationMinutes}
      label={`${court}, ${timeRangeOf(booking)}, ${describeBooking(booking, customers, state, now)}${repeat ? `, repeats ${repeat}` : ""}`}
      onClick={onOpen}
      render={
        <Button
          className={cn(
            "size-full flex-col items-start justify-start gap-0.5 overflow-hidden px-2 py-1.5 text-start font-normal text-xs shadow-xs/5 transition-[box-shadow,background-color] duration-150 ease-out-quart hover:shadow-md/10 focus-visible:z-10 pointer-coarse:after:min-h-0 pointer-coarse:after:min-w-0 sm:h-full sm:text-xs",
            meta.block,
          )}
          data-slot="day-grid-booking"
          data-state={state}
          variant="outline"
        />
      }
      start={booking.startMinute}
      value={booking.id}
    >
      <span className="flex w-full min-w-0 items-center gap-1.5">
        <Icon aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate font-medium" data-name="">
          {bookingTitle(booking, customers)}
        </span>
        {state === "held" && (
          <span className="ms-auto font-medium tabular-nums" data-slot="day-grid-countdown">
            {formatCountdown(holdRemainingMs(booking, now))}
          </span>
        )}
        {repeat && <RepeatIcon aria-hidden="true" className="ms-auto size-3.5 shrink-0" data-slot="day-grid-repeat" />}
      </span>
      {!short && (
        <span className="flex w-full min-w-0 items-center gap-1 text-muted-foreground">
          <span className="truncate tabular-nums">{timeRangeOf(booking)}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{repeat ?? (state === "part-paid" || state === "due" ? `${formatInr(due)} due` : stateLabel(state))}</span>
        </span>
      )}
    </SlotGrid.Cell>
  );
  // A repeating block has no booking actions to offer on right-click: its schedule opens on click.
  return repeat ? (
    <div className={placement} style={blockStyle(booking, open)}>
      {cell}
    </div>
  ) : (
    <BookingContextMenu booking={booking} className={placement} now={now} style={blockStyle(booking, open)}>
      {cell}
    </BookingContextMenu>
  );
}

/** Minutes since midnight at the venue if `now` falls on `date`, else null. */
function minuteOfDayIn(now: number, date: PlainDate): number | null {
  const start = bookingStart({ date, startMinute: 0 });
  const minutes = Math.floor((now - start) / 60_000);
  return minutes >= 0 && minutes < 24 * 60 ? minutes : null;
}
