"use client";

import { BellIcon, CalendarIcon, CircleCheckBigIcon, IdCardIcon, ShapesIcon, WalletIcon } from "lucide-react";
import * as React from "react";
import { dayOf, LOCALE } from "@/app/format";
import type { Route } from "@/app/router";
import { type CustomerDues, daysBetween, type DuesSort, groupDues } from "@/app/screens/money/money-model";
import { setQuery, useViewer } from "@/app/screens/money/money-hooks";
import { SubjectLink } from "@/app/screens/money/money-ui";
import { TakePaymentDialog, type TakePaymentTarget } from "@/app/screens/money/take-payment-dialog";
import { ListSkeleton, LoadFailed } from "@/app/screens/screen-kit";
import { SegmentedControl, SegmentedControlItem } from "@/components/compositions/segmented-control";
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Frame, FramePanel } from "@/components/ui/frame";
import { toastManager } from "@/components/ui/toast";
import { errorMessage, isDataError } from "@/data/errors";
import { useRead, useWrite } from "@/data/provider";
import type { Due, Viewer } from "@/data/types";
import { formatTime } from "@/lib/format";
import { formatInr } from "@/lib/money";
import type { PlainDate } from "@/lib/plain-date";
import { VENUE } from "@/lib/venue";

const TYPE: Record<Due["subject"]["type"], { label: string; icon: React.ComponentType<{ "aria-hidden"?: "true"; className?: string }> }> = {
  booking: { label: "Booking", icon: CalendarIcon },
  enrolment: { label: "Programme", icon: ShapesIcon },
  membership: { label: "Membership", icon: IdCardIcon },
  credit: { label: "Credit", icon: WalletIcon },
};

/** "Owed since Fri, 4 Sept · 44 days", or "Due today". */
function owedSince(prefix: string, since: PlainDate, today: PlainDate): string {
  const days = daysBetween(since, today);
  if (days <= 0) return "Due today";
  return `${prefix} since ${dayOf(since)} · ${days === 1 ? "1 day" : `${days} days`}`;
}

/**
 * Everything still owed, by the person who owes it: open a customer to see
 * each booking, enrolment or membership and take the money for it (the
 * dialog calls whichever API owns that item), or nudge them about a court
 * booking. `?open=cus_12` opens one customer (`?open=mixed`: the first who owes
 * in more than one place); `?sort=age` puts the oldest first.
 */
