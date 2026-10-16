"use client";

import { RepeatIcon } from "lucide-react";
import * as React from "react";
import { STATE_META } from "@/app/desk/booking-visuals";
import { makeReservations, schedule } from "@/app/gallery/fixtures";
import { SlotGrid as BookingSlotGrid } from "@/components/booking/slot-grid";
import { TimeZoneHint } from "@/components/booking/time-zone-hint";
import { RepeatEditor } from "@/components/compositions/repeat-editor";
import { SegmentedControl, SegmentedControlItem } from "@/components/compositions/segmented-control";
import { TimeZoneCombobox } from "@/components/compositions/time-zone-combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComboboxPrimitive } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toolbar, ToolbarGroup } from "@/components/ui/toolbar";
import { computeDaySlots } from "@/lib/availability";
import { formatDay, formatTime, formatTimeRange } from "@/lib/format";
import { addDays, type PlainDate } from "@/lib/plain-date";
import { instantAt, zoneCityLabel, zoneOffsetMinutes } from "@/lib/time-zone";
import { cn } from "@/lib/utils";
import { expandRecurrence, type RecurrenceRule, summarizeRecurrence, useRecurrence, WEEK, weekdayName } from "@/primitives/recurrence";
import { SlotGrid } from "@/primitives/slot-grid";
import { useTimeZoneCombobox, type ZoneGroup, type ZoneOption } from "@/primitives/time-zone";

/** A fixed day for the page, so the demos read the same on every visit: Sat 31 Oct 2026, the day before New York's DST ends. */
const DEMO_DATE: PlainDate = "2026-10-31";
const DEMO_NOW = instantAt("2026-10-30", 12 * 60, schedule.timeZone);
const VENUE_ZONE = "Asia/Kolkata";

/** The Off-Screen Club Juniors hold, as the page's starting rule. */
const OSC_RULE: RecurrenceRule = {
  interval: 1,
  weekdays: ["sat", "sun"],
  startDate: "2026-10-17",
  startMinute: 16 * 60,
  endMinute: 17 * 60,
  timeZone: VENUE_ZONE,
  end: { type: "until", date: "2026-11-30" },
  exceptions: [],
};

// --- SlotGrid ---------------------------------------------------------------------------

const BARE_TIMES = [
  { period: "Afternoon", cells: [["16:00", "4:00 pm", ""], ["16:30", "4:30 pm", ""], ["17:00", "5:00 pm", "booked"], ["17:30", "5:30 pm", ""]] },
  { period: "Evening", cells: [["18:00", "6:00 pm", ""], ["18:30", "6:30 pm", "being booked by someone else"], ["19:00", "7:00 pm", ""], ["19:30", "7:30 pm", "ends after closing"]] },
] as const;

/** (a) The primitive with no classes at all: browser buttons, styled only by its data attributes. */
export function BareSlotGrid(): React.ReactElement {
  const [value, setValue] = React.useState<string | null>("16:30");
  return (
    <div data-bare="">
      <SlotGrid.Root aria-label="Start time (bare)" onValueChange={setValue} value={value}>
        {BARE_TIMES.map((g) => (
          <SlotGrid.Group aria-label={g.period} key={g.period}>
            <p aria-hidden="true">{g.period}</p>
            <SlotGrid.Row>
              {g.cells.map(([v, label, reason]) => (
                <SlotGrid.Cell disabled={reason !== ""} key={v} reason={reason || undefined} value={v}>
                  {label}
                </SlotGrid.Cell>
              ))}
            </SlotGrid.Row>
          </SlotGrid.Group>
        ))}
      </SlotGrid.Root>
      <p>
        value: <output>{value ?? "none"}</output>
      </p>
    </div>
  );
}

/** (b) The booking skin: the start-time grid the customer uses, on fixture data. */
export function BookingSkinSlotGrid(): React.ReactElement {
  const [value, setValue] = React.useState<string | null>(null);
  const slots = React.useMemo(() => {
    const reservations = makeReservations(DEMO_NOW);
    return computeDaySlots({ schedule, date: DEMO_DATE, spaceId: "court-1", durationMinutes: 60, reservations, now: DEMO_NOW }).filter((s) => s.minuteOfDay >= 16 * 60);
  }, []);
  return (
    <BookingSlotGrid
      aria-label="Start time (booking skin)"
      columns={3}
      locale="en-IN"
      onValueChange={setValue}
      slots={slots}
      timeZone={schedule.timeZone}
      value={value}
    />
  );
}

