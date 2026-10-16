"use client";

import { CalendarX2Icon, RepeatIcon } from "lucide-react";
import * as React from "react";
import { useClock } from "@/app/clock";
import type { RepeatRef } from "@/app/desk/desk-ui";
import { dayOf, LOCALE, longDayOf } from "@/app/format";
import { useStore } from "@/app/store";
import { RepeatEditor } from "@/components/compositions/repeat-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldItem, FieldLabel } from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toastManager } from "@/components/ui/toast";
import { type Booking, findConflict, makeId } from "@/lib/booking";
import { addDays, type PlainDate, todayIn, weekdayOf } from "@/lib/plain-date";
import { endBlockFrom, type RecurringBlock } from "@/lib/recurring-blocks";
import { COURTS, type CourtId, courtName, VENUE } from "@/lib/venue";
import { expandRecurrence, nextOccurrences, type RecurrenceRule, summarizeRecurrence, validateRule } from "@/primitives/recurrence";

/**
 * Block courts from the day view: a title, which courts, and either one time
 * on that date or a repeating schedule (the Repeat editor). A repeating block
 * is saved as one rule; bookings that would collide in the next eight weeks
 * are named before saving, so the desk can call those customers first.
 */
export function BlockCourtsDialog({ date, onClose }: { date: PlainDate | null; onClose: () => void }): React.ReactElement {
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={date !== null}>
      <DialogPopup className="sm:max-w-xl">{date && <BlockCourtsForm date={date} key={date} onDone={onClose} />}</DialogPopup>
    </Dialog>
  );
}

function BlockCourtsForm({ date, onDone }: { date: PlainDate; onDone: () => void }): React.ReactElement {
  const { state, commit, dispatch } = useStore();
  const { now } = useClock();
  const [title, setTitle] = React.useState("");
  const [courts, setCourts] = React.useState<CourtId[]>(COURTS.map((c) => c.id));
  const [repeat, setRepeat] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [titleError, setTitleError] = React.useState<string | null>(null);
  const hours = state.settings.hours[weekdayOf(date)];
  const times = Array.from({ length: Math.max(1, (hours.close - hours.open) / 30) }, (_, i) => hours.open + i * 30);
  const [rule, setRule] = React.useState<RecurrenceRule>({
    interval: 1,
    weekdays: [weekdayOf(date)],
    startDate: date,
    startMinute: Math.min(16 * 60, hours.close - 60),
    endMinute: Math.min(17 * 60, hours.close),
    timeZone: VENUE.timeZone,
    end: { type: "never" },
    exceptions: [],
  });

  // Once: the same hours on this date only.
  const effective: RecurrenceRule = repeat ? rule : { ...rule, weekdays: [weekdayOf(date)], interval: 1, end: { type: "count", count: 1 }, exceptions: [] };
  const occurrences = validateRule(effective).length === 0 ? expandRecurrence(effective, { from: date, to: addDays(date, 8 * 7) }) : [];
  const clashes: Booking[] = [];
  for (const o of occurrences) {
    for (const courtId of courts) {
      const hit = findConflict(state.bookings, { courtId, date: o.date, startMinute: effective.startMinute, durationMinutes: effective.endMinute - effective.startMinute }, now());
      if (hit && !clashes.includes(hit)) clashes.push(hit);
    }
  }
  const invalid = courts.length === 0 || validateRule(effective).length > 0;

  const save = async (): Promise<void> => {
    if (!title.trim()) {
      setTitleError("Say what the courts are held for.");
      return;
    }
    if (invalid) return;
    const block: RecurringBlock = { id: makeId("rb"), title: title.trim(), courtIds: COURTS.map((c) => c.id).filter((id) => courts.includes(id)), rule: effective, createdAt: now() };
    setBusy(true);
    await commit({ type: "put-recurring-block", block });
    setBusy(false);
    toastManager.add({
      title: repeat ? "Repeating block added" : "Courts blocked",
      description: `${block.title} · ${summarizeRecurrence(block.rule, LOCALE)}`,
      type: "success",
      actionProps: { children: "Undo", onClick: () => dispatch({ type: "remove-recurring-block", blockId: block.id }) },
    });
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Block courts</DialogTitle>
        <DialogDescription>From {longDayOf(date)}. Blocked time is closed to online booking.</DialogDescription>
      </DialogHeader>
      <Form
        className="contents"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <DialogPanel className="flex flex-col gap-5">
          <Field invalid={Boolean(titleError)}>
            <FieldLabel>What for</FieldLabel>
            <Input
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError(null);
              }}
              placeholder="Off-Screen Club Juniors"
              type="text"
              value={title}
            />
            {titleError && <FieldError match>{titleError}</FieldError>}
          </Field>
          <Field invalid={courts.length === 0} name="courts" render={(props) => <Fieldset {...props} />}>
            <FieldsetLegend className="mb-2 font-medium text-sm">Courts</FieldsetLegend>
            <CheckboxGroup className="flex-row gap-4" onValueChange={(v) => setCourts(v as CourtId[])} value={courts}>
              {COURTS.map((c) => (
                <FieldItem key={c.id}>
                  <FieldLabel className="font-normal">
                    <Checkbox value={c.id} />
                    {c.name}
                  </FieldLabel>
                </FieldItem>
              ))}
            </CheckboxGroup>
            {courts.length === 0 && <FieldError match>Pick at least one court.</FieldError>}
          </Field>
          <Label className="justify-between rounded-lg border p-3 font-normal">
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 font-medium">
                <RepeatIcon aria-hidden="true" className="size-4 opacity-72" />
                Repeat
              </span>
              <span className="text-muted-foreground text-xs">A weekly hold, like a club or a coaching batch.</span>
            </span>
            <Switch checked={repeat} onCheckedChange={setRepeat} />
          </Label>
          <RepeatEditor
            locale={LOCALE}
            onValueChange={setRule}
            times={times}
            timesOnly={!repeat}
            value={rule}
          />
          {clashes.length > 0 && (
            <Alert role="status" variant="warning">
              <CalendarX2Icon aria-hidden="true" />
              <AlertTitle>
                {clashes.length === 1 ? "1 booking overlaps" : `${clashes.length} bookings overlap`} in the next eight weeks
              </AlertTitle>
              <AlertDescription>
                {clashes
                  .slice(0, 3)
                  .map((b) => `${courtName(b.courtId)}, ${dayOf(b.date)}`)
                  .join("; ")}
                {clashes.length > 3 ? "; and more" : ""}. They stay booked; call them before the block starts.
              </AlertDescription>
            </Alert>
          )}
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button disabled={invalid} loading={busy} type="submit">
            {repeat ? "Add repeating block" : "Block courts"}
          </Button>
        </DialogFooter>
      </Form>
    </>
  );
}

