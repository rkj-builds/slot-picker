"use client";

import { ArrowRightIcon, BlocksIcon } from "lucide-react";
import type * as React from "react";
import { Anchor } from "@/app/anchor";
import {
  BareRecurrence,
  BareSlotGrid,
  BareTimeZone,
  BookingSkinRecurrence,
  BookingSkinSlotGrid,
  BookingSkinTimeZone,
  DeskSkinRecurrence,
  DeskSkinSlotGrid,
  DeskSkinTimeZone,
} from "@/app/primitives/primitive-demos";
import { StatesIndex } from "@/app/states-index";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PrimitiveDoc {
  id: string;
  name: string;
  line: string;
  api: string;
  usedIn: string[];
  skins: { title: string; note: string; demo: React.ReactNode }[];
  keys: [string, string][];
  semantics: string[];
  motion: string[];
  why: string;
  earned: string;
}

const DOCS: PrimitiveDoc[] = [
  {
    id: "slot-grid",
    name: "SlotGrid",
    line: "A grid of time slots with one tab stop, a full keyboard model, and unavailable slots that stay reachable and say why.",
    api: `<SlotGrid.Root value onValueChange selectionMode="single" | "none" orientation="horizontal" | "vertical">
  <SlotGrid.Group aria-label="Evening">
    <SlotGrid.Row>
      <SlotGrid.Cell value="19:30" disabled reason="booked" render={<Button />} className={(s) => …} />`,
    usedIn: ["Book · start times", "Desk · day grid"],
    skins: [
      { title: "Bare", note: "No classes. Browser buttons, styled only through [data-selected], [data-disabled] and [data-highlighted].", demo: <BareSlotGrid /> },
      { title: "Booking skin", note: "Single mode: a radiogroup. Cells render a coss Button through a render function of state.", demo: <BookingSkinSlotGrid /> },
      { title: "Desk skin", note: "selectionMode none, orientation vertical: each court a column, every cell an action.", demo: <DeskSkinSlotGrid /> },
    ],
    keys: [
      ["←|→", "Previous / next cell. Horizontal: in reading order, wrapping at the ends. Vertical: the other column, at the same time."],
      ["↑|↓", "Horizontal: the cell above / below, from the measured column count, into the next group. Vertical: the previous / next cell in the column."],
      ["Home|End", "Horizontal: first / last cell of the grid. Vertical: of the column (with Ctrl or ⌘: of the grid)."],
      ["Page Up|Page Down", "First cell of the previous / next group (a period, or a court)."],
      ["Space|Enter", "Single mode: choose the focused cell. None mode: the cell's own action."],
      ["Tab", "One stop for the whole grid: the selected cell, else the last focused, else the first available."],
    ],
    semantics: [
      "Single mode is a radiogroup of radios, not an ARIA grid: one value is chosen, and a grid would announce row and column numbers that change with the window's width and mean nothing here.",
      "None mode is a group of buttons: on the desk a cell is an action (open a booking), never a selection.",
      "Groups are role=group with a name (Morning, Court 2), so a screen reader hears where it is.",
      "Unavailable cells use aria-disabled, never disabled: they stay focusable and their name ends with the reason (\"7:30 pm, booked\").",
      "Selection follows focus onto available cells only, like native radios; selectOnFocus={false} turns it off.",
      "Right-to-left pages swap ← and → (Base UI's DirectionProvider).",
    ],
    motion: ["None of its own: a headless part. Skins animate from data-highlighted / data-selected if they want to; these do not, so a choice registers instantly."],
    why: "It owns behaviour, not looks: focus, keys, selection and ARIA, exposed as parts and data attributes. The booking skin and the desk skin share none of their markup or styling.",
    earned: "When the desk needed the start-time grid's keyboard model for a second, different layout. coss's Radio Group and Toggle Group have no Page Up/Down, no geometry-aware Up/Down, and skip the disabled items people need to reach.",
  },
  {
    id: "recurrence",
    name: "Recurrence",
    line: "Weekly rules (days, interval, hours, until or count, skipped dates) expanded in the venue's zone and summarised in the reader's language.",
    api: `const r = useRecurrence({ value, onValueChange, locale })
r.toggleWeekday("sat"); r.setEnd({ type: "until", date }); r.summary
expandRecurrence(rule, { from, to }) → [{ date, start, end }]
summarizeRecurrence(rule, "fr") → "Chaque samedi et dimanche, 16:00 – 17:00, jusqu’au 30 nov."`,
    usedIn: ["Desk · Block courts", "Book · blocked slots", "Checkout · conflict checks"],
    skins: [
      { title: "Bare", note: "useRecurrence driving native checkboxes, a number, selects, radios and a date input.", demo: <BareRecurrence /> },
      { title: "Booking skin", note: "What a customer sees of a weekly hold, in their own zone. New York's row moves an hour on 1 Nov.", demo: <BookingSkinRecurrence /> },
      { title: "Desk skin", note: "The Repeat editor from Block courts: ToggleGroup, NumberField, Select, RadioGroup, Calendar.", demo: <DeskSkinRecurrence /> },
    ],
    keys: [
      ["Tab", "Through the native or coss controls; the model adds no keys of its own."],
      ["←|→", "Between days in the coss ToggleGroup (Base UI's roving focus)."],
      ["↑|↓", "Step the interval or the count in a NumberField."],
      ["Space", "Toggle a day, or skip a date in the next-dates list."],
    ],
    semantics: [
      "The model is data: a rule in, occurrences and a sentence out. Labels, fieldsets and live regions belong to whichever controls render it.",
      "Times are wall clock in the rule's zone; an occurrence becomes an instant only when expanded, so DST is handled per date (a spring-forward gap shifts forward, as calendars do).",
      "COUNT is counted before skipped dates are removed, as RFC 5545 says for EXDATE.",
      "Summaries use only Intl (DateTimeFormat, ListFormat, PluralRules, NumberFormat); the connecting words come from a two-language table with English as fallback. Durations are never decimal.",
    ],
    motion: ["None. The summary line updates in place (aria-live polite); moving text would be harder to read while editing."],
    why: "The rule is the product's truth: the desk, the customer's slot grid and the checkout's conflict check all expand the same rule. The editor is just one way to change it.",
    earned: "When a real club hold (both courts, every weekend, until ended) had to block online booking without writing a row per date, and end in one action.",
  },
  {
    id: "time-zone",
    name: "TimeZone",
    line: "Every IANA zone with a city, a region and its offset at a chosen instant, searchable, ready for a Base UI Combobox.",
    api: `const { rootProps } = useTimeZoneCombobox({ value, onValueChange, at, locale })
<Combobox {...rootProps}> … </Combobox>
describeZone("America/New_York", at) → { city, region, offsetLabel: "GMT-5", longName, label }`,
    usedIn: ["Book · “Also show times in”"],
    skins: [
      { title: "Bare", note: "Base UI's Combobox parts with no classes, fed by the hook.", demo: <BareTimeZone /> },
      { title: "Booking skin", note: "The picker and the “Times are in…” line, either side of New York's DST change.", demo: <BookingSkinTimeZone /> },
      { title: "Desk skin", note: "Compact, in a coss Toolbar.", demo: <DeskSkinTimeZone /> },
    ],
    keys: [
      ["Type", "Filter by city, country's long name (“india”), region or offset (“+5:30”, “gmt-5”)."],
      ["↓|↑", "Open the list, move through options across region groups."],
      ["Enter", "Choose the highlighted zone."],
      ["Esc", "Close the list, keep the value."],
    ],
    semantics: [
      "Base UI's ARIA combobox: an input with role=combobox, a listbox, options grouped under labelled groups (Asia, Americas).",
      "Each option reads “Kolkata GMT+5:30”; the long name is searchable but not repeated aloud.",
      "Offsets are computed at `at`, the day being looked at, so a list opened for 1 Nov says GMT-5 for New York and one for 31 Oct says GMT-4.",
      "Old ids are canonicalised (Asia/Calcutta → Asia/Kolkata); engines without Intl.supportedValuesOf get a 47-zone list.",
    ],
    motion: ["coss's popup scales and fades in from its anchor (data-starting-style); under reduced motion it simply appears."],
    why: "Zones are data with rules (offsets move, names change); the picker is a Combobox that already exists. The primitive is the data and the search, not another listbox.",
    earned: "When the booking flow had to show a viewer's own times across a DST change while the venue's clock stays put.",
  },
];

