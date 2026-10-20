"use client";

import { CalendarRangeIcon, CircleCheckIcon, ClockIcon, DownloadIcon, ListFilterIcon, ReceiptTextIcon, SearchIcon, SearchXIcon, XIcon } from "lucide-react";
import * as React from "react";
import { useAnchoredBarHeight } from "@/app/anchored-bar";
import { DeskViewFooter } from "@/app/desk/desk-toolbar";
import { dayOf, LOCALE } from "@/app/format";
import type { Route } from "@/app/router";
import {
  type DateRange,
  type DayGroup,
  FACETS,
  facetValueLabel,
  filterCount,
  filtersFromQuery,
  filtersQuery,
  groupByDay,
  KIND_LABEL,
  matchesFilters,
  NO_FILTERS,
  type PaymentFilters,
  paymentsCsvRows,
  presetOf,
  presetRange,
  RANGE_PRESETS,
  type RangePreset,
  rangeQuery,
  signedPaise,
  totalsOf,
  customerName,
  dayOfInstant,
} from "@/app/screens/money/money-model";
import { setQuery, useViewer } from "@/app/screens/money/money-hooks";
import { Amount, ApprovalBadge, MethodBadge, SubjectLink } from "@/app/screens/money/money-ui";
import { ListSkeleton, LoadFailed } from "@/app/screens/screen-kit";
import { LazyCalendar } from "@/components/booking/lazy-calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Drawer, DrawerFooter, DrawerHeader, DrawerPanel, DrawerPopup, DrawerTitle } from "@/components/ui/drawer";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldItem, FieldLabel } from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { Frame, FramePanel } from "@/components/ui/frame";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toastManager } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Toolbar, ToolbarButton, ToolbarGroup, ToolbarSeparator } from "@/components/ui/toolbar";
import { errorMessage } from "@/data/errors";
import { useRead, useWrite } from "@/data/provider";
import type { Customer, Payment, Viewer } from "@/data/types";
import { useMediaQuery } from "@/hooks/use-media-query";
import { downloadText, toCsv } from "@/lib/csv";
import { formatTime } from "@/lib/format";
import { formatInr, sumPaise } from "@/lib/money";
import { fromLocalDate, type PlainDate, toLocalDate } from "@/lib/plain-date";
import { VENUE } from "@/lib/venue";

/** Lines drawn at once; "Show more" adds this many again. Enough for a busy week without a slow first paint. */
const PAGE = 60;

const timeOf = (at: number): string => formatTime(at, { locale: LOCALE, timeZone: VENUE.timeZone });

const canApprove = (viewer: Viewer | undefined): boolean => viewer?.role === "admin" || viewer?.role === "manager";
const APPROVE_REASON = "Only an admin or a manager can approve payments.";

/**
 * Every line of money in a date range: what came in, what went back, what
 * moved to or from credit, grouped by day with each day's total. Filters are
 * removable chips kept in the URL; the desk's recent cash waits for a
 * manager to approve it, in bulk.
 */
