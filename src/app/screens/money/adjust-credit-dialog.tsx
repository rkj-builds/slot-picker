"use client";

import * as React from "react";
import { RadioCard } from "@/components/compositions/radio-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { NumberField, NumberFieldGroup, NumberFieldInput } from "@/components/ui/number-field";
import { RadioGroup } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { errorMessage, isDataError } from "@/data/errors";
import { useWrite } from "@/data/provider";
import { formatInr } from "@/lib/money";

type Mode = "add" | "payout";

export interface AdjustCreditTarget {
  customerId: string;
  name: string;
  creditPaise: number;
  /** Open on a payout of this many rupees (a link from elsewhere). */
  start?: { mode: Mode; rupees: number };
}

/**
 * Move credit by hand: add some as goodwill, or pay some out in cash. A
 * reason is required (it goes in the accounts), and a payout can't be more
 * than the balance; that one is checked as you type, since the balance is
 * on screen, and the backend refuses it too.
 */
export function AdjustCreditDialog({ target, onClose }: { target: AdjustCreditTarget | null; onClose: () => void }): React.ReactElement {
  const [busy, setBusy] = React.useState(false);
  return (
    <Dialog onOpenChange={(open) => !open && !busy && onClose()} open={Boolean(target)}>
      <DialogPopup>{target && <AdjustForm key={target.customerId} onBusy={setBusy} onDone={onClose} target={target} />}</DialogPopup>
    </Dialog>
  );
}

function AdjustForm({ target, onDone, onBusy }: { target: AdjustCreditTarget; onDone: () => void; onBusy: (busy: boolean) => void }): React.ReactElement {
  const { name, creditPaise } = target;
  const [mode, setMode] = React.useState<Mode>(target.start?.mode ?? "add");
  const [rupees, setRupees] = React.useState<number | null>(target.start?.rupees ?? null);
  const [reason, setReason] = React.useState("");
  const [errors, setErrors] = React.useState<{ amount?: string; reason?: string }>({});
  const adjust = useWrite((c, input: { amountPaise: number; reason: string; mode: Mode }) =>
    c.money.adjustCredit(target.customerId, { amountPaise: input.amountPaise, reason: input.reason, kind: input.mode === "add" ? "credit-issued" : "refund" }),
  );
  const amountPaise = rupees === null ? 0 : Math.round(rupees * 100);
  const tooMuch = mode === "payout" && amountPaise > creditPaise;
  const amountError = errors.amount ?? (tooMuch ? `${name} only has ${formatInr(creditPaise)} of credit.` : undefined);

  const save = async (): Promise<void> => {
    const next: typeof errors = {};
    if (amountPaise <= 0) next.amount = "Enter an amount above ₹0.";
    if (!reason.trim()) next.reason = "Say why, for the accounts.";
    setErrors(next);
    if (Object.keys(next).length > 0 || tooMuch) return;
    onBusy(true);
    try {
      await adjust.mutateAsync({ amountPaise, reason: reason.trim(), mode });
      toastManager.add(
        mode === "add"
          ? { title: `${formatInr(amountPaise)} credit added for ${name}`, description: reason.trim(), type: "success" }
          : { title: `${formatInr(amountPaise)} paid out to ${name}`, description: `Cash · ${reason.trim()}`, type: "success" },
      );
      onBusy(false);
      onDone();
    } catch (failure) {
      onBusy(false);
      if (isDataError(failure) && (failure.fields.amount || failure.fields.reason)) {
        setErrors({ amount: failure.fields.amount ? failure.message : undefined, reason: failure.fields.reason ? failure.message : undefined });
      } else {
        toastManager.add({ title: "Credit not changed", description: errorMessage(failure), type: "error" });
      }
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Adjust credit</DialogTitle>
        <DialogDescription>
          {name} has <span className="font-medium text-foreground tabular-nums">{formatInr(creditPaise)}</span> of credit.
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
          <RadioGroup aria-label="What to do" onValueChange={(value) => setMode(value as Mode)} value={mode}>
            <RadioCard value="add">
              <span className="font-medium text-sm">Add credit as goodwill</span>
              <span className="text-muted-foreground text-sm">Comes off their next booking. No money changes hands.</span>
            </RadioCard>
            <RadioCard disabled={creditPaise <= 0} value="payout">
              <span className="font-medium text-sm">Pay out as cash</span>
              <span className="text-muted-foreground text-sm">{creditPaise > 0 ? `Hand back up to ${formatInr(creditPaise)} from the drawer.` : "There's no credit to pay out."}</span>
            </RadioCard>
          </RadioGroup>
          <Field invalid={Boolean(amountError)} name="amount">
            <FieldLabel>Amount</FieldLabel>
            <NumberField
              format={{ style: "currency", currency: "INR", maximumFractionDigits: 0 }}
              locale="en-IN"
              onValueChange={(value) => {
                setRupees(value);
                setErrors((prev) => ({ ...prev, amount: undefined }));
              }}
              value={rupees}
            >
              <NumberFieldGroup className="w-48">
                <NumberFieldInput />
              </NumberFieldGroup>
            </NumberField>
            {amountError && <FieldError match>{amountError}</FieldError>}
          </Field>
          <Field invalid={Boolean(errors.reason)} name="reason">
            <FieldLabel>Reason</FieldLabel>
            <Textarea
              onChange={(event) => {
                setReason(event.target.value);
                setErrors((prev) => ({ ...prev, reason: undefined }));
              }}
              placeholder={mode === "add" ? "Floodlights failed during their game" : "Moving away, asked for the balance back"}
              value={reason}
            />
            {errors.reason ? <FieldError match>{errors.reason}</FieldError> : <FieldDescription>Goes in the accounts beside the amount.</FieldDescription>}
          </Field>
        </DialogPanel>
        <DialogFooter>
          <DialogClose disabled={adjust.isPending} render={<Button variant="ghost" />}>
            Cancel
          </DialogClose>
          <Button disabled={tooMuch} loading={adjust.isPending} type="submit">
            {mode === "add" ? (amountPaise > 0 ? `Add ${formatInr(amountPaise)} credit` : "Add credit") : amountPaise > 0 ? `Pay out ${formatInr(amountPaise)}` : "Pay out cash"}
          </Button>
        </DialogFooter>
      </Form>
    </>
  );
}
