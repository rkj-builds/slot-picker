"use client";

import { ContactIcon, SearchIcon, SearchXIcon } from "lucide-react";
import type * as React from "react";
import { Anchor } from "@/app/anchor";
import type { ScreenProps } from "@/app/desk/sections";
import { sectionById } from "@/app/desk/sections";
import { dayOf } from "@/app/format";
import { hrefFor, navigate, type Route } from "@/app/router";
import { CustomerPage } from "@/app/screens/people/customer-page";
import { CustomerTags } from "@/app/screens/people/people-parts";
import { useLastDefined } from "@/app/screens/programmes/hooks";
import { LinkTabs } from "@/app/screens/programmes/kit";
import { ListSkeleton, LoadFailed, PageHeader, Screen } from "@/app/screens/screen-kit";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Frame } from "@/components/ui/frame";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRead } from "@/data/provider";
import type { CustomerFilter, CustomerSummary } from "@/data/types";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatInr } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

const FILTERS: { id: CustomerFilter; label: string; empty: string }[] = [
  { id: "all", label: "All", empty: "Everyone who books, enrols or messages shows up here." },
  { id: "customers", label: "Customers", empty: "Nobody has booked or enrolled yet." },
  { id: "leads", label: "Leads", empty: "No leads: everyone here has booked or enrolled." },
  { id: "pay-first", label: "Pay first", empty: "Nobody has to pay before a court is held for them." },
  { id: "credit", label: "With credit", empty: "Nobody has credit waiting." },
];
const ALL = { id: "all" as const, label: "All", empty: "" };

/**
 * Customers: `#/desk/customers` the list (`?show=`, `?q=`), `#/desk/customers/<id>`
 * one customer. A page rather than a side sheet: a customer has three lists of
 * their own (bookings, enrolments, memberships), the page can be linked from
 * a booking, an enrolment or a member, and Back returns to the list as it was.
 */
export function CustomersScreen({ route, sub, now }: ScreenProps): React.ReactElement {
  if (sub[0]) return <CustomerPage id={sub[0]} key={sub[0]} now={now} />;
  return <CustomerList route={route} />;
}

function CustomerList({ route }: { route: Route }): React.ReactElement {
  const section = sectionById("customers");
  const filter = FILTERS.find((f) => f.id === route.query.get("show")) ?? ALL;
  const q = route.query.get("q") ?? "";
  const read = useRead(["customers", filter.id, q.trim()], (c) => c.customers.list({ filter: filter.id, q: q.trim() }));
  const rows = useLastDefined(read.data);
  const phone = useMediaQuery("max-md");
  const keep = (patch: Record<string, string | null>): void => navigate("/desk/customers", { show: filter.id === "all" ? null : filter.id, q: q || null, ...patch }, { replace: true });

  return (
    <Screen>
      <PageHeader description={section.line} title={section.label} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LinkTabs label="Show customers" tabs={FILTERS.map((f) => ({ href: hrefFor("/desk/customers", { show: f.id === "all" ? null : f.id, q: q || null }), label: f.label, current: f.id === filter.id }))} />
        <InputGroup className="w-full sm:w-64">
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput aria-label="Search customers" onChange={(e) => keep({ q: e.target.value || null })} placeholder="Name or phone" type="search" value={q} />
        </InputGroup>
      </div>
      {read.isError ? (
        <LoadFailed error={read.error} onRetry={() => void read.refetch()} what="customers" />
      ) : !rows ? (
        <ListSkeleton label="Loading customers" />
      ) : rows.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">{q ? <SearchXIcon aria-hidden="true" /> : <ContactIcon aria-hidden="true" />}</EmptyMedia>
            <EmptyTitle>{q ? `Nobody matches "${q}"` : filter.id === "all" ? "No customers yet" : `Nobody in ${filter.label}`}</EmptyTitle>
            <EmptyDescription>{q ? "Try part of the name, or three digits of the number." : filter.empty}</EmptyDescription>
          </EmptyHeader>
          {q && (
            <EmptyContent>
              <Button onClick={() => keep({ q: null })} variant="outline">
                Clear search
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <>
          <p aria-live="polite" className="-mb-2 text-muted-foreground text-sm">
            {rows.length} {rows.length === 1 ? "person" : "people"}
          </p>
          {phone ? <PhoneList rows={rows} /> : <DeskTable rows={rows} />}
        </>
      )}
    </Screen>
  );
}

function NameCell({ s }: { s: CustomerSummary }): React.ReactElement {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <Anchor className="font-medium underline-offset-4 hover:underline" href={hrefFor(`/desk/customers/${s.customer.id}`)}>
        {s.customer.name}
      </Anchor>
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground text-xs tabular-nums">{formatPhone(s.customer.phone)}</span>
        <CustomerTags summary={s} />
      </span>
    </span>
  );
}

function DeskTable({ rows }: { rows: readonly CustomerSummary[] }): React.ReactElement {
  return (
    <Frame>
      <Table aria-label="Customers" variant="card">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-end">Bookings</TableHead>
            <TableHead className="text-end">Spent</TableHead>
            <TableHead className="text-end">No-shows</TableHead>
            <TableHead>Last visit</TableHead>
            <TableHead className="text-end">Credit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s) => (
            <TableRow key={s.customer.id}>
              <TableCell>
                <NameCell s={s} />
              </TableCell>
              <TableCell className="text-end tabular-nums">{s.bookings}</TableCell>
              <TableCell className="text-end tabular-nums">{s.spentPaise > 0 ? formatInr(s.spentPaise) : "—"}</TableCell>
              <TableCell className={s.noShows > 0 ? "text-end text-warning-foreground tabular-nums" : "text-end tabular-nums"}>{s.noShows}</TableCell>
              <TableCell>{s.lastVisit ? dayOf(s.lastVisit) : <span className="text-muted-foreground">Never</span>}</TableCell>
              <TableCell className="text-end tabular-nums">{s.customer.creditPaise > 0 ? formatInr(s.customer.creditPaise) : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Frame>
  );
}

function PhoneList({ rows }: { rows: readonly CustomerSummary[] }): React.ReactElement {
  return (
    <Frame>
      <ul aria-label="Customers" className="flex flex-col divide-y rounded-xl border bg-card">
        {rows.map((s) => (
          <li className="flex flex-col gap-1.5 p-3" key={s.customer.id}>
            <NameCell s={s} />
            <p className="text-muted-foreground text-xs">
              {s.bookings} {s.bookings === 1 ? "booking" : "bookings"} · {formatInr(s.spentPaise)} spent
              {s.noShows > 0 ? ` · ${s.noShows} no-show${s.noShows === 1 ? "" : "s"}` : ""} · {s.lastVisit ? `last ${dayOf(s.lastVisit)}` : "never visited"}
              {s.customer.creditPaise > 0 ? ` · ${formatInr(s.customer.creditPaise)} credit` : ""}
            </p>
          </li>
        ))}
      </ul>
    </Frame>
  );
}
