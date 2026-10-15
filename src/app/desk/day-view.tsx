"use client";

import { CalendarOffIcon, PlusIcon } from "lucide-react";
import * as React from "react";
import { bookingTitle, STATE_META, stateLabel } from "@/app/desk/booking-visuals";
import { DayGrid } from "@/app/desk/day-grid";
import { dayStats, describeBooking } from "@/app/desk/desk-model";
import { useDeskUi } from "@/app/desk/desk-ui";
import { durationOf, timeRangeOf } from "@/app/format";
import { useStore } from "@/app/store";
import { useMediaQuery } from "@/app/use-media-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type Booking, deskState, duePaise, sortBookings } from "@/lib/booking";
import { formatInr } from "@/lib/money";
import { type PlainDate, weekdayOf } from "@/lib/plain-date";
import { cn } from "@/lib/utils";
import { COURTS, WEEKDAY_LABEL } from "@/lib/venue";

export function DayView({ date, now }: { date: PlainDate; now: number }): React.ReactElement {
  const { state } = useStore();
  const ui = useDeskUi();
  const wide = useMediaQuery("(min-width: 768px)");
  const [showCancelled, setShowCancelled] = React.useState(false);
  const hours = state.settings.hours[weekdayOf(date)];

  const ofDay = state.bookings.filter((b) => b.date === date).sort(sortBookings);
  const live = ofDay.filter((b) => !["cancelled", "expired"].includes(deskState(b, now)));
  const gone = ofDay.filter((b) => ["cancelled", "expired"].includes(deskState(b, now)));
  const stats = dayStats(ofDay, now);

  const firstFree = { courtId: COURTS[0]?.id ?? "court-1", date, startMinute: hours.open };

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-slot="day-stats">
        <Stat label="Booked" value={stats.minutesBooked === 0 ? "None" : durationOf(stats.minutesBooked, "short")} />
        <Stat label="Expected" value={formatInr(stats.expectedPaise)} />
        <Stat label="Collected" value={formatInr(stats.collectedPaise)} />
        <Stat emphasis={stats.duePaise > 0} label="Due" value={formatInr(stats.duePaise)} />
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Legend />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={showCancelled} id="show-cancelled" onCheckedChange={setShowCancelled} />
            <Label htmlFor="show-cancelled">
              Show cancelled{gone.length > 0 ? ` (${gone.length})` : ""}
            </Label>
          </div>
          {!wide && (
            <Button onClick={() => ui.newBooking(firstFree)} size="sm">
              <PlusIcon aria-hidden="true" />
              New booking
            </Button>
          )}
        </div>
      </div>

      {hours.closed || hours.close <= hours.open ? (
        <Empty className="rounded-2xl border border-dashed" role="status">
          <EmptyMedia>
            <CalendarOffIcon aria-hidden="true" />
          </EmptyMedia>
          <div className="flex flex-col gap-1">
            <EmptyTitle>Closed on {WEEKDAY_LABEL[weekdayOf(date)].long}s</EmptyTitle>
            <EmptyDescription>Change opening hours in Settings to take bookings on this day.</EmptyDescription>
          </div>
        </Empty>
      ) : wide ? (
        <>
          {live.length === 0 && (
            <p className="rounded-xl border border-dashed px-4 py-3 text-muted-foreground text-sm" role="status">
              Nothing booked yet. Pick any half hour to add a booking.
            </p>
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

function Stat({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }): React.ReactElement {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border bg-card px-4 py-3">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={cn("font-semibold text-lg tabular-nums tracking-tight", emphasis && "text-warning-foreground")}>{value}</dd>
    </div>
  );
}

function Legend(): React.ReactElement {
  const states = ["paid", "part-paid", "due", "held", "coaching", "no-show"] as const;
  return (
    <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
      {states.map((s) => {
        const Icon = STATE_META[s].icon;
        return (
          <li className="flex items-center gap-1" key={s}>
            <Icon aria-hidden="true" className="size-3.5" />
            {stateLabel(s)}
          </li>
        );
      })}
    </ul>
  );
}

/** Phones get a list per court: the grid would be too narrow to read. */
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
              <p className="rounded-xl border border-dashed px-4 py-3 text-muted-foreground text-sm">Nothing booked.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {list.map((b) => {
                  const ds = deskState(b, now);
                  const Icon = STATE_META[ds].icon;
                  return (
                    <li key={b.id}>
                      <button
                        aria-label={`${court.name}, ${timeRangeOf(b)}, ${describeBooking(b, state.customers, ds, now)}`}
                        className={cn("flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring", STATE_META[ds].block)}
                        onClick={() => ui.openBooking(b.id)}
                        type="button"
                      >
                        <Icon aria-hidden="true" className="size-4 shrink-0" />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium text-sm" data-name="">
                            {bookingTitle(b, state.customers)}
                          </span>
                          <span className="text-muted-foreground text-xs tabular-nums">{timeRangeOf(b)}</span>
                        </span>
                        <Badge variant={STATE_META[ds].badge}>{ds === "due" || ds === "part-paid" ? `${formatInr(duePaise(b))} due` : stateLabel(ds)}</Badge>
                      </button>
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
