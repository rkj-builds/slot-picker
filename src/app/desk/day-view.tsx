"use client";

import { CalendarOffIcon, EyeOffIcon, InfoIcon, PlusIcon, RepeatIcon } from "lucide-react";
import * as React from "react";
import { BookingContextMenu } from "@/app/desk/booking-context-menu";
import { bookingTitle, STATE_META, stateLabel } from "@/app/desk/booking-visuals";
import { DayGrid } from "@/app/desk/day-grid";
import { dayStats, describeBooking } from "@/app/desk/desk-model";
import { DeskViewToolbar } from "@/app/desk/desk-toolbar";
import { useDeskUi } from "@/app/desk/desk-ui";
import { durationOf, LOCALE, timeRangeOf } from "@/app/format";
import { navigate } from "@/app/router";
import { useStore } from "@/app/store";
import { DayStepper } from "@/components/booking/day-stepper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Toggle } from "@/components/ui/toggle";
import { Toolbar, ToolbarButton, ToolbarGroup, ToolbarSeparator } from "@/components/ui/toolbar";
import { useMediaQuery } from "@/hooks/use-media-query";
import { type Booking, deskState, duePaise, sortBookings } from "@/lib/booking";
import { formatInr } from "@/lib/money";
import { type PlainDate, weekdayOf } from "@/lib/plain-date";
import { bookingsWithBlocks, parseRecurringId } from "@/lib/recurring-blocks";
import { cn } from "@/lib/utils";
import { COURTS, VENUE, WEEKDAY_LABEL } from "@/lib/venue";

