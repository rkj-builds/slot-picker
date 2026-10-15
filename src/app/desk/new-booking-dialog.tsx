"use client";

import { UserPlusIcon, UsersIcon } from "lucide-react";
import * as React from "react";
import { useClock } from "@/app/clock";
import { useDeskActions } from "@/app/desk/desk-actions";
import type { NewBookingPrefill } from "@/app/desk/desk-ui";
import { durationOf, longDayOf, minuteLabel, timeRangeOf } from "@/app/format";
import { useStore } from "@/app/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxPopup } from "@/components/ui/combobox";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Booking, type Customer, findConflict, makeId } from "@/lib/booking";
import { formatInr } from "@/lib/money";
import { checkIndianPhone, describePhoneProblem, formatPhone } from "@/lib/phone";
import { weekdayOf } from "@/lib/plain-date";
import { customerByPhone, newCustomer } from "@/lib/store";
import { COURTS, type CourtId, DURATIONS_MINUTES, priceFor } from "@/lib/venue";

type Settle = "venue" | "cash";

/**
 * A booking taken at the desk: a phone call or a walk-in. Search a known
 * customer or add a new one, pick the court, start and length, and say
 * whether they paid in cash now. Conflicts are caught before saving.
 */
export function NewBookingDialog({ prefill, onClose }: { prefill: NewBookingPrefill | null; onClose: () => void }): React.ReactElement {
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(prefill)}>
      <DialogPopup>{prefill && <NewBookingForm key={`${prefill.courtId}-${prefill.date}-${prefill.startMinute}`} onDone={onClose} prefill={prefill} />}</DialogPopup>
    </Dialog>
  );
}

