"use client";

import { BanknoteIcon, CirclePauseIcon, CirclePlayIcon, ClockPlusIcon, RefreshCwIcon, Undo2Icon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import { dayOf, LOCALE } from "@/app/format";
import { hrefFor } from "@/app/router";
import { AddHoursForm, DialogShell, type MemberDialog, PayForm, RefundForm, RenewForm } from "@/app/screens/people/member-dialogs";
import { effectiveStatus, expiryLine } from "@/app/screens/people/members-model";
import { HoursMeter } from "@/app/screens/people/people-parts";
import { cantSay, useViewer } from "@/app/screens/programmes/hooks";
import { Gated } from "@/app/screens/programmes/kit";
import { LoadFailed } from "@/app/screens/screen-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer, DrawerDescription, DrawerFooter, DrawerHeader, DrawerPanel, DrawerPopup, DrawerTitle } from "@/components/ui/drawer";
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toastManager } from "@/components/ui/toast";
import { errorMessage } from "@/data/errors";
import { ledgerPaid, membershipDue } from "@/data/money";
import { useRead, useWrite } from "@/data/provider";
import type { LedgerEntry } from "@/data/types";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatInr } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import type { PlainDate } from "@/lib/plain-date";
import { VENUE } from "@/lib/venue";
import { cn } from "@/lib/utils";

const LEDGER_LABEL: Record<LedgerEntry["kind"], string> = {
  online: "Paid online",
  cash: "Cash",
  "credit-applied": "Credit used",
  refund: "Refunded",
  "credit-issued": "Became credit",
};

interface Parts {
  Header: React.ComponentType<{ children: React.ReactNode }>;
  Title: React.ComponentType<{ children: React.ReactNode }>;
  Description: React.ComponentType<{ children: React.ReactNode }>;
  Panel: React.ComponentType<{ children: React.ReactNode; className?: string }>;
  Footer: React.ComponentType<{ children: React.ReactNode; className?: string }>;
}
const SHEET_PARTS: Parts = { Header: SheetHeader, Title: SheetTitle, Description: SheetDescription, Panel: SheetPanel, Footer: SheetFooter };
const DRAWER_PARTS: Parts = { Header: DrawerHeader, Title: DrawerTitle, Description: DrawerDescription, Panel: DrawerPanel, Footer: DrawerFooter };

/**
 * A member's panel, as the desk's booking panel: a coss Sheet on a laptop and
 * a Drawer on a phone, opened from the URL (`?open=<id>`), so a link to a
 * member works and Back closes it. The actions' dialogs open inside it, so
 * focus comes back to the button that opened them.
 */
export function MemberSheet({ id, onClose, today }: { id: string | null; onClose: () => void; today: PlainDate }): React.ReactElement {
  const phone = useMediaQuery("max-md");
  const [last, setLast] = React.useState(id);
  if (id && id !== last) setLast(id);
  const shown = id ?? last;
  const body = shown ? <Body id={shown} parts={phone ? DRAWER_PARTS : SHEET_PARTS} today={today} /> : null;
  const onOpenChange = (open: boolean): void => {
    if (!open) onClose();
  };
  if (phone) {
    return (
      <Drawer onOpenChange={onOpenChange} open={Boolean(id)}>
        <DrawerPopup showBar>{body}</DrawerPopup>
      </Drawer>
    );
  }
  return (
    <Sheet onOpenChange={onOpenChange} open={Boolean(id)}>
      <SheetPopup>{body}</SheetPopup>
    </Sheet>
  );
}