export function PaymentsTab({ route, range, today }: { route: Route; range: DateRange; today: PlainDate }): React.ReactElement {
  const viewer = useViewer();
  // Same key as the summary strip's "collected" tile, so the two share one request and one answer.
  const read = useRead(["money", "payments", range.from, range.to], (c) => c.money.payments(range));
  const filters = filtersFromQuery(route.query);
  const [search, setSearch] = React.useState(route.query.get("q") ?? "");
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(new Set());
  const [limit, setLimit] = React.useState(PAGE);
  const phone = useMediaQuery("max-md");

  const customers = read.data?.customers ?? [];
  const rows = (read.data?.payments ?? []).filter((p) => matchesFilters(p, filters, search, customers));
  const shown = rows.slice(0, limit);
  const waiting = rows.filter((p) => !p.approved);
  // A selection only ever holds lines still on screen and still waiting.
  const picked = waiting.filter((p) => selected.has(p.id));
  const filtered = filterCount(filters) > 0 || search.trim() !== "";
  const totals = totalsOf(rows);

  const setFilters = (next: PaymentFilters): void => {
    setLimit(PAGE);
    setQuery(route, filtersQuery(next));
  };
  const setRange = (next: DateRange): void => {
    setLimit(PAGE);
    setQuery(route, rangeQuery(next, today));
  };
  const clearAll = (): void => {
    setSearch("");
    setFilters(NO_FILTERS);
  };
  const toggle = (ids: readonly string[], on: boolean): void =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const exportCsv = (): void => {
    downloadText(`payments-${range.from}-to-${range.to}.csv`, toCsv(paymentsCsvRows(rows, customers, timeOf)), "text/csv");
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="sr-only">Payments in these dates</h2>
      {/* The row right above the list: the dates on the left, the search at the right end, then filters and export. Same row on every list. */}
      <div className="flex flex-wrap items-center justify-between gap-3" data-slot="payments-filters">
        <Toolbar aria-label="Dates" className="flex-wrap">
          <RangeControl range={range} setRange={setRange} today={today} />
        </Toolbar>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <Field className="w-full sm:w-64">
            <FieldLabel className="sr-only">Search by customer</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <SearchIcon aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                onChange={(e) => {
                  setSearch(e.target.value);
                  setLimit(PAGE);
                }}
                placeholder="Name or phone"
                type="search"
                value={search}
              />
            </InputGroup>
          </Field>
          <Toolbar aria-label="Filters and export">
            <ToolbarGroup>
              <FiltersControl filters={filters} phone={phone} setFilters={setFilters} />
              <ToolbarButton disabled={rows.length === 0} onClick={exportCsv} render={<Button variant="outline" />}>
                <DownloadIcon aria-hidden="true" />
                <span className="max-sm:sr-only">Export CSV</span>
              </ToolbarButton>
            </ToolbarGroup>
          </Toolbar>
        </div>
      </div>

      {!phone && filterCount(filters) > 0 && <FilterChips filters={filters} onClear={clearAll} setFilters={setFilters} />}

      {read.isPending ? (
        <ListSkeleton label="Loading payments" rows={8} />
      ) : read.isError ? (
        <LoadFailed error={read.error} onRetry={() => void read.refetch()} what="payments" />
      ) : rows.length === 0 ? (
        filtered ? (
          <Empty className="rounded-2xl border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchXIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Nothing matches</EmptyTitle>
              <EmptyDescription>No payments in these dates match the search and filters.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={clearAll} variant="outline">
                Clear search and filters
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <Empty className="rounded-2xl border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ReceiptTextIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No payments in these dates</EmptyTitle>
              <EmptyDescription>Money taken at the desk or paid online shows up here as soon as it's recorded.</EmptyDescription>
            </EmptyHeader>
            {presetOf(range, today) !== "month" && (
              <EmptyContent>
                <Button onClick={() => setRange(presetRange("month", today))} variant="outline">
                  Show this month
                </Button>
              </EmptyContent>
            )}
          </Empty>
        )
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <p aria-live="polite" className="text-muted-foreground text-sm">
              {rows.length} {rows.length === 1 ? "line" : "lines"} · <span className="tabular-nums">{formatInr(totals.inPaise)}</span> in
              {totals.refundedPaise > 0 && (
                <>
                  {" "}
                  · <span className="tabular-nums">{formatInr(totals.refundedPaise)}</span> refunded
                </>
              )}
            </p>
            {waiting.length > 0 && (
              <p className="flex items-center gap-1.5 text-muted-foreground text-sm" data-slot="approval-hint">
                <ClockIcon aria-hidden="true" className="size-4 shrink-0" />
                {waiting.length} cash {waiting.length === 1 ? "payment is" : "payments are"} waiting for approval.{" "}
                {canApprove(viewer.data) ? "Tick them once the cash is in the drawer, then approve." : APPROVE_REASON}
              </p>
            )}
          </div>
          {phone ? (
            <PaymentList customers={customers} groups={groupByDay(shown)} onToggle={toggle} selected={selected} />
          ) : (
            <PaymentTable customers={customers} groups={groupByDay(shown)} onToggle={toggle} selected={selected} waiting={waiting} />
          )}
          {rows.length > shown.length && (
            <Button className="self-center" onClick={() => setLimit((n) => n + PAGE)} variant="outline">
              Show {Math.min(PAGE, rows.length - shown.length)} more of {rows.length - shown.length}
            </Button>
          )}
        </>
      )}

      {picked.length > 0 && <ApproveBar onClear={() => setSelected(new Set())} picked={picked} viewer={viewer.data} />}
    </div>
  );
}