function NewBookingForm({ prefill, onDone }: { prefill: NewBookingPrefill; onDone: () => void }): React.ReactElement {
  const { state } = useStore();
  const { now } = useClock();
  const actions = useDeskActions();
  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [courtId, setCourtId] = React.useState<CourtId>(prefill.courtId);
  const [startMinute, setStartMinute] = React.useState(prefill.startMinute);
  const [duration, setDuration] = React.useState(60);
  const [settle, setSettle] = React.useState<Settle>("venue");
  const [errors, setErrors] = React.useState<{ customer?: string; name?: string; phone?: string }>({});
  const [busy, setBusy] = React.useState(false);

  const hours = state.settings.hours[weekdayOf(prefill.date)];
  const starts: number[] = [];
  for (let m = hours.open; m + 30 <= hours.close; m += 30) starts.push(m);
  const span = { courtId, date: prefill.date, startMinute, durationMinutes: duration };
  const conflict = findConflict(state.bookings, span, now());
  const pastClose = startMinute + duration > hours.close;
  const price = priceFor(state.settings, prefill.date, startMinute, duration);
  const slotError = conflict ? `${COURTS.find((c) => c.id === courtId)?.name} is taken ${timeRangeOf(conflict)}.` : pastClose ? "That runs past closing time." : null;

  const save = async (): Promise<void> => {
    const next: typeof errors = {};
    let who = customer;
    let created: Customer | undefined;
    if (adding) {
      const check = checkIndianPhone(phone);
      if (!name.trim()) next.name = "Enter their name.";
      if (check.problem) next.phone = describePhoneProblem(check.problem);
      if (!next.name && check.phone) {
        who = customerByPhone(state, check.phone) ?? null;
        if (!who) created = who = newCustomer(name, check.phone, now());
      }
    } else if (!who) next.customer = "Pick a customer, or add a new one.";
    setErrors(next);
    if (Object.keys(next).length > 0 || slotError || !who) return;

    const booking: Booking = {
      id: makeId("bk"),
      courtId,
      date: prefill.date,
      startMinute,
      durationMinutes: duration,
      customerId: who.id,
      kind: "booking",
      title: "",
      players: 4,
      notes: "",
      source: "desk",
      status: "confirmed",
      payMode: "venue",
      pricePaise: price,
      holdExpiresAt: null,
      createdAt: now(),
      cancelledAt: null,
      ledger: settle === "cash" ? [{ id: makeId("le"), at: now(), kind: "cash", amountPaise: price, note: "Cash at the desk" }] : [],
    };
    setBusy(true);
    await actions.create(booking, created);
    setBusy(false);
    onDone();
  };

  return (
    <form
      className="flex min-h-0 flex-col"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <DialogHeader>
        <DialogTitle>New booking</DialogTitle>
        <DialogDescription>{longDayOf(prefill.date)}</DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-4">
        {adding ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field invalid={Boolean(errors.name)}>
              <FieldLabel>Name</FieldLabel>
              <Input autoComplete="off" onChange={(e) => setName(e.target.value)} value={name} />
              {errors.name && <FieldError match>{errors.name}</FieldError>}
            </Field>
            <Field invalid={Boolean(errors.phone)}>
              <FieldLabel>Mobile (+91)</FieldLabel>
              <Input inputMode="tel" onChange={(e) => setPhone(e.target.value)} type="tel" value={phone} />
              {errors.phone && <FieldError match>{errors.phone}</FieldError>}
            </Field>
            <Button className="justify-self-start" onClick={() => setAdding(false)} size="sm" variant="link">
              <UsersIcon aria-hidden="true" />
              Pick a known customer instead
            </Button>
          </div>
        ) : (
          <Field className="w-full" invalid={Boolean(errors.customer)}>
            <FieldLabel>Customer</FieldLabel>
            <Combobox<Customer>
              filter={(item, query) => {
                const q = query.trim().toLowerCase();
                return !q || item.name.toLowerCase().includes(q) || item.phone.includes(q.replaceAll(/\D/g, "") || "~");
              }}
              isItemEqualToValue={(a, b) => a.id === b.id}
              itemToStringLabel={(c) => c.name}
              items={state.customers}
              onValueChange={(value) => {
                setCustomer(value);
                setErrors((prev) => ({ ...prev, customer: undefined }));
              }}
              value={customer}
            >
              <ComboboxInput placeholder="Search by name or phone" />
              <ComboboxPopup>
                <ComboboxEmpty>No customer matches. Add them as new.</ComboboxEmpty>
                <ComboboxList>
                  {(c: Customer) => (
                    <ComboboxItem key={c.id} value={c}>
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate">{c.name}</span>
                        <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground text-xs tabular-nums">
                          {c.payFirst && <Badge variant="warning">Pay first</Badge>}
                          {formatPhone(c.phone)}
                        </span>
                      </span>
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxPopup>
            </Combobox>
            {errors.customer && <FieldError match>{errors.customer}</FieldError>}
            <Button className="-ms-0" onClick={() => setAdding(true)} size="sm" variant="link">
              <UserPlusIcon aria-hidden="true" />
              New customer
            </Button>
          </Field>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label id="nb-court">Court</Label>
            <Select<CourtId> items={COURTS.map((c) => ({ label: c.name, value: c.id }))} onValueChange={(v) => v && setCourtId(v)} value={courtId}>
              <SelectTrigger aria-labelledby="nb-court" className="min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {COURTS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label id="nb-start">Start</Label>
            <Select<number> items={starts.map((m) => ({ label: minuteLabel(m, prefill.date), value: m }))} onValueChange={(v) => v !== null && setStartMinute(v)} value={startMinute}>
              <SelectTrigger aria-labelledby="nb-start" className="min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {starts.map((m) => (
                  <SelectItem key={m} value={m}>
                    {minuteLabel(m, prefill.date)}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label id="nb-duration">Duration</Label>
            <Select<number> items={DURATIONS_MINUTES.map((d) => ({ label: durationOf(d), value: d }))} onValueChange={(v) => v !== null && setDuration(v)} value={duration}>
              <SelectTrigger aria-labelledby="nb-duration" className="min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {DURATIONS_MINUTES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {durationOf(d)}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
        </div>
        {slotError && (
          <p className="text-destructive-foreground text-sm" role="alert">
            {slotError}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <Label id="nb-settle">Payment</Label>
          <SegmentedControl<Settle> aria-labelledby="nb-settle" fill onValueChange={setSettle} value={settle}>
            <SegmentedControlItem<Settle> value="venue">Due at the venue</SegmentedControlItem>
            <SegmentedControlItem<Settle> value="cash">Paid in cash now</SegmentedControlItem>
          </SegmentedControl>
        </div>
      </DialogPanel>
      <DialogFooter className="items-center sm:justify-between">
        <span className="text-muted-foreground text-sm">
          {timeRangeOf(span)} · <span className="font-medium text-foreground tabular-nums">{formatInr(price)}</span>
        </span>
        <Button disabled={Boolean(slotError)} loading={busy} type="submit">
          Add booking
        </Button>
      </DialogFooter>
    </form>
  );
}
