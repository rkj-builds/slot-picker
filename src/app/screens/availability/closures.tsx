"use client";

/**
 * Days and hours the venue is shut (a festival, resurfacing): Cal.com's date
 * overrides, for a venue. The list shows what is coming; adding one says, before
 * saving, which confirmed bookings fall inside it, so the desk calls those
 * customers first. Removing asks once.
 */
import { CalendarIcon, CalendarOffIcon, CalendarX2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import * as React from "react";
import { toastRefusal } from "@/app/desk/booking-feedback";
import { dayOf, longDayOf, minuteLabel, timeRangeOf } from "@/app/format";
import { DisabledWithReason } from "@/app/desk/disabled-with-reason";
import { ListSkeleton, LoadFailed } from "@/app/screens/screen-kit";
import { LazyCalendar } from "@/components/booking/lazy-calendar";
import { SegmentedControl, SegmentedControlItem } from "@/components/compositions/segmented-control";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toastManager } from "@/components/ui/toast";
import { isDataError } from "@/data/errors";
import { useDataClient, useRead, useWrite } from "@/data/provider";
import type { Closure } from "@/data/types";
import { type Booking, bookingEnd, bookingStart, customerById, isBlocking, overlaps } from "@/lib/booking";
import { addDays, fromLocalDate, type PlainDate, toLocalDate } from "@/lib/plain-date";
import { instantAt } from "@/lib/time-zone";
import { courtName, VENUE } from "@/lib/venue";

const TIMES = Array.from({ length: 49 }, (_, i) => i * 30);
const timeLabel = (m: number): string => (m === 24 * 60 ? "Midnight" : minuteLabel(m));

function closureTime(c: Pick<Closure, "startMinute" | "endMinute">): string {
  return c.startMinute === null || c.endMinute === null ? "All day" : `${timeLabel(c.startMinute)} – ${timeLabel(c.endMinute)}`;
}

/** Confirmed customer bookings inside a closure: what the desk has to sort out first. */
function bookingsInside(bookings: readonly Booking[], closure: Pick<Closure, "date" | "startMinute" | "endMinute">, now: number): Booking[] {
  const span =
    closure.startMinute === null || closure.endMinute === null
      ? { start: instantAt(closure.date, 0, VENUE.timeZone), end: instantAt(closure.date, 24 * 60, VENUE.timeZone) }
      : { start: instantAt(closure.date, closure.startMinute, VENUE.timeZone), end: instantAt(closure.date, closure.endMinute, VENUE.timeZone) };
  return bookings.filter((b) => b.kind === "booking" && b.date === closure.date && isBlocking(b, now) && overlaps(span, { start: bookingStart(b), end: bookingEnd(b) }));
}

