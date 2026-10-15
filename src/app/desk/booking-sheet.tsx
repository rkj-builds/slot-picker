"use client";

import { Anchor } from "@/app/anchor";
import { MessageCircleIcon, SendIcon } from "lucide-react";
import * as React from "react";
import { useBookingActions } from "@/app/desk/booking-actions";
import { bookingTitle, STATE_META, stateLabel } from "@/app/desk/booking-visuals";
import { paymentLinkFor, useDeskActions } from "@/app/desk/desk-actions";
import { DeskOverlays } from "@/app/desk/desk-dialogs";
import { durationOf, initialsOf, LOCALE, whenOf } from "@/app/format";
import { useNow } from "@/app/clock";
import { useStore } from "@/app/store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Composer, ComposerActionGroup, ComposerActions, ComposerInput, ComposerSubmit, type ComposerValue, getComposerText } from "@/components/ui/composer";
import { Drawer, DrawerDescription, DrawerFooter, DrawerHeader, DrawerPanel, DrawerPopup, DrawerTitle } from "@/components/ui/drawer";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toastManager } from "@/components/ui/toast";
import { useMediaQuery } from "@/hooks/use-media-query";
import { type Booking, type Customer, customerById, deskState, duePaise, type LedgerEntry, paidPaise } from "@/lib/booking";
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

/** The overlay parts the panel is drawn with: a coss Sheet on a laptop, a coss Drawer on a phone (coss's responsive pattern, p-drawer-12). */
interface Parts {
  Header: React.ComponentType<{ children: React.ReactNode }>;
  Title: React.ComponentType<{ children: React.ReactNode }>;
  Description: React.ComponentType<{ children: React.ReactNode }>;
  Panel: React.ComponentType<{ children: React.ReactNode; className?: string }>;
  Footer: React.ComponentType<{ children: React.ReactNode; className?: string }>;
}

const SHEET_PARTS: Parts = { Header: SheetHeader, Title: SheetTitle, Description: SheetDescription, Panel: SheetPanel, Footer: SheetFooter };
const DRAWER_PARTS: Parts = { Header: DrawerHeader, Title: DrawerTitle, Description: DrawerDescription, Panel: DrawerPanel, Footer: DrawerFooter };

/** The booking's panel: who, when, the money line by line, a message box, and what the desk can do about it. */
export function BookingSheet({ bookingId, onClose }: { bookingId: string | null; onClose: () => void }): React.ReactElement {
  const { state } = useStore();
  const phone = useMediaQuery("max-md");
  const booking = bookingId ? state.bookings.find((b) => b.id === bookingId) : undefined;
  // Keep the last booking on screen while the panel animates out.
  const [last, setLast] = React.useState<Booking | undefined>(booking);
  if (booking && booking !== last) setLast(booking);
  const shown = booking ?? last;
  const onOpenChange = (open: boolean): void => {
    if (!open) onClose();
  };

  if (phone) {
    return (
      <Drawer onOpenChange={onOpenChange} open={Boolean(booking)}>
        <DrawerPopup showBar>
          {shown && <PanelBody booking={shown} parts={DRAWER_PARTS} />}
          <DeskOverlays />
        </DrawerPopup>
      </Drawer>
    );
  }
  return (
    <Sheet onOpenChange={onOpenChange} open={Boolean(booking)}>
      <SheetPopup>
        {shown && <PanelBody booking={shown} parts={SHEET_PARTS} />}
        <DeskOverlays />
      </SheetPopup>
    </Sheet>
  );
}

