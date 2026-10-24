"use client";

import { ArrowUpRightIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import { DirectionFrame, type Direction } from "@/app/components/direction-frame";
import { PropsTable } from "@/app/components/props-table";
import { WaitlistDemo } from "@/app/components/waitlist-demo";
import demoSource from "@/app/components/waitlist-demo.tsx?raw";
import { navigate, type Route } from "@/app/router";
import { ThemeToggle } from "@/app/theme";
import { SegmentedControl, SegmentedControlItem } from "@/components/compositions/segmented-control";
import waitlistSource from "@/components/compositions/waitlist/waitlist.tsx?raw";
import type { WaitlistState } from "@/components/compositions/waitlist";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { parseComponent } from "@/lib/props";

/** Rahul's 30-minute slot on Cal.com. */
const CAL_LINK = "https://cal.com/rahul-kumar-jha-ll9vhj/30min";
const WORK_LINK = "https://rkj-builds.github.io/for/cal/";
const PR_913 = "https://github.com/cosscom/ui/pull/913";

/** The states the page can hold the demo in. "live" hands the state to the component itself. */
type Shown = "live" | WaitlistState | "cancel-confirm";
const SHOWN: { value: Shown; label: string }[] = [
  { value: "live", label: "Live" },
  { value: "idle", label: "Idle" },
  { value: "joining", label: "Joining" },
  { value: "joined", label: "Joined" },
  { value: "error", label: "Error" },
  { value: "cancel-confirm", label: "Leave?" },
];
const STATIC: { state: WaitlistState; title: string; line: string }[] = [
  { state: "idle", title: "Idle", line: "Full, with one thing to do." },
  { state: "joining", title: "Joining", line: "Busy. The button keeps its width; the card is aria-busy." },
  { state: "joined", title: "Joined", line: "The place in line, and the way out." },
  { state: "error", title: "Error", line: "The reason, on a line that was always there. The same button retries." },
];

const DOC = parseComponent(waitlistSource, "Waitlist");

function shownFrom(route: Route): Shown {
  const v = route.query.get("state");
  return SHOWN.some((s) => s.value === v) ? (v as Shown) : "live";
}

/**
 * A component proposal, laid out the way coss ui documents a component: preview and code, the API read
 * from the type, every state, the keyboard, motion, right-to-left. The instance is the role this page was
 * written for.
 */
export function WaitlistDocsPage({ route }: { route: Route }): React.ReactElement {
  const shown = shownFrom(route);
  const dir: Direction = route.query.get("dir") === "rtl" ? "rtl" : "ltr";
  const set = (query: Record<string, string | null>): void => navigate(route.path, { state: route.query.get("state"), dir: route.query.get("dir"), theme: route.query.get("theme"), ...query }, { replace: true });
  const controlled = shown === "live" ? undefined : shown === "cancel-confirm" ? "joined" : shown;

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
              <BreadcrumbPage>Waitlist</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-semibold text-3xl tracking-tight" tabIndex={-1}>
              Waitlist
            </h1>
            <Badge variant="secondary">proposal</Badge>
          </div>
          <p className="max-w-2xl text-muted-foreground">{DOC.summary}</p>
          <p className="max-w-2xl text-muted-foreground text-sm">
            coss ui has no Waitlist. This is one, built from coss parts the way the library builds its own: Card, Button, Alert Dialog, Toast. Every colour is a token; every
            word on it can be changed from a prop.
          </p>
        </div>
      </header>

      <section aria-labelledby="preview-h" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-xl tracking-tight" id="preview-h">
            Preview
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl<Shown> aria-label="State shown" onValueChange={(v) => set({ state: v === "live" ? null : v })} size="sm" value={shown}>
              {SHOWN.map((s) => (
                <SegmentedControlItem<Shown> key={s.value} value={s.value}>
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
            <DirectionFrame className="flex flex-col gap-8" dir={dir}>
              <div className="flex justify-center">
                <WaitlistDemo cancelOpen={shown === "cancel-confirm"} key={shown} state={controlled} />
              </div>
              <Separator />
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-3">
                  {/* dir="auto": an English caption inside the right-to-left frame keeps its own punctuation order. */}
                  <p className="text-muted-foreground text-sm" dir="auto">
                    coss ui today: the chevrons stay put in right-to-left.
                  </p>
                  <Pagination aria-label="Example pagination, coss ui today">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious render={<Button size="sm" variant="outline" />} />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext render={<Button size="sm" variant="outline" />} />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
                <div className="flex flex-col gap-3">
                  <p className="text-muted-foreground text-sm" dir="auto">
                    With{" "}
                    <a className="text-foreground underline underline-offset-4" href={PR_913} rel="noreferrer" target="_blank">
                      #913
                    </a>
                    : they point the way you move.
                  </p>
                  <Pagination aria-label="Example pagination, with #913">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationLink aria-label="Go to previous page" render={<Button size="sm" variant="outline" />}>
                          <ChevronLeftIcon aria-hidden="true" className="rtl:rotate-180" />
                          Previous
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink aria-label="Go to next page" render={<Button size="sm" variant="outline" />}>
                          Next
                          <ChevronRightIcon aria-hidden="true" className="rtl:rotate-180" />
                        </PaginationLink>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            </DirectionFrame>
          </TabsPanel>
          <TabsPanel value="code">
            <pre className="max-h-[32rem] overflow-auto rounded-xl border border-border bg-muted/40 p-4 text-xs leading-relaxed">
              <code>{demoSource}</code>
            </pre>
          </TabsPanel>
        </Tabs>
      </section>

      <section aria-labelledby="api-h" className="flex flex-col gap-3">
        <h2 className="font-semibold text-xl tracking-tight" id="api-h">
          API reference
        </h2>
        <p className="max-w-2xl text-muted-foreground text-sm">
          Read from <code className="text-xs">WaitlistProps</code> in the source when the page builds: the names, the types, the defaults from the function's own signature and the
          comment above each prop. Change the type and this table changes; it cannot drift.
        </p>
        <PropsTable doc={DOC} />
      </section>

      <section aria-labelledby="states-h" className="flex flex-col gap-4">
        <h2 className="font-semibold text-xl tracking-tight" id="states-h">
          States
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {STATIC.map((s) => (
            <div className="flex flex-col gap-3" key={s.state}>
              <p className="text-sm">
                <span className="font-medium">{s.title}</span> <span className="text-muted-foreground">· {s.line}</span>
              </p>
              <DirectionFrame className="flex justify-center" dir={dir}>
                <WaitlistDemo state={s.state} />
              </DirectionFrame>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="a11y-h" className="flex flex-col gap-4">
        <h2 className="font-semibold text-xl tracking-tight" id="a11y-h">
          Accessibility
        </h2>
        <ul className="flex max-w-2xl list-disc flex-col gap-2 ps-5 text-muted-foreground text-sm">
          <li>
            One live region (<code className="text-xs">role="status"</code>) from the moment the card mounts, so each change is read out and nothing new has to be discovered.
          </li>
          <li>
            A join that lands moves focus to the place in line (a <code className="text-xs">group</code> with an accessible name), so it is read out and the eye lands on it. A card that
            mounts already joined never steals focus.
          </li>
          <li>
            While joining, the card is <code className="text-xs">aria-busy</code> and the button is <code className="text-xs">aria-disabled</code>, not disabled: focus stays where it was.
          </li>
          <li>
            The error line has <code className="text-xs">role="alert"</code> and is always rendered at its full height, so an error never pushes the actions down.
          </li>
          <li>Leaving goes through an alert dialog. Escape closes it; focus returns to the button that opened it. Base UI does both.</li>
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
                ["Tab", "Reaches Join, or Leave the list once joined. The place in line takes focus only when a join lands."],
                ["Enter / Space", "Joins, or opens the question."],
                ["Escape", "Closes the question and keeps the place."],
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
        <h2 className="font-semibold text-xl tracking-tight" id="motion-h">
          Motion
        </h2>
        <dl className="grid max-w-2xl gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="font-medium">What moves</dt>
          <dd className="text-muted-foreground">The place in line, once, as it appears: opacity and a 4px rise, 180 ms, ease-out.</dd>
          <dt className="font-medium">What doesn't</dt>
          <dd className="text-muted-foreground">The button, the card and the number. The button changes its label in place, at the same width.</dd>
          <dt className="font-medium">Why</dt>
          <dd className="text-muted-foreground">One thing on the card is new. The eye should land on it and nothing else should compete.</dd>
          <dt className="font-medium">Reduced motion</dt>
          <dd className="text-muted-foreground">It simply appears. Nothing on the card is animation-only.</dd>
        </dl>
      </section>

      <section aria-labelledby="rtl-h" className="flex flex-col gap-3">
        <h2 className="font-semibold text-xl tracking-tight" id="rtl-h">
          Right-to-left
        </h2>
        <p className="max-w-2xl text-muted-foreground text-sm">
          Logical properties throughout, and the one directional icon carries <code className="text-xs">rtl:rotate-180</code>, the class coss's Calendar already uses. The
          pagination pair above is why that matters: the stock chevrons point the wrong way in RTL, and{" "}
          <Button className="h-auto px-0 py-0 align-baseline text-sm underline sm:h-auto sm:text-sm" render={<Anchor href={PR_913} rel="noreferrer" target="_blank" />} variant="link">
            #913
          </Button>{" "}
          fixes it across menu, context menu, drawer, pagination and breadcrumb.
        </p>
      </section>

      <section aria-labelledby="from-h" className="flex flex-col gap-3">
        <h2 className="font-semibold text-xl tracking-tight" id="from-h">
          Where it came from
        </h2>
        <p className="max-w-2xl text-muted-foreground text-sm">
          Cal.com's Senior Product Design Engineer posting was still up when I found it; its Apply button said Position Closed. For someone who builds booking software that
          reads as a fully booked day, and a fully booked day needs a waitlist. The posting asked to send the work, and to land components in the library rather than the app. So:
          a component.
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/30 p-6">
        <p className="font-medium">If a slot opens, this is where I'd like to spend it.</p>
        <div className="flex flex-wrap gap-2">
          <Button render={<Anchor href={CAL_LINK} rel="noreferrer" target="_blank" />}>
            Book a time to argue about the API
            <ArrowUpRightIcon aria-hidden="true" className="rtl:-scale-x-100" />
          </Button>
          <Button render={<Anchor href={WORK_LINK} />} variant="outline">
            The work
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">Not a Cal.com or coss ui page. A proposal, by Rahul Jha.</p>
      </section>
    </main>
  );
}
