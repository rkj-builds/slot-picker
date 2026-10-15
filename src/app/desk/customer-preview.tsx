"use client";

import { HandCoinsIcon } from "lucide-react";
import type * as React from "react";
import { dayOf, initialsOf } from "@/app/format";
import { useStore } from "@/app/store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PreviewCard, PreviewCardPopup, PreviewCardTrigger } from "@/components/ui/preview-card";
import { Separator } from "@/components/ui/separator";
import { customerHistory } from "@/app/desk/desk-model";
import type { Customer } from "@/lib/booking";
import { formatInr } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

/**
 * Hover (or focus) a customer's name on the desk to see their record without
 * leaving the list: coss PreviewCard (particle p-preview-card-1), with the
 * name itself a coss link Button that opens the booking.
 */
export function CustomerPreview({
  customer,
  onClick,
  children,
}: {
  customer: Customer;
  onClick: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  const { state } = useStore();
  const h = customerHistory(customer, state.bookings);
  const rows: [string, string][] = [
    ["Bookings", String(h.bookings)],
    ["Paid ahead online", String(h.paidAhead)],
    ["Nothing paid", String(h.unpaid)],
    ["No-shows", String(h.noShows)],
    ["Cancelled", String(h.cancelled)],
  ];
  return (
    <PreviewCard>
      <PreviewCardTrigger
        delay={300}
        render={<Button className="h-auto px-0 py-0 font-medium sm:h-auto" onClick={onClick} size="sm" variant="link" />}
      >
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
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
            {rows.map(([term, value]) => (
              <div className="contents" key={term}>
                <dt className="text-muted-foreground">{term}</dt>
                <dd className="text-end tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-muted-foreground text-xs">{h.last ? `Last on court ${dayOf(h.last.date)}.` : "No bookings yet."}</p>
        </div>
      </PreviewCardPopup>
    </PreviewCard>
  );
}
