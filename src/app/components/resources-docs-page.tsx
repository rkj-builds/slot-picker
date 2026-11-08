"use client";

import * as React from "react";
import { Anchor } from "@/app/anchor";
import { BookCallButton } from "@/app/components/book-call-button";
import { DirectionFrame, type Direction } from "@/app/components/direction-frame";
import { PropsTable } from "@/app/components/props-table";
import { ResourcesDemo } from "@/app/components/resources-demo";
import { COURTS, LINK, RAHUL } from "@/app/components/resources-demo-data";
import demoSource from "@/app/components/resources-demo.tsx?raw";
import { ResourcesStory } from "@/app/components/resources-story";
import { navigate, type Route } from "@/app/router";
import { ThemeToggle } from "@/app/theme";
import type { ResourcesScreen } from "@/components/compositions/resources";
import resourcesSource from "@/components/compositions/resources/resources.tsx?raw";
import { SegmentedControl, SegmentedControlItem } from "@/components/compositions/segmented-control";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { parseComponent } from "@/lib/props";

/** Rahul's 30-minute slot on Cal.com; it opens as Cal.com's own booking pop-up (book-call-button.tsx). */
const CAL_SLUG = "rahul-kumar-jha-ll9vhj/30min";
const WORK_LINK = "https://rkj-builds.github.io/for/cal/";
/** The agent's own page is on the Cal.com edition of the site; it has no URL of its own yet. */
const AGENT_LINK = WORK_LINK;
const WAITLIST_LINK = "#/components/waitlist";

/** Short labels, five of them, so the control fits a phone's width. "New" opens from the list's own button and keeps its URL. */
const SCREENS: { value: ResourcesScreen; label: string }[] = [
  { value: "list", label: "List" },
  { value: "resource", label: "Court 1" },
  { value: "link", label: "Link" },
  { value: "bookings", label: "Bookings" },
  { value: "book", label: "Book" },
];
const ALL_SCREENS: ResourcesScreen[] = ["list", "new", "resource", "link", "bookings", "book"];

const DOC = parseComponent(resourcesSource, "Resources");

function screenFrom(route: Route): ResourcesScreen {
  const v = route.query.get("screen");
  return ALL_SCREENS.some((s) => s === v) ? (v as ResourcesScreen) : "list";
}

/** Both courts taken at 7 pm: the time reads as taken on the booking page. */
const BOTH_TAKEN = [RAHUL, { ...RAHUL, id: "x", resourceId: "court-2", name: "Arsh", people: 2, source: "desk" as const, reference: undefined }];
/** Court 2 paused: kept on the link, not offered. */
const PAUSED = COURTS.map((court, i) => (i === 1 ? { ...court, active: false } : court));

/**
 * A feature proposal, laid out the way coss ui documents a component: preview and code, the API read
 * from the type, every state, the keyboard, motion, right-to-left. The instance is Project 831's two
 * courts on one Cal.com account, and the page opens with how that happened (resources-story.tsx).
 */
