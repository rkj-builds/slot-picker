"use client";

import { CreditCardIcon, LockIcon, SmartphoneIcon, TriangleAlertIcon } from "lucide-react";
import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Frame, FramePanel } from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import type { PayResult } from "@/lib/checkout";
import { formatInr } from "@/lib/money";

type Method = "upi" | "card";

const UPI_ID = /^[\w.-]{2,}@[a-zA-Z]{2,}$/;

/**
 * A neutral, clearly-fake checkout. In production this step hands over to
 * Razorpay; here nothing is charged and no card details are collected.
 * The dialog owns only the payment attempt: a decline keeps it open with a
 * retry, anything else (success, a lost hold) closes it and the page decides.
 */
export function CheckoutDialog({
  open,
  onOpenChange,
  amountPaise,
  summary,
  onPay,
  onSettled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amountPaise: number;
  summary: string;
  onPay: (method: Method) => Promise<PayResult>;
  onSettled: (result: PayResult) => void;
}): React.ReactElement {
  const [method, setMethod] = React.useState<Method>("upi");
  const [upi, setUpi] = React.useState("player@upi");
  const [declined, setDeclined] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const submit = async (): Promise<void> => {
    setBusy(true);
    const result = await onPay(method);
    setBusy(false);
    if (!result.ok && result.reason === "payment-failed") {
      setDeclined(true);
      return;
    }
    setDeclined(false);
    onSettled(result);
  };

  return (
    <Dialog
      disablePointerDismissal={busy}
      onOpenChange={(next) => {
        if (busy) return;
        if (!next) setDeclined(false);
        onOpenChange(next);
      }}
      open={open}
    >
      <DialogPopup showCloseButton={!busy}>
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>Checkout</DialogTitle>
            <Badge variant="warning">Demo · no real money</Badge>
          </div>
          <DialogDescription>In production, payments go through Razorpay. Here, nothing is charged.</DialogDescription>
        </DialogHeader>
        <Form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <DialogPanel className="flex flex-col gap-4">
            <Frame>
              <FramePanel className="flex items-baseline justify-between gap-3 px-4 py-3">
                <span className="text-muted-foreground text-sm">{summary}</span>
                <span className="font-semibold text-xl tabular-nums">{formatInr(amountPaise)}</span>
              </FramePanel>
            </Frame>

            {declined && (
              <Alert role="alert" variant="error">
                <TriangleAlertIcon aria-hidden="true" />
                <AlertTitle>The payment did not go through</AlertTitle>
                <AlertDescription>The bank declined it and nothing was charged. Your court is still held. Try again, or switch method.</AlertDescription>
              </Alert>
            )}

            <Tabs onValueChange={(value) => setMethod(value as Method)} value={method}>
              <TabsList aria-label="Payment method" className="w-full">
                <TabsTab className="flex-1" value="upi">
                  <SmartphoneIcon aria-hidden="true" />
                  UPI
                </TabsTab>
                <TabsTab className="flex-1" value="card">
                  <CreditCardIcon aria-hidden="true" />
                  Card
                </TabsTab>
              </TabsList>
              <TabsPanel value="upi">
                <Field className="w-full" name="upi" validate={() => (UPI_ID.test(upi.trim()) ? null : "Enter a UPI ID like name@bank.")}>
                  <FieldLabel>UPI ID</FieldLabel>
                  <Input autoComplete="off" onChange={(event) => setUpi(event.target.value)} size="lg" spellCheck={false} type="text" value={upi} />
                  <FieldError />
                  <FieldDescription>A collect request would go to your UPI app.</FieldDescription>
                </Field>
              </TabsPanel>
              <TabsPanel value="card">
                <Alert>
                  <CreditCardIcon aria-hidden="true" />
                  <AlertTitle>Demo card ending 4242</AlertTitle>
                  <AlertDescription>No card details are collected in this demo.</AlertDescription>
                </Alert>
              </TabsPanel>
            </Tabs>
          </DialogPanel>
          <DialogFooter className="items-center sm:justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <LockIcon aria-hidden="true" className="size-3.5" />
              Your court stays held while you pay
            </span>
            <Button loading={busy} size="lg" type="submit">
              {declined ? "Try again" : "Pay"} {formatInr(amountPaise)}
            </Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}