export function DayView({ date, now, today }: { date: PlainDate; now: number; today: PlainDate }): React.ReactElement {
  const { state } = useStore();
  const ui = useDeskUi();
  const wide = useMediaQuery("md");
  // ?cancelled=1 opens the day with cancelled bookings shown (a shareable view, and the demo's jump).
  const [showCancelled, setShowCancelled] = React.useState(() => new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("cancelled") === "1");
  const hours = state.settings.hours[weekdayOf(date)];

  // The day's bookings plus any repeating block's occurrence on it (the weekend club hold).
  const ofDay = bookingsWithBlocks(state, date).filter((b) => b.date === date).sort(sortBookings);
  const live = ofDay.filter((b) => !["cancelled", "expired"].includes(deskState(b, now)));
  const gone = ofDay.filter((b) => ["cancelled", "expired"].includes(deskState(b, now)));
  const stats = dayStats(ofDay, now);

  const firstFree = { courtId: COURTS[0]?.id ?? "court-1", date, startMinute: hours.open };

  return (
    <div className="flex flex-col gap-4">
      <DeskViewToolbar>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DayStepper
          locale={LOCALE}
          now={now}
          onValueChange={(next) => navigate("/desk", { date: next === today ? null : next })}
          showToday
          timeZone={VENUE.timeZone}
          value={date}
        />
        <Toolbar aria-label="Day actions" className="ms-auto">
          <ToolbarGroup>
            <ToolbarButton
              aria-label={`Show cancelled${gone.length > 0 ? ` (${gone.length})` : ""}`}
              render={<Toggle onPressedChange={setShowCancelled} pressed={showCancelled} />}
            >
              <EyeOffIcon aria-hidden="true" />
              <span aria-hidden="true">
                <span className="max-sm:hidden">Show cancelled</span>
                <span className="sm:hidden">Cancelled</span>
                {gone.length > 0 ? ` (${gone.length})` : ""}
              </span>
            </ToolbarButton>
          </ToolbarGroup>
          <ToolbarSeparator orientation="vertical" />
          <ToolbarGroup>
            <ToolbarButton aria-label="Block courts" onClick={() => ui.blockCourts(date)} render={<Button variant="outline" />}>
              <RepeatIcon aria-hidden="true" />
              <span className="max-sm:hidden">Block courts</span>
            </ToolbarButton>
            <ToolbarButton aria-label="New booking" onClick={() => ui.newBooking(firstFree)} render={<Button />}>
              <PlusIcon aria-hidden="true" />
              New<span className="max-sm:sr-only"> booking</span>
            </ToolbarButton>
          </ToolbarGroup>
        </Toolbar>
      </div>
      </DeskViewToolbar>

      {/* The day's numbers and the key on one line: the grid is what the screen is for. */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1" data-slot="day-stats">
          <Stat label="Booked" value={stats.minutesBooked === 0 ? "None" : durationOf(stats.minutesBooked, "short")} />
          <Stat label="Expected" value={formatInr(stats.expectedPaise)} />
          <Stat label="Collected" value={formatInr(stats.collectedPaise)} />
          <Stat emphasis={stats.duePaise > 0} label="Due" value={formatInr(stats.duePaise)} />
        </dl>
        <Legend />
      </div>

      {hours.closed || hours.close <= hours.open ? (
        <Empty className="rounded-2xl border border-dashed" role="status">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarOffIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Closed on {WEEKDAY_LABEL[weekdayOf(date)].long}s</EmptyTitle>
            <EmptyDescription>Change opening hours in Settings to take bookings on this day.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : wide ? (
        <>
          {live.length === 0 && (
            <Alert role="status" variant="info">
              <InfoIcon aria-hidden="true" />
              <AlertDescription>Nothing booked yet. Pick any half hour to add a booking.</AlertDescription>
            </Alert>
          )}
          <DayGrid
            bookings={live}
            cancelled={showCancelled ? gone : []}
            close={hours.close}
            customers={state.customers}
            date={date}
            now={now}
            open={hours.open}
            settings={state.settings}
          />
        </>
      ) : (
        <DayList bookings={showCancelled ? ofDay : live} now={now} />
      )}

      {wide && showCancelled && gone.length > 0 && (
        <section aria-labelledby="cancelled-heading" className="flex flex-col gap-2">
          <h2 className="font-medium text-sm" id="cancelled-heading">
            Cancelled and expired
          </h2>
          <ul className="flex flex-wrap gap-2">
            {gone.map((b) => (
              <li key={b.id}>
                <Button onClick={() => ui.openBooking(b.id)} size="sm" variant="outline">
                  <span className="line-through">{bookingTitle(b, state.customers)}</span>
                  <span className="text-muted-foreground">{timeRangeOf(b)}</span>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** A dt/dd pair inline (label, then the number); the div is the dl's grouping element, so the list stays valid. */
function Stat({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }): React.ReactElement {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={cn("font-semibold text-sm tabular-nums", emphasis && "text-warning-foreground")}>{value}</dd>
    </div>
  );
}

function Legend(): React.ReactElement {
  const states = ["paid", "part-paid", "due", "held", "coaching", "blocked", "no-show"] as const;
  return (
    <ul aria-label="Legend" className="flex flex-wrap items-center gap-1.5">
      {states.map((s) => {
        const Icon = STATE_META[s].icon;
        return (
          <li key={s}>
            <Badge variant={STATE_META[s].badge}>
              <Icon aria-hidden="true" />
              {stateLabel(s)}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}

/** Phones get a list per court: the grid would be too narrow to read. Long-press a booking for its actions. */
function DayList({ bookings, now }: { bookings: readonly Booking[]; now: number }): React.ReactElement {
  const { state } = useStore();
  const ui = useDeskUi();
  return (
    <div className="flex flex-col gap-5">
      {COURTS.map((court) => {
        const list = bookings.filter((b) => b.courtId === court.id);
        return (
          <section aria-labelledby={`list-${court.id}`} className="flex flex-col gap-2" key={court.id}>
            <h2 className="font-medium text-sm" id={`list-${court.id}`}>
              {court.name}
            </h2>
            {list.length === 0 ? (
              <Empty className="rounded-xl border border-dashed p-4 md:p-4">
                <EmptyHeader>
                  <EmptyDescription>Nothing booked on {court.name}.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {list.map((b) => {
                  const ds = deskState(b, now);
                  const Icon = STATE_META[ds].icon;
                  const item = (
                        <Button
                          aria-label={`${court.name}, ${timeRangeOf(b)}, ${describeBooking(b, state.customers, ds, now)}`}
                          className={cn("h-auto w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-start font-normal sm:h-auto", STATE_META[ds].block)}
                          onClick={() => {
                            const recurring = parseRecurringId(b.id);
                            if (recurring) ui.openRepeat(recurring);
                            else ui.openBooking(b.id);
                          }}
                          variant="outline"
                        >
                          <Icon aria-hidden="true" className="size-4 shrink-0" />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate font-medium text-sm" data-name="">
                              {bookingTitle(b, state.customers)}
                            </span>
                            <span className="text-muted-foreground text-xs tabular-nums">{timeRangeOf(b)}</span>
                          </span>
                          <Badge variant={STATE_META[ds].badge}>{ds === "due" || ds === "part-paid" ? `${formatInr(duePaise(b))} due` : stateLabel(ds)}</Badge>
                        </Button>
                  );
                  return (
                    <li key={b.id}>
                      {parseRecurringId(b.id) ? (
                        item
                      ) : (
                        <BookingContextMenu booking={b} now={now}>
                          {item}
                        </BookingContextMenu>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
