"use client";

import { ArrowLeftIcon, CopyIcon, ExternalLinkIcon, PlusIcon, TrashIcon } from "lucide-react";
import * as React from "react";
import { useResources } from "@/components/compositions/resources/context";
import { Pane, ScreenHeader, SettingsNav } from "@/components/compositions/resources/kit";
import { DAY_LABEL, dayLabel, minuteLabel } from "@/components/compositions/resources/words";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Field, FieldDescription, FieldError, FieldItem, FieldLabel } from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput } from "@/components/ui/number-field";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { isPlainDate, type Weekday } from "@/lib/plain-date";
import { EVERY_DAY, invalidDays, RESOURCE_KINDS, type Resource, type ResourceHours, type ResourceKind, validateResource, WEEK_ORDER } from "@/lib/resources";
import { cn } from "@/lib/utils";

type Page = "basics" | "hours" | "overrides" | "links";

const GROUPS = [
  {
    title: "Setup",
    pages: [
      { value: "basics", label: "Basics" },
      { value: "hours", label: "Hours" },
      { value: "overrides", label: "Date overrides" },
    ],
  },
  { title: "Used by", pages: [{ value: "links", label: "Links" }] },
] as const;

const TIMES = Array.from({ length: 49 }, (_, i) => i * 30);

function blank(id: string): Resource {
  return { id, name: "", kind: "court", atOnce: 1, people: 4, hours: EVERY_DAY(6 * 60, 22 * 60), active: true, overrides: [] };
}

/**
 * A resource's own page, in the shape of a Cal.com editor: the settings nav
 * down the left, one page at a time, Save in the header. Hours are
 * Availability's own rows; capacity is two plain numbers.
 */
