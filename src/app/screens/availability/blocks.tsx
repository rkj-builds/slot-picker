"use client";

/**
 * Courts held on a schedule (a club every Saturday and Sunday, 4 – 5 pm):
 * each block with its courts, days and hours, when it runs from and until,
 * and the dates freed from it. The desk frees a single date, ends a block
 * from a date (asked once), or adds one with the Repeat editor, which names
 * the bookings it would land on before it is saved.
 */
import { CalendarIcon, CalendarX2Icon, PlusIcon, RepeatIcon, XIcon } from "lucide-react";
import * as React from "react";
import { toastRefusal } from "@/app/desk/booking-feedback";
import { dayOf, LOCALE, longDayOf } from "@/app/format";
import { DisabledWithReason } from "@/app/desk/disabled-with-reason";
import { ListSkeleton, LoadFailed } from "@/app/screens/screen-kit";
import { LazyCalendar } from "@/components/booking/lazy-calendar";
import { RepeatEditor } from "@/components/compositions/repeat-editor";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldError, FieldItem, FieldLabel } from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toastManager } from "@/components/ui/toast";
import { useDataClient, useRead, useWrite } from "@/data/provider";
import type { VenueSettings } from "@/data/types";
import { type Booking, findConflict, makeId } from "@/lib/booking";
import { addDays, compareDates, fromLocalDate, type PlainDate, toLocalDate, weekdayOf } from "@/lib/plain-date";
import { endBlockFrom, type RecurringBlock } from "@/lib/recurring-blocks";
import { COURTS, type CourtId, courtName, VENUE } from "@/lib/venue";
import { expandRecurrence, lastDate, nextOccurrences, type RecurrenceRule, summarizeRecurrence, validateRule } from "@/primitives/recurrence";

/** Still holding courts on or after today. A block ended before its first date never holds them at all. */
function isLive(block: RecurringBlock, today: PlainDate): boolean {
  const { end, startDate } = block.rule;
  if (end.type === "until") return compareDates(end.date, today) >= 0 && compareDates(end.date, startDate) >= 0;
  const last = lastDate(block.rule);
  return last === null || compareDates(last, today) >= 0;
}

/** "Courts 1 and 2" */
function courtsLine(ids: readonly CourtId[]): string {
  const names = COURTS.filter((c) => ids.includes(c.id)).map((c) => c.name);
  return new Intl.ListFormat("en-IN", { type: "conjunction" }).format(names);
}

