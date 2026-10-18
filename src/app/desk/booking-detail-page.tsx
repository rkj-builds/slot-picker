"use client";

/**
 * One booking on its own page (#/desk/bookings/<id>), the way Cal.com shows a
 * booking's details: who, when and where in the header with its status and
 * payment, the actions beside it, then the details, the money line by line
 * and everything that happened to it. A link to it can be sent to a
 * colleague, and Back returns to the list.
 */
import { CalendarSearchIcon, EllipsisIcon, InfoIcon, PhoneIcon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import { ACTION_ICONS, ActionButton, paymentBadge, SpecBadge, statusBadge } from "@/app/desk/booking-action-ui";
import { clockTime, useBookingCommand } from "@/app/desk/booking-commands";
import { type BookingTarget, CancelBookingDialog, EditBookingDialog, RecordPaymentDialog } from "@/app/desk/booking-dialogs";
import { type BookingActionId, type BookingActionState, bookingActions } from "@/app/desk/booking-rules";
import { viewPath } from "@/app/desk/bookings-filters";
import { durationOf, LOCALE, longDayOf, timeRangeOf } from "@/app/format";
import { hrefFor } from "@/app/router";
import { LoadFailed, PageHeader, Screen } from "@/app/screens/screen-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { isDataError } from "@/data/errors";
import { useRead } from "@/data/provider";
import type { ActivityEntry, BookingDetail, Viewer } from "@/data/types";
import { type Booking, duePaise, type LedgerEntry, paidPaise } from "@/lib/booking";
import { formatInr } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { courtName, VENUE } from "@/lib/venue";
import { cn } from "@/lib/utils";

const LEDGER_LABEL: Record<LedgerEntry["kind"], string> = {
  online: "Paid online",
  cash: "Cash",
  "credit-applied": "Credit used",
  refund: "Refunded",
  "credit-issued": "Became credit",
};

/** "Thu, 15 Oct, 4:35 pm" */
function stamp(at: number): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: VENUE.timeZone, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(at);
}

function nameOf(detail: BookingDetail): string {
  const b = detail.booking;
  if (b.kind !== "booking") return b.title || (b.kind === "coaching" ? "Coaching" : "Blocked");
  return detail.customer?.name ?? (b.title || "Walk-in");
}

export function BookingDetailPage({ id, now }: { id: string; now: number }): React.ReactElement {
  const detail = useRead(["booking", id], (c) => c.bookings.get(id));
  const viewer = useRead(["viewer"], (c) => c.team.viewer());

  if (detail.status === "pending") return <DetailSkeleton />;
  if (detail.status === "error") {
    if (isDataError(detail.error) && detail.error.code === "not-found") return <NotFound />;
    return (
      <Screen>
        <PageHeader back={{ href: hrefFor(viewPath("upcoming")), label: "Bookings" }} title="Booking" />
        <LoadFailed error={detail.error} onRetry={() => void detail.refetch()} what="this booking" />
      </Screen>
    );
  }
  return <Loaded detail={detail.data} now={now} viewer={viewer.data ?? null} />;
}

type DialogKind = "pay" | "edit" | "cancel";

