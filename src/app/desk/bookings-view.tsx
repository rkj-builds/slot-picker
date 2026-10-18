"use client";

/**
 * Every booking, in Cal.com's list shape: status views as URLs (Upcoming,
 * Payment due, Past, Cancelled), filters as removable chips that also live
 * in the URL, rows grouped by day, each row opening the booking's page, a
 * row menu decided by the rules module, and multi-select with a bulk bar for
 * the two things the desk does to many bookings at once: remind, and settle.
 * Reads through the data client; search and CSV export stay.
 */
import { BanknoteIcon, BellRingIcon, CalendarRangeIcon, ChevronDownIcon, DownloadIcon, ListFilterIcon, SearchIcon, SearchXIcon, XIcon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import { useAnchoredBarHeight } from "@/app/anchored-bar";
import { BookingRowMenu } from "@/app/desk/booking-action-ui";
import { useBookingCommand } from "@/app/desk/booking-commands";
import { type BookingTarget, CancelBookingDialog, EditBookingDialog, RecordPaymentDialog } from "@/app/desk/booking-dialogs";
import { cooldownLine, toastRefusal } from "@/app/desk/booking-feedback";
import { type BookingActionId, bookingAction, bookingActions } from "@/app/desk/booking-rules";
import { bookingTitle, STATE_META, stateLabel } from "@/app/desk/booking-visuals";
import {
  activeFields,
  BOOKINGS_VIEWS,
  type BookingFilters,
  type BookingsViewId,
  bookingsFor,
  type FilterField,
  filterQuery,
  groupByDay,
  isFiltered,
  NO_FILTERS,
  readFilters,
  STATUS_OPTIONS,
  VIA_OPTIONS,
  viewPath,
  viewWindow,
} from "@/app/desk/bookings-filters";
import { CustomerPreview } from "@/app/desk/customer-preview";
import { DeskViewFooter, DeskViewToolbar } from "@/app/desk/desk-toolbar";
import { dayOf, durationOf, timeRangeOf } from "@/app/format";
import { hrefFor, navigate, type Route } from "@/app/router";
import { DisabledWithReason } from "@/app/desk/disabled-with-reason";
import { ListSkeleton, LoadFailed, PageHeader, Screen } from "@/app/screens/screen-kit";
import { LazyCalendar } from "@/components/booking/lazy-calendar";
import { RadioCard } from "@/components/compositions/radio-card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldItem, FieldLabel } from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { Frame, FrameFooter } from "@/components/ui/frame";
import { Group, GroupText } from "@/components/ui/group";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup } from "@/components/ui/radio-group";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toastManager } from "@/components/ui/toast";
import { Toolbar, ToolbarButton, ToolbarGroup } from "@/components/ui/toolbar";
import type { PayMethod } from "@/data/client";
import { isDataError } from "@/data/errors";
import { useDataClient, useRead } from "@/data/provider";
import type { Viewer } from "@/data/types";
import { useMediaQuery } from "@/hooks/use-media-query";
import { type Booking, type Customer, customerById, deskState, duePaise, paidPaise } from "@/lib/booking";
import { downloadText, toCsv } from "@/lib/csv";
import { formatInr, sumPaise } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { addDays, fromLocalDate, type PlainDate, toLocalDate } from "@/lib/plain-date";
import { segmentedControlItemVariants, segmentedControlRootClassName } from "@/lib/segmented-control";
import { COURTS, type CourtId, courtName } from "@/lib/venue";
import { cn } from "@/lib/utils";

const PAGE_SIZES = [10, 20, 50] as const;
const FIELD_LABEL: Record<FilterField, string> = { court: "Court", status: "Status", via: "Booked via", dates: "Dates" };

function detailHref(id: string): string {
  return hrefFor(`/desk/bookings/${encodeURIComponent(id)}`);
}

