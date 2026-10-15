"use client";

import * as React from "react";
import { BookingContextMenu } from "@/app/desk/booking-context-menu";
import { bookingTitle, STATE_META, stateLabel } from "@/app/desk/booking-visuals";
import { describeBooking } from "@/app/desk/desk-model";
import { useDeskUi } from "@/app/desk/desk-ui";
import { minuteLabel, timeRangeOf } from "@/app/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { type Booking, type Customer, deskState, duePaise } from "@/lib/booking";
import { formatCountdown, holdRemainingMs } from "@/lib/holds";
import { formatInr } from "@/lib/money";
import type { PlainDate } from "@/lib/plain-date";
import { bookingStart } from "@/lib/booking";
import { cn } from "@/lib/utils";
import { COURTS, type CourtId, hourlyRateAt, isPeak, type VenueSettings } from "@/lib/venue";

const ROW_REM = 2.75;
const STEP = 30;

interface Cell {
  /** The focus target: a booking id, or "empty:<court>:<minute>". */
  id: string;
  booking?: Booking;
  courtId: CourtId;
  minute: number;
}

/**
 * The day as the desk sees it: courts across, half hours down. Every empty
 * half hour is a button ("Court 2, 7:00 pm, empty, ₹800 an hour") that
 * opens New booking; every booking is a button that opens its panel.
 *
 * One tab stop for the whole grid. Arrow keys move like a spreadsheet:
 * up/down by half an hour (a booking is one stop however long it is),
 * left/right between courts at the same time, Home/End to the ends of the day.
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
  const rows = React.useMemo(() => Array.from({ length: Math.max(0, (close - open) / STEP) }, (_, i) => open + i * STEP), [open, close]);

  // matrix[row][col] → the cell covering that half hour on that court.
  const matrix = React.useMemo(
    () =>
      rows.map((minute) =>
        COURTS.map((court): Cell => {
          const booking = bookings.find((b) => b.courtId === court.id && b.startMinute <= minute && minute < b.startMinute + b.durationMinutes);
          return booking ? { id: booking.id, booking, courtId: court.id, minute: booking.startMinute } : { id: `empty:${court.id}:${minute}`, courtId: court.id, minute };
        }),
      ),
    [rows, bookings],
  );

  const rootRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState<{ row: number; col: number }>(() => {
    const firstBooking = matrix.findIndex((r) => r.some((c) => c.booking));
    return { row: Math.max(0, firstBooking), col: Math.max(0, matrix[Math.max(0, firstBooking)]?.findIndex((c) => c.booking) ?? 0) };
  });
  const activeId = matrix[active.row]?.[active.col]?.id ?? matrix[0]?.[0]?.id;

  const move = (row: number, col: number): void => {
    const r = Math.min(Math.max(row, 0), rows.length - 1);
    const c = Math.min(Math.max(col, 0), COURTS.length - 1);
    setActive({ row: r, col: c });
    const id = matrix[r]?.[c]?.id;
    if (id) rootRef.current?.querySelector<HTMLElement>(`[data-cell-id="${CSS.escape(id)}"]`)?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, row: number, col: number): void => {
    const cell = matrix[row]?.[col];
    if (!cell) return;
    // A booking spans rows: step off its first or last row, not one row at a time.
    const firstRow = cell.booking ? rows.indexOf(cell.booking.startMinute) : row;
    const lastRow = cell.booking ? firstRow + cell.booking.durationMinutes / STEP - 1 : row;
    const keys: Record<string, () => void> = {
      ArrowDown: () => move(Math.max(row, lastRow) + 1, col),
      ArrowUp: () => move((firstRow < 0 ? row : firstRow) - 1, col),
      ArrowRight: () => move(row, col + 1),
      ArrowLeft: () => move(row, col - 1),
      Home: () => move(0, col),
      End: () => move(rows.length - 1, col),
    };
    const action = keys[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  };

  const nowMinute = minuteOfDayIn(now, date);

  return (
    <Card className="overflow-hidden" data-slot="day-grid-frame">
      {/* coss ScrollArea: on a narrow window the two courts scroll sideways instead of squeezing. */}
      <ScrollArea scrollFade>
      <div
        aria-label="Courts by half hour"
        className="relative grid min-w-[34rem] grid-cols-[4.5rem_repeat(2,minmax(0,1fr))]"
        data-slot="day-grid"
        ref={rootRef}
        role="group"
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

        {COURTS.map((court, col) => (
          <div className="relative border-s" key={court.id} style={{ height: `${rows.length * ROW_REM}rem` }}>
            {rows.map((minute, row) => {
              const cell = matrix[row]?.[col];
              if (!cell || cell.booking) return null;
              const rate = hourlyRateAt(settings, date, minute);
              const peak = isPeak(settings, date, minute);
              return (
                <Tooltip key={minute}>
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label={`${court.name}, ${minuteLabel(minute, date)}, empty, ${formatInr(rate)} an hour`}
                        className={cn(
                          "group absolute inset-x-0 h-auto justify-end rounded-none px-2 font-normal focus-visible:z-10 focus-visible:ring-inset focus-visible:ring-offset-0 pointer-coarse:after:min-h-0 pointer-coarse:after:min-w-0 sm:h-auto",
                          minute % 60 === 0 ? "border-t-border" : "border-dashed border-t-border/40",
                          "border-x-0 border-b-0",
                          nowMinute !== null && minute + STEP <= nowMinute && "bg-muted/30",
                        )}
                        data-cell-id={cell.id}
                        data-slot="day-grid-empty"
                        onClick={() => ui.newBooking({ courtId: court.id, date, startMinute: minute })}
                        onFocus={() => setActive({ row, col })}
                        onKeyDown={(event) => onKeyDown(event, row, col)}
                        style={{ top: `${row * ROW_REM}rem`, height: `${ROW_REM}rem` }}
                        tabIndex={cell.id === activeId ? 0 : -1}
                        variant="ghost"
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

            {bookings
              .filter((b) => b.courtId === court.id)
              .map((b) => {
                const row = rows.indexOf(b.startMinute);
                return (
                  <BookingBlock
                    active={b.id === activeId}
                    booking={b}
                    customers={customers}
                    key={b.id}
                    narrow={cancelled.length > 0}
                    now={now}
                    onFocus={() => setActive({ row: Math.max(0, row), col })}
                    onKeyDown={(event) => onKeyDown(event, Math.max(0, row), col)}
                    onOpen={() => ui.openBooking(b.id)}
                    open={open}
                  />
                );
              })}
          </div>
        ))}

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
      </div>
      </ScrollArea>
    </Card>
  );
}

function blockStyle(b: Booking, open: number): React.CSSProperties {
  return { top: `${((b.startMinute - open) / STEP) * ROW_REM + 0.125}rem`, height: `${(b.durationMinutes / STEP) * ROW_REM - 0.25}rem` };
}

function BookingBlock({
  booking,
  customers,
  now,
  open,
  active,
  narrow,
  onOpen,
  onFocus,
  onKeyDown,
}: {
  booking: Booking;
  customers: readonly Customer[];
  now: number;
  open: number;
  active: boolean;
  narrow: boolean;
  onOpen: () => void;
  onFocus: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}): React.ReactElement {
  const state = deskState(booking, now);
  const meta = STATE_META[state];
  const Icon = meta.icon;
  const due = duePaise(booking);
  const court = COURTS.find((c) => c.id === booking.courtId)?.name ?? "";
  const short = booking.durationMinutes <= 30;
  return (
    <BookingContextMenu
      booking={booking}
      className={cn("absolute start-1 z-[1]", narrow ? "w-[calc(70%-0.25rem)]" : "end-1")}
      now={now}
      style={blockStyle(booking, open)}
    >
      <Button
        aria-label={`${court}, ${timeRangeOf(booking)}, ${describeBooking(booking, customers, state, now)}`}
        className={cn(
          "size-full flex-col items-start justify-start gap-0.5 overflow-hidden px-2 py-1.5 text-start font-normal text-xs shadow-xs/5 transition-[box-shadow,background-color] duration-150 ease-out-quart hover:shadow-md/10 focus-visible:z-10 pointer-coarse:after:min-h-0 pointer-coarse:after:min-w-0 sm:h-full sm:text-xs",
          meta.block,
        )}
        data-cell-id={booking.id}
        data-slot="day-grid-booking"
        data-state={state}
        onClick={onOpen}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        tabIndex={active ? 0 : -1}
        variant="outline"
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
        </span>
        {!short && (
          <span className="flex w-full min-w-0 items-center gap-1 text-muted-foreground">
            <span className="truncate tabular-nums">{timeRangeOf(booking)}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0">{state === "part-paid" || state === "due" ? `${formatInr(due)} due` : stateLabel(state)}</span>
          </span>
        )}
      </Button>
    </BookingContextMenu>
  );
}

/** Minutes since midnight at the venue if `now` falls on `date`, else null. */
function minuteOfDayIn(now: number, date: PlainDate): number | null {
  const start = bookingStart({ date, startMinute: 0 });
  const minutes = Math.floor((now - start) / 60_000);
  return minutes >= 0 && minutes < 24 * 60 ? minutes : null;
}