export function DuesTab({ route, today }: { route: Route; today: PlainDate }): React.ReactElement {
  const viewer = useViewer();
  const read = useRead(["money", "dues"], (c) => c.money.dues());
  const sort: DuesSort = route.query.get("sort") === "age" ? "age" : "amount";
  const [open, setOpen] = React.useState<string[] | null>(null);
  const [paying, setPaying] = React.useState<TakePaymentTarget | null>(null);

  if (read.isPending) return <ListSkeleton label="Loading dues" rows={6} />;
  if (read.isError) return <LoadFailed error={read.error} onRetry={() => void read.refetch()} what="dues" />;

  const groups = groupDues(read.data.dues, read.data.customers, sort);
  if (groups.length === 0) {
    return (
      <Empty className="rounded-2xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleCheckBigIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Nobody owes anything</EmptyTitle>
          <EmptyDescription>Every booking, enrolment and membership is paid up. A balance shows up here the day it falls due.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  const total = groups.reduce((sum, g) => sum + g.totalPaise, 0);
  // Until someone opens or closes a customer, `?open=` decides: an id, or "mixed" for the first
  // customer who owes in more than one place (the demo's link, which can't know each day's seed).
  const asked = route.query.get("open");
  const kinds = (g: CustomerDues): Set<string> => new Set(g.items.map((d) => d.subject.type));
  const mixed =
    groups.find((g) => kinds(g).has("booking") && kinds(g).has("enrolment")) ?? groups.find((g) => kinds(g).size > 1) ?? groups.find((g) => g.items.length > 1);
  const expanded = open ?? (asked === "mixed" ? (mixed ? [mixed.customerId ?? "none"] : []) : asked ? [asked] : []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-muted-foreground text-sm">
          {groups.length} {groups.length === 1 ? "customer owes" : "customers owe"} <span className="font-medium text-foreground tabular-nums">{formatInr(total)}</span>
        </p>
        <SegmentedControl<DuesSort> aria-label="Sort" onValueChange={(value) => setQuery(route, { sort: value === "age" ? "age" : null })} size="sm" value={sort}>
          <SegmentedControlItem<DuesSort> value="amount">Largest first</SegmentedControlItem>
          <SegmentedControlItem<DuesSort> value="age">Oldest first</SegmentedControlItem>
        </SegmentedControl>
      </div>
      {viewer.data && !viewer.data.can.handleMoney && (
        <p className="text-muted-foreground text-sm">Your role can see what's owed but can't take payments. Ask an admin to add Payments to your role.</p>
      )}
      <Frame>
        <FramePanel className="px-4 py-0">
          <Accordion multiple onValueChange={(value) => setOpen(value as string[])} value={expanded}>
            {groups.map((group) => (
              <CustomerItem group={group} key={group.customerId ?? "none"} onPay={setPaying} today={today} viewer={viewer.data} />
            ))}
          </Accordion>
        </FramePanel>
      </Frame>
      <TakePaymentDialog onClose={() => setPaying(null)} target={paying} />
    </div>
  );
}

function CustomerItem({ group, today, viewer, onPay }: { group: CustomerDues; today: PlainDate; viewer: Viewer | undefined; onPay: (target: TakePaymentTarget) => void }): React.ReactElement {
  return (
    <AccordionItem value={group.customerId ?? "none"}>
      <AccordionTrigger className="items-center hover:no-underline">
        <span className="grid min-w-0 flex-1 grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-0.5 sm:grid-cols-[minmax(0,1fr)_auto_7rem]">
          <span className="min-w-0 truncate">
            {group.name}
            <span className="ms-2 font-normal text-muted-foreground text-xs">
              {group.items.length} {group.items.length === 1 ? "item" : "items"}
            </span>
          </span>
          <span className="font-normal text-muted-foreground text-xs max-sm:col-start-1 max-sm:row-start-2 sm:whitespace-nowrap sm:text-sm">
            {owedSince("Owed", group.since, today)}
          </span>
          <span className="text-end tabular-nums max-sm:row-span-2 max-sm:self-center">{formatInr(group.totalPaise)}</span>
        </span>
      </AccordionTrigger>
      <AccordionPanel>
        <ul aria-label={`What ${group.name} owes`} className="flex flex-col divide-y rounded-lg border">
          {group.items.map((due) => (
            <DueRow due={due} key={`${due.subject.type}:${due.subject.id}`} name={group.name} onPay={onPay} today={today} viewer={viewer} />
          ))}
        </ul>
      </AccordionPanel>
    </AccordionItem>
  );
}

function DueRow({ due, name, today, viewer, onPay }: { due: Due; name: string; today: PlainDate; viewer: Viewer | undefined; onPay: (target: TakePaymentTarget) => void }): React.ReactElement {
  const remind = useWrite((c, id: string) => c.bookings.sendReminder(id));
  const type = TYPE[due.subject.type];
  const Icon = type.icon;
  const canPay = viewer?.can.handleMoney ?? false;
  const canRemind = Boolean(due.customerId) && (viewer?.can.writeBookings ?? false);

  const sendReminder = async (): Promise<void> => {
    try {
      await remind.mutateAsync(due.subject.id);
      toastManager.add({ title: `Reminder sent to ${name}`, description: `WhatsApp · ${formatInr(due.duePaise)} for ${due.subject.label}`, type: "success" });
    } catch (error) {
      const again = isDataError(error) && error.retryAt ? ` You can send another at ${formatTime(error.retryAt, { locale: LOCALE, timeZone: VENUE.timeZone })}.` : "";
      toastManager.add({ title: "Reminder not sent", description: `${errorMessage(error)}${again}`, type: "error" });
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 text-foreground">
      <span className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-2">
          <Badge variant="outline">
            <Icon aria-hidden="true" />
            {type.label}
          </Badge>
          <SubjectLink className="text-sm" subject={due.subject} />
        </span>
        <span className="text-muted-foreground text-xs">
          {owedSince("Due", due.since, today)}
        </span>
      </span>
      <span className="font-medium tabular-nums">{formatInr(due.duePaise)}</span>
      <span className="flex flex-wrap gap-2">
        {due.subject.type === "booking" && (
          <Button disabled={!canRemind} loading={remind.isPending} onClick={() => void sendReminder()} size="sm" variant="outline">
            <BellIcon aria-hidden="true" />
            Send reminder
          </Button>
        )}
        <Button
          aria-label={`Take payment for ${due.subject.label}`}
          disabled={!canPay}
          onClick={() => onPay({ due, name })}
          size="sm"
        >
          Take payment
        </Button>
      </span>
    </li>
  );
}
