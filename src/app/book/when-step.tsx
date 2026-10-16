"use client";

import * as React from "react";
import { StepHeading } from "@/app/book/book-page";
import { useFlow } from "@/app/book/flow";
import { StepActions, StepLayout } from "@/app/book/step-actions";
import { bookingRows } from "@/app/book/summary-rows";
import { dayOf, durationOf, LOCALE, minuteLabel, timeRangeOf } from "@/app/format";
import { useNow } from "@/app/clock";
import { useStore } from "@/app/store";
import { type BookingSelection, BookingSlotPicker } from "@/components/booking/booking-slot-picker";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { ANY_COURT, anyCourtReservations, reservationsFrom } from "@/lib/booking";
import { formatInr } from "@/lib/money";
import { addDays, type PlainDate, todayIn, type Weekday, weekdayOf } from "@/lib/plain-date";
import { bookingsWithBlocks } from "@/lib/recurring-blocks";
import { localTimeZone } from "@/lib/time-zone";
import { COURTS, courtName, priceFor, scheduleFromSettings, VENUE } from "@/lib/venue";

const pad = (n: number): string => String(n).padStart(2, "0");

export function WhenStep(): React.ReactElement {
  const { draft, update, goTo } = useFlow();
  const { state, scenarios } = useStore();
  const now = useNow(60_000);
  const today = todayIn(VENUE.timeZone, now);
  const schedule = React.useMemo(() => scheduleFromSettings(state.settings), [state.settings]);
  // The fortnight a customer can book, with the repeating blocks (a club's weekend hold) laid out as bookings.
  const bookings = React.useMemo(() => bookingsWithBlocks(state, today, addDays(today, 13)), [state, today]);
  const reservations =
    draft.courtId === "any" ? anyCourtReservations(bookings, COURTS.map((c) => c.id), now) : reservationsFrom(bookings, now);
  const space = draft.courtId === "any" ? { id: ANY_COURT, name: "Any court" } : { id: draft.courtId, name: courtName(draft.courtId) };
  const [selection, setSelection] = React.useState<BookingSelection | null>(null);

  // The weekend scenario opens on the next Saturday (today, if it is one).
  const nextSaturday = nextWeekday(today, "sat");
  const seededSlot = draft.date && draft.startMinute !== null ? `${draft.date}T${pad(Math.floor(draft.startMinute / 60))}:${pad(draft.startMinute % 60)}` : undefined;
  const { basePricePaise, peakPricePaise, peakStartMinute } = state.settings;

  const span = selection ? { date: selection.date, startMinute: selection.slot.minuteOfDay, durationMinutes: selection.durationMinutes } : null;
  const price = span ? formatInr(priceFor(state.settings, span.date, span.startMinute, span.durationMinutes)) : null;

  return (
    <StepLayout
      actions={
        <StepActions
          note={span ? "Next: your name and number." : "Pick a start time to continue."}
          onBack={() => goTo("court")}
          primary={
            <Button
              disabled={!span}
              onClick={() => {
                if (!span) return;
                update(span);
                goTo("you");
              }}
              size="lg"
            >
              Continue
            </Button>
          }
          rows={bookingRows({
            court: space.name,
            players: draft.players,
            day: span ? dayOf(span.date) : null,
            time: span ? timeRangeOf(span) : null,
            duration: span ? durationOf(span.durationMinutes) : null,
            price,
          })}
          compactLine={
            span ? (
              <p className="truncate tabular-nums" data-slot="booking-summary-line">
                <span className="font-medium">{space.name}</span>
                <Dot />
                {dayOf(span.date)}
                <Dot />
                {timeRangeOf(span)}
                <Dot />
                <span className="font-semibold">{price}</span>
              </p>
            ) : (
              <p className="truncate">
                <span className="font-medium">{space.name}</span>
                <Dot />
                <span className="text-muted-foreground">No time chosen yet</span>
              </p>
            )
          }
        />
      }
    >
      <StepHeading
        description={`${formatInr(basePricePaise)} an hour, ${formatInr(peakPricePaise)} from ${minuteLabel(peakStartMinute)} and at weekends. Times are at the venue in Jamshedpur.`}
        title="Pick a time"
      />
      <Card data-step-card="">
        <CardPanel className="p-4 sm:p-6">
          <BookingSlotPicker
            defaultDate={scenarios.weekend ? nextSaturday : (draft.date ?? undefined)}
            defaultDurationMinutes={draft.durationMinutes}
            defaultSlotId={scenarios.weekend && draft.date !== nextSaturday ? undefined : seededSlot}
            heading={space.name}
            key={`${space.id}-${scenarios.weekend ? "weekend" : "any"}`}
            locale={LOCALE}
            maxDate={addDays(today, 13)}
            now={now}
            onSelectionChange={setSelection}
            reservations={reservations}
            schedule={schedule}
            showSummary={false}
            spaces={[space]}
            viewerTimeZone={localTimeZone()}
          />
        </CardPanel>
      </Card>
    </StepLayout>
  );
}

function Dot(): React.ReactElement {
  return (
    <span aria-hidden="true" className="text-muted-foreground/60">
      {" · "}
    </span>
  );
}

function nextWeekday(from: PlainDate, day: Weekday): PlainDate {
  for (let i = 0; i < 7; i += 1) if (weekdayOf(addDays(from, i)) === day) return addDays(from, i);
  return from;
}