const DESK_ROWS = [16 * 60, 16 * 60 + 30, 17 * 60, 17 * 60 + 30, 18 * 60, 18 * 60 + 30];
const DESK_BLOCKS: Record<string, { start: number; end: number; title: string; kind: "blocked" | "part-paid" }[]> = {
  "Court 1": [{ start: 16 * 60, end: 17 * 60, title: "Off-Screen Club Juniors", kind: "blocked" }],
  "Court 2": [
    { start: 16 * 60, end: 17 * 60, title: "Off-Screen Club Juniors", kind: "blocked" },
    { start: 17 * 60 + 30, end: 19 * 60, title: "Diya Patel", kind: "part-paid" },
  ],
};
const ROW = 2.25;

/** (c) The desk skin: the same primitive as a group of action buttons, one column per court. */
export function DeskSkinSlotGrid(): React.ReactElement {
  const [last, setLast] = React.useState<string>("nothing yet");
  const label = (minute: number): string => formatTime(instantAt(DEMO_DATE, minute, VENUE_ZONE), { locale: "en-IN", timeZone: VENUE_ZONE });
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border">
        <SlotGrid.Root aria-label="Courts by half hour (desk skin)" className="grid grid-cols-[3.5rem_1fr_1fr]" orientation="vertical" selectionMode="none">
          <div aria-hidden="true" className="col-span-3 grid grid-cols-subgrid border-b text-xs">
            <span className="px-2 py-1.5 text-muted-foreground">Time</span>
            {Object.keys(DESK_BLOCKS).map((c) => (
              <span className="border-s px-2 py-1.5 font-medium" key={c}>
                {c}
              </span>
            ))}
          </div>
          <div aria-hidden="true" className="relative" style={{ height: `${DESK_ROWS.length * ROW}rem` }}>
            {DESK_ROWS.filter((m) => m % 60 === 0).map((m) => (
              <span className="absolute end-1.5 text-[11px] text-muted-foreground tabular-nums" key={m} style={{ top: `${DESK_ROWS.indexOf(m) * ROW + 0.25}rem` }}>
                {label(m)}
              </span>
            ))}
          </div>
          {Object.entries(DESK_BLOCKS).map(([court, blocks]) => {
            const placed = new Set<string>();
            return (
              <SlotGrid.Group aria-label={court} className="relative border-s" key={court} style={{ height: `${DESK_ROWS.length * ROW}rem` }}>
                {DESK_ROWS.map((minute, row) => {
                  const block = blocks.find((b) => b.start <= minute && minute < b.end);
                  if (block) {
                    if (placed.has(block.title)) return null;
                    placed.add(block.title);
                    const meta = STATE_META[block.kind];
                    const Icon = block.kind === "blocked" ? RepeatIcon : meta.icon;
                    const name = `${court}, ${label(block.start)}, ${block.title}, ${block.kind === "blocked" ? "Blocked, repeats every Sat and Sun" : "Part-paid"}`;
                    return (
                      <SlotGrid.Cell
                        className={cn("absolute inset-x-1 flex h-auto items-start justify-start gap-1 overflow-hidden px-1.5 py-1 text-start font-normal text-[11px] sm:h-auto sm:text-[11px]", meta.block)}
                        end={block.end}
                        key={block.title}
                        label={name}
                        onClick={() => setLast(name)}
                        render={<Button variant="outline" />}
                        start={block.start}
                        style={{ top: `${((block.start - 16 * 60) / 30) * ROW + 0.125}rem`, height: `${((block.end - block.start) / 30) * ROW - 0.25}rem` }}
                        value={`${court}-${block.title}`}
                      >
                        <Icon aria-hidden="true" className="size-3 shrink-0" />
                        <span className="truncate font-medium">{block.title}</span>
                      </SlotGrid.Cell>
                    );
                  }
                  const name = `${court}, ${label(minute)}, empty`;
                  return (
                    <SlotGrid.Cell
                      className={cn("absolute inset-x-0 h-auto rounded-none border-x-0 border-b-0 px-2 font-normal focus-visible:z-10 sm:h-auto", minute % 60 === 0 ? "border-t-border" : "border-dashed border-t-border/40")}
                      end={minute + 30}
                      key={minute}
                      label={name}
                      onClick={() => setLast(name)}
                      render={<Button variant="ghost" />}
                      start={minute}
                      style={{ top: `${row * ROW}rem`, height: `${ROW}rem` }}
                      value={`${court}-${minute}`}
                    />
                  );
                })}
              </SlotGrid.Group>
            );
          })}
        </SlotGrid.Root>
      </div>
      <p aria-live="polite" className="text-muted-foreground text-xs">
        Last opened: <span className="text-foreground">{last}</span>
      </p>
    </div>
  );
}

// --- Recurrence -------------------------------------------------------------------------

