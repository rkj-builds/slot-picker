"use client";

import { RotateCcwIcon, UserMinusIcon, UsersIcon } from "lucide-react";
import * as React from "react";
import { useDeskActions } from "@/app/desk/desk-actions";
import { durationOf, minuteLabel } from "@/app/format";
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
import { Card, CardDescription, CardFooter, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Combobox, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxPopup } from "@/components/ui/combobox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "@/components/ui/empty";
import { Field, FieldDescription, FieldItem, FieldLabel } from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput } from "@/components/ui/number-field";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toastManager } from "@/components/ui/toast";
import type { Customer } from "@/lib/booking";
import { formatInr, splitPaise } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { listDays, type VenueSettings, WEEKDAY_LABEL, WEEKDAYS } from "@/lib/venue";

const HOLD_OPTIONS = [5, 10, 15, 20, 30];
const TIMES = Array.from({ length: 49 }, (_, i) => i * 30);

/**
 * The venue's rules. Payment rules and hours are a draft until saved; the
 * moment they are, #/book follows them (set 30% and the next customer sees a
 * 30% deposit). Pay-first flags are per customer and apply at once.
 */
export function SettingsView(): React.ReactElement {
  const { state, dispatch } = useStore();
  const [draft, setDraft] = React.useState<VenueSettings>(state.settings);
  const dirty = JSON.stringify(draft) !== JSON.stringify(state.settings);
  const set = <K extends keyof VenueSettings>(key: K, value: VenueSettings[K]): void => setDraft((d) => ({ ...d, [key]: value }));
  const example = splitPaise(draft.peakPricePaise, draft.depositPercent);

  const save = (): void => {
    const previous = state.settings;
    dispatch({ type: "update-settings", settings: draft });
    toastManager.add({
      title: "Settings saved",
      description: "Online booking uses them from the next customer.",
      type: "success",
      actionProps: { children: "Undo", onClick: () => {
        dispatch({ type: "update-settings", settings: previous });
        setDraft(previous);
      } },
    });
  };

  return (
    <Form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (dirty) save();
      }}
    >
      <Card>
        <CardHeader>
          <h2>
            <CardTitle>Payment rules</CardTitle>
          </h2>
          <CardDescription>What a customer pays before a court is held for them.</CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-6">
          {/* Deposit and prices keep a coss Label rather than a Field: a Field would add step validity, and 33% or ₹825 are allowed. */}
          <Fieldset className="flex flex-col gap-2">
            <FieldsetLegend className="sr-only">Deposit</FieldsetLegend>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <NumberField
                format={{ style: "percent", maximumFractionDigits: 0 }}
                id="deposit"
                max={100}
                min={0}
                onValueChange={(v) => set("depositPercent", Math.round((v ?? 0) * 100))}
                step={0.05}
                value={draft.depositPercent / 100}
              >
                <Label htmlFor="deposit">Deposit</Label>
                <NumberFieldGroup className="w-32">
                  <NumberFieldDecrement aria-label="Lower deposit" />
                  <NumberFieldInput />
                  <NumberFieldIncrement aria-label="Raise deposit" />
                </NumberFieldGroup>
              </NumberField>
              <p className="text-muted-foreground text-sm">
                A {formatInr(draft.peakPricePaise)} hour: {formatInr(example.now)} now, {formatInr(example.later)} at the venue.
              </p>
            </div>
            <Slider max={100} min={0} onValueChange={(v: number | readonly number[]) => set("depositPercent", typeof v === "number" ? v : (v[0] ?? 0))} step={5} getAriaLabel={() => "Deposit percent"} value={draft.depositPercent} />
          </Fieldset>

          <Field name="prepayDays" render={(props) => <Fieldset {...props} />}>
            <FieldsetLegend className="font-medium text-sm">Prepay days</FieldsetLegend>
            <CheckboxGroup
              aria-describedby="prepay-days-hint"
              className="flex-row flex-wrap gap-x-4 gap-y-2"
              onValueChange={(days) => set("prepayDays", WEEKDAYS.filter((d) => days.includes(d)))}
              value={draft.prepayDays}
            >
              {WEEKDAYS.map((d) => (
                <FieldItem key={d}>
                  <FieldLabel className="font-normal">
                    <Checkbox value={d} />
                    <span aria-hidden="true">{WEEKDAY_LABEL[d].short}</span>
                    <span className="sr-only">{WEEKDAY_LABEL[d].long}</span>
                  </FieldLabel>
                </FieldItem>
              ))}
            </CheckboxGroup>
            <FieldDescription id="prepay-days-hint">
              {draft.prepayDays.length === 0 ? "No day requires payment up front." : `A deposit or full payment is required on ${listDays(draft.prepayDays)}.`}
            </FieldDescription>
          </Field>

          <div className="flex flex-wrap gap-6">
            <Field>
              <FieldLabel>Hold while paying</FieldLabel>
              <Select<number> items={HOLD_OPTIONS.map((m) => ({ label: durationOf(m), value: m }))} onValueChange={(v) => v !== null && set("holdMinutes", v)} value={draft.holdMinutes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {HOLD_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {durationOf(m)}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </Field>
            <Field className="max-w-sm flex-row items-start gap-3">
              <Switch checked={draft.requirePaymentForNewCustomers} className="mt-0.5" onCheckedChange={(v) => set("requirePaymentForNewCustomers", v)} />
              <div className="flex flex-col gap-1">
                <FieldLabel>Deposit from new customers</FieldLabel>
                <FieldDescription>A first booking asks for the deposit on any day.</FieldDescription>
              </div>
            </Field>
          </div>
        </CardPanel>
      </Card>

      <PayFirstCard />

      <Card>
        <CardHeader>
          <h2>
            <CardTitle>Hours and prices</CardTitle>
          </h2>
          <CardDescription>Per hour, per court. Peak applies in the band below{draft.weekendIsPeak ? " and all weekend" : ""}.</CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-6">
          <Fieldset className="flex flex-col gap-3">
            <FieldsetLegend className="font-medium text-sm">Prices</FieldsetLegend>
            <div className="flex flex-wrap gap-4">
            <PriceField id="base-price" label="Off-peak" onChange={(v) => set("basePricePaise", v)} value={draft.basePricePaise} />
            <PriceField id="peak-price" label="Peak" onChange={(v) => set("peakPricePaise", v)} value={draft.peakPricePaise} />
            <TimeSelect label="Peak from" onChange={(v) => set("peakStartMinute", v)} value={draft.peakStartMinute} />
            <TimeSelect label="Peak until" onChange={(v) => set("peakEndMinute", v)} value={draft.peakEndMinute} />
            <Field className="self-end pb-1.5">
              <FieldLabel>
                <Checkbox checked={draft.weekendIsPeak} onCheckedChange={(v) => set("weekendIsPeak", v)} />
                Weekends are peak
              </FieldLabel>
            </Field>
            </div>
          </Fieldset>
          <Fieldset className="flex flex-col gap-3">
            <FieldsetLegend className="font-medium text-sm">Opening hours</FieldsetLegend>
          <Table aria-label="Opening hours">
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Open</TableHead>
                <TableHead>Opens</TableHead>
                <TableHead>Closes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {WEEKDAYS.map((d) => {
                const h = draft.hours[d];
                const setHours = (patch: Partial<typeof h>): void => set("hours", { ...draft.hours, [d]: { ...h, ...patch } });
                return (
                  <TableRow key={d}>
                    <TableCell className="font-medium">{WEEKDAY_LABEL[d].long}</TableCell>
                    <TableCell>
                      <Checkbox aria-label={`Open on ${WEEKDAY_LABEL[d].long}`} checked={!h.closed} onCheckedChange={(v) => setHours({ closed: !v })} />
                    </TableCell>
                    <TableCell>
                      <TimeSelect disabled={h.closed} hideLabel label={`${WEEKDAY_LABEL[d].long} opens`} onChange={(v) => setHours({ open: v })} value={h.open} />
                    </TableCell>
                    <TableCell>
                      <TimeSelect disabled={h.closed} hideLabel label={`${WEEKDAY_LABEL[d].long} closes`} onChange={(v) => setHours({ close: v })} value={h.close} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </Fieldset>
        </CardPanel>
        <CardFooter>
          <ResetDemo />
        </CardFooter>
      </Card>

      <div className="sticky bottom-0 z-30 -mx-4 border-t bg-background/92 backdrop-blur" data-slot="settings-savebar">
        <div className="flex w-full items-center justify-end gap-3 px-4 py-3">
          <span aria-live="polite" className="me-auto text-muted-foreground text-sm">
            {dirty ? "Unsaved changes" : "All changes saved"}
          </span>
          <Button disabled={!dirty} onClick={() => setDraft(state.settings)} variant="ghost">
            Discard
          </Button>
          <Button disabled={!dirty} type="submit">
            Save settings
          </Button>
        </div>
      </div>
    </Form>
  );
}

function PayFirstCard(): React.ReactElement {
  const { state } = useStore();
  const actions = useDeskActions();
  const flagged = state.customers.filter((c) => c.payFirst);
  const others = state.customers.filter((c) => !c.payFirst);
  const [picked, setPicked] = React.useState<Customer | null>(null);
  return (
    <Card>
      <CardHeader>
        <h2>
          <CardTitle>Pay-first customers</CardTitle>
        </h2>
        <CardDescription>They pay in full before a court is held. Changes apply at once.</CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-col gap-4">
        {flagged.length === 0 ? (
          <Empty className="rounded-xl border border-dashed p-4 md:p-4">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyDescription>Nobody is on the list. Add a customer who has ghosted before.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table aria-label="Pay-first customers">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>
                  <span className="sr-only">Remove</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flagged.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{formatPhone(c.phone)}</TableCell>
                  <TableCell className="text-end">
                    <Button aria-label={`Remove ${c.name}`} onClick={() => void actions.setPayFirst(c, false)} size="sm" variant="ghost">
                      <UserMinusIcon aria-hidden="true" />
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <Field className="min-w-60 flex-1">
            <FieldLabel>Add a customer</FieldLabel>
            <Combobox<Customer> isItemEqualToValue={(a, b) => a.id === b.id} itemToStringLabel={(c) => c.name} items={others} onValueChange={setPicked} value={picked}>
              <ComboboxInput placeholder="Search by name" />
              <ComboboxPopup>
                <ComboboxEmpty>No customer by that name.</ComboboxEmpty>
                <ComboboxList>
                  {(c: Customer) => (
                    <ComboboxItem key={c.id} value={c}>
                      {c.name}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxPopup>
            </Combobox>
          </Field>
          <Button
            disabled={!picked}
            onClick={() => {
              if (!picked) return;
              void actions.setPayFirst(picked, true);
              setPicked(null);
            }}
            variant="outline"
          >
            Add to list
          </Button>
        </div>
      </CardPanel>
    </Card>
  );
}

function PriceField({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (paise: number) => void }): React.ReactElement {
  return (
    <NumberField
      format={{ style: "currency", currency: "INR", maximumFractionDigits: 0 }}
      id={id}
      locale="en-IN"
      max={10_000}
      min={0}
      onValueChange={(v) => onChange(Math.round((v ?? 0) * 100))}
      step={50}
      value={value / 100}
    >
      <Label htmlFor={id}>{label}</Label>
      <NumberFieldGroup className="w-36">
        <NumberFieldDecrement aria-label={`${label} ₹50 less`} />
        <NumberFieldInput />
        <NumberFieldIncrement aria-label={`${label} ₹50 more`} />
      </NumberFieldGroup>
    </NumberField>
  );
}

function TimeSelect({
  label,
  value,
  onChange,
  disabled,
  hideLabel = false,
}: {
  label: string;
  value: number;
  onChange: (minute: number) => void;
  disabled?: boolean;
  hideLabel?: boolean;
}): React.ReactElement {
  return (
    <Field disabled={disabled}>
      <FieldLabel className={hideLabel ? "sr-only" : undefined}>{label}</FieldLabel>
      <Select<number> disabled={disabled} items={TIMES.map((m) => ({ label: m === 24 * 60 ? "Midnight" : minuteLabel(m), value: m }))} onValueChange={(v) => v !== null && onChange(v)} value={value}>
        <SelectTrigger className="min-w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {TIMES.map((m) => (
            <SelectItem key={m} value={m}>
              {m === 24 * 60 ? "Midnight" : minuteLabel(m)}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </Field>
  );
}

function ResetDemo(): React.ReactElement {
  const { reset } = useStore();
  const [open, setOpen] = React.useState(false);
  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <Button onClick={() => setOpen(true)} size="sm" variant="ghost">
        <RotateCcwIcon aria-hidden="true" />
        Reset demo data
      </Button>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset the demo?</AlertDialogTitle>
          <AlertDialogDescription>Bookings, customers and settings go back to the seed. This only affects your browser.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="ghost" />}>Keep my changes</AlertDialogClose>
          <Button
            onClick={() => {
              reset();
              setOpen(false);
              toastManager.add({ title: "Demo data reset", type: "info" });
            }}
            variant="destructive"
          >
            Reset
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
