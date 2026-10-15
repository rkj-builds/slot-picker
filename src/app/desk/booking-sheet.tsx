"use client";

import { BanknoteIcon, CircleSlashIcon, LinkIcon, UserXIcon } from "lucide-react";
import * as React from "react";
import { bookingTitle, STATE_META, stateLabel } from "@/app/desk/booking-visuals";
import { useDeskActions } from "@/app/desk/desk-actions";
import { DeskOverlays } from "@/app/desk/desk-dialogs";
import { useDeskUi } from "@/app/desk/desk-ui";
import { durationOf, LOCALE, whenOf } from "@/app/format";
import { useNow } from "@/app/clock";
import { useStore } from "@/app/store";
import { Avatar, AvatarFallback, initialsOf } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { type Booking, customerById, deskState, duePaise, type LedgerEntry, paidPaise } from "@/lib/booking";
import { formatCountdown, holdRemainingMs } from "@/lib/holds";
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

/** The booking's panel: who, when, the money line by line, and what the desk can do about it. */
export function BookingSheet({ bookingId, onClose }: { bookingId: string | null; onClose: () => void }): React.ReactElement {
  const { state } = useStore();
  const booking = bookingId ? state.bookings.find((b) => b.id === bookingId) : undefined;
  // Keep the last booking on screen while the sheet animates out.
  const [last, setLast] = React.useState<Booking | undefined>(booking);
  if (booking && booking !== last) setLast(booking);
  const shown = booking ?? last;

  return (
    <Sheet onOpenChange={(open) => !open && onClose()} open={Boolean(booking)}>
      <SheetPopup>
        {shown && <SheetBody booking={shown} />}
        <DeskOverlays />
      </SheetPopup>
    </Sheet>
  );
}

function SheetBody({ booking }: { booking: Booking }): React.ReactElement {
  const { state } = useStore();
  const actions = useDeskActions();
  const ui = useDeskUi();
  const now = useNow(1000);
  const ds = deskState(booking, now);
  const meta = STATE_META[ds];
  const Icon = meta.icon;
  const customer = customerById(state.customers, booking.customerId);
  const due = duePaise(booking);
  const paid = paidPaise(booking);
  const isBooking = booking.kind === "booking";
  const live = ds !== "cancelled" && ds !== "expired";

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <Badge variant={meta.badge}>
            <Icon aria-hidden="true" />
            {stateLabel(ds)}
          </Badge>
          {ds === "held" && <span className="text-muted-foreground text-xs tabular-nums">{formatCountdown(holdRemainingMs(booking, now))} left</span>}
        </div>
        <SheetTitle>{bookingTitle(booking, state.customers)}</SheetTitle>
        <SheetDescription>
          {courtName(booking.courtId)} · {whenOf(booking)} · {durationOf(booking.durationMinutes)}
        </SheetDescription>
      </SheetHeader>

      <SheetPanel className="flex flex-col gap-5">
        {customer && (
          <section aria-labelledby="sheet-customer" className="flex flex-col gap-3">
            <h3 className="sr-only" id="sheet-customer">
              Customer
            </h3>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{initialsOf(customer.name)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="font-medium text-sm">{customer.name}</span>
                <a className="text-muted-foreground text-xs underline-offset-2 hover:underline" href={`tel:${customer.phone}`}>
                  {formatPhone(customer.phone)}
                </a>
              </div>
              {customer.creditPaise > 0 && (
                <Badge className="ms-auto" variant="info">
                  {formatInr(customer.creditPaise)} credit
                </Badge>
              )}
            </div>
            <div className="flex items-start justify-between gap-4 rounded-xl border px-3 py-2.5">
              <div className="flex flex-col">
                <Label htmlFor="pay-first">Pay first</Label>
                <span className="text-muted-foreground text-xs" id="pay-first-hint">
                  Ask for full payment before holding a court for {customer.name.split(" ")[0]}.
                </span>
              </div>
              <Switch
                aria-describedby="pay-first-hint"
                checked={customer.payFirst}
                id="pay-first"
                onCheckedChange={(value) => void actions.setPayFirst(customer, value)}
              />
            </div>
          </section>
        )}

        {isBooking && (
          <section aria-labelledby="sheet-money" className="flex flex-col gap-2">
            <h3 className="font-medium text-sm" id="sheet-money">
              Payment
            </h3>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <MoneyCell label="Price" value={booking.pricePaise} />
              <MoneyCell label="Paid" value={Math.max(0, paid)} />
              <MoneyCell emphasis={due > 0} label="Due" value={due} />
            </dl>
            {booking.ledger.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nothing paid yet.</p>
            ) : (
              <ol aria-label="Payment history" className="flex flex-col divide-y rounded-xl border">
                {booking.ledger.map((e) => (
                  <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm" key={e.id}>
                    <span className="flex min-w-0 flex-col">
                      <span>{LEDGER_LABEL[e.kind]}</span>
                      <span className="truncate text-muted-foreground text-xs">
                        {new Intl.DateTimeFormat(LOCALE, { timeZone: VENUE.timeZone, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(e.at)} · {e.note}
                      </span>
                    </span>
                    <span className={cn("tabular-nums", e.kind === "refund" && "text-destructive-foreground")}>
                      {e.kind === "refund" ? "−" : ""}
                      {formatInr(e.amountPaise)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        <Separator />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {isBooking && (
            <>
              <dt className="text-muted-foreground">Players</dt>
              <dd>{booking.players}</dd>
              <dt className="text-muted-foreground">Booked</dt>
              <dd>{booking.source === "self-serve" ? "Online, by the customer" : "At the desk"}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Notes</dt>
          <dd className="text-pretty">{booking.notes || "None"}</dd>
        </dl>
      </SheetPanel>

      {live && (
        <SheetFooter>
          {isBooking && due > 0 && ds !== "held" && (
            <Button onClick={() => ui.recordCash(booking.id)}>
              <BanknoteIcon aria-hidden="true" />
              Record cash
            </Button>
          )}
          {isBooking && due > 0 && (
            <Button onClick={() => void actions.copyPaymentLink(booking)} variant="outline">
              <LinkIcon aria-hidden="true" />
              Copy payment link
            </Button>
          )}
          {isBooking && booking.status === "confirmed" && (
            <Button onClick={() => void actions.markNoShow(booking)} variant="outline">
              <UserXIcon aria-hidden="true" />
              Mark no-show
            </Button>
          )}
          <Button className="sm:ms-auto" onClick={() => ui.cancel(booking.id)} variant="destructive-outline">
            <CircleSlashIcon aria-hidden="true" />
            {ds === "held" ? "Release hold" : isBooking ? "Cancel booking" : "Remove block"}
          </Button>
        </SheetFooter>
      )}
    </>
  );
}

function MoneyCell({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }): React.ReactElement {
  return (
    <div className="flex flex-col rounded-xl border px-2 py-2">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={cn("font-semibold tabular-nums", emphasis && "text-warning-foreground")}>{formatInr(value)}</dd>
    </div>
  );
}
