"use client";

import { CalendarRangeIcon, DownloadIcon, EllipsisIcon, ListFilterIcon, SearchIcon, SearchXIcon } from "lucide-react";
import * as React from "react";
import { useBookingActions } from "@/app/desk/booking-actions";
import { bookingTitle, STATE_META, stateLabel } from "@/app/desk/booking-visuals";
import { CustomerPreview } from "@/app/desk/customer-preview";
import { DeskViewToolbar } from "@/app/desk/desk-toolbar";
import { useDeskUi } from "@/app/desk/desk-ui";
import { dayOf, timeRangeOf } from "@/app/format";
import { useStore } from "@/app/store";
import {
  Autocomplete,
  AutocompleteCollection,
  AutocompleteEmpty,
  AutocompleteGroup,
  AutocompleteGroupLabel,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
  AutocompleteSeparator,
} from "@/components/ui/autocomplete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LazyCalendar } from "@/components/booking/lazy-calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldItem, FieldLabel } from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { Frame, FrameFooter } from "@/components/ui/frame";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Toolbar, ToolbarButton, ToolbarGroup, ToolbarSeparator } from "@/components/ui/toolbar";
import { type Booking, type Customer, customerById, deskState, type DeskState, duePaise, paidPaise, sortBookings } from "@/lib/booking";
import { downloadText, toCsv } from "@/lib/csv";
import { formatInr } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { addDays, compareDates, fromLocalDate, type PlainDate, toLocalDate } from "@/lib/plain-date";
import { courtName } from "@/lib/venue";

const STATUSES: { value: DeskState; label: string }[] = [
  { value: "held", label: "Held" },
  { value: "paid", label: "Paid" },
  { value: "part-paid", label: "Part-paid" },
  { value: "due", label: "Due at venue" },
  { value: "no-show", label: "No-show" },
  { value: "cancelled", label: "Cancelled" },
  { value: "coaching", label: "Coaching" },
];
const PAGE = 12;

type Preset = "past" | "today" | "next";

interface Suggestion {
  id: string;
  label: string;
  /** What the search box holds once it is picked. */
  value: string;
  hint?: string;
}

interface SuggestionGroup {
  value: string;
  items: Suggestion[];
}