function PanelBody({ booking, parts: P }: { booking: Booking; parts: Parts }): React.ReactElement {
  const { state } = useStore();
  const actions = useDeskActions();
  const now = useNow(1000);
  const ds = deskState(booking, now);
  const meta = STATE_META[ds];
  const Icon = meta.icon;
  const customer = customerById(state.customers, booking.customerId);
  const due = duePaise(booking);
  const paid = paidPaise(booking);
  const isBooking = booking.kind === "booking";
  const footerActions = useBookingActions(booking, now, { includeOpen: false });

  return (
    <>
      <P.Header>
        <div className="flex items-center gap-2">
          <Badge variant={meta.badge}>
            <Icon aria-hidden="true" />
            {stateLabel(ds)}
          </Badge>
          {ds === "held" && <span className="text-muted-foreground text-xs tabular-nums">{formatCountdown(holdRemainingMs(booking, now))} left</span>}
        </div>
        <P.Title>{bookingTitle(booking, state.customers)}</P.Title>
        <P.Description>
          {courtName(booking.courtId)} · {whenOf(booking)} · {durationOf(booking.durationMinutes)}
        </P.Description>
      </P.Header>

      <P.Panel className="flex flex-col gap-5">
        {customer && (
          <section aria-labelledby="sheet-customer" className="flex flex-col gap-3">
            <h3 className="sr-only" id="sheet-customer">
              Customer
            </h3>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{initialsOf(customer.name)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col items-start">
                <span className="font-medium text-sm">{customer.name}</span>
                <Button className="h-auto px-0 py-0 font-normal text-muted-foreground sm:h-auto" render={<Anchor href={`tel:${customer.phone}`} />} size="xs" variant="link">
                  {formatPhone(customer.phone)}
                </Button>
              </div>
              {customer.creditPaise > 0 && (
                <Badge className="ms-auto" variant="info">
                  {formatInr(customer.creditPaise)} credit
                </Badge>
              )}
            </div>
            <Card className="rounded-xl px-3 py-2.5 before:rounded-[calc(var(--radius-xl)-1px)]">
              <Field className="flex-row items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <FieldLabel>Pay first</FieldLabel>
                  <FieldDescription>Ask for full payment before holding a court for {customer.name.split(" ")[0]}.</FieldDescription>
                </div>
                <Switch checked={customer.payFirst} onCheckedChange={(value) => void actions.setPayFirst(customer, value)} />
              </Field>
            </Card>
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
              <Table>
                <TableCaption className="sr-only">Payment history</TableCaption>
                <TableHeader className="sr-only">
                  <TableRow>
                    <TableHead>What</TableHead>
                    <TableHead className="text-end">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {booking.ledger.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-normal">
                        <span className="flex min-w-0 flex-col">
                          <span>{LEDGER_LABEL[e.kind]}</span>
                          <span className="text-muted-foreground text-xs">
                            {new Intl.DateTimeFormat(LOCALE, { timeZone: VENUE.timeZone, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(e.at)} · {e.note}
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
        )}

        {customer && <WhatsAppComposer booking={booking} customer={customer} due={due} />}

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
      </P.Panel>

      {footerActions.length > 0 && (
        <P.Footer className="flex-wrap">
          {footerActions.map(({ id, label, icon: ActionIcon, run, destructive }, i) => (
            <Button
              className={cn(destructive && "sm:ms-auto")}
              key={id}
              onClick={run}
              variant={destructive ? "destructive-outline" : i === 0 && id === "record-cash" ? "default" : "outline"}
            >
              <ActionIcon aria-hidden="true" />
              {label}
            </Button>
          ))}
        </P.Footer>
      )}
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

/**
 * Message the customer from the panel: coss Composer with a plain-text
 * textarea (its documented "plain-text message" input). The demo queues
 * nothing; the real 831 sends through the WhatsApp Business number.
 */
function WhatsAppComposer({ booking, customer, due }: { booking: Booking; customer: Customer; due: number }): React.ReactElement {
  const [value, setValue] = React.useState<ComposerValue>([]);
  const first = customer.name.split(" ")[0] ?? customer.name;
  const where = `${courtName(booking.courtId)}, ${whenOf(booking)}`;
  const templates = [
    due > 0 ? { label: "Payment link", text: `Hi ${first}, ${formatInr(due)} is due for ${where}. Pay here: ${paymentLinkFor(booking)}` } : null,
    { label: "See you soon", text: `Hi ${first}, see you on ${where}. Paddles and balls are at the desk.` },
  ].filter((t): t is { label: string; text: string } => t !== null);

  return (
    <section aria-labelledby="sheet-message" className="flex flex-col gap-2">
      <h3 className="flex items-center gap-1.5 font-medium text-sm" id="sheet-message">
        <MessageCircleIcon aria-hidden="true" className="size-4 text-muted-foreground" />
        Message on WhatsApp
      </h3>
      <Composer
        onSubmit={(draft) => {
          const text = getComposerText(draft).trim();
          if (!text) return;
          toastManager.add({ title: "Message queued (demo)", description: `To ${customer.name} on ${formatPhone(customer.phone)}. Nothing is sent from this demo.`, type: "success" });
          setValue([]);
        }}
        onValueChange={setValue}
        value={value}
      >
        <ComposerInput render={<textarea aria-label={`Message to ${customer.name}`} placeholder={`Write to ${first}…`} />} />
        <ComposerActions>
          <ComposerActionGroup>
            {templates.map((t) => (
              <Button key={t.label} onClick={() => setValue([{ type: "text", text: t.text }])} size="xs" variant="ghost">
                {t.label}
              </Button>
            ))}
          </ComposerActionGroup>
          <ComposerActionGroup align="end">
            <ComposerSubmit
              render={
                <Button aria-label="Send on WhatsApp" size="icon-sm">
                  <SendIcon aria-hidden="true" />
                </Button>
              }
            />
          </ComposerActionGroup>
        </ComposerActions>
      </Composer>
    </section>
  );
}