/**
 * A repeating block, opened from one of its dates on the grid: what it is,
 * when it repeats, the next dates, and the two things the desk does to one:
 * skip this date, or end it from this date on. Both have an Undo.
 */
export function RepeatBlockDialog({ target, onClose }: { target: RepeatRef | null; onClose: () => void }): React.ReactElement {
  const { state, commit, dispatch } = useStore();
  const { now } = useClock();
  const block = target ? state.recurringBlocks.find((b) => b.id === target.blockId) : undefined;
  // Keep the last block on screen while the dialog closes.
  const [shown, setShown] = React.useState<{ block: RecurringBlock; date: PlainDate } | null>(null);
  if (block && target && (shown?.block !== block || shown.date !== target.date)) setShown({ block, date: target.date });
  const today = todayIn(VENUE.timeZone, now());

  const change = async (next: RecurringBlock, title: string): Promise<void> => {
    const before = shown?.block;
    await commit({ type: "put-recurring-block", block: next });
    toastManager.add({
      title,
      description: summarizeRecurrence(next.rule, LOCALE),
      type: "info",
      actionProps: before ? { children: "Undo", onClick: () => dispatch({ type: "put-recurring-block", block: before }) } : undefined,
    });
    onClose();
  };

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(block && target)}>
      <DialogPopup>
        {shown && (
          <>
            <DialogHeader>
              <DialogTitle>{shown.block.title}</DialogTitle>
              <DialogDescription className="flex items-start gap-1.5">
                <RepeatIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 opacity-72" />
                {summarizeRecurrence(shown.block.rule, LOCALE)}
              </DialogDescription>
            </DialogHeader>
            <DialogPanel className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-1.5">
                {shown.block.courtIds.map((id) => (
                  <Badge key={id} variant="secondary">
                    {courtName(id)}
                  </Badge>
                ))}
                <Badge variant="outline">Closed to online booking</Badge>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-medium text-sm">Next dates</span>
                <ul className="flex flex-wrap gap-1.5 text-sm tabular-nums">
                  {nextOccurrences(shown.block.rule, today, 4).map((o) => (
                    <li className="rounded-md bg-muted px-2 py-1" key={o.date}>
                      {dayOf(o.date)}
                    </li>
                  ))}
                </ul>
              </div>
            </DialogPanel>
            <DialogFooter className="sm:justify-between">
              <Button
                onClick={() => void change(endBlockFrom(shown.block, shown.date), `Ended from ${dayOf(shown.date)}`)}
                variant="destructive-outline"
              >
                End from {dayOf(shown.date)}
              </Button>
              <Button
                onClick={() => void change({ ...shown.block, rule: { ...shown.block.rule, exceptions: [...shown.block.rule.exceptions, shown.date] } }, `${dayOf(shown.date)} skipped`)}
                variant="outline"
              >
                Skip {dayOf(shown.date)} only
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogPopup>
    </Dialog>
  );
}