export function BookingsView({ today, now, initialQuery = "" }: { today: PlainDate; now: number; initialQuery?: string }): React.ReactElement {
  const { state } = useStore();
  const [query, setQuery] = React.useState(initialQuery);
  const [statuses, setStatuses] = React.useState<DeskState[]>([]);
  const [from, setFrom] = React.useState<PlainDate>(addDays(today, -7));
  const [to, setTo] = React.useState<PlainDate>(addDays(today, 7));
  const [page, setPage] = React.useState(0);

  const presets: Record<Preset, { label: string; from: PlainDate; to: PlainDate }> = {
    past: { label: "Last 7 days", from: addDays(today, -7), to: today },
    today: { label: "Today", from: today, to: today },
    next: { label: "Next 7 days", from: today, to: addDays(today, 7) },
  };
  const preset = (Object.keys(presets) as Preset[]).find((p) => presets[p].from === from && presets[p].to === to);

  const q = query.trim().toLowerCase();
  const digits = q.replaceAll(/\D/g, "");
  const rows = state.bookings
    .filter((b) => compareDates(b.date, from) >= 0 && compareDates(b.date, to) <= 0)
    .filter((b) => statuses.length === 0 || statuses.includes(deskState(b, now)))
    .filter((b) => {
      if (!q) return true;
      const c = customerById(state.customers, b.customerId);
      return bookingTitle(b, state.customers).toLowerCase().includes(q) || (digits.length >= 3 && Boolean(c?.phone.includes(digits)));
    })
    .sort(sortBookings);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * PAGE, current * PAGE + PAGE);
  const filtered = Boolean(q) || statuses.length > 0;

  const setRange = (nextFrom: PlainDate, nextTo: PlainDate): void => {
    setFrom(nextFrom);
    setTo(nextTo);
    setPage(0);
  };

  const exportCsv = (): void => {
    const header = ["Date", "Start", "End", "Court", "Customer", "Phone", "Source", "Status", "Price (INR)", "Paid (INR)", "Due (INR)"];
    const body = rows.map((b) => {
      const c = customerById(state.customers, b.customerId);
      const [start = "", end = ""] = timeRangeOf(b).split(" – ");
      return [b.date, start, end, courtName(b.courtId), bookingTitle(b, state.customers), c?.phone ?? "", b.source, stateLabel(deskState(b, now)), b.pricePaise / 100, Math.max(0, paidPaise(b)) / 100, duePaise(b) / 100];
    });
    downloadText(`project-831-bookings-${from}-to-${to}.csv`, toCsv([header, ...body]), "text/csv");
  };

  return (
    <div className="flex flex-col gap-4">
      <DeskViewToolbar inlineOnPhone>
      <div className="flex flex-wrap items-start gap-2" data-slot="bookings-filters">
        <SearchField customers={state.customers} onChange={(value) => {
          setQuery(value);
          setPage(0);
        }} value={query} />
        <Toolbar aria-label="Filters and export" className="flex-wrap">
          <ToolbarGroup className="flex-wrap">
            <Popover>
              <ToolbarButton render={<PopoverTrigger render={<Button variant="ghost" />} />}>
                <ListFilterIcon aria-hidden="true" />
                Status
                {statuses.length > 0 && (
                  <Badge className="-me-1" variant="outline">
                    {statuses.length}
                  </Badge>
                )}
              </ToolbarButton>
              <PopoverPopup align="start">
                <Field name="status" render={(props) => <Fieldset {...props} />}>
                  <FieldsetLegend className="mb-3 font-medium text-sm">Show statuses</FieldsetLegend>
                  <CheckboxGroup
                    onValueChange={(value) => {
                      setStatuses(value as DeskState[]);
                      setPage(0);
                    }}
                    value={statuses}
                  >
                    {STATUSES.map((s) => (
                      <FieldItem key={s.value}>
                        <FieldLabel className="font-normal">
                          <Checkbox value={s.value} />
                          {s.label}
                        </FieldLabel>
                      </FieldItem>
                    ))}
                  </CheckboxGroup>
                </Field>
                <Button className="mt-3 w-full" disabled={statuses.length === 0} onClick={() => setStatuses([])} size="sm" variant="ghost">
                  Show every status
                </Button>
              </PopoverPopup>
            </Popover>
            <Popover>
              <ToolbarButton
                aria-label={`Dates, ${dayOf(from)} to ${dayOf(to)}`}
                render={<PopoverTrigger render={<Button className="tabular-nums" variant="ghost" />} />}
              >
                <CalendarRangeIcon aria-hidden="true" />
                {from === to ? dayOf(from) : `${dayOf(from)} – ${dayOf(to)}`}
              </ToolbarButton>
              <PopoverPopup align="start">
                <LazyCalendar
                  defaultMonth={toLocalDate(from)}
                  mode="range"
                  onSelect={(range) => {
                    if (range?.from) setRange(fromLocalDate(range.from), fromLocalDate(range.to ?? range.from));
                  }}
                  selected={{ from: toLocalDate(from), to: toLocalDate(to) }}
                  today={toLocalDate(today)}
                />
              </PopoverPopup>
            </Popover>
          </ToolbarGroup>
          <ToolbarSeparator orientation="vertical" />
          <ToggleGroup
            aria-label="Quick dates"
            className="border-none p-0"
            onValueChange={(value) => {
              const picked = value[0] as Preset | undefined;
              if (picked) setRange(presets[picked].from, presets[picked].to);
              else setRange(addDays(today, -7), addDays(today, 7));
            }}
            value={preset ? [preset] : []}
          >
            {(Object.keys(presets) as Preset[]).map((p) => (
              <ToolbarButton key={p} render={<ToggleGroupItem value={p} />}>
                {presets[p].label}
              </ToolbarButton>
            ))}
          </ToggleGroup>
          <ToolbarSeparator orientation="vertical" />
          <ToolbarGroup>
            <ToolbarButton disabled={rows.length === 0} onClick={exportCsv} render={<Button variant="outline" />}>
              <DownloadIcon aria-hidden="true" />
              Export CSV
            </ToolbarButton>
          </ToolbarGroup>
        </Toolbar>
      </div>
      </DeskViewToolbar>

      <p aria-live="polite" className="text-muted-foreground text-sm">
        {rows.length === 0 ? "No bookings" : `Showing ${current * PAGE + 1}–${current * PAGE + visible.length} of ${rows.length} bookings`}
      </p>

      {rows.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Nothing matches</EmptyTitle>
            <EmptyDescription>{filtered ? "Try another name, or clear the filters." : "No bookings in these dates."}</EmptyDescription>
          </EmptyHeader>
          {filtered && (
            <EmptyContent>
              <Button
                onClick={() => {
                  setQuery("");
                  setStatuses([]);
                  setPage(0);
                }}
                variant="outline"
              >
                Clear filters
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <Frame>
          <Table aria-label="Bookings" variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Court</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-end">Price</TableHead>
                <TableHead className="text-end">Due</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((b) => (
                <Row booking={b} key={b.id} now={now} today={today} />
              ))}
            </TableBody>
          </Table>
          {pages > 1 && (
            <FrameFooter className="p-2">
              <Pagination aria-label="Pages" className="justify-end">
                <PaginationContent className="gap-2">
                  <PaginationItem>
                    <PaginationPrevious render={<Button disabled={current === 0} onClick={() => setPage(current - 1)} size="sm" variant="outline" />} />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="text-muted-foreground text-sm tabular-nums">
                      Page {current + 1} of {pages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext render={<Button disabled={current >= pages - 1} onClick={() => setPage(current + 1)} size="sm" variant="outline" />} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </FrameFooter>
          )}
        </Frame>
      )}
    </div>
  );
}

/**
 * Free-text search with suggestions: coss Autocomplete (particles
 * p-autocomplete-5 and -10, grouped). Typing filters the table as you go;
 * picking a customer or a number fills the box with it.
 */
