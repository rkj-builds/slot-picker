"use client";

import * as React from "react";
import { StepHeading } from "@/app/book/book-page";
import { useFlow } from "@/app/book/flow";
import { LOCALE, minuteLabel } from "@/app/format";
import { useNow } from "@/app/clock";
import { useStore } from "@/app/store";
import { BookingSlotPicker } from "@/components/booking/booking-slot-picker";
import { Card, CardPanel } from "@/components/ui/card";
import { ANY_COURT, anyCourtReservations, reservationsFrom } from "@/lib/booking";
import { formatInr } from "@/lib/money";
import { addDays, type PlainDate, todayIn, type Weekday, weekdayOf } from "@/lib/plain-date";
import { localTimeZone } from "@/lib/time-zone";
import { COURTS, courtName, priceFor, scheduleFromSettings, VENUE } from "@/lib/venue";

const pad = (n: number): string => String(n).padStart(2, "0");

export function WhenStep(): React.ReactElement {
  const { draft, update, goTo } = useFlow();
  const { state, scenarios } = useStore();
  const now = useNow(60_000);
  const today = todayIn(VENUE.timeZone, now);
  const schedule = React.useMemo(() => scheduleFromSettings(state.settings), [state.settings]);
  const reservations =
    draft.courtId === "any" ? anyCourtReservations(state.bookings, COURTS.map((c) => c.id), now) : reservationsFrom(state.bookings, now);
  const space = draft.courtId === "any" ? { id: ANY_COURT, name: "Any court" } : { id: draft.courtId, name: courtName(draft.courtId) };

  // The weekend scenario opens on the next Saturday (today, if it is one).
  const nextSaturday = nextWeekday(today, "sat");
  const seededSlot = draft.date && draft.startMinute !== null ? `${draft.date}T${pad(Math.floor(draft.startMinute / 60))}:${pad(draft.startMinute % 60)}` : undefined;
  const { basePricePaise, peakPricePaise, peakStartMinute } = state.settings;

  return (
    <section>
      <StepHeading
        description={`${formatInr(basePricePaise)} an hour, ${formatInr(peakPricePaise)} from ${minuteLabel(peakStartMinute)} and at weekends. Times are at the venue in Jamshedpur.`}
        title="Pick a time"
      />
      <Card>
        <CardPanel className="p-4 sm:p-5">
        <BookingSlotPicker
          confirmLabel="Continue"
          defaultDate={scenarios.weekend ? nextSaturday : (draft.date ?? undefined)}
          defaultDurationMinutes={draft.durationMinutes}
          defaultSlotId={scenarios.weekend && draft.date !== nextSaturday ? undefined : seededSlot}
          heading={space.name}
          key={`${space.id}-${scenarios.weekend ? "weekend" : "any"}`}
          locale={LOCALE}
          maxDate={addDays(today, 13)}
          now={now}
          onConfirm={(selection) => {
            update({ date: selection.date, startMinute: selection.slot.minuteOfDay, durationMinutes: selection.durationMinutes });
            goTo("you");
          }}
          renderSummaryExtra={(selection) => (
            <span className="font-medium">{formatInr(priceFor(state.settings, selection.date, selection.slot.minuteOfDay, selection.durationMinutes))}</span>
          )}
          reservations={reservations}
          schedule={schedule}
          spaces={[space]}
          viewerTimeZone={localTimeZone()}
        />
        </CardPanel>
      </Card>
    </section>
  );
}



function nextWeekday(from: PlainDate, day: Weekday): PlainDate {
  for (let i = 0; i < 7; i += 1) if (weekdayOf(addDays(from, i)) === day) return addDays(from, i);
  return from;
}