/** Presets as a toggle group, any other range on the calendar (the desk's bookings list does the same). */
function RangeControl({ range, today, setRange }: { range: DateRange; today: PlainDate; setRange: (range: DateRange) => void }): React.ReactElement {
  const preset = presetOf(range, today);
  return (
    <>
      <ToggleGroup
        aria-label="Quick dates"
        className="border-none p-0"
        onValueChange={(value) => {
          const next = value[0] as RangePreset | undefined;
          if (next) setRange(presetRange(next, today));
        }}
        value={preset ? [preset] : []}
      >
        {RANGE_PRESETS.map((p) => (
          <ToolbarButton key={p.id} render={<ToggleGroupItem value={p.id} />}>
            {p.label}
          </ToolbarButton>
        ))}
      </ToggleGroup>
      <ToolbarSeparator className="max-sm:hidden" orientation="vertical" />
      <Popover>
        <ToolbarButton
          aria-label={`Dates, ${dayOf(range.from)} to ${dayOf(range.to)}. Pick other dates`}
          render={<PopoverTrigger render={<Button className="tabular-nums" variant="ghost" />} />}
        >
          <CalendarRangeIcon aria-hidden="true" />
          {range.from === range.to ? dayOf(range.from) : `${dayOf(range.from)} – ${dayOf(range.to)}`}
        </ToolbarButton>
        <PopoverPopup align="start">
          <LazyCalendar
            defaultMonth={toLocalDate(range.from)}
            disabled={{ after: toLocalDate(today) }}
            mode="range"
            onSelect={(picked) => {
              if (picked?.from) setRange({ from: fromLocalDate(picked.from), to: fromLocalDate(picked.to ?? picked.from) });
            }}
            selected={{ from: toLocalDate(range.from), to: toLocalDate(range.to) }}
            today={toLocalDate(today)}
          />
        </PopoverPopup>
      </Popover>
    </>
  );
}

/** One checkbox list per facet; the same fields sit in a popover on a laptop and a drawer on a phone. */
function FilterFields({ filters, setFilters }: { filters: PaymentFilters; setFilters: (next: PaymentFilters) => void }): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
      {FACETS.map((facet) => (
        <Field key={facet.id} name={facet.id} render={(props) => <Fieldset {...props} />}>
          <FieldsetLegend className="mb-2 font-medium text-sm">{facet.label}</FieldsetLegend>
          <CheckboxGroup onValueChange={(value) => setFilters({ ...filters, [facet.id]: facet.options.map((o) => o.value).filter((v) => value.includes(v)) })} value={filters[facet.id]}>
            {facet.options.map((o) => (
              <FieldItem key={o.value}>
                <FieldLabel className="font-normal">
                  <Checkbox value={o.value} />
                  {o.label}
                </FieldLabel>
              </FieldItem>
            ))}
          </CheckboxGroup>
        </Field>
      ))}
    </div>
  );
}

function FiltersControl({ filters, setFilters, phone }: { filters: PaymentFilters; setFilters: (next: PaymentFilters) => void; phone: boolean }): React.ReactElement {
  const count = filterCount(filters);
  const [open, setOpen] = React.useState(false);
  const label = (
    <>
      <ListFilterIcon aria-hidden="true" />
      Filters
      {count > 0 && (
        <>
          <Badge aria-hidden="true" className="-me-1" variant="outline">
            {count}
          </Badge>
          <span className="sr-only">, {count} on</span>
        </>
      )}
    </>
  );
  if (phone) {
    return (
      <>
        <ToolbarButton onClick={() => setOpen(true)} render={<Button variant="ghost" />}>
          {label}
        </ToolbarButton>
        <Drawer onOpenChange={setOpen} open={open}>
          <DrawerPopup showBar>
            <DrawerHeader>
              <DrawerTitle>Filters</DrawerTitle>
            </DrawerHeader>
            <DrawerPanel>
              <FilterFields filters={filters} setFilters={setFilters} />
            </DrawerPanel>
            <DrawerFooter className="flex-row justify-between">
              <Button disabled={count === 0} onClick={() => setFilters(NO_FILTERS)} variant="ghost">
                Clear filters
              </Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DrawerFooter>
          </DrawerPopup>
        </Drawer>
      </>
    );
  }
  return (
    <Popover>
      <ToolbarButton render={<PopoverTrigger render={<Button variant="ghost" />} />}>{label}</ToolbarButton>
      <PopoverPopup align="end">
        <FilterFields filters={filters} setFilters={setFilters} />
        <Button className="mt-4 w-full" disabled={count === 0} onClick={() => setFilters(NO_FILTERS)} size="sm" variant="ghost">
          Clear filters
        </Button>
      </PopoverPopup>
    </Popover>
  );
}

