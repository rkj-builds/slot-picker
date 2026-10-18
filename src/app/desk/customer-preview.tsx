"use client";

import { HandCoinsIcon } from "lucide-react";
import type * as React from "react";
import { Anchor } from "@/app/anchor";
import { dayOf, initialsOf } from "@/app/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PreviewCard, PreviewCardPopup, PreviewCardTrigger } from "@/components/ui/preview-card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { customerHistory } from "@/app/desk/desk-model";
import { useRead } from "@/data/provider";
import type { Customer } from "@/lib/booking";
import type { PlainDate } from "@/lib/plain-date";
import { formatInr } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

/**
 * Hover (or focus) a customer's name on the desk to see their record without
 * leaving the list: coss PreviewCard (particle p-preview-card-1), with the
 * name itself a link to the booking. Their history is read when the card
 * first opens, through the data client.
 */
export function CustomerPreview({
  customer,
  today,
  href,
  children,
}: {
  customer: Customer;
  /** The venue's today, which splits "last time" from "next time". */
  today: PlainDate;
  /** Where the name goes: the booking's page. */
  href: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <PreviewCard>
      <PreviewCardTrigger delay={300} render={<Button className="h-auto px-0 py-0 font-medium sm:h-auto" render={<Anchor href={href} />} size="sm" variant="link" />}>
        {children}
      </PreviewCardTrigger>
      <PreviewCardPopup align="start" className="w-72" data-slot="customer-preview">
        <div className="flex w-full flex-col gap-3">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{initialsOf(customer.name)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{customer.name}</span>
              <span className="text-muted-foreground text-xs tabular-nums">{formatPhone(customer.phone)}</span>
            </div>
          </div>
          {(customer.payFirst || customer.creditPaise > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {customer.payFirst && (
                <Badge variant="warning">
                  <HandCoinsIcon aria-hidden="true" />
                  Pays first
                </Badge>
              )}
              {customer.creditPaise > 0 && <Badge variant="info">{formatInr(customer.creditPaise)} credit</Badge>}
            </div>
          )}
          <Separator />
          <History customer={customer} today={today} />
        </div>
      </PreviewCardPopup>
    </PreviewCard>
  );
}

function History({ customer, today }: { customer: Customer; today: PlainDate }): React.ReactElement {
  const record = useRead(["customer", customer.id], (c) => c.customers.get(customer.id));
  if (record.status === "pending") {
    return (
      <div aria-busy="true" className="flex flex-col gap-1.5" role="status">
        <span className="sr-only">Loading their history</span>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton className="h-4" key={i} />
        ))}
      </div>
    );
  }
  if (record.status === "error") return <p className="text-muted-foreground text-sm">Their history couldn't load.</p>;
  const h = customerHistory(customer, record.data.bookings, today);
  const rows: [string, string][] = [
    ["Bookings", String(h.bookings)],
    ["Paid ahead online", String(h.paidAhead)],
    ["Nothing paid", String(h.unpaid)],
    ["No-shows", String(h.noShows)],
    ["Cancelled", String(h.cancelled)],
  ];
  return (
    <>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
        {rows.map(([term, value]) => (
          <div className="contents" key={term}>
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="text-end tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground text-xs">
        {[h.last ? `Last played ${dayOf(h.last.date)}` : "First time here", h.next ? `next booked ${dayOf(h.next.date)}` : null].filter(Boolean).join(", ")}.
      </p>
    </>
  );
}
