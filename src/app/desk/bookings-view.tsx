"use client";

import { DownloadIcon, EllipsisIcon, SearchIcon, SearchXIcon } from "lucide-react";
import * as React from "react";
import { bookingTitle, STATE_META, stateLabel } from "@/app/desk/booking-visuals";
import { useDeskActions } from "@/app/desk/desk-actions";
import { useDeskUi } from "@/app/desk/desk-ui";
import { dayOf, timeRangeOf } from "@/app/format";
import { useStore } from "@/app/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Frame, FrameFooter } from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Booking, customerById, deskState, type DeskState, duePaise, paidPaise, sortBookings } from "@/lib/booking";
import { downloadText, toCsv } from "@/lib/csv";
import { formatInr } from "@/lib/money";
import { addDays, compareDates, type PlainDate } from "@/lib/plain-date";
import { courtName } from "@/lib/venue";

type StatusFilter = "all" | DeskState;
const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "held", label: "Held" },
  { value: "paid", label: "Paid" },
  { value: "part-paid", label: "Part-paid" },
  { value: "due", label: "Due at venue" },
  { value: "no-show", label: "No-show" },
  { value: "cancelled", label: "Cancelled" },
  { value: "coaching", label: "Coaching" },
];
const PAGE = 12;

export function BookingsView({ today, now }: { today: PlainDate; now: number }): React.ReactElement {
  const { state } = useStore();
  const ui = useDeskUi();
  const actions = useDeskActions();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [from, setFrom] = React.useState<string>(addDays(today, -7));
  const [to, setTo] = React.useState<string>(addDays(today, 7));
  const [page, setPage] = React.useState(0);

  const q = query.trim().toLowerCase();
  const digits = q.replaceAll(/\D/g, "");
  const rows = state.bookings
    .filter((b) => (!from || compareDates(b.date, from as PlainDate) >= 0) && (!to || compareDates(b.date, to as PlainDate) <= 0))
    .filter((b) => status === "all" || deskState(b, now) === status)
    .filter((b) => {
      if (!q) return true;
      const c = customerById(state.customers, b.customerId);
      return bookingTitle(b, state.customers).toLowerCase().includes(q) || (digits.length >= 3 && Boolean(c?.phone.includes(digits)));
    })
    .sort(sortBookings);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * PAGE, current * PAGE + PAGE);
  const filtered = Boolean(q) || status !== "all";

  const resetPage = <T,>(set: (v: T) => void) => (v: T): void => {
    set(v);
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
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <Label htmlFor="bookings-search">Search</Label>
          <InputGroup>
            <InputGroupInput id="bookings-search" onChange={(e) => resetPage(setQuery)(e.target.value)} placeholder="Name or phone" type="search" value={query} />
            <InputGroupAddon>
              <SearchIcon aria-hidden="true" />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label id="bookings-status">Status</Label>
          <Select<StatusFilter> items={FILTERS} onValueChange={(v) => v && resetPage(setStatus)(v)} value={status}>
            <SelectTrigger aria-labelledby="bookings-status">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bookings-from">From</Label>
          <Input className="w-38" id="bookings-from" max={to} onChange={(e) => resetPage(setFrom)(e.target.value)} type="date" value={from} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bookings-to">To</Label>
          <Input className="w-38" id="bookings-to" min={from} onChange={(e) => resetPage(setTo)(e.target.value)} type="date" value={to} />
        </div>
        <Button disabled={rows.length === 0} onClick={exportCsv} variant="outline">
          <DownloadIcon aria-hidden="true" />
          Export CSV
        </Button>
      </div>

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
                  setStatus("all");
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
                <Row actions={actions} booking={b} key={b.id} now={now} ui={ui} />
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

function Row({ booking: b, now, ui, actions }: { booking: Booking; now: number; ui: ReturnType<typeof useDeskUi>; actions: ReturnType<typeof useDeskActions> }): React.ReactElement {
  const { state } = useStore();
  const ds = deskState(b, now);
  const Icon = STATE_META[ds].icon;
  const due = duePaise(b);
  const title = bookingTitle(b, state.customers);
  const live = ds !== "cancelled" && ds !== "expired";
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
        <button className="rounded-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => ui.openBooking(b.id)} type="button">
          {title}
        </button>
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
          <MenuPopup>
            <MenuItem onClick={() => ui.openBooking(b.id)}>Open</MenuItem>
            {live && b.kind === "booking" && due > 0 && ds !== "held" && <MenuItem onClick={() => ui.recordCash(b.id)}>Record cash</MenuItem>}
            {live && b.kind === "booking" && due > 0 && <MenuItem onClick={() => void actions.copyPaymentLink(b)}>Copy payment link</MenuItem>}
            {b.kind === "booking" && b.status === "confirmed" && <MenuItem onClick={() => void actions.markNoShow(b)}>Mark no-show</MenuItem>}
            {live && (
              <>
                <MenuSeparator />
                <MenuItem onClick={() => ui.cancel(b.id)} variant="destructive">
                  {ds === "held" ? "Release hold" : "Cancel"}
                </MenuItem>
              </>
            )}
          </MenuPopup>
        </Menu>
      </TableCell>
    </TableRow>
  );
}
