"use client";

/**
 * The booking's dialogs, on the data client: record a payment, move or edit,
 * cancel. The detail page and the bookings list open the same ones, so a
 * payment recorded from a row reads exactly like one recorded on the page.
 * Each shows the backend's refusal where it applies: a clash inline, a field
 * error under its field, anything else in a toast.
 */
import { CalendarIcon, CalendarX2Icon } from "lucide-react";
import * as React from "react";
import { useClock } from "@/app/clock";
import { cancelLabel } from "@/app/desk/booking-rules";
import { durationOf, longDayOf, minuteLabel, whenOf } from "@/app/format";
import { LazyCalendar } from "@/components/booking/lazy-calendar";
import { RadioCard } from "@/components/compositions/radio-card";
import { SegmentedControl, SegmentedControlItem } from "@/components/compositions/segmented-control";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberField, NumberFieldGroup, NumberFieldInput } from "@/components/ui/number-field";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioPrimitive } from "@/components/ui/radio-group";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import type { PayMethod } from "@/data/client";
import { errorMessage, isDataError } from "@/data/errors";
import { useDataClient, useRead, useWrite } from "@/data/provider";
import type { BookingPatch, Viewer } from "@/data/types";
import { type Booking, bookingStart, duePaise, paidPaise } from "@/lib/booking";
import { formatInr } from "@/lib/money";
import { fromLocalDate, type PlainDate, toLocalDate, weekdayOf } from "@/lib/plain-date";
import { COURTS, type CourtId, courtName, DURATIONS_MINUTES, priceFor } from "@/lib/venue";
import { cn } from "@/lib/utils";

/** The booking a dialog is about, and the name to call it by ("Kabir Singh", or a block's title). */
export interface BookingTarget {
  booking: Booking;
  name: string;
}

/** Keep the last target on screen while a dialog animates out. */
function useShown(target: BookingTarget | null): BookingTarget | null {
  const [last, setLast] = React.useState(target);
  if (target && target !== last) setLast(target);
  return target ?? last;
}

/** A toast for a write the backend refused: its own sentence. */
export function toastRefusal(title: string, error: unknown): void {
  toastManager.add({ title, description: errorMessage(error), type: "error" });
}

/* ── Record payment ─────────────────────────────────────────────────── */

/**
 * Money in at the desk, cash or online (a UPI transfer to the venue),
 * prefilled with the balance. Part payments are fine; more than is due is
 * refused here and again by the backend.
 */
export function RecordPaymentDialog({ target, onClose }: { target: BookingTarget | null; onClose: () => void }): React.ReactElement {
  const shown = useShown(target);
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={target !== null}>
      <DialogPopup>{shown && <RecordPaymentForm key={shown.booking.id} onDone={onClose} target={shown} />}</DialogPopup>
    </Dialog>
  );
}

