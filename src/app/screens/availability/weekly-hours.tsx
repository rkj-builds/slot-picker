"use client";

/**
 * Opening hours, one row a day, in Cal.com's weekly-hours shape: a switch for
 * open or closed, from and to, and "Copy times to…" for the rest of the week.
 * Edits are a draft until saved from the unsaved bar; the same settings the
 * Settings view edits, so the two never disagree.
 */
import { CopyIcon } from "lucide-react";
import * as React from "react";
import { useAnchoredBarHeight } from "@/app/anchored-bar";
import { DeskViewFooter } from "@/app/desk/desk-toolbar";
import { minuteLabel } from "@/app/format";
import { toastRefusal } from "@/app/desk/booking-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Field, FieldError, FieldItem, FieldLabel } from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toastManager } from "@/components/ui/toast";
import { useDataClient, useWrite } from "@/data/provider";
import type { Weekday } from "@/lib/plain-date";
import { type DayHours, type VenueSettings, WEEKDAY_LABEL, WEEKDAYS } from "@/lib/venue";
import { cn } from "@/lib/utils";

export type HoursEdits = Partial<Record<Weekday, DayHours>>;

const TIMES = Array.from({ length: 49 }, (_, i) => i * 30);
const timeLabel = (m: number): string => (m === 24 * 60 ? "Midnight" : minuteLabel(m));

function same(a: DayHours, b: DayHours): boolean {
  return a.open === b.open && a.close === b.close && a.closed === b.closed;
}

/** The hours with the edits laid over them, and which days really changed. */
function applyEdits(saved: VenueSettings["hours"], edits: HoursEdits): { hours: VenueSettings["hours"]; changed: Weekday[] } {
  const hours = Object.fromEntries(WEEKDAYS.map((d) => [d, edits[d] ?? saved[d]])) as VenueSettings["hours"];
  return { hours, changed: WEEKDAYS.filter((d) => !same(hours[d], saved[d])) };
}

/** "Mon–Fri 6:00 am – 11:00 pm", for the card's summary line. */
function summary(hours: VenueSettings["hours"]): string {
  const open = WEEKDAYS.filter((d) => !hours[d].closed);
  if (open.length === 0) return "Closed every day";
  if (open.length === 7 && open.every((d) => same(hours[d], hours.mon))) return `Every day, ${timeLabel(hours.mon.open)} – ${timeLabel(hours.mon.close)}`;
  return `Open ${open.length} ${open.length === 1 ? "day" : "days"} a week`;
}

export function WeeklyHoursCard({
  settings,
  edits,
  onEdits,
  readOnly,
}: {
  settings: VenueSettings;
  edits: HoursEdits;
  onEdits: (edits: HoursEdits) => void;
  readOnly: boolean;
}): React.ReactElement {
  const { hours, changed } = applyEdits(settings.hours, edits);
  const set = (day: Weekday, patch: Partial<DayHours>): void => onEdits({ ...edits, [day]: { ...hours[day], ...patch } });
  const copy = (from: Weekday, to: readonly Weekday[]): void => {
    const source = hours[from];
    onEdits({ ...edits, ...Object.fromEntries(to.map((d) => [d, { ...source }])) });
  };

  return (
    <Card>
      <CardHeader>
        <h2>
          <CardTitle render={<span className="block" />}>Weekly hours</CardTitle>
        </h2>
        <CardDescription>
          When courts can be booked, each day. {summary(hours)}.
        </CardDescription>
      </CardHeader>
      <CardPanel className="pt-0">
        <ul aria-label="Opening hours by day" className="flex flex-col divide-y">
          {WEEKDAYS.map((day) => (
            <DayRow
              changed={changed.includes(day)}
              day={day}
              hours={hours[day]}
              key={day}
              onCopy={(to) => copy(day, to)}
              onSet={(patch) => set(day, patch)}
              readOnly={readOnly}
            />
          ))}
        </ul>
      </CardPanel>
    </Card>
  );
}

function DayRow({
  day,
  hours,
  changed,
  readOnly,
  onSet,
  onCopy,
}: {
  day: Weekday;
  hours: DayHours;
  changed: boolean;
  readOnly: boolean;
  onSet: (patch: Partial<DayHours>) => void;
  onCopy: (to: Weekday[]) => void;
}): React.ReactElement {
  const name = WEEKDAY_LABEL[day].long;
  const invalid = !hours.closed && hours.close <= hours.open;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3" data-changed={changed || undefined}>
      <Field className="w-36 flex-row items-center gap-3">
        <Switch aria-label={`Open on ${name}`} checked={!hours.closed} disabled={readOnly} onCheckedChange={(open) => onSet({ closed: !open })} />
        <FieldLabel className={cn("font-medium", hours.closed && "text-muted-foreground")}>{name}</FieldLabel>
      </Field>
      {hours.closed ? (
        <span className="min-w-56 flex-1 text-muted-foreground text-sm">Closed</span>
      ) : (
        <div className="flex min-w-56 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <TimeSelect disabled={readOnly} invalid={invalid} label={`${name} opens`} onChange={(open) => onSet({ open })} value={hours.open} />
            <span aria-hidden="true" className="text-muted-foreground">
              –
            </span>
            <TimeSelect disabled={readOnly} invalid={invalid} label={`${name} closes`} onChange={(close) => onSet({ close })} value={hours.close} />
          </div>
          {invalid && (
            <Field invalid>
              <FieldError match>Closing time has to be after opening time.</FieldError>
            </Field>
          )}
        </div>
      )}
      <div className="ms-auto flex items-center gap-2">
        {changed && <Badge variant="warning">Changed</Badge>}
        <CopyTimes day={day} disabled={readOnly || hours.closed || invalid} onCopy={onCopy} />
      </div>
    </li>
  );
}