function Body({ id, parts: P, today }: { id: string; parts: Parts; today: PlainDate }): React.ReactElement {
  const viewer = useViewer();
  const read = useRead(["membership", id], (c) => c.memberships.get(id));
  const plans = useRead(["memberships"], (c) => c.memberships.list());
  const [dialog, setDialog] = React.useState<MemberDialog | null>(null);
  const paused = useWrite((c, value: boolean) => c.memberships.setPaused(id, value));

  if (read.isPending) {
    return (
      <>
        <P.Header>
          <P.Title>Member</P.Title>
          <P.Description>Loading…</P.Description>
        </P.Header>
        <P.Panel className="flex flex-col gap-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
        </P.Panel>
      </>
    );
  }
  if (read.isError) {
    return (
      <>
        <P.Header>
          <P.Title>Member</P.Title>
          <P.Description>Couldn't open this membership.</P.Description>
        </P.Header>
        <P.Panel>
          <LoadFailed error={read.error} onRetry={() => void read.refetch()} what="this membership" />
        </P.Panel>
      </>
    );
  }

  const { membership: m, plan, customer, activity } = read.data;
  const status = effectiveStatus(m, today);
  const due = membershipDue(m);
  const paid = Math.max(0, ledgerPaid(m.ledger));
  const money = viewer?.can.handleMoney ?? false;
  const change = viewer?.can.writeBookings ?? false;
  const refund = viewer?.can.refund ?? false;
  const close = (): void => setDialog(null);

  const togglePause = async (value: boolean): Promise<void> => {
    try {
      await paused.mutateAsync(value);
      toastManager.add({
        title: value ? `${customer.name}'s membership paused` : `${customer.name}'s membership resumed`,
        description: value ? "Their hours can't be used until it resumes." : undefined,
        type: "success",
        actionProps: { children: "Undo", onClick: () => void paused.mutateAsync(!value) },
      });
    } catch (error) {
      toastManager.add({ title: "Couldn't change the membership", description: errorMessage(error), type: "error" });
    }
  };

  return (
    <>
      <P.Header>
        <div className="flex items-center gap-2">
          <Badge variant={status === "active" ? "success" : status === "paused" ? "info" : "secondary"}>{status === "active" ? "Active" : status === "paused" ? "Paused" : "Expired"}</Badge>
          {due > 0 && <Badge variant="warning">Owes {formatInr(due)}</Badge>}
        </div>
        <P.Title>{customer.name}</P.Title>
        <P.Description>
          {plan.name} · {formatPhone(customer.phone)}
        </P.Description>
      </P.Header>
      <P.Panel className="flex flex-col gap-5">
        <HoursMeter m={m} />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Started</dt>
          <dd>{dayOf(m.startsOn)}</dd>
          <dt className="text-muted-foreground">Expires</dt>
          <dd>{expiryLine(m, today).text}</dd>
          <dt className="text-muted-foreground">Last on court</dt>
          <dd>{m.lastVisitOn ? dayOf(m.lastVisitOn) : "Not yet"}</dd>
          <dt className="text-muted-foreground">Customer</dt>
          <dd>
            <Anchor className="underline underline-offset-4" href={hrefFor(`/desk/customers/${customer.id}`)}>
              Open {customer.name.split(" ")[0]}'s page
            </Anchor>
          </dd>
        </dl>

        <section aria-labelledby="member-money" className="flex flex-col gap-2">
          <h3 className="font-medium text-sm" id="member-money">
            Money
          </h3>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <MoneyCell label="Price" value={m.pricePaise} />
            <MoneyCell label="Paid" value={paid} />
            <MoneyCell emphasis={due > 0} label="Due" value={due} />
          </dl>
          {m.ledger.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nothing paid yet.</p>
          ) : (
            <Table>
              <TableCaption className="sr-only">Payments on this membership</TableCaption>
              <TableHeader className="sr-only">
                <TableRow>
                  <TableHead>What</TableHead>
                  <TableHead className="text-end">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {m.ledger.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-normal">
                      <span className="flex flex-col">
                        <span>{LEDGER_LABEL[e.kind]}</span>
                        <span className="text-muted-foreground text-xs">
                          {new Intl.DateTimeFormat(LOCALE, { timeZone: VENUE.timeZone, day: "numeric", month: "short" }).format(e.at)} · {e.note}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className={cn("text-end tabular-nums", e.kind === "refund" && "text-destructive-foreground")}>
                      {e.kind === "refund" ? "−" : ""}
                      {formatInr(e.amountPaise)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <section aria-labelledby="member-activity" className="flex flex-col gap-2">
          <h3 className="font-medium text-sm" id="member-activity">
            Activity
          </h3>
          {activity.length === 0 ? (
            <p className="text-muted-foreground text-sm">No changes since it was sold.</p>
          ) : (
            <ol className="flex flex-col gap-2 text-sm">
              {activity.map((a) => (
                <li className="flex flex-col" key={a.id}>
                  <span>{a.text}</span>
                  <span className="text-muted-foreground text-xs">
                    {a.actor} · {new Intl.DateTimeFormat(LOCALE, { timeZone: VENUE.timeZone, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(a.at)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </P.Panel>
      <P.Footer className="flex-wrap">
        {due > 0 && (
          <Gated allowed={money} reason={cantSay(viewer, "take or record money")}>
            <Button onClick={() => setDialog("pay")}>
              <BanknoteIcon aria-hidden="true" />
              Take payment
            </Button>
          </Gated>
        )}
        <Gated allowed={money} reason={cantSay(viewer, "take or record money")}>
          <Button onClick={() => setDialog("renew")} variant={due > 0 ? "outline" : "default"}>
            <RefreshCwIcon aria-hidden="true" />
            Renew
          </Button>
        </Gated>
        <Gated allowed={money} reason={cantSay(viewer, "take or record money")}>
          <Button onClick={() => setDialog("hours")} variant="outline">
            <ClockPlusIcon aria-hidden="true" />
            Add hours
          </Button>
        </Gated>
        {status !== "expired" && (
          <Gated allowed={change} reason={cantSay(viewer, "change memberships")}>
            <Button loading={paused.isPending} onClick={() => void togglePause(status === "active")} variant="outline">
              {status === "active" ? <CirclePauseIcon aria-hidden="true" /> : <CirclePlayIcon aria-hidden="true" />}
              {status === "active" ? "Pause" : "Resume"}
            </Button>
          </Gated>
        )}
        {paid > 0 && (
          <Gated allowed={refund} reason={cantSay(viewer, "refund or give credit")}>
            <Button className="sm:ms-auto" onClick={() => setDialog("refund")} variant="destructive-outline">
              <Undo2Icon aria-hidden="true" />
              Refund
            </Button>
          </Gated>
        )}
      </P.Footer>

      <DialogShell onClose={close} open={dialog === "pay"}>
        <PayForm membership={m} name={customer.name} onClose={close} />
      </DialogShell>
      <DialogShell onClose={close} open={dialog === "renew"}>
        <RenewForm membership={m} name={customer.name} onClose={close} plans={plans.data?.plans ?? [plan]} />
      </DialogShell>
      <DialogShell onClose={close} open={dialog === "hours"}>
        <AddHoursForm membership={m} name={customer.name} onClose={close} plan={plan} />
      </DialogShell>
      <DialogShell onClose={close} open={dialog === "refund"}>
        <RefundForm membership={m} name={customer.name} onClose={close} />
      </DialogShell>
    </>
  );
}

function MoneyCell({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }): React.ReactElement {
  return (
    <Card className="rounded-xl px-2 py-2 shadow-none before:hidden">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={cn("font-semibold tabular-nums", emphasis && "text-warning-foreground")}>{formatInr(value)}</dd>
    </Card>
  );
}
