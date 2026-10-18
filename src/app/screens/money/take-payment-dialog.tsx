"use client";

import * as React from "react";
import { SegmentedControl, SegmentedControlItem } from "@/components/compositions/segmented-control";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { NumberField, NumberFieldGroup, NumberFieldInput } from "@/components/ui/number-field";
import { toastManager } from "@/components/ui/toast";
import type { PayMethod } from "@/data/client";
import { errorMessage, isDataError } from "@/data/errors";
import { useWrite } from "@/data/provider";
import type { Due } from "@/data/types";
import { formatInr } from "@/lib/money";

export interface TakePaymentTarget {
  due: Due;
  /** Who owes it, for the title and the toast. */
  name: string;
}

/**
 * Money for one thing that is owed, at the desk: the balance prefilled
 * (part payments are fine), cash or online. The item's own API takes it, so
 * its rules (never more than is due) are the ones that refuse, on the field.
 */
export function TakePaymentDialog({ target, onClose }: { target: TakePaymentTarget | null; onClose: () => void }): React.ReactElement {
  const [busy, setBusy] = React.useState(false);
  return (
    <Dialog onOpenChange={(open) => !open && !busy && onClose()} open={Boolean(target)}>
      <DialogPopup>{target && <TakePaymentForm key={`${target.due.subject.type}:${target.due.subject.id}`} onBusy={setBusy} onDone={onClose} target={target} />}</DialogPopup>
    </Dialog>
  );
}

function TakePaymentForm({ target, onDone, onBusy }: { target: TakePaymentTarget; onDone: () => void; onBusy: (busy: boolean) => void }): React.ReactElement {
  const { due, name } = target;
  const [rupees, setRupees] = React.useState<number | null>(due.duePaise / 100);
  const [method, setMethod] = React.useState<PayMethod>("cash");
  const [error, setError] = React.useState<string | null>(null);
  const pay = useWrite((c, input: { method: PayMethod; amountPaise: number }) => {
    const { type, id } = due.subject;
    if (type === "booking") return c.bookings.recordPayment(id, input).then(() => undefined);
    if (type === "enrolment") return c.enrolments.recordPayment(id, input).then(() => undefined);
    if (type === "membership") return c.memberships.recordPayment(id, input).then(() => undefined);
    return Promise.reject(new Error(`Nothing to pay on ${type}`));
  });
  const amountPaise = rupees === null ? 0 : Math.round(rupees * 100);

  const save = async (): Promise<void> => {
    if (amountPaise <= 0) {
      setError("Enter an amount above ₹0.");
      return;
    }
    onBusy(true);
    try {
      await pay.mutateAsync({ method, amountPaise });
      const left = due.duePaise - amountPaise;
      toastManager.add({
        title: `${formatInr(amountPaise)} recorded for ${name}`,
        description: `${method === "cash" ? "Cash" : "Online"} · ${due.subject.label} · ${left > 0 ? `${formatInr(left)} still due` : "paid in full"}`,
        type: "success",
      });
      onBusy(false);
      onDone();
    } catch (failure) {
      onBusy(false);
      // A refusal about the amount belongs on the amount; anything else is a toast.
      if (isDataError(failure) && failure.fields.amount) setError(failure.message);
      else toastManager.add({ title: "Payment not recorded", description: errorMessage(failure), type: "error" });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Take payment</DialogTitle>
        <DialogDescription>
          {name} · {due.subject.label}
        </DialogDescription>
      </DialogHeader>
      <Form
        className="contents"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <DialogPanel className="flex flex-col gap-4">
          <Field invalid={Boolean(error)} name="amount">
            <FieldLabel>Amount</FieldLabel>
            <NumberField
              format={{ style: "currency", currency: "INR", maximumFractionDigits: 0 }}
              locale="en-IN"
              onValueChange={(value) => {
                setRupees(value);
                setError(null);
              }}
              value={rupees}
            >
              <NumberFieldGroup className="w-48">
                <NumberFieldInput />
              </NumberFieldGroup>
            </NumberField>
            {error ? <FieldError match>{error}</FieldError> : <FieldDescription>{formatInr(due.duePaise)} is due. Part payments are fine.</FieldDescription>}
          </Field>
          <div className="flex flex-col gap-1.5">
            <Label id="take-payment-method">How they paid</Label>
            <SegmentedControl<PayMethod> aria-labelledby="take-payment-method" fill onValueChange={setMethod} value={method}>
              <SegmentedControlItem<PayMethod> value="cash">Cash</SegmentedControlItem>
              <SegmentedControlItem<PayMethod> value="online">Online</SegmentedControlItem>
            </SegmentedControl>
            {method === "cash" && <span className="text-muted-foreground text-xs">Cash waits for a manager to approve it once it's in the drawer.</span>}
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose disabled={pay.isPending} render={<Button variant="ghost" />}>
            Cancel
          </DialogClose>
          <Button loading={pay.isPending} type="submit">
            Record {amountPaise > 0 ? formatInr(amountPaise) : "payment"}
          </Button>
        </DialogFooter>
      </Form>
    </>
  );
}
