"use client";

import { CalendarPlusIcon, CircleCheckIcon, CircleSlashIcon, MessageCircleIcon, RotateCcwIcon, WalletIcon } from "lucide-react";
import * as React from "react";
import { EMPTY_DRAFT, useFlow } from "@/app/book/flow";
import { StepActions, StepCard, StepLayout } from "@/app/book/step-actions";
import { durationOf, whenOf } from "@/app/format";
import { useClock } from "@/app/clock";
import { useStore } from "@/app/store";
import { Anchor } from "@/app/anchor";
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardFooter, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { RadioGroup } from "@/components/ui/radio-group";
import { RadioCard } from "@/components/compositions/radio-card";
import { Separator } from "@/components/ui/separator";
import { toastManager } from "@/components/ui/toast";
import { type Booking, bookingEnd, bookingStart, duePaise, makeId, paidPaise } from "@/lib/booking";
import { downloadText } from "@/lib/csv";
import { buildIcs } from "@/lib/ics";
import { formatInr } from "@/lib/money";
import type { CancelResolution } from "@/lib/store";
import { courtName, VENUE } from "@/lib/venue";

export function DoneStep(): React.ReactElement | null {
  const { booking, update, goTo, draft } = useFlow();
  if (!booking) return null;
  const cancelled = booking.status === "cancelled";
  const paid = paidPaise(booking);
  const due = duePaise(booking);
  const credit = booking.ledger.find((e) => e.kind === "credit-issued");
  const refund = booking.ledger.find((e) => e.kind === "refund");
  const where = `${courtName(booking.courtId)} · ${whenOf(booking)}`;

  const bookAnother = (): void => {
    update({ ...EMPTY_DRAFT, name: draft.name, phone: draft.phone, players: draft.players, verifiedPhone: draft.verifiedPhone });
    goTo("court");
  };

  return (
    <StepLayout
      actions={
        <StepActions
          compactLine={
            <p className="truncate tabular-nums">
              <span className="font-medium">{cancelled ? "Cancelled" : "Confirmed"}</span>
              <span aria-hidden="true" className="text-muted-foreground/60">{" · "}</span>
              {where}
            </p>
          }
          note="Your name and number stay filled in."
          primary={
            <Button onClick={bookAnother} size="lg">
              <RotateCcwIcon aria-hidden="true" />
              Book another court
            </Button>
          }
          rows={[]}
          title="What next"
        />
      }
    >
      <div className="flex flex-col items-start gap-3">
        <Badge size="lg" variant={cancelled ? "secondary" : "success"}>
          {cancelled ? <CircleSlashIcon aria-hidden="true" /> : <CircleCheckIcon aria-hidden="true" />}
          {cancelled ? "Cancelled" : "Confirmed"}
        </Badge>
        <div className="flex flex-col gap-1">
          <h1 className="font-semibold text-2xl outline-none" tabIndex={-1}>
            {cancelled ? "Booking cancelled" : "You are booked"}
          </h1>
          <p className="text-muted-foreground text-sm">{where}</p>
        </div>
      </div>

      {cancelled && (
        <Alert role="status" variant={credit || refund ? "info" : "default"}>
          <WalletIcon aria-hidden="true" />
          <AlertDescription>
            {credit
              ? `${formatInr(credit.amountPaise)} is now credit on your number. It comes off your next booking.`
              : refund
                ? `${formatInr(refund.amountPaise)} is on its way back to your original payment method. It usually lands in 5–7 working days.`
                : "Nothing was paid, so there is nothing to refund."}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{VENUE.name}</CardTitle>
          <CardAction>
            <Badge variant={cancelled ? "secondary" : due === 0 ? "success" : paid > 0 ? "info" : "warning"}>
              {cancelled ? "Cancelled" : due === 0 ? "Paid" : paid > 0 ? "Part-paid" : "Pay at venue"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardPanel>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Court</dt>
            <dd className="text-end">{courtName(booking.courtId)}</dd>
            <dt className="text-muted-foreground">When</dt>
            <dd className="text-end tabular-nums">{whenOf(booking)}</dd>
            <dt className="text-muted-foreground">Duration</dt>
            <dd className="text-end">{durationOf(booking.durationMinutes)}</dd>
          </dl>
          <Separator className="my-3" />
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm" data-slot="paid-breakdown">
            <dt className="text-muted-foreground">Price</dt>
            <dd className="text-end tabular-nums">{formatInr(booking.pricePaise)}</dd>
            <dt className="text-muted-foreground">Paid</dt>
            <dd className="text-end tabular-nums">{formatInr(Math.max(0, paid))}</dd>
            {!cancelled && (
              <>
                <dt className="font-medium">Due at the venue</dt>
                <dd className="text-end font-semibold tabular-nums">{formatInr(due)}</dd>
              </>
            )}
          </dl>
        </CardPanel>
        {!cancelled && (
          <CardFooter className="flex-wrap gap-2">
            <CalendarButton booking={booking} />
            <Button render={<Anchor href={whatsAppHref(booking)} rel="noreferrer" target="_blank" />} variant="outline">
              <MessageCircleIcon aria-hidden="true" />
              Share on WhatsApp
            </Button>
          </CardFooter>
        )}
      </Card>

      <StepCard title="Good to know">
        <Accordion>
          <AccordionItem value="cancel">
            <AccordionTrigger>Cancellation policy</AccordionTrigger>
            <AccordionPanel>
              Cancel any time before your start. Whatever you paid becomes credit straight away, or a refund to the original payment method in 5–7
              working days. You choose. Nothing paid means nothing to settle.
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem value="arrive">
            <AccordionTrigger>On the day</AccordionTrigger>
            <AccordionPanel>Come ten minutes early. Paddles and balls are at the desk; non-marking shoes, please. Pay any balance at the desk by UPI or cash.</AccordionPanel>
          </AccordionItem>
          <AccordionItem value="why">
            <AccordionTrigger>Why we ask for money up front</AccordionTrigger>
            <AccordionPanel>
              Unpaid bookings were cancelled almost half the time, often too late for anyone else to play. A deposit keeps courts for people who come.
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </StepCard>

      {!cancelled && (
        <StepCard description="Cancel any time before your start. What you paid becomes credit or a refund, your choice." title="Change of plans?">
          <ManageBooking booking={booking} />
        </StepCard>
      )}
    </StepLayout>
  );
}

function CalendarButton({ booking }: { booking: Booking }): React.ReactElement {
  const { now } = useClock();
  return (
    <Button
      onClick={() => {
        const ics = buildIcs({
          uid: `${booking.id}@project831`,
          start: bookingStart(booking),
          end: bookingEnd(booking),
          summary: `Pickleball at ${VENUE.name}, ${courtName(booking.courtId)}`,
          location: VENUE.address,
          description: `Due at the venue: ${formatInr(duePaise(booking))}`,
          stamp: now(),
        });
        downloadText("project-831-booking.ics", ics, "text/calendar");
      }}
      variant="outline"
    >
      <CalendarPlusIcon aria-hidden="true" />
      Add to calendar
    </Button>
  );
}

function whatsAppHref(booking: Booking): string {
  const text = `Booked ${courtName(booking.courtId)} at ${VENUE.name}, ${whenOf(booking)}. Bring your paddle!`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function ManageBooking({ booking }: { booking: Booking }): React.ReactElement {
  const store = useStore();
  const { now } = useClock();
  const [open, setOpen] = React.useState(false);
  const [resolution, setResolution] = React.useState<CancelResolution>("credit");
  const [busy, setBusy] = React.useState(false);
  const paid = paidPaise(booking);

  const cancel = async (): Promise<void> => {
    setBusy(true);
    await store.commit({ type: "cancel", bookingId: booking.id, resolution, at: now(), entryId: makeId("le") });
    setBusy(false);
    setOpen(false);
    toastManager.add({
      title: "Booking cancelled",
      description: paid === 0 ? "Nothing was paid." : resolution === "credit" ? `${formatInr(paid)} added as credit.` : `${formatInr(paid)} refund started.`,
      type: "info",
    });
  };

  return (
    <AlertDialog onOpenChange={(next) => !busy && setOpen(next)} open={open}>
      <Button onClick={() => setOpen(true)} variant="destructive-outline">
        Cancel booking
      </Button>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
          <AlertDialogDescription>
            {courtName(booking.courtId)} · {whenOf(booking)}. The court goes back on sale straight away.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-6 pb-6">
          {paid > 0 ? (
            <RadioGroup aria-label={`What happens to the ${formatInr(paid)} you paid`} onValueChange={(v) => setResolution(v as CancelResolution)} value={resolution}>
              <RadioCard value="credit">
                <span className="font-medium text-sm">Keep {formatInr(paid)} as credit</span>
                <span className="text-muted-foreground text-sm">Instant. It comes off your next booking, any day.</span>
              </RadioCard>
              <RadioCard value="refund">
                <span className="font-medium text-sm">Refund {formatInr(paid)}</span>
                <span className="text-muted-foreground text-sm">Back to your original payment method in 5–7 working days.</span>
              </RadioCard>
            </RadioGroup>
          ) : (
            <p className="text-muted-foreground text-sm">Nothing was paid for this booking, so there is nothing to refund.</p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogClose disabled={busy} render={<Button variant="ghost" />}>
            Keep booking
          </AlertDialogClose>
          <Button loading={busy} onClick={() => void cancel()} variant="destructive">
            Cancel booking
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