function Loaded({ detail, viewer, now }: { detail: BookingDetail; viewer: Viewer | null; now: number }): React.ReactElement {
  const { booking, customer, activity } = detail;
  const name = nameOf(detail);
  const target: BookingTarget = { booking, name };
  const [dialog, setDialog] = React.useState<DialogKind | null>(null);
  const command = useBookingCommand();
  const checkedIn = detail.checkedInAt !== null;
  // Actions wait for the viewer (already cached by the desk), so nothing is offered that the role can't do.
  const actions = viewer ? bookingActions({ booking, viewer, now, checkedIn, hasCustomer: customer !== null }) : [];
  const byId = (id: BookingActionId): BookingActionState | undefined => actions.find((a) => a.id === id);
  const status = statusBadge(booking, now, checkedIn);
  const payment = paymentBadge(booking);
  const roleLimited = viewer !== null && actions.some((a) => a.reason?.endsWith("Ask an admin."));

  const run = (id: BookingActionId): void => {
    if (id === "record-payment") setDialog("pay");
    else if (id === "edit") setDialog("edit");
    else if (id === "cancel") setDialog("cancel");
    else void command.run(id, target);
  };

  const pay = byId("record-payment");
  const checkIn = byId("check-in") ?? byId("undo-check-in");
  const remind = byId("send-reminder");
  const edit = byId("edit");
  const more = actions.filter((a) => a.group === "after" || a.group === "destructive");

  return (
    <Screen>
      <PageHeader
        actions={
          <>
            {checkIn && <ActionButton action={checkIn} loading={command.pending === checkIn.id} onRun={() => run(checkIn.id)} variant={checkIn.id === "check-in" && checkIn.enabled && duePaise(booking) === 0 ? "default" : "outline"} />}
            {pay && booking.kind === "booking" && <ActionButton action={pay} onRun={() => run("record-payment")} variant={pay.enabled ? "default" : "outline"} />}
            {remind && booking.kind === "booking" && <ActionButton action={remind} loading={command.pending === "send-reminder"} onRun={() => run("send-reminder")} variant="outline" />}
            {edit && <ActionButton action={edit} onRun={() => run("edit")} variant="outline" />}
            {more.length > 0 && <Menu>
              <MenuTrigger render={<Button aria-label="More actions" size="icon" variant="outline" />}>
                <EllipsisIcon aria-hidden="true" />
              </MenuTrigger>
              <MenuPopup align="end" className="w-64">
                {more.map((a, i) => {
                  const Icon = ACTION_ICONS[a.id];
                  return (
                    <React.Fragment key={a.id}>
                      {i > 0 && a.group !== more[i - 1]?.group && <MenuSeparator />}
                      <MenuItem className="items-start" disabled={!a.enabled} onClick={() => run(a.id)} variant={a.destructive ? "destructive" : "default"}>
                        <Icon aria-hidden="true" className="mt-0.5" />
                        <span className="flex min-w-0 flex-col">
                          <span>{a.label}</span>
                          {a.reason && <span className="whitespace-normal text-muted-foreground text-xs">{a.reason}</span>}
                        </span>
                      </MenuItem>
                    </React.Fragment>
                  );
                })}
              </MenuPopup>
            </Menu>}
          </>
        }
        back={{ href: hrefFor(viewPath("upcoming")), label: "Bookings" }}
        description={
          <>
            {longDayOf(booking.date)} · {timeRangeOf(booking)} · {courtName(booking.courtId)}
          </>
        }
        meta={
          <>
            <SpecBadge spec={status} />
            {payment && <SpecBadge spec={payment} />}
          </>
        }
        title={<span className={cn(booking.status === "cancelled" && "text-muted-foreground line-through decoration-1")}>{name}</span>}
      />

      {roleLimited && viewer && (
        <p className="-mt-2 flex items-center gap-1.5 text-muted-foreground text-sm">
          <InfoIcon aria-hidden="true" className="size-4 shrink-0" />
          Signed in as {viewer.name}. Some actions need a manager or an admin; each one says why.
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <DetailsCard detail={detail} />
          <ActivityCard activity={activity} />
        </div>
        {booking.kind === "booking" && <PaymentCard booking={booking} creditPaise={customer?.creditPaise ?? 0} />}
      </div>

      <RecordPaymentDialog onClose={() => setDialog(null)} target={dialog === "pay" ? target : null} />
      <EditBookingDialog onClose={() => setDialog(null)} target={dialog === "edit" ? target : null} viewer={viewer} />
      <CancelBookingDialog onClose={() => setDialog(null)} target={dialog === "cancel" ? target : null} />
    </Screen>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-4 gap-y-1 py-2.5 max-sm:grid-cols-1">
      <dt className="text-muted-foreground text-sm">{term}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

function DetailsCard({ detail }: { detail: BookingDetail }): React.ReactElement {
  const { booking: b, customer } = detail;
  const isBooking = b.kind === "booking";
  return (
    <Card>
      <CardHeader>
        <h2>
          <CardTitle render={<span className="block" />}>Details</CardTitle>
        </h2>
      </CardHeader>
      <CardPanel className="pt-0">
        <dl className="divide-y">
          {customer && (
            <Row term="Customer">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium">{customer.name}</span>
                <Button className="h-auto gap-1 p-0 font-normal text-muted-foreground tabular-nums sm:h-auto" render={<Anchor href={`tel:${customer.phone}`} />} size="xs" variant="link">
                  <PhoneIcon aria-hidden="true" />
                  {formatPhone(customer.phone)}
                </Button>
                {customer.payFirst && <Badge variant="warning">Pays first</Badge>}
                {customer.trusted && <Badge variant="secondary">Regular</Badge>}
              </span>
            </Row>
          )}
          <Row term="Court">{courtName(b.courtId)}</Row>
          <Row term="When">
            {longDayOf(b.date)}, {timeRangeOf(b)}
          </Row>
          <Row term="Length">{durationOf(b.durationMinutes)}</Row>
          {isBooking && <Row term="Players">{b.players}</Row>}
          <Row term="Booked">
            {b.source === "self-serve" ? "Online, by the customer" : "At the desk"} · {stamp(b.createdAt)}
          </Row>
          {detail.checkedInAt !== null && <Row term="Checked in">{clockTime(detail.checkedInAt)}</Row>}
          {isBooking && (
            <Row term="Reminder">
              {detail.lastReminderAt === null ? (
                <span className="text-muted-foreground">None sent yet</span>
              ) : (
                <>
                  Sent {stamp(detail.lastReminderAt)}
                  <span className="text-muted-foreground"> · one an hour at most</span>
                </>
              )}
            </Row>
          )}
          {b.cancelledAt !== null && <Row term="Cancelled">{stamp(b.cancelledAt)}</Row>}
          <Row term="Notes">{b.notes ? <span className="whitespace-pre-line text-pretty">{b.notes}</span> : <span className="text-muted-foreground">None</span>}</Row>
        </dl>
      </CardPanel>
    </Card>
  );
}

function PaymentCard({ booking, creditPaise }: { booking: Booking; creditPaise: number }): React.ReactElement {
  const paid = Math.max(0, paidPaise(booking));
  const due = duePaise(booking);
  return (
    <Card>
      <CardHeader>
        <h2>
          <CardTitle render={<span className="block" />}>Payment</CardTitle>
        </h2>
        {creditPaise > 0 && <CardDescription>The customer has {formatInr(creditPaise)} in credit.</CardDescription>}
      </CardHeader>
      <CardPanel className="flex flex-col gap-4 pt-0">
        <dl className="grid grid-cols-3 gap-2">
          {[
            ["Price", booking.pricePaise, false],
            ["Paid", paid, false],
            ["Balance", due, due > 0],
          ].map(([label, value, emphasis]) => (
            <div className="flex flex-col gap-0.5 rounded-lg bg-muted/64 px-3 py-2" key={label as string}>
              <dt className="text-muted-foreground text-xs">{label as string}</dt>
              <dd className={cn("font-semibold tabular-nums", emphasis && "text-warning-foreground")}>{formatInr(value as number)}</dd>
            </div>
          ))}
        </dl>
        <Separator />
        {booking.ledger.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing paid yet.</p>
        ) : (
          <ul aria-label="Payment lines" className="flex flex-col gap-3">
            {booking.ledger.map((e) => (
              <li className="flex items-start justify-between gap-3 text-sm" key={e.id}>
                <span className="flex min-w-0 flex-col">
                  <span>{LEDGER_LABEL[e.kind]}</span>
                  <span className="text-muted-foreground text-xs">
                    {stamp(e.at)} · {e.note}
                  </span>
                </span>
                <span className={cn("shrink-0 tabular-nums", e.kind === "refund" && "text-destructive-foreground", e.kind === "credit-issued" && "text-muted-foreground")}>
                  {e.kind === "refund" ? "−" : ""}
                  {formatInr(e.amountPaise)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardPanel>
    </Card>
  );
}

function ActivityCard({ activity }: { activity: readonly ActivityEntry[] }): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <h2>
          <CardTitle render={<span className="block" />}>Activity</CardTitle>
        </h2>
        <CardDescription>Newest first.</CardDescription>
      </CardHeader>
      <CardPanel className="pt-0">
        {activity.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing has happened to this booking yet.</p>
        ) : (
          <ol aria-label="Activity" className="relative flex flex-col gap-4 ps-5 before:absolute before:start-1.5 before:top-1.5 before:bottom-1.5 before:w-px before:bg-border">
            {activity.map((a) => (
              <li className="relative flex flex-col gap-0.5 text-sm" key={a.id}>
                <span aria-hidden="true" className="absolute -start-5 top-1.5 size-3 rounded-full border-2 border-background bg-muted-foreground/48" />
                <span>{a.text}</span>
                <span className="text-muted-foreground text-xs">
                  {a.actor} · <time dateTime={new Date(a.at).toISOString()}>{stamp(a.at)}</time>
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardPanel>
    </Card>
  );
}

function NotFound(): React.ReactElement {
  return (
    <Screen>
      <PageHeader back={{ href: hrefFor(viewPath("upcoming")), label: "Bookings" }} title="Booking not found" />
      <Empty className="rounded-2xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarSearchIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>This booking isn't here</EmptyTitle>
          <EmptyDescription>It may have been removed, or the link is wrong. Search for it in Bookings.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Anchor href={hrefFor(viewPath("upcoming"))} />} variant="outline">
            Go to bookings
          </Button>
        </EmptyContent>
      </Empty>
    </Screen>
  );
}

/** Shaped like the page: header, actions, two cards beside the payment card. */
function DetailSkeleton(): React.ReactElement {
  return (
    <div aria-busy="true" className="flex flex-col gap-6" role="status">
      <span className="sr-only">Loading the booking</span>
      <Skeleton className="h-7 w-24" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    </div>
  );
}