export function BlocksCard({ today, now, settings, readOnly, readOnlyReason }: { today: PlainDate; now: number; settings: VenueSettings; readOnly: boolean; readOnlyReason: string }): React.ReactElement {
  const blocks = useRead(["blocks"], (c) => c.availability.blocks());
  const [adding, setAdding] = React.useState(false);
  const [ending, setEnding] = React.useState<RecurringBlock | null>(null);
  const live = blocks.data?.filter((b) => isLive(b, today)) ?? [];
  const ended = blocks.data?.filter((b) => !isLive(b, today)) ?? [];

  return (
    <Card>
      <CardHeader>
        <h2>
          <CardTitle render={<span className="block" />}>Repeating court blocks</CardTitle>
        </h2>
        <CardDescription>Courts held on a schedule, like a club or a coaching batch. Closed to online booking.</CardDescription>
        <CardAction>
          {readOnly ? (
            <DisabledWithReason reason={readOnlyReason}>
              <PlusIcon aria-hidden="true" />
              Add block
            </DisabledWithReason>
          ) : (
            <Button onClick={() => setAdding(true)} variant="outline">
              <PlusIcon aria-hidden="true" />
              Add block
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardPanel className="flex flex-col gap-4 pt-0">
        {blocks.status === "pending" ? (
          <ListSkeleton label="Loading repeating blocks" rows={2} />
        ) : blocks.status === "error" ? (
          <LoadFailed error={blocks.error} onRetry={() => void blocks.refetch()} what="repeating blocks" />
        ) : live.length === 0 ? (
          <Empty className="rounded-xl border border-dashed p-6 md:p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RepeatIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No courts held on a schedule</EmptyTitle>
              <EmptyDescription>Add a block for a club night or a coaching batch, and those hours stop showing online.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul aria-label="Repeating blocks" className="flex flex-col gap-3">
            {live.map((b) => (
              <BlockItem block={b} key={b.id} onEnd={() => setEnding(b)} readOnly={readOnly} today={today} />
            ))}
          </ul>
        )}
        {ended.length > 0 && (
          <details className="group text-sm">
            <summary className="cursor-pointer text-muted-foreground">
              {ended.length} ended {ended.length === 1 ? "block" : "blocks"}
            </summary>
            <ul className="mt-2 flex flex-col gap-1 text-muted-foreground">
              {ended.map((b) => (
                <li key={b.id}>
                  {b.title} · {summarizeRecurrence(b.rule, LOCALE)}
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardPanel>
      <AddBlockDialog now={now} onClose={() => setAdding(false)} open={adding} settings={settings} today={today} />
      <EndBlockDialog block={ending} onClose={() => setEnding(null)} today={today} />
    </Card>
  );
}

function BlockItem({ block, today, readOnly, onEnd }: { block: RecurringBlock; today: PlainDate; readOnly: boolean; onEnd: () => void }): React.ReactElement {
  const client = useDataClient();
  const put = useWrite((c, next: RecurringBlock) => c.availability.putBlock(next));
  const last = lastDate(block.rule);
  const freed = [...block.rule.exceptions].filter((d) => compareDates(d, today) >= 0).sort();
  const upcoming = nextOccurrences(block.rule, today, 6);

  const change = async (next: RecurringBlock, title: string): Promise<void> => {
    try {
      await put.mutateAsync(next);
    } catch (error) {
      toastRefusal("Block not changed", error);
      return;
    }
    toastManager.add({
      title,
      description: block.title,
      type: "info",
      actionProps: {
        children: "Undo",
        onClick: () => {
          client.availability.putBlock(block).catch((error: unknown) => toastRefusal("Couldn't undo", error));
        },
      },
    });
  };

  return (
    <li className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="font-medium text-sm">{block.title}</h3>
          <p className="flex items-start gap-1.5 text-muted-foreground text-sm">
            <RepeatIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {summarizeRecurrence(block.rule, LOCALE)}
          </p>
        </div>
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <Menu>
              <MenuTrigger disabled={upcoming.length === 0} render={<Button size="sm" variant="outline" />}>
                <CalendarX2Icon aria-hidden="true" />
                Free a date
              </MenuTrigger>
              <MenuPopup align="end">
                {upcoming.map((o) => (
                  <MenuItem key={o.date} onClick={() => void change({ ...block, rule: { ...block.rule, exceptions: [...block.rule.exceptions, o.date] } }, `${dayOf(o.date)} freed`)}>
                    {longDayOf(o.date)}
                  </MenuItem>
                ))}
              </MenuPopup>
            </Menu>
            <Button onClick={onEnd} size="sm" variant="destructive-outline">
              End block
            </Button>
          </div>
        )}
      </div>
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-muted-foreground">Courts</dt>
        <dd className="flex flex-wrap gap-1.5">
          {block.courtIds.map((id) => (
            <Badge key={id} variant="secondary">
              {courtName(id)}
            </Badge>
          ))}
        </dd>
        <dt className="text-muted-foreground">Runs</dt>
        <dd>
          From {dayOf(block.rule.startDate)}, {last ? `until ${dayOf(last)}` : "no end date"}
        </dd>
        {freed.length > 0 && (
          <>
            <dt className="text-muted-foreground">Freed dates</dt>
            <dd>
              <ul aria-label={`Dates freed from ${block.title}`} className="flex flex-wrap gap-1.5">
                {freed.map((d) => (
                  <li key={d}>
                    <Badge className="gap-1 pe-0.5" variant="outline">
                      {dayOf(d)}
                      {!readOnly && (
                        <Button
                          aria-label={`Hold ${dayOf(d)} again`}
                          className="size-5 sm:size-4"
                          onClick={() => void change({ ...block, rule: { ...block.rule, exceptions: block.rule.exceptions.filter((x) => x !== d) } }, `${dayOf(d)} held again`)}
                          size="icon-xs"
                          variant="ghost"
                        >
                          <XIcon aria-hidden="true" />
                        </Button>
                      )}
                    </Badge>
                  </li>
                ))}
              </ul>
            </dd>
          </>
        )}
      </dl>
    </li>
  );
}

/** End a block from a date: that date and every later one are free again. Asked once, with Undo. */
function EndBlockDialog({ block, today, onClose }: { block: RecurringBlock | null; today: PlainDate; onClose: () => void }): React.ReactElement {
  const client = useDataClient();
  const [last, setLast] = React.useState(block);
  if (block && block !== last) setLast(block);
  const shown = block ?? last;
  const dates = shown ? nextOccurrences(shown.rule, today, 8).map((o) => o.date) : [];
  const [from, setFrom] = React.useState<PlainDate | null>(null);
  const picked = from && dates.includes(from) ? from : (dates[0] ?? today);
  const put = useWrite((c, next: RecurringBlock) => c.availability.putBlock(next));

  const confirm = async (): Promise<void> => {
    if (!shown) return;
    const before = shown;
    try {
      await put.mutateAsync(endBlockFrom(shown, picked));
    } catch (error) {
      toastRefusal("Block not ended", error);
      return;
    }
    toastManager.add({
      title: `${before.title} ends from ${dayOf(picked)}`,
      description: `${courtsLine(before.courtIds)} can be booked then.`,
      type: "info",
      actionProps: {
        children: "Undo",
        onClick: () => {
          client.availability.putBlock(before).catch((error: unknown) => toastRefusal("Couldn't undo", error));
        },
      },
    });
    setFrom(null);
    onClose();
  };

  return (
    <AlertDialog onOpenChange={(o) => !o && !put.isPending && onClose()} open={block !== null}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>End {shown?.title ?? "this block"}?</AlertDialogTitle>
          <AlertDialogDescription>
            {shown ? `${courtsLine(shown.courtIds)} open for booking on its days and hours from the date you pick. Dates before it stay held.` : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-6 pb-6">
          <Field>
            <FieldLabel>First free date</FieldLabel>
            <Select<PlainDate> items={dates.map((d) => ({ label: longDayOf(d), value: d }))} onValueChange={(v) => v && setFrom(v)} value={picked}>
              <SelectTrigger className="w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {dates.map((d) => (
                  <SelectItem key={d} value={d}>
                    {longDayOf(d)}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </Field>
        </div>
        <AlertDialogFooter>
          <AlertDialogClose disabled={put.isPending} render={<Button variant="ghost" />}>
            Keep it
          </AlertDialogClose>
          <Button loading={put.isPending} onClick={() => void confirm()} variant="destructive">
            End block
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

/**
 * Add a repeating block: what for, which courts, the first date, then the
 * Repeat editor (the desk's own, from Block courts). Bookings it would land
 * on in the next eight weeks are named before saving.
 */
function AddBlockDialog({ open, today, now, settings, onClose }: { open: boolean; today: PlainDate; now: number; settings: VenueSettings; onClose: () => void }): React.ReactElement {
  return (
    <Dialog onOpenChange={(o) => !o && onClose()} open={open}>
      <DialogPopup className="sm:max-w-xl">{open && <AddBlockForm now={now} onDone={onClose} settings={settings} today={today} />}</DialogPopup>
    </Dialog>
  );
}

function AddBlockForm({ today, now, settings, onDone }: { today: PlainDate; now: number; settings: VenueSettings; onDone: () => void }): React.ReactElement {
  const client = useDataClient();
  const [title, setTitle] = React.useState("");
  const [titleError, setTitleError] = React.useState<string | null>(null);
  const [courts, setCourts] = React.useState<CourtId[]>(COURTS.map((c) => c.id));
  const [dateOpen, setDateOpen] = React.useState(false);
  const first = addDays(today, 1);
  const hours = settings.hours[weekdayOf(first)];
  const [rule, setRule] = React.useState<RecurrenceRule>({
    interval: 1,
    weekdays: [weekdayOf(first)],
    startDate: first,
    startMinute: Math.min(16 * 60, hours.close - 60),
    endMinute: Math.min(17 * 60, hours.close),
    timeZone: VENUE.timeZone,
    end: { type: "never" },
    exceptions: [],
  });
  const put = useWrite((c, block: RecurringBlock) => c.availability.putBlock(block));
  const horizon = addDays(rule.startDate, 8 * 7);
  const ahead = useRead(["bookings", rule.startDate, horizon], (c) => c.bookings.list({ from: rule.startDate, to: horizon }));
  const problems = validateRule(rule);
  const occurrences = problems.length === 0 ? expandRecurrence(rule, { from: rule.startDate, to: horizon }) : [];
  const clashes: Booking[] = [];
  for (const o of occurrences) {
    for (const courtId of courts) {
      const hit = findConflict(ahead.data?.bookings ?? [], { courtId, date: o.date, startMinute: rule.startMinute, durationMinutes: rule.endMinute - rule.startMinute }, now);
      if (hit?.kind === "booking" && !clashes.includes(hit)) clashes.push(hit);
    }
  }
  const times: number[] = [];
  for (let m = Math.min(...Object.values(settings.hours).map((h) => h.open)); m < Math.max(...Object.values(settings.hours).map((h) => h.close)); m += 30) times.push(m);
  const invalid = courts.length === 0 || problems.length > 0;

  const save = async (): Promise<void> => {
    if (!title.trim()) {
      setTitleError("Say what the courts are held for.");
      return;
    }
    if (invalid) return;
    const block: RecurringBlock = { id: makeId("rb"), title: title.trim(), courtIds: COURTS.map((c) => c.id).filter((id) => courts.includes(id)), rule, createdAt: now };
    try {
      await put.mutateAsync(block);
    } catch (error) {
      toastRefusal("Block not added", error);
      return;
    }
    toastManager.add({
      title: "Repeating block added",
      description: `${block.title} · ${summarizeRecurrence(block.rule, LOCALE)}`,
      type: "success",
      actionProps: {
        children: "Undo",
        onClick: () => {
          client.availability.removeBlock(block.id).catch((error: unknown) => toastRefusal("Couldn't undo", error));
        },
      },
    });
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add a repeating block</DialogTitle>
        <DialogDescription>Hold courts on the same days and hours each week. Blocked time is closed to online booking.</DialogDescription>
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
              placeholder="Juniors club"
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
          <div className="flex flex-col items-start gap-2">
            <span className="font-medium text-base/4.5 sm:text-sm/4" id="block-start-label">
              First date
            </span>
            <Popover onOpenChange={setDateOpen} open={dateOpen}>
              <PopoverTrigger render={<Button aria-labelledby="block-start-label block-start-value" className="justify-start font-normal" variant="outline" />}>
                <CalendarIcon aria-hidden="true" />
                <span id="block-start-value">{longDayOf(rule.startDate)}</span>
              </PopoverTrigger>
              <PopoverPopup align="start">
                <LazyCalendar
                  defaultMonth={toLocalDate(rule.startDate)}
                  disabled={{ before: toLocalDate(today) }}
                  mode="single"
                  onSelect={(picked) => {
                    if (!picked) return;
                    const date = fromLocalDate(picked);
                    setRule((r) => ({ ...r, startDate: date, weekdays: r.weekdays.length ? r.weekdays : [weekdayOf(date)] }));
                    setDateOpen(false);
                  }}
                  selected={toLocalDate(rule.startDate)}
                  today={toLocalDate(today)}
                />
              </PopoverPopup>
            </Popover>
          </div>
          <RepeatEditor locale={LOCALE} onValueChange={setRule} preview={0} times={times} value={rule} />
          {clashes.length > 0 && (
            <Alert variant="warning">
              <CalendarX2Icon aria-hidden="true" />
              <AlertTitle>{clashes.length === 1 ? "1 booking overlaps" : `${clashes.length} bookings overlap`} in the next eight weeks</AlertTitle>
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
          <Button disabled={invalid} loading={put.isPending} type="submit">
            Add block
          </Button>
        </DialogFooter>
      </Form>
    </>
  );
}