function TimeSelect({ label, value, onChange, disabled, invalid }: { label: string; value: number; onChange: (minute: number) => void; disabled: boolean; invalid: boolean }): React.ReactElement {
  return (
    <Select<number> disabled={disabled} items={TIMES.map((m) => ({ label: timeLabel(m), value: m }))} onValueChange={(v) => v !== null && onChange(v)} value={value}>
      <SelectTrigger aria-invalid={invalid || undefined} aria-label={label} className="w-32 min-w-0 tabular-nums">
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

/** Copy one day's hours onto others: a checkbox per day (Cal.com's "Copy times to…"), Select all, Apply. */
function CopyTimes({ day, disabled, onCopy }: { day: Weekday; disabled: boolean; onCopy: (to: Weekday[]) => void }): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [picked, setPicked] = React.useState<Weekday[]>([]);
  const others = WEEKDAYS.filter((d) => d !== day);
  const name = WEEKDAY_LABEL[day].long;
  return (
    <Popover
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setPicked([]);
      }}
      open={open}
    >
      <PopoverTrigger render={<Button aria-label={`Copy ${name}'s times to other days`} disabled={disabled} size="icon-sm" variant="ghost" />}>
        <CopyIcon aria-hidden="true" />
      </PopoverTrigger>
      <PopoverPopup align="end" className="w-60">
        <Field name="copy-to" render={(props) => <Fieldset {...props} />}>
          <FieldsetLegend className="mb-3 font-medium text-sm">Copy {name}&rsquo;s times to</FieldsetLegend>
          <FieldItem className="mb-2">
            <FieldLabel className="font-normal">
              <Checkbox
                checked={picked.length === others.length}
                indeterminate={picked.length > 0 && picked.length < others.length}
                onCheckedChange={(on) => setPicked(on ? others : [])}
              />
              Select all
            </FieldLabel>
          </FieldItem>
          <CheckboxGroup onValueChange={(v) => setPicked(WEEKDAYS.filter((d) => v.includes(d)))} value={picked}>
            {others.map((d) => (
              <FieldItem key={d}>
                <FieldLabel className="font-normal">
                  <Checkbox value={d} />
                  {WEEKDAY_LABEL[d].long}
                </FieldLabel>
              </FieldItem>
            ))}
          </CheckboxGroup>
        </Field>
        <Button
          className="mt-3 w-full"
          disabled={picked.length === 0}
          onClick={() => {
            onCopy(picked);
            setOpen(false);
          }}
          size="sm"
        >
          Apply
        </Button>
      </PopoverPopup>
    </Popover>
  );
}

/**
 * The unsaved bar, anchored to the bottom of the desk while the hours differ
 * from what is saved: what changed, Discard, Save. Save stays disabled while a
 * day closes before it opens.
 */
export function HoursSaveBar({ settings, edits, onSaved, onDiscard }: { settings: VenueSettings; edits: HoursEdits; onSaved: () => void; onDiscard: () => void }): React.ReactElement | null {
  const ref = useAnchoredBarHeight<HTMLElement>();
  const client = useDataClient();
  const save = useWrite((c, next: VenueSettings) => c.availability.updateSettings(next));
  const { hours, changed } = applyEdits(settings.hours, edits);
  const invalid = WEEKDAYS.some((d) => !hours[d].closed && hours[d].close <= hours[d].open);
  if (changed.length === 0) return null;

  const submit = async (): Promise<void> => {
    const previous = settings;
    try {
      await save.mutateAsync({ ...settings, hours });
    } catch (error) {
      toastRefusal("Hours not saved", error);
      return;
    }
    onSaved();
    toastManager.add({
      title: "Opening hours saved",
      description: "Online booking uses them from now on.",
      type: "success",
      actionProps: {
        children: "Undo",
        onClick: () => {
          client.availability.updateSettings(previous).catch((error: unknown) => toastRefusal("Couldn't undo", error));
        },
      },
    });
  };

  return (
    <DeskViewFooter>
      <section aria-label="Unsaved hours" className="border-t bg-background/94 pb-[env(safe-area-inset-bottom)] backdrop-blur-md" data-slot="hours-savebar" ref={ref}>
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-end gap-2 px-4 py-3">
          <span aria-live="polite" className="me-auto flex items-center gap-2 text-sm">
            <Badge variant="warning">Unsaved changes</Badge>
            <span className="text-muted-foreground max-sm:hidden">{changed.map((d) => WEEKDAY_LABEL[d].long).join(", ")}</span>
          </span>
          <Button disabled={save.isPending} onClick={onDiscard} variant="ghost">
            Discard
          </Button>
          <Button disabled={invalid} loading={save.isPending} onClick={() => void submit()}>
            Save hours
          </Button>
        </div>
      </section>
    </DeskViewFooter>
  );
}

export function HoursSkeleton(): React.ReactElement {
  return (
    <div aria-busy="true" className="flex flex-col gap-3 rounded-2xl border p-6" role="status">
      <span className="sr-only">Loading opening hours</span>
      <Skeleton className="h-5 w-40" />
      {WEEKDAYS.map((d) => (
        <Skeleton className="h-9" key={d} />
      ))}
    </div>
  );
}

