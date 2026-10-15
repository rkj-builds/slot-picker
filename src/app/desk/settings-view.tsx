"use client";

import { RotateCcwIcon, UserMinusIcon } from "lucide-react";
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
import { Combobox, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxPopup } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput } from "@/components/ui/number-field";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toastManager } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Customer } from "@/lib/booking";
import { formatInr, splitPaise } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import type { Weekday } from "@/lib/plain-date";
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
    <div className="flex flex-col gap-5 pb-24">
      <Card>
        <CardHeader>
          <h2>
            <CardTitle>Payment rules</CardTitle>
          </h2>
          <CardDescription>What a customer pays before a court is held for them.</CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
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
          </div>

          <div className="flex flex-col gap-2">
            <Label id="prepay-days">Prepay days</Label>
            <ToggleGroup aria-labelledby="prepay-days" multiple onValueChange={(days) => set("prepayDays", days as Weekday[])} value={draft.prepayDays}>
              {WEEKDAYS.map((d) => (
                <ToggleGroupItem aria-label={WEEKDAY_LABEL[d].long} key={d} value={d}>
                  {WEEKDAY_LABEL[d].short}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-muted-foreground text-xs">
              {draft.prepayDays.length === 0 ? "No day requires payment up front." : `A deposit or full payment is required on ${listDays(draft.prepayDays)}.`}
            </p>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col gap-2">
              <Label id="hold-minutes">Hold while paying</Label>
              <Select<number> items={HOLD_OPTIONS.map((m) => ({ label: durationOf(m), value: m }))} onValueChange={(v) => v !== null && set("holdMinutes", v)} value={draft.holdMinutes}>
                <SelectTrigger aria-labelledby="hold-minutes">
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
            </div>
            <div className="flex max-w-sm items-start gap-3">
              <Switch
                aria-describedby="new-customers-hint"
                checked={draft.requirePaymentForNewCustomers}
                className="mt-0.5"
                id="new-customers"
                onCheckedChange={(v) => set("requirePaymentForNewCustomers", v)}
              />
              <div className="flex flex-col">
                <Label htmlFor="new-customers">Deposit from new customers</Label>
                <span className="text-muted-foreground text-xs" id="new-customers-hint">
                  A first booking asks for the deposit on any day.
                </span>
              </div>
            </div>
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
        <CardPanel className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-4">
            <PriceField id="base-price" label="Off-peak" onChange={(v) => set("basePricePaise", v)} value={draft.basePricePaise} />
            <PriceField id="peak-price" label="Peak" onChange={(v) => set("peakPricePaise", v)} value={draft.peakPricePaise} />
            <TimeSelect id="peak-start" label="Peak from" onChange={(v) => set("peakStartMinute", v)} value={draft.peakStartMinute} />
            <TimeSelect id="peak-end" label="Peak until" onChange={(v) => set("peakEndMinute", v)} value={draft.peakEndMinute} />
            <div className="flex items-center gap-2 self-end pb-1.5">
              <Checkbox checked={draft.weekendIsPeak} id="weekend-peak" onCheckedChange={(v) => set("weekendIsPeak", v)} />
              <Label htmlFor="weekend-peak">Weekends are peak</Label>
            </div>
          </div>
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
                      <TimeSelect disabled={h.closed} hideLabel id={`open-${d}`} label={`${WEEKDAY_LABEL[d].long} opens`} onChange={(v) => setHours({ open: v })} value={h.open} />
                    </TableCell>
                    <TableCell>
                      <TimeSelect disabled={h.closed} hideLabel id={`close-${d}`} label={`${WEEKDAY_LABEL[d].long} closes`} onChange={(v) => setHours({ close: v })} value={h.close} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardPanel>
        <CardFooter>
          <ResetDemo />
        </CardFooter>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/92 backdrop-blur" data-slot="settings-savebar">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-end gap-3 px-4 py-3">
          <span aria-live="polite" className="me-auto text-muted-foreground text-sm">
            {dirty ? "Unsaved changes" : "All changes saved"}
          </span>
          <Button disabled={!dirty} onClick={() => setDraft(state.settings)} variant="ghost">
            Discard
          </Button>
          <Button disabled={!dirty} onClick={save}>
            Save settings
          </Button>
        </div>
      </div>
    </div>
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
          <p className="rounded-xl border border-dashed px-4 py-3 text-muted-foreground text-sm">Nobody is on the list.</p>
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
          <div className="flex min-w-60 flex-1 flex-col gap-1.5">
            <Label htmlFor="add-pay-first">Add a customer</Label>
            <Combobox<Customer> isItemEqualToValue={(a, b) => a.id === b.id} itemToStringLabel={(c) => c.name} items={others} onValueChange={setPicked} value={picked}>
              <ComboboxInput id="add-pay-first" placeholder="Search by name" />
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
          </div>
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
  id,
  label,
  value,
  onChange,
  disabled,
  hideLabel = false,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (minute: number) => void;
  disabled?: boolean;
  hideLabel?: boolean;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className={hideLabel ? "sr-only" : undefined} id={id}>
        {label}
      </Label>
      <Select<number> disabled={disabled} items={TIMES.map((m) => ({ label: m === 24 * 60 ? "Midnight" : minuteLabel(m), value: m }))} onValueChange={(v) => v !== null && onChange(v)} value={value}>
        <SelectTrigger aria-labelledby={id} className="min-w-28">
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
    </div>
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
