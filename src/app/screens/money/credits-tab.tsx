"use client";

import { WalletIcon } from "lucide-react";
import * as React from "react";
import { dayOf } from "@/app/format";
import type { Route } from "@/app/router";
import { AdjustCreditDialog, type AdjustCreditTarget } from "@/app/screens/money/adjust-credit-dialog";
import { creditDelta, creditVerb, customerName, dayOfInstant } from "@/app/screens/money/money-model";
import { setQuery, useViewer } from "@/app/screens/money/money-hooks";
import { SubjectLink } from "@/app/screens/money/money-ui";
import { ListSkeleton, LoadFailed } from "@/app/screens/screen-kit";
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Frame, FramePanel } from "@/components/ui/frame";
import { useRead } from "@/data/provider";
import type { CreditLine, Customer, Viewer } from "@/data/types";
import { formatInr } from "@/lib/money";
import type { PlainDate } from "@/lib/plain-date";

export const CREDIT_REASON = "Only an admin or a manager can add or pay out credit.";

/**
 * Credit the venue holds for customers: the balance, and every line that
 * moved it (a cancellation kept as credit, credit used on a booking, a hand
 * adjustment). Adjusting is for roles that may refund. `?adjust=cus_14`
 * (or `largest`) opens the dialog for one customer; `&payout=5000` starts it
 * as a payout of ₹5,000.
 */
export function CreditsTab({ route }: { route: Route; today: PlainDate }): React.ReactElement {
  const viewer = useViewer();
  const read = useRead(["money", "credits"], (c) => c.money.credits());
  const [adjusting, setAdjusting] = React.useState<AdjustCreditTarget | null>(null);
  const canAdjust = viewer.data?.can.refund ?? false;

  if (read.isPending) return <ListSkeleton label="Loading credits" rows={5} />;
  if (read.isError) return <LoadFailed error={read.error} onRetry={() => void read.refetch()} what="credits" />;

  const { credits, customers } = read.data;
  const targetFor = (line: CreditLine): AdjustCreditTarget => ({ customerId: line.customerId, name: customerName(customers, line.customerId), creditPaise: line.creditPaise });
  const asked = route.query.get("adjust");
  // "largest": whoever holds the most (the demo's link, which can't know the seed's ids for every day).
  const askedLine = !asked || !canAdjust ? undefined : asked === "largest" ? credits.find((c) => c.creditPaise > 0) : credits.find((c) => c.customerId === asked);
  const payout = Number(route.query.get("payout") ?? "");
  const target = adjusting ?? (askedLine ? { ...targetFor(askedLine), start: Number.isFinite(payout) && payout > 0 ? { mode: "payout" as const, rupees: payout } : undefined } : null);

  const close = (): void => {
    setAdjusting(null);
    if (asked) setQuery(route, { adjust: null, payout: null });
  };

  if (credits.length === 0) {
    return (
      <Empty className="rounded-2xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WalletIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No one holds credit</EmptyTitle>
          <EmptyDescription>When a cancelled booking's money is kept as credit, the customer shows up here with their balance.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  const total = credits.reduce((sum, c) => sum + c.creditPaise, 0);

  return (
    <div className="flex flex-col gap-4">
      <p aria-live="polite" className="text-muted-foreground text-sm">
        <span className="font-medium text-foreground tabular-nums">{formatInr(total)}</span> held for {credits.filter((c) => c.creditPaise > 0).length} customers. It comes off their next booking.
      </p>
      {viewer.data && !canAdjust && <p className="text-muted-foreground text-sm">{CREDIT_REASON}</p>}
      <Frame>
        <FramePanel className="px-4 py-0">
          <Accordion multiple>
            {credits.map((line) => (
              <CreditItem customers={customers} key={line.customerId} line={line} onAdjust={() => setAdjusting(targetFor(line))} viewer={viewer.data} />
            ))}
          </Accordion>
        </FramePanel>
      </Frame>
      <AdjustCreditDialog onClose={close} target={target} />
    </div>
  );
}

function CreditItem({ line, customers, viewer, onAdjust }: { line: CreditLine; customers: readonly Customer[]; viewer: Viewer | undefined; onAdjust: () => void }): React.ReactElement {
  const name = customerName(customers, line.customerId);
  const last = line.history[0];
  return (
    <AccordionItem value={line.customerId}>
      <AccordionTrigger className="items-center hover:no-underline">
        <span className="grid min-w-0 flex-1 grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-0.5 sm:grid-cols-[minmax(0,1fr)_auto_7rem]">
          <span className="min-w-0 truncate">{name}</span>
          <span className="font-normal text-muted-foreground text-xs max-sm:col-start-1 max-sm:row-start-2 sm:whitespace-nowrap sm:text-sm">
            {line.history.length} {line.history.length === 1 ? "change" : "changes"}
            {last ? ` · last ${dayOf(dayOfInstant(last.at))}` : ""}
          </span>
          <span className="text-end tabular-nums max-sm:row-span-2 max-sm:self-center">{formatInr(line.creditPaise)}</span>
        </span>
      </AccordionTrigger>
      <AccordionPanel className="flex flex-col gap-3">
        <ul aria-label={`Where ${name}'s credit came from`} className="flex flex-col divide-y rounded-lg border text-foreground">
          {line.history.map((p) => {
            const delta = creditDelta(p);
            return (
              <li className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-3 py-2.5" key={p.id}>
                <span className="w-24 shrink-0 text-muted-foreground text-xs">{dayOf(dayOfInstant(p.at))}</span>
                <span className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
                  <SubjectLink className="text-sm" subject={p.subject} />
                  {p.note && <span className="text-muted-foreground text-xs">{p.note}</span>}
                </span>
                <span className="text-end text-sm tabular-nums">
                  <span className="text-muted-foreground text-xs">{creditVerb(p)} </span>
                  {delta < 0 ? "−" : "+"}
                  {formatInr(Math.abs(delta))}
                </span>
              </li>
            );
          })}
        </ul>
        <Button className="self-start" disabled={!(viewer?.can.refund ?? false)} onClick={onAdjust} size="sm" variant="outline">
          Adjust credit
        </Button>
      </AccordionPanel>
    </AccordionItem>
  );
}