const BARE_TIMES_OPTIONS = Array.from({ length: 17 * 2 + 1 }, (_, i) => 6 * 60 + i * 30);
const hhmm = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** (a) `useRecurrence` driving plain HTML inputs: checkboxes, a number, two selects, radios, a date. */
export function BareRecurrence(): React.ReactElement {
  const r = useRecurrence({ defaultValue: OSC_RULE, locale: "en-IN" });
  const { rule } = r;
  return (
    <form data-bare="" onSubmit={(e) => e.preventDefault()}>
      <fieldset>
        <legend>On</legend>
        {WEEK.map((d) => (
          <label key={d} style={{ whiteSpace: "nowrap" }}>
            <input {...r.getWeekdayProps(d)} />
            {weekdayName(d, "en-IN")}{" "}
          </label>
        ))}
      </fieldset>
      <p>
        <label>
          Every <input max={8} min={1} onChange={(e) => r.setInterval(Number(e.target.value))} type="number" value={rule.interval} /> week(s)
        </label>
      </p>
      <p>
        <label>
          From{" "}
          <select onChange={(e) => r.setTimes(Number(e.target.value), Math.max(rule.endMinute, Number(e.target.value) + 30))} value={rule.startMinute}>
            {BARE_TIMES_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {hhmm(m)}
              </option>
            ))}
          </select>
        </label>{" "}
        <label>
          to{" "}
          <select onChange={(e) => r.setTimes(rule.startMinute, Number(e.target.value))} value={rule.endMinute}>
            {BARE_TIMES_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {hhmm(m)}
              </option>
            ))}
          </select>
        </label>
      </p>
      <fieldset>
        <legend>Ends</legend>
        <label>
          <input checked={rule.end.type === "never"} name="bare-end" onChange={() => r.setEnd({ type: "never" })} type="radio" /> never
        </label>{" "}
        <label>
          <input checked={rule.end.type === "until"} name="bare-end" onChange={() => r.setEnd({ type: "until", date: "2026-11-30" })} type="radio" /> on{" "}
        </label>
        <input
          aria-label="Last date"
          disabled={rule.end.type !== "until"}
          onChange={(e) => e.target.value && r.setEnd({ type: "until", date: e.target.value as PlainDate })}
          type="date"
          value={rule.end.type === "until" ? rule.end.date : ""}
        />
      </fieldset>
      <p>
        <output aria-live="polite">{r.valid ? r.summary : r.problems.join(", ")}</output>
      </p>
      <ol>
        {r.next("2026-10-31", 4).map((o) => (
          <li key={o.date}>{o.date}</li>
        ))}
      </ol>
    </form>
  );
}

/**
 * (b) The booking skin: what a customer sees of a weekly hold, in their own
 * zone. Pick New York and the 1 Nov row moves an hour; Kolkata's never does.
 */