function SearchField({ customers, value, onChange }: { customers: readonly Customer[]; value: string; onChange: (value: string) => void }): React.ReactElement {
  const groups = React.useMemo<SuggestionGroup[]>(
    () => [
      { value: "Customers", items: customers.map((c) => ({ id: `name-${c.id}`, label: c.name, value: c.name, hint: formatPhone(c.phone) })) },
      {
        value: "Phone numbers",
        items: customers.map((c) => ({ id: `phone-${c.id}`, label: formatPhone(c.phone), value: c.phone.replace(/^\+91/, ""), hint: c.name })),
      },
    ],
    [customers],
  );
  // The coss Toolbar's own frame (border, p-1, rounded-xl) around a default-size input: the input is the
  // same height as the Toolbar's default-size buttons, so the search and the filters share one outer height and baseline.
  return (
    <Field className="min-w-56 flex-1 rounded-xl border bg-card not-dark:bg-clip-padding p-1" data-slot="bookings-search">
      <FieldLabel className="sr-only">Search</FieldLabel>
      <Autocomplete
        items={groups}
        itemToStringValue={(item: unknown) => (item as Suggestion).value}
        onValueChange={onChange}
        value={value}
      >
        <AutocompleteInput placeholder="Name or phone" showClear startAddon={<SearchIcon />} />
        <AutocompletePopup>
          <AutocompleteEmpty>No customer by that name or number.</AutocompleteEmpty>
          <AutocompleteList>
            {(group: SuggestionGroup) => (
              <React.Fragment key={group.value}>
                <AutocompleteGroup items={group.items}>
                  <AutocompleteGroupLabel>{group.value}</AutocompleteGroupLabel>
                  <AutocompleteCollection>
                    {(item: Suggestion) => (
                      <AutocompleteItem key={item.id} value={item}>
                        <span className="flex w-full items-center justify-between gap-3">
                          <span className="truncate">{item.label}</span>
                          {item.hint && <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{item.hint}</span>}
                        </span>
                      </AutocompleteItem>
                    )}
                  </AutocompleteCollection>
                </AutocompleteGroup>
                {group.value === "Customers" && <AutocompleteSeparator />}
              </React.Fragment>
            )}
          </AutocompleteList>
        </AutocompletePopup>
      </Autocomplete>
    </Field>
  );
}

function Row({ booking: b, now, today }: { booking: Booking; now: number; today: PlainDate }): React.ReactElement {
  const { state } = useStore();
  const ui = useDeskUi();
  const actions = useBookingActions(b, now);
  const ds = deskState(b, now);
  const Icon = STATE_META[ds].icon;
  const due = duePaise(b);
  const title = bookingTitle(b, state.customers);
  const customer = b.kind === "booking" ? customerById(state.customers, b.customerId) : undefined;
  const safe = actions.filter((a) => !a.destructive);
  const destructive = actions.filter((a) => a.destructive);
  return (
    <TableRow>
      <TableCell>
        <span className="flex flex-col">
          <span>{dayOf(b.date)}</span>
          <span className="text-muted-foreground text-xs">{timeRangeOf(b)}</span>
        </span>
      </TableCell>
      <TableCell>{courtName(b.courtId)}</TableCell>
      <TableCell>
        {customer ? (
          <CustomerPreview customer={customer} onClick={() => ui.openBooking(b.id)} today={today}>
            {title}
          </CustomerPreview>
        ) : (
          <Button className="h-auto px-0 py-0 font-medium sm:h-auto" onClick={() => ui.openBooking(b.id)} size="sm" variant="link">
            {title}
          </Button>
        )}
        {b.kind === "booking" && <span className="block text-muted-foreground text-xs">{b.source === "self-serve" ? "Online" : "Desk"}</span>}
      </TableCell>
      <TableCell>
        <Badge variant={STATE_META[ds].badge}>
          <Icon aria-hidden="true" />
          {stateLabel(ds)}
        </Badge>
      </TableCell>
      <TableCell className="text-end">{b.kind === "booking" ? formatInr(b.pricePaise) : "—"}</TableCell>
      <TableCell className="text-end">{due > 0 ? formatInr(due) : "—"}</TableCell>
      <TableCell className="w-10 text-end">
        <Menu>
          <MenuTrigger render={<Button aria-label={`Actions for ${title}, ${dayOf(b.date)} ${timeRangeOf(b)}`} size="icon-sm" variant="ghost" />}>
            <EllipsisIcon aria-hidden="true" />
          </MenuTrigger>
          <MenuPopup align="end">
            {safe.map(({ id, label, icon: ActionIcon, run }) => (
              <MenuItem key={id} onClick={run}>
                <ActionIcon aria-hidden="true" />
                {label}
              </MenuItem>
            ))}
            {destructive.length > 0 && <MenuSeparator />}
            {destructive.map(({ id, label, icon: ActionIcon, run }) => (
              <MenuItem key={id} onClick={run} variant="destructive">
                <ActionIcon aria-hidden="true" />
                {label}
              </MenuItem>
            ))}
          </MenuPopup>
        </Menu>
      </TableCell>
    </TableRow>
  );
}

