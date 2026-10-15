"use client";

import * as React from "react";
import { useDeskActions } from "@/app/desk/desk-actions";
import { useDeskUi } from "@/app/desk/desk-ui";
import { bookingTitle } from "@/app/desk/booking-visuals";
import { whenOf } from "@/app/format";
import { useStore } from "@/app/store";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput } from "@/components/ui/number-field";
import { RadioGroup } from "@/components/ui/radio-group";
import { RadioCard } from "@/components/compositions/radio-card";
import { type Booking, duePaise, paidPaise } from "@/lib/booking";
import { formatInr } from "@/lib/money";
import type { CancelResolution } from "@/lib/store";
import { courtName } from "@/lib/venue";

/** Cash at the desk, prefilled with the balance; whole rupees, never more than is due. */
export function RecordCashDialog({ booking, onClose }: { booking: Booking | undefined; onClose: () => void }): React.ReactElement {
  const actions = useDeskActions();
  const { state } = useStore();
  const due = booking ? duePaise(booking) : 0;
  const [rupees, setRupees] = React.useState<number | null>(due / 100);
  const [busy, setBusy] = React.useState(false);
  const [forId, setForId] = React.useState<string | undefined>(booking?.id);
  if (booking?.id !== forId) {
    setForId(booking?.id);
    setRupees(due / 100);
  }
  const valid = rupees !== null && rupees > 0 && rupees * 100 <= due;

  const save = async (): Promise<void> => {
    if (!booking || !valid) return;
    setBusy(true);
    await actions.recordCash(booking, Math.round(rupees * 100));
    setBusy(false);
    onClose();
  };

  return (
    <Dialog onOpenChange={(open) => !open && !busy && onClose()} open={Boolean(booking)}>
      <DialogPopup>
        <form
          className="flex min-h-0 flex-col"
          // The amount is validated here, not by the browser: a ₹100 step would otherwise refuse a ₹350 balance.
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <DialogHeader>
            <DialogTitle>Record cash</DialogTitle>
            <DialogDescription>
              {booking ? `${bookingTitle(booking, state.customers)} · ${courtName(booking.courtId)}, ${whenOf(booking)}` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <NumberField
              format={{ style: "currency", currency: "INR", maximumFractionDigits: 0 }}
              id="cash-amount"
              locale="en-IN"
              max={due / 100}
              min={1}
              onValueChange={setRupees}
              step={100}
              value={rupees}
            >
              <Label htmlFor="cash-amount">Amount received</Label>
              <NumberFieldGroup className="h-10 w-48">
                <NumberFieldDecrement aria-label="₹100 less" />
                <NumberFieldInput />
                <NumberFieldIncrement aria-label="₹100 more" />
              </NumberFieldGroup>
              <span className="text-muted-foreground text-xs">{formatInr(due)} is due. Part payments are fine.</span>
            </NumberField>
          </DialogPanel>
          <DialogFooter>
            <Button disabled={!valid} loading={busy} type="submit">
              Record {valid ? formatInr(Math.round(rupees * 100)) : "cash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}

/** Cancel (or release a hold, or remove a block). With money paid, the desk picks credit or refund. */
export function CancelBookingDialog({ booking, onClose }: { booking: Booking | undefined; onClose: () => void }): React.ReactElement {
  const actions = useDeskActions();
  const { state } = useStore();
  const [resolution, setResolution] = React.useState<CancelResolution>("credit");
  const [busy, setBusy] = React.useState(false);
  const paid = booking ? paidPaise(booking) : 0;
  const verb = booking?.status === "held" ? "Release hold" : booking?.kind === "booking" ? "Cancel booking" : "Remove block";

  const confirm = async (): Promise<void> => {
    if (!booking) return;
    setBusy(true);
    await actions.cancel(booking, resolution);
    setBusy(false);
    onClose();
  };

  return (
    <AlertDialog onOpenChange={(open) => !open && !busy && onClose()} open={Boolean(booking)}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{verb}?</AlertDialogTitle>
          <AlertDialogDescription>
            {booking ? `${bookingTitle(booking, state.customers)} · ${courtName(booking.courtId)}, ${whenOf(booking)}. The court becomes free to book.` : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-6 pb-6">
          {paid > 0 ? (
            <RadioGroup aria-label={`What happens to the ${formatInr(paid)} paid`} onValueChange={(v) => setResolution(v as CancelResolution)} value={resolution}>
              <RadioCard value="credit">
                <span className="font-medium text-sm">Keep {formatInr(paid)} as credit</span>
                <span className="text-muted-foreground text-sm">The money stays with the venue and comes off their next booking. Best for late cancellations.</span>
              </RadioCard>
              <RadioCard value="refund">
                <span className="font-medium text-sm">Refund {formatInr(paid)}</span>
                <span className="text-muted-foreground text-sm">Back to the original payment method in 5–7 working days.</span>
              </RadioCard>
            </RadioGroup>
          ) : (
            <p className="text-muted-foreground text-sm">Nothing was paid, so there is nothing to refund.</p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogClose disabled={busy} render={<Button variant="ghost" />}>
            Keep it
          </AlertDialogClose>
          <Button loading={busy} onClick={() => void confirm()} variant="destructive">
            {verb}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

/**
 * Record cash and Cancel, wherever they are opened from. Rendered inside the
 * booking sheet while it is open, so they nest as child dialogs (one focus
 * trap, focus back to the sheet's button), and at page level otherwise.
 */
export function DeskOverlays(): React.ReactElement {
  const ui = useDeskUi();
  const { state } = useStore();
  const find = (id: string | null): Booking | undefined => (id ? state.bookings.find((b) => b.id === id) : undefined);
  return (
    <>
      <RecordCashDialog booking={find(ui.cashId)} onClose={ui.closeCash} />
      <CancelBookingDialog booking={find(ui.cancelId)} onClose={ui.closeCancel} />
    </>
  );
}