export function ClosuresCard({ today, now, readOnly, readOnlyReason, initialOpen, initialDate, onDialogClosed }: {
  today: PlainDate;
  now: number;
  readOnly: boolean;
  readOnlyReason: string;
  /** Open Add closure straight away (#/desk/availability?closure=new). */
  initialOpen: boolean;
  initialDate: PlainDate | null;
  onDialogClosed: () => void;
}): React.ReactElement {
  const range = { from: today, to: addDays(today, 365) };
  const closures = useRead(["closures", range.from, range.to], (c) => c.availability.closures(range));
  // Opened from the URL before the viewer has loaded: it shows once the role is known to allow it.
  const [adding, setAdding] = React.useState(initialOpen);
  const [asked, setAsked] = React.useState(initialOpen);
  if (asked !== initialOpen) {
    setAsked(initialOpen);
    if (initialOpen) setAdding(true);
  }
  const [removing, setRemoving] = React.useState<Closure | null>(null);

  return (
    <Card>
      <CardHeader>
        <h2>
          <CardTitle render={<span className="block" />}>Closures</CardTitle>
        </h2>
        <CardDescription>Holidays and maintenance. Online booking doesn't offer these times.</CardDescription>
        <CardAction>
          {readOnly ? (
            <DisabledWithReason reason={readOnlyReason}>
              <PlusIcon aria-hidden="true" />
              Add closure
            </DisabledWithReason>
          ) : (
            <Button onClick={() => setAdding(true)} variant="outline">
              <PlusIcon aria-hidden="true" />
              Add closure
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardPanel className="pt-0">
        {closures.status === "pending" ? (
          <ListSkeleton label="Loading closures" rows={2} />
        ) : closures.status === "error" ? (
          <LoadFailed error={closures.error} onRetry={() => void closures.refetch()} what="closures" />
        ) : closures.data.length === 0 ? (
          <Empty className="rounded-xl border border-dashed p-6 md:p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarOffIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No closures coming up</EmptyTitle>
              <EmptyDescription>Add one for a holiday or court work, and those times stop showing online.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul aria-label="Upcoming closures" className="flex flex-col divide-y">
            {closures.data.map((c) => (
              <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3" key={c.id}>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-medium text-sm">{longDayOf(c.date)}</span>
                  <span className="text-muted-foreground text-sm">
                    <span className="tabular-nums">{closureTime(c)}</span> · {c.reason}
                  </span>
                </span>
                {readOnly ? null : (
                  <Button aria-label={`Remove the closure on ${dayOf(c.date)}`} onClick={() => setRemoving(c)} size="sm" variant="ghost">
                    <Trash2Icon aria-hidden="true" />
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardPanel>
      <AddClosureDialog
        initialDate={initialDate ?? addDays(today, 1)}
        now={now}
        onClose={() => {
          setAdding(false);
          onDialogClosed();
        }}
        open={adding && !readOnly}
        today={today}
      />
      <RemoveClosureDialog closure={removing} onClose={() => setRemoving(null)} />
    </Card>
  );
}

function AddClosureDialog({ open, today, now, initialDate, onClose }: { open: boolean; today: PlainDate; now: number; initialDate: PlainDate; onClose: () => void }): React.ReactElement {
  return (
    <Dialog onOpenChange={(o) => !o && onClose()} open={open}>
      <DialogPopup>{open && <AddClosureForm initialDate={initialDate} key={initialDate} now={now} onDone={onClose} today={today} />}</DialogPopup>
    </Dialog>
  );
}

type Span = "day" | "range";

function AddClosureForm({ initialDate, today, now, onDone }: { initialDate: PlainDate; today: PlainDate; now: number; onDone: () => void }): React.ReactElement {
  const client = useDataClient();
  const [date, setDate] = React.useState<PlainDate>(initialDate);
  const [span, setSpan] = React.useState<Span>("day");
  const [start, setStart] = React.useState(6 * 60);
  const [end, setEnd] = React.useState(9 * 60);
  const [reason, setReason] = React.useState("");
  const [dateOpen, setDateOpen] = React.useState(false);
  const [errors, setErrors] = React.useState<{ reason?: string; endMinute?: string }>({});
  const add = useWrite((c, input: Omit<Closure, "id" | "createdAt">) => c.availability.addClosure(input));
  const day = useRead(["bookings", date, date], (c) => c.bookings.list({ from: date, to: date }));
  const closure = { date, startMinute: span === "day" ? null : start, endMinute: span === "day" ? null : end };
  const inside = day.data ? bookingsInside(day.data.bookings, closure, now) : [];
  const badRange = span === "range" && end <= start;
  const endError = errors.endMinute ?? (badRange ? "The end has to be after the start." : null);

  const submit = async (): Promise<void> => {
    const next: { reason?: string; endMinute?: string } = {};
    if (!reason.trim()) next.reason = "Say why the venue is closed; customers see it.";
    if (badRange) next.endMinute = "The end has to be after the start.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    let saved: Closure;
    try {
      saved = await add.mutateAsync({ ...closure, reason });
    } catch (error) {
      if (isDataError(error) && Object.keys(error.fields).length > 0) setErrors(Object.fromEntries(Object.keys(error.fields).map((k) => [k, error.message])));
      else toastRefusal("Closure not added", error);
      return;
    }
    toastManager.add({
      title: `Closure added for ${dayOf(saved.date)}`,
      description: `${closureTime(saved)} · ${saved.reason}`,
      type: "success",
      actionProps: {
        children: "Undo",
        onClick: () => {
          client.availability.removeClosure(saved.id).catch((error: unknown) => toastRefusal("Couldn't undo", error));
        },
      },
    });
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add closure</DialogTitle>
        <DialogDescription>A day or a few hours when no court can be booked.</DialogDescription>
      </DialogHeader>
      <Form
        className="contents"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <DialogPanel className="flex flex-col gap-5">
          <div className="flex flex-col items-start gap-2">
            <span className="font-medium text-base/4.5 sm:text-sm/4" id="closure-date-label">
              Date
            </span>
            <Popover onOpenChange={setDateOpen} open={dateOpen}>
              <PopoverTrigger render={<Button aria-labelledby="closure-date-label closure-date-value" className="w-full justify-start font-normal" variant="outline" />}>
                <CalendarIcon aria-hidden="true" />
                <span id="closure-date-value">{longDayOf(date)}</span>
              </PopoverTrigger>
              <PopoverPopup align="start">
                <LazyCalendar
                  defaultMonth={toLocalDate(date)}
                  disabled={{ before: toLocalDate(today) }}
                  mode="single"
                  onSelect={(picked) => {
                    if (!picked) return;
                    setDate(fromLocalDate(picked));
                    setDateOpen(false);
                  }}
                  selected={toLocalDate(date)}
                  today={toLocalDate(today)}
                />
              </PopoverPopup>
            </Popover>
          </div>
          <div className="flex flex-col gap-2">
            <Label id="closure-span">How long</Label>
            <SegmentedControl<Span> aria-labelledby="closure-span" fill onValueChange={setSpan} value={span}>
              <SegmentedControlItem<Span> value="day">Full day</SegmentedControlItem>
              <SegmentedControlItem<Span> value="range">Time range</SegmentedControlItem>
            </SegmentedControl>
          </div>
          {span === "range" && (
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>From</FieldLabel>
                <TimePick label="From" onChange={setStart} value={start} />
              </Field>
              <Field invalid={endError !== null}>
                <FieldLabel>Until</FieldLabel>
                <TimePick label="Until" onChange={setEnd} value={end} />
                {endError && <FieldError match>{endError}</FieldError>}
              </Field>
            </div>
          )}
          <Field invalid={Boolean(errors.reason)}>
            <FieldLabel>Reason</FieldLabel>
            <Input
              maxLength={100}
              onChange={(e) => {
                setReason(e.target.value);
                setErrors((prev) => ({ endMinute: prev.endMinute }));
              }}
              placeholder="Festival holiday"
              type="text"
              value={reason}
            />
            {errors.reason ? <FieldError match>{errors.reason}</FieldError> : <FieldDescription>Customers see this when they look for a court. {100 - reason.length} characters left.</FieldDescription>}
          </Field>
          {inside.length > 0 && (
            <Alert variant="warning">
              <CalendarX2Icon aria-hidden="true" />
              <AlertTitle>
                {inside.length === 1 ? "1 confirmed booking falls" : `${inside.length} confirmed bookings fall`} in this closure
              </AlertTitle>
              <AlertDescription>
                <ul className="flex flex-col gap-0.5">
                  {inside.slice(0, 4).map((b) => (
                    <li className="tabular-nums" key={b.id}>
                      {customerById(day.data?.customers ?? [], b.customerId)?.name ?? "A customer"}, {courtName(b.courtId)}, {timeRangeOf(b)}
                    </li>
                  ))}
                  {inside.length > 4 && <li>and {inside.length - 4} more</li>}
                </ul>
                <p className="mt-1">They stay booked. Call them, then move or cancel each one.</p>
              </AlertDescription>
            </Alert>
          )}
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button loading={add.isPending} type="submit">
            Add closure
          </Button>
        </DialogFooter>
      </Form>
    </>
  );
}

function TimePick({ label, value, onChange }: { label: string; value: number; onChange: (m: number) => void }): React.ReactElement {
  return (
    <Select<number> items={TIMES.map((m) => ({ label: timeLabel(m), value: m }))} onValueChange={(v) => v !== null && onChange(v)} value={value}>
      <SelectTrigger aria-label={label} className="w-full min-w-0 tabular-nums">
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {TIMES.map((m) => (
          <SelectItem key={m} value={m}>
            {timeLabel(m)}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

function RemoveClosureDialog({ closure, onClose }: { closure: Closure | null; onClose: () => void }): React.ReactElement {
  const client = useDataClient();
  const [last, setLast] = React.useState(closure);
  if (closure && closure !== last) setLast(closure);
  const shown = closure ?? last;
  const remove = useWrite((c, id: string) => c.availability.removeClosure(id));

  const confirm = async (): Promise<void> => {
    if (!shown) return;
    try {
      await remove.mutateAsync(shown.id);
    } catch (error) {
      toastRefusal("Closure not removed", error);
      return;
    }
    const { date, startMinute, endMinute, reason } = shown;
    toastManager.add({
      title: `Closure on ${dayOf(date)} removed`,
      description: "Those times can be booked again.",
      type: "info",
      actionProps: {
        children: "Undo",
        onClick: () => {
          client.availability.addClosure({ date, startMinute, endMinute, reason }).catch((error: unknown) => toastRefusal("Couldn't undo", error));
        },
      },
    });
    onClose();
  };

  return (
    <AlertDialog onOpenChange={(o) => !o && !remove.isPending && onClose()} open={closure !== null}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove the closure on {shown ? dayOf(shown.date) : ""}?</AlertDialogTitle>
          <AlertDialogDescription>
            {shown ? `${closureTime(shown)} · ${shown.reason}. ` : ""}Online booking offers those times again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose disabled={remove.isPending} render={<Button variant="ghost" />}>
            Keep it
          </AlertDialogClose>
          <Button loading={remove.isPending} onClick={() => void confirm()} variant="destructive">
            Remove closure
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