export function BookingsView({ view, route, today, now }: { view: BookingsViewId; route: Route; today: PlainDate; now: number }): React.ReactElement {
  const filters = readFilters(route.query);
  const range = filters.from && filters.to ? { from: filters.from, to: filters.to } : viewWindow(view, today);
  const list = useRead(["bookings", range.from, range.to], (c) => c.bookings.list(range));
  const viewer = useRead(["viewer"], (c) => c.team.viewer());
  const [pageSize, setPageSize] = React.useState<number>(20);
  const [page, setPage] = React.useState(0);
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(new Set());
  // A different view or filter is a different list: start at its first page, with nothing selected.
  const signature = `${view}?${route.query.toString()}`;
  const [seen, setSeen] = React.useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setPage(0);
    setSelected(new Set());
  }

  const setFilters = (next: BookingFilters): void => navigate(viewPath(view), filterQuery(next), { replace: true });
  const customers = list.data?.customers ?? [];
  const rows = list.data ? bookingsFor(view, list.data.bookings, customers, filters, now) : [];
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * pageSize, current * pageSize + pageSize);
  const empty = BOOKINGS_VIEWS.find((v) => v.id === view)?.empty ?? { title: "No bookings", description: "" };
  const nameOf = (b: Booking): string => bookingTitle(b, customers);
  const chosen = rows.filter((b) => selected.has(b.id));

  const exportCsv = (): void => {
    const header = ["Date", "Start", "End", "Court", "Customer", "Phone", "Booked via", "Status", "Price (INR)", "Paid (INR)", "Due (INR)"];
    const body = rows.map((b) => {
      const c = customerById(customers, b.customerId);
      const [start = "", end = ""] = timeRangeOf(b).split(" – ");
      return [b.date, start, end, courtName(b.courtId), nameOf(b), c?.phone ?? "", b.source === "self-serve" ? "Online" : "Desk", stateLabel(deskState(b, now)), b.pricePaise / 100, Math.max(0, paidPaise(b)) / 100, duePaise(b) / 100];
    });
    downloadText(`bookings-${view}-${range.from}-to-${range.to}.csv`, toCsv([header, ...body]), "text/csv");
  };

  const live = rows.filter((b) => b.kind === "booking" && b.status !== "cancelled");
  const summary =
    rows.length === 0
      ? "No bookings"
      : `${rows.length} ${rows.length === 1 ? "booking" : "bookings"} · ${formatInr(sumPaise(live.map((b) => b.pricePaise)))} · ${formatInr(sumPaise(live.map(duePaise)))} still due`;

  return (
    <Screen className="gap-4">
      <PageHeader description="Every booking, what it's worth and what is still due." title="Bookings" />
      <DeskViewToolbar inlineOnPhone>
        <div className="flex flex-wrap items-start gap-2" data-slot="bookings-filters">
          <ViewTabs filters={filters} view={view} />
          <SearchField customers={customers} onChange={(q) => setFilters({ ...filters, q })} value={filters.q} />
          <FilterBar filters={filters} onChange={setFilters} onExport={exportCsv} rows={rows.length} today={today} />
        </div>
      </DeskViewToolbar>

      {list.status === "pending" ? (
        <ListSkeleton label="Loading bookings" rows={8} />
      ) : list.status === "error" ? (
        <LoadFailed error={list.error} onRetry={() => void list.refetch()} what="bookings" />
      ) : (
        <>
          <p aria-live="polite" className="text-muted-foreground text-sm tabular-nums">
            {summary}
          </p>
          {rows.length === 0 ? (
            <Empty className="rounded-2xl border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchXIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>{isFiltered(filters) ? "Nothing matches" : empty.title}</EmptyTitle>
                <EmptyDescription>{isFiltered(filters) ? "Try another name, or clear the filters." : empty.description}</EmptyDescription>
              </EmptyHeader>
              {isFiltered(filters) && (
                <EmptyContent>
                  <Button onClick={() => setFilters(NO_FILTERS)} variant="outline">
                    Clear filters
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <BookingsList
              customers={customers}
              nameOf={nameOf}
              now={now}
              onPage={setPage}
              onPageSize={(size) => {
                setPageSize(size);
                setPage(0);
              }}
              onSelect={setSelected}
              page={current}
              pageSize={pageSize}
              pages={pages}
              rows={visible}
              selected={selected}
              today={today}
              total={rows.length}
              viewer={viewer.data ?? null}
            />
          )}
        </>
      )}

      {chosen.length > 0 && (
        <DeskViewFooter>
          <BulkBar bookings={chosen} nameOf={nameOf} now={now} onClear={() => setSelected(new Set())} viewer={viewer.data ?? null} />
        </DeskViewFooter>
      )}
    </Screen>
  );
}

/** The status views as links (coss particle p-navigation-1): each a URL, so Back and shared links work. Filters carry across. */
function ViewTabs({ view, filters }: { view: BookingsViewId; filters: BookingFilters }): React.ReactElement {
  return (
    <nav aria-label="Booking views" className="max-w-full overflow-x-auto">
      <ul className={segmentedControlRootClassName}>
        {BOOKINGS_VIEWS.map((v) => (
          <li key={v.id}>
            <a aria-current={v.id === view ? "page" : undefined} className={segmentedControlItemVariants({ state: "current" })} href={hrefFor(viewPath(v.id), filterQuery(filters))}>
              {v.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

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

/**
 * Free-text search with suggestions: coss Autocomplete (particles
 * p-autocomplete-5 and -10, grouped). Typing filters the list as you go;
 * picking a customer or a number fills the box with it.
 */
function SearchField({ customers, value, onChange }: { customers: readonly Customer[]; value: string; onChange: (value: string) => void }): React.ReactElement {
  const groups = React.useMemo<SuggestionGroup[]>(
    () => [
      { value: "Customers", items: customers.map((c) => ({ id: `name-${c.id}`, label: c.name, value: c.name, hint: formatPhone(c.phone) })) },
      { value: "Phone numbers", items: customers.map((c) => ({ id: `phone-${c.id}`, label: formatPhone(c.phone), value: c.phone.replace(/^\+91/, ""), hint: c.name })) },
    ],
    [customers],
  );
  return (
    <Field className="min-w-56 flex-1" data-slot="bookings-search">
      <FieldLabel className="sr-only">Search</FieldLabel>
      <Autocomplete items={groups} itemToStringValue={(item: unknown) => (item as Suggestion).value} onValueChange={onChange} value={value}>
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

/* ── Filters as chips ───────────────────────────────────────────────── */

/**
 * "Filter" adds a field; each field on is a chip (label, value, ×) whose
 * value opens in a popover, as Cal.com's bookings filters do. Clear removes
 * them all. A chip just added stays, empty, until it gets a value or is removed.
 */
function FilterBar({
  filters,
  onChange,
  onExport,
  rows,
  today,
}: {
  filters: BookingFilters;
  onChange: (next: BookingFilters) => void;
  onExport: () => void;
  rows: number;
  today: PlainDate;
}): React.ReactElement {
  const [pending, setPending] = React.useState<FilterField[]>([]);
  const [openChip, setOpenChip] = React.useState<FilterField | null>(null);
  const on = activeFields(filters);
  const shown = [...on, ...pending.filter((f) => !on.includes(f))];
  const remove = (field: FilterField): void => {
    setPending((p) => p.filter((f) => f !== field));
    if (field === "court") onChange({ ...filters, courts: [] });
    if (field === "status") onChange({ ...filters, statuses: [] });
    if (field === "via") onChange({ ...filters, via: [] });
    if (field === "dates") onChange({ ...filters, from: null, to: null });
  };

  return (
    <>
      <Toolbar aria-label="Filters and export">
        <ToolbarGroup>
          <Menu>
            <ToolbarButton render={<MenuTrigger render={<Button variant="ghost" />} />}>
              <ListFilterIcon aria-hidden="true" />
              Filter
              {on.length > 0 && (
                <Badge className="-me-1" variant="outline">
                  {on.length}
                </Badge>
              )}
            </ToolbarButton>
            <MenuPopup align="start">
              {(Object.keys(FIELD_LABEL) as FilterField[]).map((field) => (
                <MenuItem
                  disabled={shown.includes(field)}
                  key={field}
                  onClick={() => {
                    setPending((p) => [...p, field]);
                    // Open the new chip's value once the menu has closed and the chip has rendered.
                    window.setTimeout(() => setOpenChip(field), 0);
                  }}
                >
                  {FIELD_LABEL[field]}
                </MenuItem>
              ))}
            </MenuPopup>
          </Menu>
          <ToolbarButton disabled={rows === 0} onClick={onExport} render={<Button variant="outline" />}>
            <DownloadIcon aria-hidden="true" />
            Export CSV
          </ToolbarButton>
        </ToolbarGroup>
      </Toolbar>
      {shown.length > 0 && (
        <div aria-label="Filters on" className="flex w-full flex-wrap items-center gap-2" role="group">
          {shown.map((field) => (
            <FilterChip
              field={field}
              filters={filters}
              key={field}
              onChange={onChange}
              onOpenChange={(open) => setOpenChip(open ? field : null)}
              onRemove={() => remove(field)}
              open={openChip === field}
              today={today}
            />
          ))}
          <Button
            className="ms-auto"
            onClick={() => {
              setPending([]);
              onChange({ ...NO_FILTERS, q: filters.q });
            }}
            size="sm"
            variant="ghost"
          >
            Clear
          </Button>
        </div>
      )}
    </>
  );
}

function chipValue(field: FilterField, f: BookingFilters): string {
  const names = (values: readonly string[], options: readonly { value: string; label: string }[]): string =>
    values.length === 0 ? "Any" : values.length <= 2 ? values.map((v) => options.find((o) => o.value === v)?.label ?? v).join(", ") : `${values.length} picked`;
  switch (field) {
    case "court":
      return names(
        f.courts,
        COURTS.map((c) => ({ value: c.id, label: c.name })),
      );
    case "status":
      return names(f.statuses, STATUS_OPTIONS);
    case "via":
      return names(f.via, VIA_OPTIONS);
    case "dates":
      return f.from && f.to ? (f.from === f.to ? dayOf(f.from) : `${dayOf(f.from)} – ${dayOf(f.to)}`) : "Any";
  }
}

function FilterChip({
  field,
  filters,
  open,
  today,
  onOpenChange,
  onChange,
  onRemove,
}: {
  field: FilterField;
  filters: BookingFilters;
  open: boolean;
  today: PlainDate;
  onOpenChange: (open: boolean) => void;
  onChange: (next: BookingFilters) => void;
  onRemove: () => void;
}): React.ReactElement {
  const label = FIELD_LABEL[field];
  const value = chipValue(field, filters);
  return (
    <Group aria-label={`${label} filter`}>
      <GroupText className="text-sm">{label}</GroupText>
      <Popover onOpenChange={onOpenChange} open={open}>
        <PopoverTrigger render={<Button aria-label={`${label}: ${value}. Change`} className="tabular-nums" size="sm" variant="outline" />}>
          {field === "dates" && <CalendarRangeIcon aria-hidden="true" />}
          {value}
          <ChevronDownIcon aria-hidden="true" />
        </PopoverTrigger>
        <PopoverPopup align="start" aria-label={`${label} filter`}>
          {field === "court" && (
            <ChoiceList
              label="Courts"
              onChange={(v) => onChange({ ...filters, courts: v as CourtId[] })}
              options={COURTS.map((c) => ({ value: c.id, label: c.name }))}
              value={filters.courts}
            />
          )}
          {field === "status" && <ChoiceList label="Statuses" onChange={(v) => onChange({ ...filters, statuses: v as BookingFilters["statuses"] })} options={STATUS_OPTIONS} value={filters.statuses} />}
          {field === "via" && <ChoiceList label="Booked via" onChange={(v) => onChange({ ...filters, via: v as BookingFilters["via"] })} options={VIA_OPTIONS} value={filters.via} />}
          {field === "dates" && <DatesEditor filters={filters} onChange={onChange} onDone={() => onOpenChange(false)} today={today} />}
        </PopoverPopup>
      </Popover>
      <Button aria-label={`Remove ${label.toLowerCase()} filter`} onClick={onRemove} size="icon-sm" variant="outline">
        <XIcon aria-hidden="true" />
      </Button>
    </Group>
  );
}

function ChoiceList({ label, options, value, onChange }: { label: string; options: readonly { value: string; label: string }[]; value: readonly string[]; onChange: (value: string[]) => void }): React.ReactElement {
  return (
    <Field name={label} render={(props) => <Fieldset {...props} />}>
      <FieldsetLegend className="mb-3 font-medium text-sm">{label}</FieldsetLegend>
      <CheckboxGroup onValueChange={onChange} value={[...value]}>
        {options.map((o) => (
          <FieldItem key={o.value}>
            <FieldLabel className="font-normal">
              <Checkbox value={o.value} />
              {o.label}
            </FieldLabel>
          </FieldItem>
        ))}
      </CheckboxGroup>
    </Field>
  );
}

function DatesEditor({ filters, today, onChange, onDone }: { filters: BookingFilters; today: PlainDate; onChange: (next: BookingFilters) => void; onDone: () => void }): React.ReactElement {
  const presets: { label: string; from: PlainDate; to: PlainDate }[] = [
    { label: "Today", from: today, to: today },
    { label: "Next 7 days", from: today, to: addDays(today, 6) },
    { label: "Last 7 days", from: addDays(today, -6), to: today },
    { label: "Last 30 days", from: addDays(today, -29), to: today },
  ];
  const set = (from: PlainDate, to: PlainDate): void => onChange({ ...filters, from, to });
  return (
    <div className="flex gap-3 max-sm:flex-col">
      <ul aria-label="Quick ranges" className="flex flex-col gap-1 sm:w-32">
        {presets.map((p) => (
          <li key={p.label}>
            <Button
              aria-pressed={filters.from === p.from && filters.to === p.to}
              className="w-full justify-start aria-pressed:bg-accent"
              onClick={() => {
                set(p.from, p.to);
                onDone();
              }}
              size="sm"
              variant="ghost"
            >
              {p.label}
            </Button>
          </li>
        ))}
      </ul>
      <LazyCalendar
        defaultMonth={toLocalDate(filters.from ?? today)}
        mode="range"
        onSelect={(r) => {
          if (r?.from) set(fromLocalDate(r.from), fromLocalDate(r.to ?? r.from));
        }}
        selected={filters.from && filters.to ? { from: toLocalDate(filters.from), to: toLocalDate(filters.to) } : undefined}
        today={toLocalDate(today)}
      />
    </div>
  );
}

/* ── The list ───────────────────────────────────────────────────────── */

interface ListProps {
  rows: Booking[];
  customers: readonly Customer[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  today: PlainDate;
  now: number;
  viewer: Viewer | null;
  selected: ReadonlySet<string>;
  nameOf: (b: Booking) => string;
  onSelect: (next: ReadonlySet<string>) => void;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}

/**
 * A framed table on a laptop, stacked rows on a phone. Rows are grouped
 * under their day. The customer's name is the link to the booking (and
 * hovering it previews the customer); a click anywhere else on the row opens
 * it too, for the mouse.
 */
function BookingsList(props: ListProps): React.ReactElement {
  const { rows, today, selected, onSelect, nameOf, viewer, now } = props;
  const phone = useMediaQuery("max-md");
  const [dialog, setDialog] = React.useState<{ kind: "pay" | "edit" | "cancel"; target: BookingTarget } | null>(null);
  const command = useBookingCommand();
  const groups = groupByDay(rows, today);
  const pageIds = rows.map((b) => b.id);
  const allOn = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOn = pageIds.some((id) => selected.has(id));
  const toggle = (id: string, on: boolean): void => {
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    onSelect(next);
  };
  const togglePage = (on: boolean): void => onSelect(on ? new Set([...selected, ...pageIds]) : new Set([...selected].filter((id) => !pageIds.includes(id))));
  const onAction = (b: Booking, id: BookingActionId): void => {
    const target = { booking: b, name: nameOf(b) };
    if (id === "record-payment") setDialog({ kind: "pay", target });
    else if (id === "edit") setDialog({ kind: "edit", target });
    else if (id === "cancel") setDialog({ kind: "cancel", target });
    else void command.run(id, target);
  };
  // Check-in needs the booking's own detail (is it checked in already?); it lives on the booking's page.
  const rowActions = (b: Booking): ReturnType<typeof bookingActions> =>
    viewer ? bookingActions({ booking: b, viewer, now, hasCustomer: b.customerId !== null }).filter((a) => a.id !== "check-in" && a.id !== "undo-check-in") : [];
  const open = (event: React.MouseEvent, b: Booking): void => {
    const target = event.target as HTMLElement;
    // Clicks inside the row's portaled popups (its menu, the customer card) bubble here through React too; only the row itself opens.
    if (!event.currentTarget.contains(target) || target.closest("a, button, input, label, [role=checkbox]")) return;
    navigate(`/desk/bookings/${encodeURIComponent(b.id)}`);
  };
  const actionLabel = (b: Booking): string => `Actions for ${nameOf(b)}, ${dayOf(b.date)} ${timeRangeOf(b)}`;

  const nameCell = (b: Booking): React.ReactNode => {
    const customer = b.kind === "booking" ? customerById(props.customers, b.customerId) : undefined;
    const name = nameOf(b);
    const cancelled = b.status === "cancelled";
    return customer ? (
      <span className={cn(cancelled && "[&_a]:line-through")}>
        <CustomerPreview customer={customer} href={detailHref(b.id)} today={today}>
          {name}
        </CustomerPreview>
      </span>
    ) : (
      <Button className={cn("h-auto px-0 py-0 font-medium sm:h-auto", cancelled && "line-through")} render={<Anchor href={detailHref(b.id)} />} size="sm" variant="link">
        {name}
      </Button>
    );
  };
  const badge = (b: Booking): React.ReactNode => {
    const ds = deskState(b, now);
    const Icon = STATE_META[ds].icon;
    return (
      <Badge variant={STATE_META[ds].badge}>
        <Icon aria-hidden="true" />
        {stateLabel(ds)}
      </Badge>
    );
  };

  return (
    <>
      {phone ? (
        <div className="flex flex-col gap-4">
          <Field className="px-1">
            <FieldLabel className="font-normal">
              <Checkbox checked={allOn} indeterminate={someOn && !allOn} onCheckedChange={togglePage} />
              Select all on this page
            </FieldLabel>
          </Field>
          {groups.map((g) => (
            <section aria-labelledby={`day-${g.date}`} className="flex flex-col gap-2" key={g.date}>
              <h2 className="px-1 font-medium text-muted-foreground text-sm" id={`day-${g.date}`}>
                {g.label}
                {g.label !== dayOf(g.date) ? ` · ${dayOf(g.date)}` : ""}
              </h2>
              <ul className="flex flex-col divide-y rounded-2xl border bg-card">
                {g.rows.map((b) => {
                  const due = duePaise(b);
                  return (
                    <li className="flex items-start gap-3 p-3 data-[state=selected]:bg-accent/50" data-state={selected.has(b.id) ? "selected" : undefined} key={b.id}>
                      <Checkbox aria-label={`Select ${nameOf(b)}, ${timeRangeOf(b)}`} checked={selected.has(b.id)} className="mt-1" onCheckedChange={(on) => toggle(b.id, on)} />
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="truncate">{nameCell(b)}</div>
                        <span className="text-muted-foreground text-sm tabular-nums">
                          {timeRangeOf(b)} · {courtName(b.courtId)}
                        </span>
                        <span className="flex flex-wrap items-center gap-2">
                          {badge(b)}
                          {due > 0 && <span className="text-sm tabular-nums">{formatInr(due)} due</span>}
                        </span>
                      </div>
                      <BookingRowMenu actions={rowActions(b)} href={detailHref(b.id)} label={actionLabel(b)} onAction={(id) => onAction(b, id)} />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <Pager {...props} />
        </div>
      ) : (
        <Frame>
          <Table aria-label="Bookings" variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox aria-label="Select all on this page" checked={allOn} indeterminate={someOn && !allOn} onCheckedChange={togglePage} />
                </TableHead>
                <TableHead>Time</TableHead>
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
              {groups.map((g) => (
                <React.Fragment key={g.date}>
                  <TableRow>
                    <TableHead className="h-8 bg-muted/72 text-foreground text-xs" colSpan={8} scope="rowgroup">
                      {g.label}
                      {g.label !== dayOf(g.date) && <span className="font-normal text-muted-foreground"> · {dayOf(g.date)}</span>}
                    </TableHead>
                  </TableRow>
                  {g.rows.map((b) => {
                    const due = duePaise(b);
                    return (
                      <TableRow className="cursor-pointer" data-state={selected.has(b.id) ? "selected" : undefined} key={b.id} onClick={(e) => open(e, b)}>
                        <TableCell>
                          <Checkbox aria-label={`Select ${nameOf(b)}, ${timeRangeOf(b)}`} checked={selected.has(b.id)} onCheckedChange={(on) => toggle(b.id, on)} />
                        </TableCell>
                        <TableCell className="tabular-nums">
                          <span className="flex flex-col gap-1">
                            <span>{timeRangeOf(b)}</span>
                            <span className="text-muted-foreground text-xs">{durationOf(b.durationMinutes)}</span>
                          </span>
                        </TableCell>
                        <TableCell>{courtName(b.courtId)}</TableCell>
                        <TableCell>
                          {nameCell(b)}
                          {b.kind === "booking" && <span className="mt-1 block text-muted-foreground text-xs">{b.source === "self-serve" ? "Online" : "Desk"}</span>}
                        </TableCell>
                        <TableCell>{badge(b)}</TableCell>
                        <TableCell className="text-end tabular-nums">{b.kind === "booking" ? formatInr(b.pricePaise) : "—"}</TableCell>
                        <TableCell className="text-end tabular-nums">{due > 0 ? formatInr(due) : "—"}</TableCell>
                        <TableCell className="w-10 text-end">
                          <BookingRowMenu actions={rowActions(b)} href={detailHref(b.id)} label={actionLabel(b)} onAction={(id) => onAction(b, id)} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
          <FrameFooter className="p-2">
            <Pager {...props} />
          </FrameFooter>
        </Frame>
      )}

      <RecordPaymentDialog onClose={() => setDialog(null)} target={dialog?.kind === "pay" ? dialog.target : null} />
      <EditBookingDialog onClose={() => setDialog(null)} target={dialog?.kind === "edit" ? dialog.target : null} viewer={viewer} />
      <CancelBookingDialog onClose={() => setDialog(null)} target={dialog?.kind === "cancel" ? dialog.target : null} />
    </>
  );
}

/** Rows per page, "1–20 of 64", Previous and Next (coss particle p-pagination-3). */
function Pager({ total, page, pages, pageSize, onPage, onPageSize }: ListProps): React.ReactElement {
  const first = page * pageSize + 1;
  const last = Math.min(total, first + pageSize - 1);
  const labelId = React.useId();
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm" id={labelId}>
          Rows per page
        </span>
        <Select<number> items={PAGE_SIZES.map((n) => ({ label: String(n), value: n }))} onValueChange={(v) => v !== null && onPageSize(v)} value={pageSize}>
          <SelectTrigger aria-labelledby={labelId} className="w-18" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {PAGE_SIZES.map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </div>
      <span className="text-muted-foreground text-sm tabular-nums">
        {first}–{last} of {total}
      </span>
      <div className="flex gap-2">
        <Button disabled={page === 0} onClick={() => onPage(page - 1)} size="sm" variant="outline">
          Previous
        </Button>
        <Button disabled={page >= pages - 1} onClick={() => onPage(page + 1)} size="sm" variant="outline">
          Next
        </Button>
      </div>
    </nav>
  );
}

/* ── Bulk bar ───────────────────────────────────────────────────────── */

/**
 * Anchored to the bottom of the desk while bookings are selected: how many,
 * Send reminders, Record as paid, and clear. Each does what it can and says
 * what it skipped and why, by the same rules as a single booking.
 */
function BulkBar({ bookings, viewer, now, nameOf, onClear }: { bookings: Booking[]; viewer: Viewer | null; now: number; nameOf: (b: Booking) => string; onClear: () => void }): React.ReactElement {
  const ref = useAnchoredBarHeight<HTMLElement>();
  const client = useDataClient();
  const [busy, setBusy] = React.useState(false);
  const [paying, setPaying] = React.useState(false);
  const can = (id: BookingActionId, b: Booking): boolean => Boolean(viewer && bookingAction(id, { booking: b, viewer, now, hasCustomer: b.customerId !== null })?.enabled);
  const remindable = bookings.filter((b) => can("send-reminder", b));
  const payable = bookings.filter((b) => can("record-payment", b));
  const moneyBlocked = viewer && !viewer.can.handleMoney ? "Your role can't take or record money. Ask an admin." : null;

  const remind = async (): Promise<void> => {
    setBusy(true);
    let sent = 0;
    const skipped: string[] = [];
    for (const b of remindable) {
      try {
        await client.bookings.sendReminder(b.id);
        sent += 1;
      } catch (error) {
        skipped.push(isDataError(error) && error.code === "cooldown" ? `${nameOf(b)} had one less than an hour ago.` : `${nameOf(b)}: ${cooldownLine(error)}`);
      }
    }
    setBusy(false);
    const notEligible = bookings.length - remindable.length;
    toastManager.add({
      title: sent === 0 ? "No reminders sent" : `Reminders sent to ${sent} ${sent === 1 ? "customer" : "customers"}`,
      description:
        [notEligible > 0 ? `${notEligible} skipped: already happened, cancelled or not a customer booking.` : null, ...skipped].filter(Boolean).join(" ") || "On WhatsApp.",
      type: sent === 0 ? "warning" : "success",
    });
    if (sent > 0) onClear();
  };

  return (
    <section aria-label="Selected bookings" className="border-t bg-background/94 pb-[env(safe-area-inset-bottom)] backdrop-blur-md" data-slot="bookings-bulkbar" ref={ref}>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-end gap-2 px-4 py-3">
        <span aria-live="polite" className="me-auto font-medium text-sm tabular-nums">
          {bookings.length} selected
        </span>
        <Button disabled={busy} onClick={onClear} variant="ghost">
          Clear selection
        </Button>
        <Button disabled={remindable.length === 0} loading={busy} onClick={() => void remind()} variant="outline">
          <BellRingIcon aria-hidden="true" />
          Send reminders
        </Button>
        {moneyBlocked ? (
          <DisabledWithReason reason={moneyBlocked} variant="default">
            <BanknoteIcon aria-hidden="true" />
            Record as paid
          </DisabledWithReason>
        ) : (
          <Button disabled={payable.length === 0} onClick={() => setPaying(true)}>
            <BanknoteIcon aria-hidden="true" />
            Record as paid
          </Button>
        )}
      </div>
      <BulkPayDialog bookings={payable} nameOf={nameOf} onClose={() => setPaying(false)} onDone={onClear} open={paying} skipped={bookings.length - payable.length} />
    </section>
  );
}

/** Settle every selected balance at once: the desk says how it came in, sees the total, confirms. */
function BulkPayDialog({
  bookings,
  skipped,
  open,
  nameOf,
  onClose,
  onDone,
}: {
  bookings: Booking[];
  skipped: number;
  open: boolean;
  nameOf: (b: Booking) => string;
  onClose: () => void;
  onDone: () => void;
}): React.ReactElement {
  const client = useDataClient();
  const [method, setMethod] = React.useState<PayMethod>("cash");
  const [busy, setBusy] = React.useState(false);
  const total = sumPaise(bookings.map(duePaise));

  const confirm = async (): Promise<void> => {
    setBusy(true);
    let done = 0;
    let amount = 0;
    const failed: string[] = [];
    for (const b of bookings) {
      try {
        await client.bookings.recordPayment(b.id, { method, amountPaise: duePaise(b) });
        done += 1;
        amount += duePaise(b);
      } catch (error) {
        failed.push(nameOf(b));
        if (failed.length === 1) toastRefusal(`Not recorded for ${nameOf(b)}`, error);
      }
    }
    setBusy(false);
    onClose();
    if (done > 0) {
      toastManager.add({
        title: `${formatInr(amount)} recorded for ${done} ${done === 1 ? "booking" : "bookings"}`,
        description: `${method === "cash" ? "Cash" : "Online"}${failed.length ? ` · not recorded: ${failed.join(", ")}` : ""}`,
        type: "success",
      });
      onDone();
    }
  };

  return (
    <Dialog onOpenChange={(o) => !o && !busy && onClose()} open={open}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Record as paid</DialogTitle>
          <DialogDescription>
            {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}, {formatInr(total)} in all.
            {skipped > 0 ? ` ${skipped} selected ${skipped === 1 ? "booking has" : "bookings have"} nothing to record and ${skipped === 1 ? "is" : "are"} left out.` : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <RadioGroup aria-label="How it was paid" onValueChange={(v) => setMethod(v as PayMethod)} value={method}>
            <RadioCard value="cash">
              <span className="font-medium text-sm">All in cash</span>
              <span className="text-muted-foreground text-sm">Taken at the desk.</span>
            </RadioCard>
            <RadioCard value="online">
              <span className="font-medium text-sm">All online</span>
              <span className="text-muted-foreground text-sm">UPI transfers to the venue.</span>
            </RadioCard>
          </RadioGroup>
        </DialogPanel>
        <DialogFooter>
          <DialogClose disabled={busy} render={<Button variant="ghost" />}>
            Cancel
          </DialogClose>
          <Button loading={busy} onClick={() => void confirm()}>
            Record {formatInr(total)}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