function RecordPaymentForm({ target, onDone }: { target: BookingTarget; onDone: () => void }): React.ReactElement {
  const { booking, name } = target;
  const due = duePaise(booking);
  const [method, setMethod] = React.useState<PayMethod>("cash");
  const [rupees, setRupees] = React.useState<number | null>(due / 100);
  const [reference, setReference] = React.useState("");
  const [refused, setRefused] = React.useState<string | null>(null);
  const pay = useWrite((c, input: { method: PayMethod; amountPaise: number; note?: string }) => c.bookings.recordPayment(booking.id, input));
  const amount = rupees === null ? 0 : Math.round(rupees * 100);
  const amountError = refused ?? (rupees !== null && amount > due ? `That's more than the ${formatInr(due)} due.` : rupees !== null && amount <= 0 ? "Enter an amount above ₹0." : null);
  const valid = rupees !== null && amount > 0 && amount <= due;

  const save = async (): Promise<void> => {
    if (!valid) return;
    try {
      await pay.mutateAsync({ method, amountPaise: amount, note: method === "online" ? reference : undefined });
    } catch (error) {
      if (isDataError(error) && error.fields.amount) setRefused(error.message);
      else toastRefusal("Payment not recorded", error);
      return;
    }
    const left = due - amount;
    toastManager.add({
      title: `${formatInr(amount)} recorded for ${name}`,
      description: `${method === "cash" ? "Cash" : "Online"} · ${left > 0 ? `${formatInr(left)} still due` : "paid in full"}`,
      type: "success",
    });
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Record payment</DialogTitle>
        <DialogDescription>
          {name} · {courtName(booking.courtId)}, {whenOf(booking)}
        </DialogDescription>
      </DialogHeader>
      <Form
        className="contents"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <DialogPanel className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label id="pay-method">Paid by</Label>
            <SegmentedControl<PayMethod> aria-labelledby="pay-method" fill onValueChange={setMethod} value={method}>
              <SegmentedControlItem<PayMethod> value="cash">Cash</SegmentedControlItem>
              <SegmentedControlItem<PayMethod> value="online">Online (UPI)</SegmentedControlItem>
            </SegmentedControl>
          </div>
          <Field invalid={Boolean(amountError)}>
            <FieldLabel>Amount</FieldLabel>
            <NumberField
              format={{ style: "currency", currency: "INR", maximumFractionDigits: 0 }}
              locale="en-IN"
              min={0}
              onValueChange={(value) => {
                setRupees(value);
                setRefused(null);
              }}
              step={1}
              value={rupees}
            >
              <NumberFieldGroup className="w-48">
                <NumberFieldInput className="tabular-nums" />
              </NumberFieldGroup>
            </NumberField>
            {amountError ? <FieldError match>{amountError}</FieldError> : <FieldDescription>{formatInr(due)} is due. Part payments are fine.</FieldDescription>}
          </Field>
          {method === "online" && (
            <Field>
              <FieldLabel>Reference (optional)</FieldLabel>
              <Input onChange={(e) => setReference(e.target.value)} placeholder="UPI reference or a note" type="text" value={reference} />
            </Field>
          )}
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button disabled={!valid} loading={pay.isPending} type="submit">
            Record {valid ? formatInr(amount) : "payment"}
          </Button>
        </DialogFooter>
      </Form>
    </>
  );
}

/* ── Move or edit ───────────────────────────────────────────────────── */

const DAY_START = 6 * 60;
const DAY_END = 23 * 60;

/**
 * Court, date, start and length, the price (with a reason, for the activity
 * log) and the notes, in one form. Only what changed is sent. A clash comes
 * back from the backend and shows inline, naming who has the court.
 */
export function EditBookingDialog({ target, viewer, onClose }: { target: BookingTarget | null; viewer: Viewer | null; onClose: () => void }): React.ReactElement {
  const shown = useShown(target);
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={target !== null}>
      <DialogPopup className="sm:max-w-xl">{shown && <EditBookingForm key={shown.booking.id} onDone={onClose} target={shown} viewer={viewer} />}</DialogPopup>
    </Dialog>
  );
}