const MOTION: [string, string, string][] = [
  ["Booking step change", "Slides 12 px from the side you moved towards, 220 ms", "Forward and back feel different, so you know which way you went."],
  ["Hold countdown", "One scale beat when it turns amber, another at red; the meter eases its colour", "The change in urgency is noticed without a ticking distraction."],
  ["Toasts on a phone", "No motion of their own beyond coss's; the page shifts up by the toast's height, instantly", "Content makes room for a toast instead of hiding behind it; an animated scroll would fight your own."],
  ["Drawers, sheets, dialogs, popups", "coss's data-starting-style / data-ending-style transitions", "Where a surface came from, and where it went."],
  ["Toasts", "coss's stack: slide in, swipe away; gone after four seconds", "A passing outcome, never something to read later."],
  ["Slot selection, desk cells", "Nothing", "A choice must register instantly; motion would only delay it."],
];

/**
 * The primitives extracted from this product, each shown three ways: bare
 * (no styles), in the booking skin and in the desk skin. Then its keyboard
 * map, semantics, motion, and why it is a primitive at all.
 */
export function PrimitivesPage(): React.ReactElement {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-8 sm:py-10">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <BlocksIcon aria-hidden="true" className="size-4" />
          src/primitives
        </div>
        <h1 className="font-semibold text-3xl tracking-tight outline-none" tabIndex={-1}>
          Primitives
        </h1>
        <p className="max-w-3xl text-pretty text-muted-foreground">
          A component is a look you can drop in. A primitive is behaviour you can build looks on: state, keys, semantics, and data attributes to style from, with no
          markup opinions. These three came out of this product once a second screen needed the same behaviour in a different skin. They follow Base UI's conventions:
          dot-namespaced parts, a <code className="font-mono text-foreground text-xs">render</code> prop, <code className="font-mono text-foreground text-xs">className</code>{" "}
          as a function of state, controlled or uncontrolled values.
        </p>
        <nav aria-label="Primitives">
          <ul className="flex flex-wrap gap-1.5">
            {[...DOCS.map((d) => ({ id: d.id, label: d.name })), { id: "motion", label: "Motion" }, { id: "states", label: "States" }].map((d) => (
              <li key={d.id}>
                <Button
                  className="rounded-full font-normal text-muted-foreground before:rounded-full"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    document.getElementById(d.id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
                  }}
                  render={<Anchor href="#/primitives" />}
                  size="xs"
                  variant="outline"
                >
                  {d.label}
                </Button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {DOCS.map((doc) => (
        <PrimitiveSection doc={doc} key={doc.id} />
      ))}

      <section aria-labelledby="motion" className="flex scroll-mt-16 flex-col gap-4">
        <SectionHeading id="motion" line="Only where it tells you something. Everything here stops under prefers-reduced-motion." title="Motion" />
        <Card>
          <Table aria-label="Why each thing animates">
            <TableHeader>
              <TableRow>
                <TableHead>What</TableHead>
                <TableHead>How</TableHead>
                <TableHead>Why it animates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOTION.map(([what, how, why]) => (
                <TableRow key={what}>
                  <TableCell className="font-medium">{what}</TableCell>
                  <TableCell className="whitespace-normal py-2.5 text-muted-foreground leading-normal">{how}</TableCell>
                  <TableCell className="whitespace-normal py-2.5 leading-normal">{why}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>

      <section aria-labelledby="states" className="flex scroll-mt-16 flex-col gap-4">
        <SectionHeading id="states" line="Every state of the product, one click away. Each link turns on its demo switch and goes to the screen." title="States" />
        <StatesIndex />
      </section>

      <p className="flex items-center gap-1.5 text-muted-foreground text-sm">
        The coss components these skins are built from are on
        <Button className="h-auto px-0 py-0 text-sm sm:h-auto" render={<Anchor href="#/components" />} variant="link">
          Components
          <ArrowRightIcon aria-hidden="true" />
        </Button>
      </p>
    </main>
  );
}

function SectionHeading({ id, title, line }: { id: string; title: string; line: string }): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="font-semibold text-xl tracking-tight" id={id}>
        {title}
      </h2>
      <p className="max-w-3xl text-pretty text-muted-foreground text-sm">{line}</p>
    </div>
  );
}

function PrimitiveSection({ doc }: { doc: PrimitiveDoc }): React.ReactElement {
  return (
    <section aria-labelledby={doc.id} className="flex scroll-mt-16 flex-col gap-5" data-slot="primitive-section">
      <div className="flex flex-col gap-3">
        <SectionHeading id={doc.id} line={doc.line} title={doc.name} />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-xs">Used in</span>
          {doc.usedIn.map((u) => (
            <Badge key={u} variant="outline">
              {u}
            </Badge>
          ))}
        </div>
        <pre className="overflow-x-auto rounded-xl border bg-muted px-4 py-3 font-mono text-xs leading-relaxed" data-slot="api-sketch">
          <code>{doc.api}</code>
        </pre>
      </div>

      <ol aria-label={`${doc.name}, three ways`} className="grid gap-4 lg:grid-cols-3">
        {doc.skins.map((skin, i) => (
          <li className="flex min-w-0" key={skin.title}>
            <Card className="w-full">
              <CardHeader>
                <h3>
                  <CardTitle className="flex items-center gap-2 text-base" render={<span />}>
                    <span className="flex size-5 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-xs" aria-hidden="true">
                      {String.fromCharCode(97 + i)}
                    </span>
                    {skin.title}
                  </CardTitle>
                </h3>
                <CardDescription>{skin.note}</CardDescription>
              </CardHeader>
              <CardPanel className="min-w-0">{skin.demo}</CardPanel>
            </Card>
          </li>
        ))}
      </ol>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3>
              <CardTitle className="text-base" render={<span />}>
                Keyboard
              </CardTitle>
            </h3>
          </CardHeader>
          <CardPanel className="pt-0">
            <Table aria-label={`${doc.name} keyboard map`}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Keys</TableHead>
                  <TableHead>Does</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doc.keys.map(([keys, does]) => (
                  <TableRow key={keys}>
                    <TableCell className="align-top">
                      <span className="flex flex-wrap gap-1">
                        {keys.split("|").map((k) => (
                          <Kbd key={k}>{k}</Kbd>
                        ))}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-normal py-2.5 leading-normal">{does}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardPanel>
        </Card>
        <Card>
          <CardHeader>
            <h3>
              <CardTitle className="text-base" render={<span />}>
                Semantics and motion
              </CardTitle>
            </h3>
          </CardHeader>
          <CardPanel className="flex flex-col gap-4 pt-0 text-sm">
            <ul className="flex list-disc flex-col gap-1.5 ps-5">
              {doc.semantics.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <div className="flex flex-col gap-1">
              <span className="font-medium">Motion</span>
              {doc.motion.map((m) => (
                <p className="text-muted-foreground" key={m}>
                  {m}
                </p>
              ))}
            </div>
          </CardPanel>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <h3>
              <CardTitle className="text-base" render={<span />}>
                Why this is a primitive, not a component
              </CardTitle>
            </h3>
            <CardDescription className="text-pretty">{doc.why}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <h3>
              <CardTitle className="text-base" render={<span />}>
                When it earned its place
              </CardTitle>
            </h3>
            <CardDescription className="text-pretty">{doc.earned}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </section>
  );
}