export function BookingSkinRecurrence(): React.ReactElement {
  const [viewer, setViewer] = React.useState("America/New_York");
  const zoneId = React.useId();
  const occurrences = expandRecurrence(OSC_RULE, { from: "2026-10-24", to: "2026-11-08" });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="font-medium text-sm">Off-Screen Club Juniors</span>
        <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
          <RepeatIcon aria-hidden="true" className="size-3.5" />
          {summarizeRecurrence(OSC_RULE, "en-IN")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Label className="font-normal text-muted-foreground text-xs" htmlFor={zoneId}>
          Your times in
        </Label>
        <TimeZoneCombobox at={occurrences[0]?.start ?? DEMO_NOW} className="w-52" id={zoneId} locale="en-US" onValueChange={setViewer} size="sm" value={viewer} />
      </div>
      <Table aria-label="Club dates in your zone" className="text-xs">
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>At the venue</TableHead>
            <TableHead>{zoneCityLabel(viewer)}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {occurrences.map((o, i) => {
            const prev = occurrences[i - 1];
            const shifted = prev !== undefined && zoneOffsetMinutes(o.start, viewer) !== zoneOffsetMinutes(prev.start, viewer);
            return (
              <TableRow data-shifted={shifted || undefined} key={o.date}>
                <TableCell className="tabular-nums">{formatDay(o.date, "en-IN")}</TableCell>
                <TableCell className="tabular-nums">{formatTimeRange(o.start, o.end, { locale: "en-IN", timeZone: VENUE_ZONE })}</TableCell>
                <TableCell className="tabular-nums">
                  <span className="flex flex-col items-start gap-1">
                    {formatTimeRange(o.start, o.end, { locale: "en-US", timeZone: viewer })}
                    {shifted && <Badge variant="warning">Clocks changed</Badge>}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/** (c) The desk skin: the Repeat editor the desk uses to block courts, plus the summary in three locales. */
export function DeskSkinRecurrence(): React.ReactElement {
  const [rule, setRule] = React.useState<RecurrenceRule>(OSC_RULE);
  return (
    <div className="flex flex-col gap-4">
      <RepeatEditor locale="en-IN" onValueChange={setRule} preview={4} value={rule} />
      <Table aria-label="The same rule in three locales" className="text-xs">
        <TableHeader>
          <TableRow>
            <TableHead>Locale</TableHead>
            <TableHead>Summary</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {["en-IN", "en-US", "fr"].map((locale) => (
            <TableRow key={locale}>
              <TableCell className="font-mono">{locale}</TableCell>
              <TableCell className="whitespace-normal py-2 leading-normal">{summarizeRecurrence(rule, locale)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// --- TimeZone ---------------------------------------------------------------------------

const DST_DAYS: { date: PlainDate; label: string }[] = [
  { date: "2026-10-31", label: "Sat 31 Oct" },
  { date: "2026-11-01", label: "Sun 1 Nov" },
];

/** (a) Base UI's Combobox parts with no classes, fed by `useTimeZoneCombobox`. */
export function BareTimeZone(): React.ReactElement {
  const [zone, setZone] = React.useState("America/New_York");
  const { rootProps } = useTimeZoneCombobox({ value: zone, onValueChange: setZone, at: instantAt("2026-11-01", 16 * 60, VENUE_ZONE), locale: "en-US" });
  const id = React.useId();
  return (
    <div data-bare="">
      <ComboboxPrimitive.Root {...rootProps}>
        <label htmlFor={id}>Time zone </label>
        <ComboboxPrimitive.Input id={id} />
        <ComboboxPrimitive.Portal>
          <ComboboxPrimitive.Positioner data-bare-popup="" sideOffset={2}>
            <ComboboxPrimitive.Popup>
              <ComboboxPrimitive.Empty>No zone matches.</ComboboxPrimitive.Empty>
              <ComboboxPrimitive.List>
                {(group: ZoneGroup) => (
                  <ComboboxPrimitive.Group items={group.items} key={group.value}>
                    <ComboboxPrimitive.GroupLabel>{group.value}</ComboboxPrimitive.GroupLabel>
                    <ComboboxPrimitive.Collection>
                      {(z: ZoneOption) => (
                        <ComboboxPrimitive.Item key={z.value} value={z}>
                          {z.city} ({z.offsetLabel})
                        </ComboboxPrimitive.Item>
                      )}
                    </ComboboxPrimitive.Collection>
                  </ComboboxPrimitive.Group>
                )}
              </ComboboxPrimitive.List>
            </ComboboxPrimitive.Popup>
          </ComboboxPrimitive.Positioner>
        </ComboboxPrimitive.Portal>
      </ComboboxPrimitive.Root>
      <p>
        value: <output>{zone}</output>
      </p>
    </div>
  );
}

/** (b) The booking skin: the "Times are in…" line and the zone picker, on either side of 1 Nov. */
export function BookingSkinTimeZone(): React.ReactElement {
  const [viewer, setViewer] = React.useState("America/New_York");
  const [day, setDay] = React.useState<PlainDate>("2026-11-01");
  const start = instantAt(day, 16 * 60, VENUE_ZONE);
  const zoneId = React.useId();
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl<PlainDate> aria-label="Day" onValueChange={setDay} size="sm" value={day}>
        {DST_DAYS.map((d) => (
          <SegmentedControlItem<PlainDate> key={d.date} value={d.date}>
            {d.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={zoneId}>Also show times in</Label>
        <TimeZoneCombobox at={start} id={zoneId} locale="en-US" onValueChange={setViewer} value={viewer} />
      </div>
      <TimeZoneHint end={start + 3_600_000} locale="en-US" start={start} timeZone={VENUE_ZONE} viewerTimeZone={viewer} />
      <p className="text-muted-foreground text-xs">4 – 5 pm at the venue. The offset in the picker is the one in force on the day shown.</p>
    </div>
  );
}

/** (c) The desk skin: compact, in a toolbar, for staff who take calls from abroad. */
export function DeskSkinTimeZone(): React.ReactElement {
  const [zone, setZone] = React.useState("Europe/London");
  const at = instantAt(addDays(DEMO_DATE, 1), 16 * 60, VENUE_ZONE);
  const zoneId = React.useId();
  return (
    <div className="flex flex-col gap-3">
      <Toolbar aria-label="Caller's zone" className="flex-wrap items-center">
        <ToolbarGroup className="ps-2">
          <Label className="font-normal text-muted-foreground text-xs" htmlFor={zoneId}>
            Caller in
          </Label>
        </ToolbarGroup>
        <TimeZoneCombobox at={at} className="w-48" id={zoneId} locale="en-IN" onValueChange={setZone} size="sm" value={zone} />
      </Toolbar>
      <p className="text-sm tabular-nums">
        4:00 pm on Sun 1 Nov at the venue is <span className="font-semibold">{formatTime(at, { locale: "en-IN", timeZone: zone })}</span> in {zoneCityLabel(zone)}.
      </p>
    </div>
  );
}