export function ResourceEditor({ mode }: { mode: "new" | "edit" }): React.ReactElement {
  const { resources, resourceId, open, saveResource, link, changeLink, timeZone, locale } = useResources("ResourceEditor");
  const existing = mode === "edit" ? (resources.find((r) => r.id === resourceId) ?? resources[0]) : undefined;
  const [draft, setDraft] = React.useState<Resource>(() => existing ?? blank(`res_${Math.random().toString(36).slice(2, 8)}`));
  const [page, setPage] = React.useState<Page>("basics");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const set = (patch: Partial<Resource>): void => {
    setDraft((d) => ({ ...d, ...patch }));
    setSaved(false);
    setError(null);
  };

  const submit = async (): Promise<void> => {
    const why = validateResource(draft);
    if (why) {
      setError(why);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveResource(draft);
      if (mode === "new") open("list");
      else setSaved(true);
    } catch (reason: unknown) {
      setError(reason instanceof Error && reason.message ? reason.message : "Couldn’t save. Nothing changed.");
    } finally {
      setSaving(false);
    }
  };

  const usedBy = link.who.kind === "resource" && link.who.resourceIds.includes(draft.id);

  return (
    <Pane data-screen={mode === "new" ? "new" : "resource"}>
      <ScreenHeader
        actions={
          <>
            <span aria-live="polite" className="text-muted-foreground text-xs" role="status">
              {saved ? "Saved" : ""}
            </span>
            <Field className="flex-row items-center gap-2">
              <Switch checked={draft.active} onCheckedChange={(active) => set({ active })} />
              <FieldLabel>Offered</FieldLabel>
            </Field>
            <Button loading={saving} onClick={() => void submit()}>
              Save
            </Button>
          </>
        }
        back={
          <Button className="-ms-2 self-start text-muted-foreground" onClick={() => open("list")} size="sm" variant="ghost">
            <ArrowLeftIcon aria-hidden="true" className="rtl:rotate-180" />
            Resources
          </Button>
        }
        title={draft.name.trim() === "" ? "New resource" : <bdi>{draft.name}</bdi>}
      />
      {error && (
        <Alert variant="error">
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}
      <div className="flex flex-col gap-6 @2xl/pane:flex-row @2xl/pane:gap-8">
        <SettingsNav<Page> groups={GROUPS} label="Resource settings" onValueChange={setPage} value={page} />
        <div className="flex min-w-0 max-w-xl flex-1 flex-col gap-5" data-page={page}>
          {page === "basics" && (
            <>
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ name: e.target.value })} placeholder="Court 3" value={draft.name} />
              </Field>
              <Field>
                <FieldLabel>Kind</FieldLabel>
                <Select<ResourceKind> items={RESOURCE_KINDS} onValueChange={(kind) => kind !== null && set({ kind })} value={draft.kind}>
                  <SelectTrigger aria-label="Kind" className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {RESOURCE_KINDS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </Field>
              <div className="grid gap-5 @lg/pane:grid-cols-2">
                <Field>
                  <FieldLabel>Bookings at once</FieldLabel>
                  <NumberField max={50} min={1} onValueChange={(v) => v !== null && set({ atOnce: v })} value={draft.atOnce}>
                    <NumberFieldGroup className="w-36">
                      <NumberFieldDecrement aria-label="One fewer at once" />
                      <NumberFieldInput aria-label="Bookings at once" />
                      <NumberFieldIncrement aria-label="One more at once" />
                    </NumberFieldGroup>
                  </NumberField>
                  <FieldDescription>A court takes one. A pair of racquets takes two.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>People per booking</FieldLabel>
                  <NumberField max={100} min={1} onValueChange={(v) => v !== null && set({ people: v })} value={draft.people}>
                    <NumberFieldGroup className="w-36">
                      <NumberFieldDecrement aria-label="One person fewer" />
                      <NumberFieldInput aria-label="People per booking" />
                      <NumberFieldIncrement aria-label="One person more" />
                    </NumberFieldGroup>
                  </NumberField>
                  <FieldDescription>At most. Shown on the booking page.</FieldDescription>
                </Field>
              </div>
            </>
          )}
          {page === "hours" && (
            <Fieldset className="flex flex-col gap-1">
              <FieldsetLegend className="font-medium text-sm">Hours</FieldsetLegend>
              <p className="text-muted-foreground text-xs">When this resource can be booked. Its own week, not yours.</p>
              <ul aria-label="Hours by day" className="mt-2 flex flex-col divide-y">
                {WEEK_ORDER.map((day) => (
                  <DayRow
                    day={day}
                    hours={draft.hours[day]}
                    key={day}
                    locale={locale}
                    onCopy={(to) => set({ hours: { ...draft.hours, ...Object.fromEntries(to.map((d) => [d, { ...draft.hours[day] }])) } })}
                    onSet={(patch) => set({ hours: { ...draft.hours, [day]: { ...draft.hours[day], ...patch } } })}
                    timeZone={timeZone}
                  />
                ))}
              </ul>
            </Fieldset>
          )}
          {page === "overrides" && <Overrides draft={draft} locale={locale} onChange={(overrides) => set({ overrides })} />}
          {page === "links" && (
            <div className="flex flex-col gap-3">
              <p className="font-medium text-sm">Links that book this</p>
              {usedBy ? (
                <ul className="flex flex-col divide-y rounded-xl border">
                  <li className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-medium text-sm">{link.title}</span>
                      <span className="text-muted-foreground text-xs">/{link.slug} · any free one</span>
                    </span>
                    <Button onClick={() => open("link")} size="sm" variant="outline">
                      <ExternalLinkIcon aria-hidden="true" />
                      Open
                    </Button>
                  </li>
                </ul>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-4">
                  <span className="text-muted-foreground text-sm">No link books it yet.</span>
                  <Button onClick={() => changeLink({ ...link, who: { kind: "resource", resourceIds: [...(link.who.kind === "resource" ? link.who.resourceIds : []), draft.id] } })} size="sm" variant="outline">
                    <PlusIcon aria-hidden="true" />
                    Add to {link.title}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Pane>
  );
}

function DayRow({
  day,
  hours,
  timeZone,
  locale,
  onSet,
  onCopy,
}: {
  day: Weekday;
  hours: ResourceHours;
  timeZone: string;
  locale: string | undefined;
  onSet: (patch: Partial<ResourceHours>) => void;
  onCopy: (to: Weekday[]) => void;
}): React.ReactElement {
  const name = DAY_LABEL[day].long;
  const invalid = invalidDays({ ...EVERY_DAY(0, 1), [day]: hours }).includes(day);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <Field className="w-32 flex-row items-center gap-3">
        <Switch aria-label={`Open on ${name}`} checked={!hours.closed} onCheckedChange={(open) => onSet({ closed: !open })} />
        <FieldLabel className={cn("font-medium", hours.closed && "text-muted-foreground")}>{name}</FieldLabel>
      </Field>
      {hours.closed ? (
        <span className="min-w-48 flex-1 text-muted-foreground text-sm">Closed</span>
      ) : (
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <TimeSelect invalid={invalid} label={`${name} opens`} locale={locale} onChange={(open) => onSet({ open })} timeZone={timeZone} value={hours.open} />
            <span aria-hidden="true" className="text-muted-foreground">
              –
            </span>
            <TimeSelect invalid={invalid} label={`${name} closes`} locale={locale} onChange={(close) => onSet({ close })} timeZone={timeZone} value={hours.close} />
          </div>
          {invalid && (
            <Field invalid>
              <FieldError match>Closing time has to be after opening time.</FieldError>
            </Field>
          )}
        </div>
      )}
      <CopyTimes day={day} disabled={hours.closed || invalid} onCopy={onCopy} />
    </li>
  );
}

function TimeSelect({ label, value, onChange, invalid, timeZone, locale }: { label: string; value: number; onChange: (minute: number) => void; invalid: boolean; timeZone: string; locale: string | undefined }): React.ReactElement {
  const items = React.useMemo(() => TIMES.map((m) => ({ label: minuteLabel(m, timeZone, locale), value: m })), [timeZone, locale]);
  return (
    <Select<number> items={items} onValueChange={(v) => v !== null && onChange(v)} value={value}>
      <SelectTrigger aria-invalid={invalid || undefined} aria-label={label} className="w-30 min-w-0 tabular-nums" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {items.map((m) => (
          <SelectItem key={m.value} value={m.value}>
            {m.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

/** Copy one day's hours onto others: Cal.com's "Copy times to…". */
function CopyTimes({ day, disabled, onCopy }: { day: Weekday; disabled: boolean; onCopy: (to: Weekday[]) => void }): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [picked, setPicked] = React.useState<Weekday[]>([]);
  const others = WEEK_ORDER.filter((d) => d !== day);
  const name = DAY_LABEL[day].long;
  return (
    <Popover
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setPicked([]);
      }}
      open={open}
    >
      <PopoverTrigger render={<Button aria-label={`Copy ${name}’s times to other days`} className="ms-auto" disabled={disabled} size="icon-sm" variant="ghost" />}>
        <CopyIcon aria-hidden="true" />
      </PopoverTrigger>
      <PopoverPopup align="end" className="w-56">
        <Field name="copy-to" render={(props) => <Fieldset {...props} />}>
          <FieldsetLegend className="mb-3 font-medium text-sm">Copy {name}’s times to</FieldsetLegend>
          <CheckboxGroup onValueChange={(v) => setPicked(WEEK_ORDER.filter((d) => v.includes(d)))} value={picked}>
            {others.map((d) => (
              <FieldItem key={d}>
                <FieldLabel className="font-normal">
                  <Checkbox value={d} />
                  {DAY_LABEL[d].long}
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

function Overrides({ draft, locale, onChange }: { draft: Resource; locale: string | undefined; onChange: (overrides: Resource["overrides"]) => void }): React.ReactElement {
  const [date, setDate] = React.useState("");
  const [reason, setReason] = React.useState("");
  const add = (): void => {
    if (!isPlainDate(date)) return;
    onChange([...draft.overrides.filter((o) => o.date !== date), { date, reason: reason.trim() || "Closed" }].sort((a, b) => a.date.localeCompare(b.date)));
    setDate("");
    setReason("");
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <p className="font-medium text-sm">Date overrides</p>
        <p className="text-muted-foreground text-xs">Days the week’s hours don’t apply: a tournament, a repair, a holiday. Closed all day.</p>
      </div>
      {draft.overrides.length > 0 ? (
        <ul aria-label="Date overrides" className="flex flex-col divide-y rounded-xl border">
          {draft.overrides.map((o) => (
            <li className="flex items-center justify-between gap-3 px-4 py-2.5" key={o.date}>
              <span className="flex min-w-0 flex-col">
                <span className="font-medium text-sm">{dayLabel(o.date, locale)}</span>
                <span className="truncate text-muted-foreground text-xs">
                  Closed · <bdi>{o.reason}</bdi>
                </span>
              </span>
              <Button aria-label={`Remove the override on ${dayLabel(o.date, locale)}`} onClick={() => onChange(draft.overrides.filter((x) => x.date !== o.date))} size="icon-sm" variant="ghost">
                <TrashIcon aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed px-4 py-3 text-muted-foreground text-sm">None yet.</p>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <Field className="w-40">
          <FieldLabel>Date</FieldLabel>
          <Input onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)} type="date" value={date} />
        </Field>
        <Field className="min-w-40 flex-1">
          <FieldLabel>Reason</FieldLabel>
          <Input onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)} placeholder="Tournament" value={reason} />
        </Field>
        <Button disabled={!isPlainDate(date)} onClick={add} variant="outline">
          <PlusIcon aria-hidden="true" />
          Add
        </Button>
      </div>
    </div>
  );
}