function EditBookingForm({ target, viewer, onDone }: { target: BookingTarget; viewer: Viewer | null; onDone: () => void }): React.ReactElement {
  const { booking, name } = target;
  const client = useDataClient();
  const settings = useRead(["availability", "settings"], (c) => c.availability.settings());
  const [courtId, setCourtId] = React.useState<CourtId>(booking.courtId);
  const [date, setDate] = React.useState<PlainDate>(booking.date);
  const [startMinute, setStartMinute] = React.useState(booking.startMinute);
  const [duration, setDuration] = React.useState(booking.durationMinutes);
  const [rupees, setRupees] = React.useState<number | null>(booking.pricePaise / 100);
  const [reason, setReason] = React.useState("");
  const [notes, setNotes] = React.useState(booking.notes);
  const [dateOpen, setDateOpen] = React.useState(false);
  const [refusal, setRefusal] = React.useState<{ clash: string | null; fields: Record<string, string> }>({ clash: null, fields: {} });
  const save = useWrite((c, patch: BookingPatch) => c.bookings.update(booking.id, patch));
  const isBooking = booking.kind === "booking";
  const canPrice = Boolean(viewer?.can.handleMoney) && isBooking;

  const hours = settings.data?.hours[weekdayOf(date)];
  const open = hours && !hours.closed ? hours.open : DAY_START;
  const close = hours && !hours.closed ? hours.close : DAY_END;
  const starts: number[] = [];
  for (let m = Math.min(open, booking.startMinute); m + 30 <= Math.max(close, booking.startMinute + 30); m += 30) starts.push(m);
  const durations = [...new Set([...DURATIONS_MINUTES, booking.durationMinutes])].sort((a, b) => a - b);
  const pricePaise = rupees === null ? booking.pricePaise : Math.round(rupees * 100);
  const moved = courtId !== booking.courtId || date !== booking.date || startMinute !== booking.startMinute || duration !== booking.durationMinutes;
  const repriced = pricePaise !== booking.pricePaise;
  const standard = settings.data && isBooking ? priceFor(settings.data, date, startMinute, duration) : null;
  const patch: BookingPatch = {
    ...(courtId !== booking.courtId ? { courtId } : {}),
    ...(date !== booking.date ? { date } : {}),
    ...(startMinute !== booking.startMinute ? { startMinute } : {}),
    ...(duration !== booking.durationMinutes ? { durationMinutes: duration } : {}),
    ...(repriced ? { pricePaise, priceReason: reason.trim() } : {}),
    ...(notes !== booking.notes ? { notes } : {}),
  };
  const dirty = Object.keys(patch).length > 0;
  const fieldError = (key: string): string | null => refusal.fields[key] ?? null;
  const clear = (): void => setRefusal({ clash: null, fields: {} });
  const reasonMissing = repriced && !reason.trim();

  const submit = async (): Promise<void> => {
    if (!dirty) return;
    if (reasonMissing) {
      setRefusal({ clash: null, fields: { priceReason: "Say why the price changed." } });
      return;
    }
    let saved: Booking;
    try {
      saved = await save.mutateAsync(patch);
    } catch (error) {
      if (isDataError(error) && error.code === "clash") setRefusal({ clash: error.message, fields: {} });
      else if (isDataError(error) && Object.keys(error.fields).length > 0) setRefusal({ clash: null, fields: error.fields });
      else toastRefusal("Changes not saved", error);
      return;
    }
    const before: BookingPatch = {
      courtId: booking.courtId,
      date: booking.date,
      startMinute: booking.startMinute,
      durationMinutes: booking.durationMinutes,
      notes: booking.notes,
      ...(repriced ? { pricePaise: booking.pricePaise, priceReason: "Undone" } : {}),
    };
    toastManager.add({
      title: moved ? "Booking moved" : "Booking updated",
      description: moved ? `${name} · ${courtName(saved.courtId)}, ${whenOf(saved)}` : repriced ? `${name} · now ${formatInr(saved.pricePaise)}` : `${name} · notes saved`,
      type: "success",
      actionProps: {
        children: "Undo",
        onClick: () => {
          client.bookings.update(booking.id, before).catch((error: unknown) => toastRefusal("Couldn't undo", error));
        },
      },
    });
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Move or edit</DialogTitle>
        <DialogDescription>
          {name} · now {courtName(booking.courtId)}, {whenOf(booking)}
        </DialogDescription>
      </DialogHeader>
      <Form
        className="contents"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <DialogPanel className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Court</FieldLabel>
              <Select<CourtId>
                items={COURTS.map((c) => ({ label: c.name, value: c.id }))}
                onValueChange={(v) => {
                  if (v) setCourtId(v);
                  clear();
                }}
                value={courtId}
              >
                <SelectTrigger className="w-full min-w-0">
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
            </Field>
            <div className="flex flex-col items-start gap-2">
              <span className="font-medium text-base/4.5 sm:text-sm/4" id="edit-date-label">
                Date
              </span>
              <Popover onOpenChange={setDateOpen} open={dateOpen}>
                <PopoverTrigger
                  render={<Button aria-labelledby="edit-date-label edit-date-value" className="w-full justify-start font-normal" variant="outline" />}
                >
                  <CalendarIcon aria-hidden="true" />
                  <span id="edit-date-value">{longDayOf(date)}</span>
                </PopoverTrigger>
                <PopoverPopup align="start">
                  <LazyCalendar
                    defaultMonth={toLocalDate(date)}
                    mode="single"
                    onSelect={(picked) => {
                      if (!picked) return;
                      setDate(fromLocalDate(picked));
                      setDateOpen(false);
                      clear();
                    }}
                    selected={toLocalDate(date)}
                  />
                </PopoverPopup>
              </Popover>
            </div>
            <Field>
              <FieldLabel>Start</FieldLabel>
              <Select<number>
                items={starts.map((m) => ({ label: minuteLabel(m, date), value: m }))}
                onValueChange={(v) => {
                  if (v !== null) setStartMinute(v);
                  clear();
                }}
                value={startMinute}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {starts.map((m) => (
                    <SelectItem key={m} value={m}>
                      {minuteLabel(m, date)}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Length</FieldLabel>
              <Select<number>
                items={durations.map((d) => ({ label: durationOf(d), value: d }))}
                onValueChange={(v) => {
                  if (v !== null) setDuration(v);
                  clear();
                }}
                value={duration}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {durations.map((d) => (
                    <SelectItem key={d} value={d}>
                      {durationOf(d)}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </Field>
          </div>
          {hours?.closed && <p className="text-muted-foreground text-sm">The venue is normally closed on this day. The booking still saves, as a record of what happened.</p>}
          {refusal.clash && (
            <Alert variant="error">
              <CalendarX2Icon aria-hidden="true" />
              <AlertDescription>{refusal.clash}</AlertDescription>
            </Alert>
          )}

          {isBooking && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field disabled={!canPrice} invalid={Boolean(fieldError("price"))}>
                <FieldLabel>Price</FieldLabel>
                <NumberField
                  disabled={!canPrice}
                  format={{ style: "currency", currency: "INR", maximumFractionDigits: 0 }}
                  locale="en-IN"
                  min={0}
                  onValueChange={(v) => {
                    setRupees(v);
                    clear();
                  }}
                  step={1}
                  value={rupees}
                >
                  <NumberFieldGroup className="w-full">
                    <NumberFieldInput className="tabular-nums" />
                  </NumberFieldGroup>
                </NumberField>
                {fieldError("price") ? (
                  <FieldError match>{fieldError("price")}</FieldError>
                ) : !canPrice ? (
                  <FieldDescription>{viewer ? "Your role can't change prices. Ask an admin." : null}</FieldDescription>
                ) : standard !== null && standard !== pricePaise ? (
                  <FieldDescription>
                    The usual price for this slot is {formatInr(standard)}.{" "}
                    <Button
                      className="h-auto p-0 align-baseline text-xs sm:h-auto"
                      onClick={() => {
                        setRupees(standard / 100);
                        if (!reason.trim() && moved) setReason("Moved to another slot");
                      }}
                      size="xs"
                      variant="link"
                    >
                      Use {formatInr(standard)}
                    </Button>
                  </FieldDescription>
                ) : (
                  <FieldDescription>Paid so far: {formatInr(Math.max(0, paidPaise(booking)))}.</FieldDescription>
                )}
              </Field>
              <Field disabled={!repriced} invalid={Boolean(fieldError("priceReason"))}>
                <FieldLabel>Why the price changed</FieldLabel>
                <Input
                  disabled={!repriced}
                  maxLength={100}
                  onChange={(e) => {
                    setReason(e.target.value);
                    clear();
                  }}
                  placeholder={repriced ? "Regular's discount" : "Only when the price changes"}
                  type="text"
                  value={reason}
                />
                {fieldError("priceReason") && <FieldError match>{fieldError("priceReason")}</FieldError>}
              </Field>
            </div>
          )}

          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Textarea onChange={(e) => setNotes(e.target.value)} placeholder="Bringing their own paddles" value={notes} />
          </Field>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button disabled={!dirty} loading={save.isPending} type="submit">
            Save changes
          </Button>
        </DialogFooter>
      </Form>
    </>
  );
}

/* ── Cancel ─────────────────────────────────────────────────────────── */

const REASONS = ["Customer asked", "Rain or weather", "Court problem", "Booked twice", "Didn't pay", "Something else"] as const;
type Reason = (typeof REASONS)[number];

/**
 * Cancel a booking (release a hold, remove a block): a reason is required,
 * from a few chips, with a note for "Something else". With money in, the desk
 * chooses credit (the default: the money stays and comes off the next
 * booking) or a refund. Put back undoes it.
 */
export function CancelBookingDialog({ target, onClose }: { target: BookingTarget | null; onClose: () => void }): React.ReactElement {
  const shown = useShown(target);
  return (
    <AlertDialog onOpenChange={(open) => !open && onClose()} open={target !== null}>
      <AlertDialogPopup>{shown && <CancelForm key={shown.booking.id} onDone={onClose} target={shown} />}</AlertDialogPopup>
    </AlertDialog>
  );
}

function CancelForm({ target, onDone }: { target: BookingTarget; onDone: () => void }): React.ReactElement {
  const { booking, name } = target;
  const client = useDataClient();
  const { now } = useClock();
  const [reason, setReason] = React.useState<Reason | null>(null);
  const [note, setNote] = React.useState("");
  const [resolution, setResolution] = React.useState<"credit" | "refund">("credit");
  const [errors, setErrors] = React.useState<{ reason?: string; note?: string }>({});
  const cancel = useWrite((c, input: { resolution: "credit" | "refund"; reason: string }) => c.bookings.cancel(booking.id, input));
  const paid = Math.max(0, paidPaise(booking));
  const verb = cancelLabel(booking);
  const past = bookingStart(booking) <= now();

  const confirm = async (): Promise<void> => {
    const next: typeof errors = {};
    if (!reason) next.reason = "Pick a reason.";
    if (reason === "Something else" && !note.trim()) next.note = "Say what happened.";
    setErrors(next);
    if (!reason || Object.keys(next).length > 0) return;
    const text = reason === "Something else" ? note.trim() : note.trim() ? `${reason}: ${note.trim()}` : reason;
    try {
      await cancel.mutateAsync({ resolution, reason: text });
    } catch (error) {
      toastRefusal(`${verb} didn't go through`, error);
      return;
    }
    toastManager.add({
      title: booking.status === "held" ? "Hold released" : booking.kind === "booking" ? "Booking cancelled" : "Block removed",
      description: paid <= 0 ? `${name} · nothing was paid` : resolution === "credit" ? `${formatInr(paid)} kept as credit for ${name}` : `${formatInr(paid)} refund started for ${name}`,
      type: "info",
      actionProps: {
        children: "Undo",
        onClick: () => {
          client.bookings.restore(booking.id).catch((error: unknown) => toastRefusal("Couldn't put it back", error));
        },
      },
    });
    onDone();
  };

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{verb}?</AlertDialogTitle>
        <AlertDialogDescription>
          {name} · {courtName(booking.courtId)}, {whenOf(booking)}. {past ? "The time has passed, so this only corrects the record." : "The court becomes free to book."}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="flex flex-col gap-5 px-6 pb-6">
        <Fieldset className="flex flex-col gap-2">
          <FieldsetLegend className="font-medium text-sm">Reason</FieldsetLegend>
          <RadioGroup
            aria-describedby={errors.reason ? "cancel-reason-error" : undefined}
            aria-label="Reason"
            className="flex flex-row flex-wrap gap-1.5"
            onValueChange={(v) => {
              setReason(v as Reason);
              setErrors({});
            }}
            value={reason}
          >
            {REASONS.map((r) => (
              <RadioPrimitive.Root
                className={cn(
                  "inline-flex h-8 cursor-pointer items-center rounded-full border border-input bg-background px-3 text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground sm:h-7",
                  errors.reason && "border-destructive/48",
                )}
                key={r}
                value={r}
              >
                {r}
              </RadioPrimitive.Root>
            ))}
          </RadioGroup>
          {errors.reason && (
            <p className="text-destructive-foreground text-xs" id="cancel-reason-error">
              {errors.reason}
            </p>
          )}
        </Fieldset>
        <Field invalid={Boolean(errors.note)}>
          <FieldLabel>{reason === "Something else" ? "What happened" : "Note (optional)"}</FieldLabel>
          <Input
            maxLength={120}
            onChange={(e) => {
              setNote(e.target.value);
              setErrors((prev) => ({ ...prev, note: undefined }));
            }}
            type="text"
            value={note}
          />
          {errors.note && <FieldError match>{errors.note}</FieldError>}
        </Field>
        {paid > 0 && (
          <RadioGroup aria-label={`What happens to the ${formatInr(paid)} paid`} onValueChange={(v) => setResolution(v as "credit" | "refund")} value={resolution}>
            <RadioCard value="credit">
              <span className="font-medium text-sm">Keep {formatInr(paid)} as credit</span>
              <span className="text-muted-foreground text-sm">The money stays with the venue and comes off their next booking.</span>
            </RadioCard>
            <RadioCard value="refund">
              <span className="font-medium text-sm">Refund {formatInr(paid)}</span>
              <span className="text-muted-foreground text-sm">Back to how they paid, in 5–7 working days.</span>
            </RadioCard>
          </RadioGroup>
        )}
      </div>
      <AlertDialogFooter>
        <AlertDialogClose disabled={cancel.isPending} render={<Button variant="ghost" />}>
          Keep it
        </AlertDialogClose>
        <Button loading={cancel.isPending} onClick={() => void confirm()} variant="destructive">
          {verb}
        </Button>
      </AlertDialogFooter>
    </>
  );
}