/** Each facet that is on, as a chip: what it filters to, and × to take it off. */
function FilterChips({ filters, setFilters, onClear }: { filters: PaymentFilters; setFilters: (next: PaymentFilters) => void; onClear: () => void }): React.ReactElement {
  const on = FACETS.filter((f) => filters[f.id].length > 0);
  return (
    <ul aria-label="Filters on" className="flex flex-wrap items-center gap-2">
      {on.map((facet) => {
        const value = facetValueLabel(facet, filters[facet.id]);
        return (
          <li key={facet.id}>
            <Button aria-label={`Remove filter: ${facet.label} is ${value}`} onClick={() => setFilters({ ...filters, [facet.id]: [] })} size="sm" variant="outline">
              <span className="text-muted-foreground">{facet.label}</span>
              {value}
              <XIcon aria-hidden="true" />
            </Button>
          </li>
        );
      })}
      <li>
        <Button onClick={onClear} size="sm" variant="ghost">
          Clear all
        </Button>
      </li>
    </ul>
  );
}

function dayTotalLabel(group: DayGroup): string {
  const parts = [`${formatInr(group.totals.inPaise)} in`];
  if (group.totals.refundedPaise > 0) parts.push(`${formatInr(group.totals.refundedPaise)} refunded`);
  return parts.join(" · ");
}

function rowLabel(p: Payment, customers: readonly Customer[]): string {
  const signed = signedPaise(p);
  return `${signed < 0 ? "minus " : ""}${formatInr(Math.abs(signed))} ${KIND_LABEL[p.kind].toLowerCase()} from ${customerName(customers, p.customerId)}, ${dayOf(dayOfInstant(p.at))} ${timeOf(p.at)}`;
}

