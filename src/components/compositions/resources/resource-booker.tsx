"use client";

import { ArrowRightIcon, GlobeIcon, MapPinIcon } from "lucide-react";
import * as React from "react";
import { DayStepper } from "@/components/booking/day-stepper";
import { DurationPicker } from "@/components/booking/duration-picker";
import { SlotGrid } from "@/components/booking/slot-grid";
import { useResources } from "@/components/compositions/resources/context";
import { dayLabel, spanLabel } from "@/components/compositions/resources/words";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatDuration } from "@/lib/duration";
import type { PlainDate } from "@/lib/plain-date";
import { assign, hostSlots, linkSlots, type Resource, type ResourceBooking } from "@/lib/resources";
import { cn } from "@/lib/utils";

const DURATIONS = [60, 90, 120] as const;

/** A reference like Cal.com's: eight characters, upper case. Outside the component, so it is only ever called on Book. */
function newReference(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

/**
 * The public booking page for the link, as Cal.com draws one: the link on
 * the left, the day and its start times on the right. While the link books
 * a resource, a start is free whenever any one of them is, and the summary
 * says which one it lands on. `preview` is the small live copy inside the
 * link's editor: the same page, no booking form.
 */
export function ResourceBooker({ preview = false }: { preview?: boolean }): React.ReactElement {
  const { resources, bookings, link, date: initial, timeZone, locale, now, book, venue } = useResources("ResourceBooker");
  const [date, setDate] = React.useState<PlainDate>(initial);
  const [duration, setDuration] = React.useState(link.durationMinutes);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<{ booking: ResourceBooking; resource: Resource | null } | null>(null);
  const effective = React.useMemo(() => ({ ...link, durationMinutes: duration }), [link, duration]);
  const byResource = link.who.kind === "resource";
  const slots = React.useMemo(
    () => (byResource ? linkSlots(resources, bookings, effective, date, { timeZone, now }) : hostSlots(resources, bookings, effective, date, { timeZone, now })),
    [byResource, resources, bookings, effective, date, timeZone, now],
  );
  const slot = slots.find((s) => s.id === selected && s.status === "available") ?? null;
  const landing = slot && byResource ? assign(resources, bookings, effective, date, slot.minuteOfDay, timeZone) : null;
  const span = slot ? { date, startMinute: slot.minuteOfDay, durationMinutes: duration } : null;

  const submit = async (): Promise<void> => {
    if (!slot || !span) return;
    if (name.trim() === "") {
      setError("Your name, so the venue knows who is coming.");
      return;
    }
    if (byResource && !landing) {
      setError("That time just went. Pick another.");
      return;
    }
    setBusy(true);
    setError(null);
    const reference = newReference();
    const booking: ResourceBooking = {
      id: `bk_${reference}`,
      resourceId: landing?.id ?? "host",
      ...span,
      name: name.trim().split(/\s+/)[0] ?? name.trim(),
      people: landing?.people ?? 1,
      source: "page",
      reference,
    };
    try {
      await book(booking);
      setDone({ booking, resource: landing });
      setSelected(null);
    } catch (reason: unknown) {
      setError(reason instanceof Error && reason.message ? reason.message : "The booking didn’t go through. Nothing was taken.");
    } finally {
      setBusy(false);
    }
  };

  const about = (
    <div className={cn("flex flex-col gap-3", preview ? "gap-2" : "@2xl/pane:w-60 @2xl/pane:shrink-0")} data-slot="booker-about">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="size-6 rounded-full bg-foreground" />
        <span className="text-muted-foreground text-sm">{venue.name}</span>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className={cn("font-semibold leading-tight", preview ? "text-base" : "text-xl")}>{link.title}</h3>
        {!preview && <p className="text-muted-foreground text-sm">One pickleball court at {venue.name}.</p>}
      </div>
      {preview ? (
        <p className="text-muted-foreground text-xs">{formatDuration(duration, { locale, style: "short" })}</p>
      ) : (
        <DurationPicker durations={DURATIONS} locale={locale} onValueChange={setDuration} value={duration} />
      )}
      {!preview && (
        <ul className="flex flex-col gap-1.5 text-muted-foreground text-sm">
          <li className="flex items-center gap-2">
            <MapPinIcon aria-hidden="true" className="size-4 shrink-0" />
            {venue.name}, {venue.line}
          </li>
          <li className="flex items-center gap-2">
            <GlobeIcon aria-hidden="true" className="size-4 shrink-0" />
            {timeZone}
          </li>
        </ul>
      )}
    </div>
  );

  return (
    <div className={cn("flex flex-col gap-5", !preview && "@2xl/pane:flex-row @2xl/pane:gap-8")} data-mode={byResource ? "resource" : "person"} data-slot="resource-booker">
      {about}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {preview ? <p className="font-medium text-sm">{dayLabel(date, locale)}</p> : <DayStepper locale={locale} now={now} onValueChange={setDate} timeZone={timeZone} value={date} />}
        <SlotGrid aria-label="Start time" locale={locale} onValueChange={setSelected} slots={slots} timeZone={timeZone} value={selected} />
        {span && (
          <div className="flex flex-col gap-1 rounded-xl bg-muted px-4 py-3 text-sm" data-slot="booker-summary" role="status">
            <span className="font-medium tabular-nums">
              {dayLabel(date, locale)} · {spanLabel(span, timeZone, locale)}
            </span>
            <span className="text-muted-foreground">{byResource ? (landing ? `Any free court: this one lands on ${landing.name}.` : "That time just went.") : "On the host’s calendar, like every other link."}</span>
          </div>
        )}
        {!preview && span && !done && (
          <div className="flex flex-wrap items-end gap-2">
            <Field className="min-w-48 flex-1">
              <FieldLabel>Your name</FieldLabel>
              <Input onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="First name is enough" value={name} />
            </Field>
            <Button disabled={byResource && !landing} loading={busy} onClick={() => void submit()}>
              Book
              <ArrowRightIcon aria-hidden="true" className="rtl:rotate-180" />
            </Button>
          </div>
        )}
        {error && (
          <Alert variant="error">
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}
        {done && (
          <Card className="w-full" data-slot="booker-done">
            <CardHeader>
              <Badge className="w-fit" variant="success">
                Booked
              </Badge>
              <CardTitle className="text-balance leading-tight">
                {done.resource ? `${done.resource.name} · ` : ""}
                {dayLabel(done.booking.date, locale)} · {spanLabel(done.booking, timeZone, locale)}
              </CardTitle>
              <CardDescription>
                <bdi>{done.booking.name}</bdi>
                {done.booking.reference ? (
                  <>
                    {" · "}
                    <span className="font-mono">{done.booking.reference}</span>
                  </>
                ) : null}
              </CardDescription>
            </CardHeader>
            <CardFooter className="gap-2">
              <Button onClick={() => setDone(null)} size="sm" variant="outline">
                Book another
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