export function ResourcesDocsPage({ route }: { route: Route }): React.ReactElement {
  const screen = screenFrom(route);
  const dir: Direction = route.query.get("dir") === "rtl" ? "rtl" : "ltr";
  const set = (query: Record<string, string | null>): void => navigate(route.path, { screen: route.query.get("screen"), dir: route.query.get("dir"), theme: route.query.get("theme"), ...query }, { replace: true });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8">
      <header className="flex flex-col gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#/components">Components</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Resources</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-semibold text-3xl" tabIndex={-1}>
              Resources
            </h1>
            <Badge variant="secondary">proposal</Badge>
          </div>
          <p className="max-w-2xl text-muted-foreground">{DOC.summary}</p>
          <p className="max-w-2xl text-muted-foreground text-sm">A Cal.com feature it doesn’t have yet, built on coss ui. Book the court, not the person.</p>
        </div>
      </header>

      <ResourcesStory dir={dir} />

      <section aria-labelledby="preview-h" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-xl" id="preview-h">
            Preview
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl<ResourcesScreen> aria-label="Screen shown" onValueChange={(v) => set({ screen: v === "list" ? null : v })} size="sm" value={screen}>
              {SCREENS.map((s) => (
                <SegmentedControlItem<ResourcesScreen> key={s.value} value={s.value}>
                  {s.label}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
            <SegmentedControl<Direction> aria-label="Direction" onValueChange={(v) => set({ dir: v === "rtl" ? "rtl" : null })} size="sm" value={dir}>
              <SegmentedControlItem<Direction> value="ltr">LTR</SegmentedControlItem>
              <SegmentedControlItem<Direction> value="rtl">RTL</SegmentedControlItem>
            </SegmentedControl>
            <ThemeToggle />
          </div>
        </div>
        <Tabs defaultValue="preview">
          <TabsList aria-label="Preview or code">
            <TabsTab value="preview">Preview</TabsTab>
            <TabsTab value="code">Code</TabsTab>
          </TabsList>
          <TabsPanel value="preview">
            <DirectionFrame className="p-3 sm:p-4" dir={dir}>
              <ResourcesDemo onScreenChange={(next) => set({ screen: next === "list" ? null : next })} screen={screen} />
            </DirectionFrame>
            <p className="mt-3 text-muted-foreground text-xs" dir="auto">
              Project 831’s real hours and the booking the agent made on 1 November: Court 1, Monday 2 November, 7 to 8 pm. Click a court, flip the link to “A person”, book 7 pm. Nothing leaves the page.
            </p>
          </TabsPanel>
          <TabsPanel value="code">
            <pre className="max-h-[32rem] overflow-auto rounded-xl border border-border bg-muted/40 p-4 text-xs leading-relaxed">
              <code>{demoSource}</code>
            </pre>
          </TabsPanel>
        </Tabs>
      </section>

      <section aria-labelledby="model-h" className="flex flex-col gap-3">
        <h2 className="font-semibold text-xl" id="model-h">
          Under the hood, a resource is host-shaped
        </h2>
        <p className="max-w-2xl text-muted-foreground text-sm">
          Cal.com already has a thing with a weekly schedule that round robin picks from: a host. A resource is that, minus the calendar and the login, plus how many it takes at
          once. The smallest honest build inside Cal.com is a host without a calendar; the screens above don’t have to show it, and the API below doesn’t have to hide it.
        </p>
        <Table className="max-w-2xl">
          <TableHeader>
            <TableRow>
              <TableHead>
                <span className="sr-only">What</span>
              </TableHead>
              <TableHead>A person</TableHead>
              <TableHead>A resource</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(
              [
                ["A week of hours, date overrides", "Yes", "Yes, its own"],
                ["A calendar to check", "Yes", "No"],
                ["A login, an email", "Yes", "No"],
                ["Takes at once", "1", "1, or 2 racquets, or 8 seats"],
                ["Which free one gets it", "Round robin: least recently booked", "The same rule"],
                ["A booking blocks", "Every link of the person", "That resource, nothing else"],
              ] as const
            ).map(([what, person, resource]) => (
              <TableRow key={what}>
                <TableCell className="whitespace-normal align-top font-medium leading-normal">{what}</TableCell>
                <TableCell className="whitespace-normal align-top leading-normal">{person}</TableCell>
                <TableCell className="whitespace-normal align-top leading-normal">{resource}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section aria-labelledby="api-change-h" className="flex flex-col gap-3">
        <h2 className="font-semibold text-xl" id="api-change-h">
          The API it needs
        </h2>
        <p className="max-w-2xl text-muted-foreground text-sm">
          Two changes to API v2: slots that say which resource is free, and a resource on a booking. With them the{" "}
          <Button className="h-auto px-0 py-0 align-baseline text-sm underline sm:h-auto sm:text-sm" render={<Anchor href={AGENT_LINK} rel="noreferrer" target="_blank" />} variant="link">
            WhatsApp agent
          </Button>{" "}
          stops keeping the courts itself, drops <code className="text-xs">allowConflicts</code>, asks which court is free and books that one. Every venue on Cal.com gets the same
          without writing an agent.
        </p>
        {/* Long lines wrap rather than scroll: a scrolling box on a phone hides the one line that matters. */}
        <pre className="max-w-2xl whitespace-pre-wrap break-words rounded-xl border border-border bg-muted/40 p-4 text-xs leading-relaxed">
          <code>{`GET  /v2/slots?eventTypeId=…&start=2026-11-02&end=2026-11-02
     cal-api-version: 2024-09-04
  →  { "2026-11-02": [
       { "start": "2026-11-02T18:30:00+05:30", "resources": ["court-2"] },
       { "start": "2026-11-02T19:00:00+05:30", "resources": ["court-2"] },
       { "start": "2026-11-02T20:00:00+05:30", "resources": ["court-1", "court-2"] } ] }

POST /v2/bookings
     { "eventTypeId": …, "start": "2026-11-02T19:00:00+05:30",
       "resourceId": "court-2", … }
  →  201, the booking, with "resourceId": "court-2"`}</code>
        </pre>
        <dl className="grid max-w-2xl gap-x-6 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="font-medium">In cal.com, roughly</dt>
          <dd className="text-muted-foreground" data-estimate="">
            A Resource with a schedule and a capacity; a list of them on an event type; the slots service counting bookings per resource instead of per host; a resourceId on
            Booking; one page and one view. An estimate from the outside, by reading the public code before it moved to cal.diy.
          </dd>
          <dt className="font-medium">What it doesn’t touch</dt>
          <dd className="text-muted-foreground">Teams, round robin, seats, payments, workflows. A resource on a team link sits where Assignment is; on a personal link it is the new page.</dd>
        </dl>
      </section>

      <section aria-labelledby="api-h" className="flex flex-col gap-3">
        <h2 className="font-semibold text-xl" id="api-h">
          API reference
        </h2>
        <p className="max-w-2xl text-muted-foreground text-sm">
          Read from <code className="text-xs">ResourcesProps</code> in the source when the page builds: the names, the types, the defaults from the function’s own signature and the
          comment above each prop. Change the type and this table changes; it cannot drift.
        </p>
        <PropsTable doc={DOC} />
      </section>

      <section aria-labelledby="states-h" className="flex flex-col gap-4">
        <h2 className="font-semibold text-xl" id="states-h">
          States
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {(
            [
              { key: "loading", title: "Loading", line: "Two rows of skeleton, the height of the rows that come.", demo: <ResourcesDemo nav={false} status="loading" /> },
              { key: "error", title: "Couldn’t load", line: "The reason and Try again, in the list’s place; nothing else on the page changes.", demo: <ResourcesDemo nav={false} status="error" /> },
              { key: "empty", title: "Empty", line: "The first run: what a resource is, and the one button.", demo: <ResourcesDemo nav={false} resources={[]} /> },
              { key: "paused", title: "A paused court", line: "Court 2 keeps its bookings, isn’t offered, and the link says so.", demo: <ResourcesDemo defaultScreen="link" nav={false} resources={PAUSED} /> },
              { key: "person", title: "As a person, today", line: "The link books the host: Court 1’s booking makes 7 pm busy for every link.", demo: <ResourcesDemo defaultScreen="book" link={{ ...LINK, who: { kind: "person" } }} nav={false} /> },
              { key: "taken", title: "Every court taken", line: "Both courts booked at 7 pm: the time reads as taken. This is where the Waitlist fits.", demo: <ResourcesDemo bookings={BOTH_TAKEN} defaultScreen="book" nav={false} /> },
            ] as const
          ).map((s) => (
            <div className="flex min-w-0 flex-col gap-3" key={s.key}>
              <p className="text-sm">
                <span className="font-medium">{s.title}</span> <span className="text-muted-foreground">· {s.line}</span>
              </p>
              <DirectionFrame className="p-2" dir={dir}>
                {s.demo}
              </DirectionFrame>
            </div>
          ))}
        </div>
        <p className="max-w-2xl text-muted-foreground text-sm">
          A full day gets a{" "}
          <Button className="h-auto px-0 py-0 align-baseline text-sm underline sm:h-auto sm:text-sm" render={<Anchor href={WAITLIST_LINK} />} variant="link">
            Waitlist
          </Button>
          , the other coss ui proposal on this site.
        </p>
      </section>

      <section aria-labelledby="a11y-h" className="flex flex-col gap-4">
        <h2 className="font-semibold text-xl" id="a11y-h">
          Accessibility
        </h2>
        <ul className="flex max-w-2xl list-disc flex-col gap-2 ps-5 text-muted-foreground text-sm">
          <li>
            Every screen is a landmark with a name: the sidebar is a <code className="text-xs">nav</code>, the settings pages are a <code className="text-xs">nav</code> with{" "}
            <code className="text-xs">aria-current</code>, the day grid is a group named for the day it shows.
          </li>
          <li>Pages this proposal doesn’t draw stay in the sidebar, disabled and titled, so the new page is seen where it would sit without a dead link.</li>
          <li>Bookings by resource is the SlotGrid primitive in a third skin: one tab stop, each booking a button that says its court, its time, who and from where.</li>
          <li>The booking page is the same grid the booking flow uses: a radio per start, a taken start still focusable and read as taken, the chosen start announced with where it lands.</li>
          <li>
            Saved, booked and “that time just went” are live regions (<code className="text-xs">role="status"</code>); a save that fails is an alert above the form, not a toast that leaves.
          </li>
          <li>A booking’s details open in a popover; Escape closes it and focus returns to the booking. Base UI does both.</li>
        </ul>
        <Table className="max-w-2xl">
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Does</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(
              [
                ["Tab", "Walks the sidebar, then the page’s controls, in reading order. The day grid and the start times are one stop each."],
                ["↑ ↓", "In the day grid, the previous or next booking on the same resource. On the booking page, the start above or below."],
                ["← →", "In the day grid, the booking nearest the same time on the next resource. On the booking page, the previous or next start."],
                ["Page Up / Down", "The first booking of the previous or next resource; the first start of the previous or next part of the day."],
                ["Home / End", "The first or last booking, or start, of the day."],
                ["Enter / Space", "Opens the booking’s details; chooses the start."],
                ["Escape", "Closes the details, or the resource picker, and puts focus back."],
              ] as const
            ).map(([key, does]) => (
              <TableRow key={key}>
                <TableCell className="whitespace-nowrap">
                  {key.split(" / ").map((k, i) => (
                    <React.Fragment key={k}>
                      {i > 0 ? " / " : null}
                      <Kbd>{k}</Kbd>
                    </React.Fragment>
                  ))}
                </TableCell>
                <TableCell className="whitespace-normal leading-normal">{does}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section aria-labelledby="motion-h" className="flex flex-col gap-3">
        <h2 className="font-semibold text-xl" id="motion-h">
          Motion
        </h2>
        <dl className="grid max-w-2xl gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="font-medium">What moves</dt>
          <dd className="text-muted-foreground">A screen, once, as it opens: opacity and a 2 px rise, 160 ms, ease-out. A booking that lands on the grid arrives the same way. The tab indicator slides, as coss’s does.</dd>
          <dt className="font-medium">What doesn’t</dt>
          <dd className="text-muted-foreground">The sidebar, the header, the day grid’s lines. Switching “Who is booked” changes the preview’s slots in place, with no animation to say so: the words do.</dd>
          <dt className="font-medium">Why</dt>
          <dd className="text-muted-foreground">An admin page is read many times a day. Motion marks what is new and nothing else.</dd>
          <dt className="font-medium">Reduced motion</dt>
          <dd className="text-muted-foreground">Everything is simply there.</dd>
        </dl>
      </section>

      <section aria-labelledby="rtl-h" className="flex flex-col gap-3">
        <h2 className="font-semibold text-xl" id="rtl-h">
          Right-to-left
        </h2>
        <p className="max-w-2xl text-muted-foreground text-sm">
          Logical properties throughout: the sidebar sits at the start, the time gutter at the start of the grid, the chevrons and arrows carry <code className="text-xs">rtl:rotate-180</code>.
          Every string a prop supplies sits in <code className="text-xs">bdi</code>, so “Court 1” inside a right-to-left page keeps its own order and still aligns to the row. Flip the
          switch above to see it.
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/30 p-6">
        <p className="font-medium">A slot should open. This is where I’d spend it.</p>
        <div className="flex flex-wrap gap-2">
          <BookCallButton calLink={CAL_SLUG}>Book a time to argue about the API</BookCallButton>
          <Button render={<Anchor href={WORK_LINK} />} variant="outline">
            The work
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">Not a Cal.com or coss ui page. A proposal, by Rahul Jha.</p>
      </section>
    </main>
  );
}