function PaymentTable({
  groups,
  customers,
  selected,
  waiting,
  onToggle,
}: {
  groups: DayGroup[];
  customers: readonly Customer[];
  selected: ReadonlySet<string>;
  waiting: readonly Payment[];
  onToggle: (ids: readonly string[], on: boolean) => void;
}): React.ReactElement {
  const shownWaiting = groups.flatMap((g) => g.payments.filter((p) => !p.approved).map((p) => p.id));
  const pickedCount = shownWaiting.filter((id) => selected.has(id)).length;
  return (
    <Frame>
      <FramePanel className="p-0">
        <Table aria-label="Payments">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 ps-4">
                <Checkbox
                  aria-label="Select every waiting payment shown"
                  checked={shownWaiting.length > 0 && pickedCount === shownWaiting.length}
                  disabled={waiting.length === 0}
                  indeterminate={pickedCount > 0 && pickedCount < shownWaiting.length}
                  onCheckedChange={(on) => onToggle(shownWaiting, on)}
                />
              </TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>For</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-end">Amount</TableHead>
              <TableHead className="pe-4">Approval</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <React.Fragment key={group.date}>
                <TableRow className="bg-muted/48 hover:bg-muted/48" data-slot="day-row">
                  <TableCell className="ps-4 font-medium" colSpan={5}>
                    {dayOf(group.date)}
                  </TableCell>
                  <TableCell className="text-end text-muted-foreground text-xs tabular-nums" colSpan={2}>
                    {dayTotalLabel(group)}
                  </TableCell>
                </TableRow>
                {group.payments.map((p) => (
                  <TableRow data-state={selected.has(p.id) ? "selected" : undefined} key={p.id}>
                    <TableCell className="ps-4">
                      {!p.approved && <Checkbox aria-label={`Select ${rowLabel(p, customers)}`} checked={selected.has(p.id)} onCheckedChange={(on) => onToggle([p.id], on)} />}
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{timeOf(p.at)}</TableCell>
                    <TableCell className="max-w-48 truncate">{customerName(customers, p.customerId)}</TableCell>
                    <TableCell className="max-w-64">
                      <SubjectLink subject={p.subject} />
                    </TableCell>
                    <TableCell>
                      <MethodBadge kind={p.kind} />
                    </TableCell>
                    <TableCell className="text-end">
                      <Amount payment={p} />
                    </TableCell>
                    <TableCell className="pe-4">
                      <ApprovalBadge approved={p.approved} />
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </FramePanel>
    </Frame>
  );
}

/** A phone's version of the table: one stacked row per line, under a heading per day. */
function PaymentList({
  groups,
  customers,
  selected,
  onToggle,
}: {
  groups: DayGroup[];
  customers: readonly Customer[];
  selected: ReadonlySet<string>;
  onToggle: (ids: readonly string[], on: boolean) => void;
}): React.ReactElement {
  return (
    <Frame>
      {groups.map((group) => (
        <FramePanel className="p-0" key={group.date}>
          <section aria-labelledby={`day-${group.date}`}>
            <header className="flex items-baseline justify-between gap-2 border-b px-4 py-2.5">
              <h3 className="font-medium text-sm" id={`day-${group.date}`}>
                {dayOf(group.date)}
              </h3>
              <span className="text-muted-foreground text-xs tabular-nums">{dayTotalLabel(group)}</span>
            </header>
            <ul className="divide-y">
              {group.payments.map((p) => (
                <li className="flex gap-3 px-4 py-3" key={p.id}>
                  <span className="w-5 shrink-0 pt-0.5">
                    {!p.approved && <Checkbox aria-label={`Select ${rowLabel(p, customers)}`} checked={selected.has(p.id)} onCheckedChange={(on) => onToggle([p.id], on)} />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0 truncate font-medium">{customerName(customers, p.customerId)}</span>
                      <Amount payment={p} />
                    </span>
                    <SubjectLink className="text-sm" subject={p.subject} />
                    <span className="flex flex-wrap items-center gap-1.5 text-muted-foreground text-xs">
                      <span className="tabular-nums">{timeOf(p.at)}</span>
                      <MethodBadge kind={p.kind} />
                      <ApprovalBadge approved={p.approved} />
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </FramePanel>
      ))}
    </Frame>
  );
}

/** The bulk bar, anchored to the bottom while lines are ticked. A role that can't approve sees why, beside the disabled button. */
function ApproveBar({ picked, viewer, onClear }: { picked: readonly Payment[]; viewer: Viewer | undefined; onClear: () => void }): React.ReactElement {
  const ref = useAnchoredBarHeight<HTMLElement>();
  const approve = useWrite((c, ids: string[]) => c.money.approve(ids));
  const allowed = canApprove(viewer);
  const total = sumPaise(picked.map((p) => p.amountPaise));
  const noun = picked.length === 1 ? "payment" : "payments";

  const run = async (): Promise<void> => {
    try {
      await approve.mutateAsync(picked.map((p) => p.id));
      toastManager.add({ title: `${picked.length} ${noun} approved`, description: `${formatInr(total)} of cash checked into the drawer.`, type: "success" });
      onClear();
    } catch (error) {
      toastManager.add({ title: "Couldn't approve", description: errorMessage(error), type: "error" });
    }
  };

  return (
    <DeskViewFooter>
      <section aria-label="Selected payments" className="border-t bg-background/94 pb-[env(safe-area-inset-bottom)] backdrop-blur-md" ref={ref}>
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-end gap-2 px-4 py-3">
          <span aria-live="polite" className="me-auto text-sm">
            <span className="font-medium">{picked.length} selected</span> · <span className="tabular-nums">{formatInr(total)}</span>
          </span>
          {!allowed && (
            <span className="text-muted-foreground text-sm" id="approve-reason">
              {APPROVE_REASON}
            </span>
          )}
          <Button onClick={onClear} variant="ghost">
            Clear
          </Button>
          <Button aria-describedby={allowed ? undefined : "approve-reason"} disabled={!allowed} loading={approve.isPending} onClick={() => void run()}>
            <CircleCheckIcon aria-hidden="true" />
            Approve {picked.length} {noun}
          </Button>
        </div>
      </section>
    </DeskViewFooter>
  );
}
