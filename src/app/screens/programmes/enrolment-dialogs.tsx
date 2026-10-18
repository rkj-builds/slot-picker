"use client";

/**
 * Everything the desk does to an enrolment, in one place: Add a child,
 * Renew, Take payment, Pause, Stop, Give money back and Follow-up, as
 * dialogs; Resume and Undo stop straight away with a toast. A screen wraps
 * its table in `EnrolmentActionsProvider` and rows call `useEnrolmentActions()`.
 * Every change goes through `enrolments.*`, and a refusal is shown as the
 * backend said it, on the field it names.
 */
import { UserPlusIcon, UsersIcon } from "lucide-react";
import { ActionsContext, type AddPrefill, type EnrolmentActions, type EnrolmentDialog } from "@/app/screens/programmes/enrolment-actions";
import * as React from "react";
import { dayOf, longDayOf } from "@/app/format";
import { type Refusal, refusalOf } from "@/app/screens/programmes/hooks";
import { DateField, DialogForm, PayMethodField, RupeesField } from "@/app/screens/programmes/kit";
import { WholeField } from "@/app/screens/programmes/programme-form";
import { activePlans, enrolleeName, firstName, planLine, planOf } from "@/app/screens/programmes/programme-model";
import { RadioCard } from "@/components/compositions/radio-card";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Combobox, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxPopup } from "@/components/ui/combobox";
import { Dialog, DialogPopup } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import type { PayMethod } from "@/data/client";
import { errorMessage } from "@/data/errors";
import { enrolmentDue, ledgerPaid } from "@/data/money";
import { useRead, useWrite } from "@/data/provider";
import type { Customer, Enrolment, Programme } from "@/data/types";
import { formatInr } from "@/lib/money";
import { checkIndianPhone, describePhoneProblem, formatPhone } from "@/lib/phone";
import { addDays, compareDates, type PlainDate } from "@/lib/plain-date";
import { cn } from "@/lib/utils";

/** Hosts the dialogs. `initial` opens one on arrival (a link such as `?renew=<id>`); `onSettle` hears when it closes. */
export function EnrolmentActionsProvider({
  children,
  customers,
  programmes,
  enrolments,
  today,
  initial,
  onInitialClosed,
  onAdded,
}: {
  children: React.ReactNode;
  customers: readonly Customer[];
  programmes: readonly Programme[];
  enrolments: readonly Enrolment[];
  today: PlainDate;
  initial?: { dialog: EnrolmentDialog; id: string } | null;
  onInitialClosed?: () => void;
  /** After Add a child saves (the register uses it to show the walk-in). */
  onAdded?: (enrolment: Enrolment) => void;
}): React.ReactElement {
  const [target, setTarget] = React.useState<{ dialog: EnrolmentDialog; id: string } | null>(initial ?? null);
  const [adding, setAdding] = React.useState<AddPrefill | null>(null);
  const resumeWrite = useWrite((c, id: string) => c.enrolments.resume(id));
  const undoStopWrite = useWrite((c, id: string) => c.enrolments.undoStop(id));
  const stopWrite = useWrite((c, input: { id: string; on: PlainDate; reason: string }) => c.enrolments.stop(input.id, { on: input.on, reason: input.reason }));

  const live = enrolments.find((e) => e.id === target?.id);
  // Keep the last enrolment on screen while its dialog animates out.
  const [last, setLast] = React.useState(live);
  if (live && live !== last) setLast(live);
  const shown = live ?? last;
  const close = (): void => {
    if (initial && target?.id === initial.id) onInitialClosed?.();
    setTarget(null);
  };
  const nameOf = (e: Enrolment): string => enrolleeName(e, customers);

  const actions = React.useMemo<EnrolmentActions>(
    () => ({
      open: (dialog, e) => setTarget({ dialog, id: e.id }),
      add: (prefill) => setAdding(prefill ?? {}),
      resume: (e) => {
        resumeWrite
          .mutateAsync(e.id)
          .then(() => toastManager.add({ title: `${enrolleeName(e, customers)} is back on the register`, description: "The pause ended today.", type: "success" }))
          .catch((error: unknown) => toastManager.add({ title: "Couldn't end the pause", description: errorMessage(error), type: "error" }));
      },
      undoStop: (e) => {
        const { stoppedOn, stopReason } = e;
        undoStopWrite
          .mutateAsync(e.id)
          .then(() =>
            toastManager.add({
              title: `${enrolleeName(e, customers)} is back on the register`,
              type: "success",
              actionProps:
                stoppedOn && stopReason
                  ? { children: "Undo", onClick: () => void stopWrite.mutateAsync({ id: e.id, on: stoppedOn, reason: stopReason }) }
                  : undefined,
            }),
          )
          .catch((error: unknown) => toastManager.add({ title: "Couldn't put them back", description: errorMessage(error), type: "error" }));
      },
      customers,
      programmes,
      today,
    }),
    [customers, programmes, today, resumeWrite, undoStopWrite, stopWrite],
  );

  const programme = shown ? programmes.find((p) => p.id === shown.programmeId) : undefined;
  const common = { enrolment: shown, programme, name: shown ? nameOf(shown) : "", onClose: close, today };
  return (
    <ActionsContext.Provider value={actions}>
      {children}
      <Shell onClose={close} open={target?.dialog === "pay"}>{shown && <PayForm {...common} enrolment={shown} />}</Shell>
      <Shell onClose={close} open={target?.dialog === "renew"}>
        {shown && <RenewForm {...common} enrolment={shown} onTakePayment={() => setTarget({ dialog: "pay", id: shown.id })} />}
      </Shell>
      <Shell onClose={close} open={target?.dialog === "pause"}>{shown && <PauseForm {...common} enrolment={shown} />}</Shell>
      <Shell onClose={close} open={target?.dialog === "stop"}>{shown && <StopForm {...common} enrolment={shown} />}</Shell>
      <Shell onClose={close} open={target?.dialog === "give-back"}>{shown && <GiveBackForm {...common} enrolment={shown} />}</Shell>
      <Shell onClose={close} open={target?.dialog === "follow-up"}>{shown && <FollowUpForm {...common} enrolment={shown} />}</Shell>
      <Shell onClose={() => setAdding(null)} open={adding !== null} wide>
        {adding && <AddChildForm customers={customers} onAdded={onAdded} onClose={() => setAdding(null)} prefill={adding} programmes={programmes} today={today} />}
      </Shell>
    </ActionsContext.Provider>
  );
}

function Shell({ open, onClose, children, wide = false }: { open: boolean; onClose: () => void; children: React.ReactNode; wide?: boolean }): React.ReactElement {
  return (
    <Dialog onOpenChange={(next) => !next && onClose()} open={open}>
      <DialogPopup className={wide ? "sm:max-w-xl" : undefined}>{open && children}</DialogPopup>
    </Dialog>
  );
}

interface FormProps {
  enrolment: Enrolment;
  programme: Programme | undefined;
  name: string;
  onClose: () => void;
  today: PlainDate;
}

function periodLine(e: Enrolment, programme: Programme | undefined): string {
  const plan = planOf(programme, e.planId);
  return `${plan?.name ?? "Plan"} · paid until ${dayOf(e.paidUntil)}`;
}

/* ── Take payment ───────────────────────────────────────────────────── */

function PayForm({ enrolment: e, programme, name, onClose }: FormProps): React.ReactElement {
  const due = enrolmentDue(e);
  const [amount, setAmount] = React.useState(due);
  const [method, setMethod] = React.useState<PayMethod>("cash");
  const [refusal, setRefusal] = React.useState<Refusal>(null);
  const pay = useWrite((c, input: { method: PayMethod; amountPaise: number }) => c.enrolments.recordPayment(e.id, input));
  const submit = async (): Promise<void> => {
    setRefusal(null);
    try {
      await pay.mutateAsync({ method, amountPaise: amount });
      const left = due - amount;
      toastManager.add({ title: `${formatInr(amount)} recorded for ${name}`, description: left > 0 ? `${formatInr(left)} still due` : "Paid up for this period", type: "success" });
      onClose();
    } catch (error) {
      setRefusal(refusalOf(error));
    }
  };
  return (
    <DialogForm
      description={`${name} · ${periodLine(e, programme)}`}
      onClose={onClose}
      onSubmit={() => void submit()}
      pending={pay.isPending}
      refusal={refusal}
      submitLabel={`Record ${formatInr(amount)}`}
      title="Take payment"
    >
      <RupeesField description={due > 0 ? `${formatInr(due)} is due. Part payments are fine.` : "Nothing is due for this period."} label="Amount received" onChange={setAmount} paise={amount} />
      <PayMethodField onChange={setMethod} value={method} />
    </DialogForm>
  );
}

/* ── Renew ──────────────────────────────────────────────────────────── */

function RenewForm({ enrolment: e, programme, name, onClose, today, onTakePayment }: FormProps & { onTakePayment: () => void }): React.ReactElement {
  const plans = programme ? activePlans(programme) : [];
  const [planId, setPlanId] = React.useState(plans.some((p) => p.id === e.planId) ? e.planId : (plans[0]?.id ?? e.planId));
  const [startsOn, setStartsOn] = React.useState<PlainDate>(compareDates(e.paidUntil, addDays(today, -1)) >= 0 ? addDays(e.paidUntil, 1) : today);
  const [paidNow, setPaidNow] = React.useState(true);
  const [method, setMethod] = React.useState<PayMethod>("cash");
  const [amount, setAmount] = React.useState<number | null>(null);
  const [refusal, setRefusal] = React.useState<Refusal>(null);
  const preview = useRead(["enrolment-renew-preview", e.id, planId, startsOn], (c) => c.enrolments.previewRenew(e.id, { planId, startsOn }));
  const renew = useWrite((c, input: { planId: string; startsOn: PlainDate; paid: { method: PayMethod; amountPaise: number } | null }) => c.enrolments.renew(e.id, input));
  const owes = enrolmentDue(e);
  const due = preview.data?.duePaise ?? 0;
  const paying = amount ?? due;

  const submit = async (): Promise<void> => {
    setRefusal(null);
    try {
      const after = await renew.mutateAsync({ planId, startsOn, paid: paidNow && paying > 0 ? { method, amountPaise: paying } : null });
      const credit = preview.data?.creditAppliedPaise ?? 0;
      const bits = [paidNow && paying > 0 ? `${formatInr(paying)} ${method === "cash" ? "cash" : "online"} taken` : due > 0 ? `${formatInr(due)} still due` : null, credit > 0 ? `${formatInr(credit)} credit used` : null].filter(Boolean);
      toastManager.add({ title: `${name} renewed until ${dayOf(after.paidUntil)}`, description: bits.join(" · ") || undefined, type: "success" });
      onClose();
    } catch (error) {
      setRefusal(refusalOf(error));
    }
  };

  return (
    <DialogForm
      description={`${name} · ${programme?.name ?? "Programme"}`}
      onClose={onClose}
      onSubmit={() => void submit()}
      pending={renew.isPending}
      refusal={refusal}
      submitDisabled={!preview.data}
      submitLabel={preview.data ? `Renew until ${dayOf(preview.data.paidUntil)}` : "Renew"}
      title="Renew"
    >
      {owes > 0 && (
        <Alert variant="warning">
          <AlertDescription>
            {firstName(name)} still owes {formatInr(owes)} for this period. Take that before renewing.
          </AlertDescription>
          <AlertAction>
            <Button onClick={onTakePayment} size="sm" variant="outline">
              Take payment
            </Button>
          </AlertAction>
        </Alert>
      )}
      <Field name="planId" render={(props) => <div {...props} />}>
        <span className="font-medium text-sm" id={`renew-plan-${e.id}`}>
          Plan
        </span>
        <RadioGroup aria-labelledby={`renew-plan-${e.id}`} onValueChange={(v) => {
          setPlanId(v as string);
          setAmount(null);
        }} value={planId}>
          {plans.map((plan) => (
            <RadioCard key={plan.id} value={plan.id}>
              <span className="font-medium text-sm">{plan.name}</span>
              <span className="text-muted-foreground text-sm">{planLine(plan)}</span>
            </RadioCard>
          ))}
        </RadioGroup>
        <FieldError />
      </Field>
      <DateField
        description={compareDates(e.paidUntil, today) >= 0 ? `Their current period ends ${longDayOf(e.paidUntil)}.` : `Their last period ended ${longDayOf(e.paidUntil)}.`}
        label="New period starts"
        name="startsOn"
        onChange={(date) => {
          setStartsOn(date);
          setAmount(null);
        }}
        value={startsOn}
      />
      <section aria-labelledby={`renew-preview-${e.id}`} aria-live="polite" className="rounded-xl border bg-muted/40 p-3">
        <h3 className="sr-only" id={`renew-preview-${e.id}`}>
          What renewing does
        </h3>
        {preview.isPending ? (
          <Skeleton className="h-20" />
        ) : preview.isError ? (
          <p className="text-destructive-foreground text-sm">{errorMessage(preview.error)}</p>
        ) : (
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Paid until</dt>
            <dd className="text-end font-medium">{longDayOf(preview.data.paidUntil)}</dd>
            <dt className="text-muted-foreground">Price</dt>
            <dd className="text-end tabular-nums">{formatInr(preview.data.pricePaise)}</dd>
            {preview.data.creditAppliedPaise > 0 && (
              <>
                <dt className="text-muted-foreground">Credit applied</dt>
                <dd className="text-end text-success-foreground tabular-nums">−{formatInr(preview.data.creditAppliedPaise)}</dd>
              </>
            )}
            <dt className="font-medium">Due</dt>
            <dd className="text-end font-semibold tabular-nums">{formatInr(preview.data.duePaise)}</dd>
          </dl>
        )}
      </section>
      {due > 0 && (
        <>
          <Field className="flex-row items-center gap-3">
            <Switch checked={paidNow} onCheckedChange={setPaidNow} />
            <FieldLabel>They paid now</FieldLabel>
          </Field>
          {paidNow ? (
            <>
              <RupeesField label="Amount received" onChange={setAmount} paise={paying} />
              <PayMethodField onChange={setMethod} value={method} />
            </>
          ) : (
            <p className="text-muted-foreground text-sm">{formatInr(due)} goes on their record as owed, and they show up in To chase.</p>
          )}
        </>
      )}
    </DialogForm>
  );
}

/* ── Pause ──────────────────────────────────────────────────────────── */

function PauseForm({ enrolment: e, programme, name, onClose, today }: FormProps): React.ReactElement {
  const [from, setFrom] = React.useState<PlainDate>(today);
  const [until, setUntil] = React.useState<PlainDate>(addDays(today, 13));
  const [refusal, setRefusal] = React.useState<Refusal>(null);
  const preview = useRead(["enrolment-pause-preview", e.id, from, until], (c) => c.enrolments.previewPause(e.id, { from, until }));
  const pause = useWrite((c, input: { from: PlainDate; until: PlainDate }) => c.enrolments.pause(e.id, input));
  const submit = async (): Promise<void> => {
    setRefusal(null);
    try {
      await pause.mutateAsync({ from, until });
      toastManager.add({ title: `${name} paused until ${dayOf(until)}`, description: preview.data ? `Paid until moves to ${dayOf(preview.data.paidUntil)}.` : undefined, type: "success" });
      onClose();
    } catch (error) {
      setRefusal(refusalOf(error));
    }
  };
  return (
    <DialogForm
      description={`${name} · ${periodLine(e, programme)}. Paused days are added to the end of what they've paid for.`}
      onClose={onClose}
      onSubmit={() => void submit()}
      pending={pause.isPending}
      refusal={refusal}
      submitLabel={`Pause ${firstName(name)}`}
      title="Pause"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField label="From" name="from" onChange={setFrom} value={from} />
        <DateField label="Until" name="until" onChange={setUntil} value={until} />
      </div>
      <p aria-live="polite" className="rounded-xl border bg-muted/40 p-3 text-sm">
        {preview.isPending ? (
          "Working out the new date…"
        ) : preview.isError ? (
          <span className="text-destructive-foreground">{errorMessage(preview.error)}</span>
        ) : (
          <>
            Paid until moves from {dayOf(e.paidUntil)} to <span className="font-medium">{longDayOf(preview.data.paidUntil)}</span>.
          </>
        )}
      </p>
    </DialogForm>
  );
}

/* ── Stop ───────────────────────────────────────────────────────────── */

const STOP_REASONS = ["Moved away", "Too much with school", "Didn't enjoy it", "Joined somewhere else"];

function StopForm({ enrolment: e, programme, name, onClose, today }: FormProps): React.ReactElement {
  const [on, setOn] = React.useState<PlainDate>(today);
  const [reason, setReason] = React.useState("");
  const [refusal, setRefusal] = React.useState<Refusal>(null);
  const stop = useWrite((c, input: { on: PlainDate; reason: string }) => c.enrolments.stop(e.id, input));
  const undo = useWrite((c, id: string) => c.enrolments.undoStop(id));
  const paid = Math.max(0, ledgerPaid(e.ledger));
  const submit = async (): Promise<void> => {
    setRefusal(null);
    try {
      await stop.mutateAsync({ on, reason });
      toastManager.add({
        title: `${name} stopped from ${dayOf(on)}`,
        description: "They're off the register and won't be chased.",
        type: "success",
        actionProps: { children: "Undo", onClick: () => void undo.mutateAsync(e.id) },
      });
      onClose();
    } catch (error) {
      setRefusal(refusalOf(error));
    }
  };
  return (
    <DialogForm
      description={`${name} · ${programme?.name ?? "Programme"}. They come off the register from this day; you can put them back.`}
      destructive
      onClose={onClose}
      onSubmit={() => void submit()}
      pending={stop.isPending}
      refusal={refusal}
      submitLabel={`Stop ${firstName(name)}`}
      title={`Stop ${firstName(name)}'s enrolment?`}
    >
      <DateField label="Last day on the register" name="on" onChange={setOn} value={on} />
      <Field name="reason">
        <FieldLabel>Why they're stopping</FieldLabel>
        <Textarea onChange={(event) => setReason(event.target.value)} rows={2} value={reason} />
        <div className="flex flex-wrap gap-1.5">
          {STOP_REASONS.map((r) => (
            <Button key={r} onClick={() => setReason(r)} size="xs" variant="outline">
              {r}
            </Button>
          ))}
        </div>
        <FieldDescription>So nobody chases them for a renewal.</FieldDescription>
        <FieldError />
      </Field>
      {paid > 0 && <p className="text-muted-foreground text-sm">{formatInr(paid)} was paid this period. Giving money back is separate: use Give money back after stopping.</p>}
    </DialogForm>
  );
}

/* ── Give money back ────────────────────────────────────────────────── */

function GiveBackForm({ enrolment: e, name, onClose }: FormProps): React.ReactElement {
  const preview = useRead(["enrolment-giveback-preview", e.id], (c) => c.enrolments.previewGiveBack(e.id));
  const [as, setAs] = React.useState<"credit" | "refund">("credit");
  const [amount, setAmount] = React.useState<number | null>(null);
  const [refusal, setRefusal] = React.useState<Refusal>(null);
  const give = useWrite((c, input: { as: "credit" | "refund"; amountPaise: number }) => c.enrolments.giveBack(e.id, input));
  const value = amount ?? preview.data?.amountPaise ?? 0;
  const paid = Math.max(0, ledgerPaid(e.ledger));
  const payer = name;
  const submit = async (): Promise<void> => {
    setRefusal(null);
    try {
      await give.mutateAsync({ as, amountPaise: value });
      toastManager.add({ title: as === "credit" ? `${formatInr(value)} kept as credit for ${payer}` : `${formatInr(value)} refunded for ${payer}`, description: as === "credit" ? "It comes off their next renewal." : "Hand it back the way they paid.", type: "success" });
      onClose();
    } catch (error) {
      setRefusal(refusalOf(error));
    }
  };
  return (
    <DialogForm
      description={`${name} · ${formatInr(paid)} paid this period`}
      onClose={onClose}
      onSubmit={() => void submit()}
      pending={give.isPending}
      refusal={refusal}
      submitDisabled={!preview.data || value <= 0}
      submitLabel={as === "credit" ? `Keep ${formatInr(value)} as credit` : `Refund ${formatInr(value)}`}
      title="Give money back"
    >
      <p aria-live="polite" className="rounded-xl border bg-muted/40 p-3 text-sm">
        {preview.isPending ? (
          "Working out the unused share…"
        ) : preview.isError ? (
          <span className="text-destructive-foreground">{errorMessage(preview.error)}</span>
        ) : (
          <>
            Unused share: <span className="font-medium tabular-nums">{formatInr(preview.data.amountPaise)}</span> ({preview.data.basis}).
          </>
        )}
      </p>
      <RadioGroup aria-label="How to give it back" onValueChange={(v) => setAs(v as "credit" | "refund")} value={as}>
        <RadioCard value="credit">
          <span className="font-medium text-sm">Keep as credit</span>
          <span className="text-muted-foreground text-sm">Stays with the venue and comes off their next renewal or booking.</span>
        </RadioCard>
        <RadioCard value="refund">
          <span className="font-medium text-sm">Refund</span>
          <span className="text-muted-foreground text-sm">Hand it back in cash or to the account they paid from.</span>
        </RadioCard>
      </RadioGroup>
      <RupeesField description={`Up to ${formatInr(paid)}, what was paid.`} label="Amount" onChange={setAmount} paise={value} />
    </DialogForm>
  );
}

/* ── Follow-up ──────────────────────────────────────────────────────── */

function FollowUpForm({ enrolment: e, name, onClose }: FormProps): React.ReactElement {
  const [note, setNote] = React.useState(e.followUp ?? "");
  const [refusal, setRefusal] = React.useState<Refusal>(null);
  const save = useWrite((c, value: string | null) => c.enrolments.setFollowUp(e.id, value));
  const submit = async (value: string | null): Promise<void> => {
    setRefusal(null);
    try {
      await save.mutateAsync(value);
      toastManager.add({ title: value ? `Follow-up saved for ${name}` : `Follow-up cleared for ${name}`, type: "success" });
      onClose();
    } catch (error) {
      setRefusal(refusalOf(error));
    }
  };
  return (
    <DialogForm
      description="A note for whoever chases next: what was said, and when to try again."
      onClose={onClose}
      onSubmit={() => void submit(note.trim() || null)}
      pending={save.isPending}
      refusal={refusal}
      submitDisabled={note.trim() === (e.followUp ?? "")}
      submitLabel="Save note"
      title={`Follow-up for ${firstName(name)}`}
    >
      <Field name="note">
        <FieldLabel>Note</FieldLabel>
        <Textarea onChange={(event) => setNote(event.target.value)} placeholder="Father said he'll pay on Saturday" rows={3} value={note} />
        <FieldError />
      </Field>
      {e.followUp && (
        <Button className="self-start" disabled={save.isPending} onClick={() => void submit(null)} size="sm" variant="ghost">
          Clear the note
        </Button>
      )}
    </DialogForm>
  );
}

/* ── Add a child ────────────────────────────────────────────────────── */

interface AddInput {
  programmeId: string;
  planId: string;
  participantName: string;
  participantAge: number | null;
  guardian: { id: string } | { name: string; phone: string };
  startsOn: PlainDate;
  paid: { method: PayMethod; amountPaise: number } | null;
}

function AddChildForm({
  programmes,
  customers,
  prefill,
  today,
  onClose,
  onAdded,
}: {
  programmes: readonly Programme[];
  customers: readonly Customer[];
  prefill: AddPrefill;
  today: PlainDate;
  onClose: () => void;
  onAdded?: (e: Enrolment) => void;
}): React.ReactElement {
  const choices = programmes.filter((p) => p.status === "open" || p.status === "closed" || p.id === prefill.programmeId);
  const [programmeId, setProgrammeId] = React.useState(prefill.programmeId ?? choices[0]?.id ?? "");
  const programme = programmes.find((p) => p.id === programmeId);
  const plans = programme ? activePlans(programme) : [];
  const [planId, setPlanId] = React.useState(plans[0]?.id ?? "");
  const plan = plans.find((p) => p.id === planId);
  const [child, setChild] = React.useState("");
  const [age, setAge] = React.useState<number | null>(null);
  const [parent, setParent] = React.useState<Customer | null>(null);
  const [newParent, setNewParent] = React.useState(false);
  const [parentName, setParentName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [startsOn, setStartsOn] = React.useState<PlainDate>(prefill.startsOn ?? today);
  const [alreadyPaid, setAlreadyPaid] = React.useState(false);
  const [method, setMethod] = React.useState<PayMethod>("cash");
  const [amount, setAmount] = React.useState<number | null>(null);
  const [refusal, setRefusal] = React.useState<Refusal>(null);
  const add = useWrite((c, input: AddInput) => c.enrolments.add(input));
  const forChildren = programme?.ageMax !== null && programme?.ageMax !== undefined;

  const submit = async (): Promise<void> => {
    const fields: Record<string, string> = {};
    let guardian: AddInput["guardian"] | null = parent ? { id: parent.id } : null;
    if (newParent) {
      const check = checkIndianPhone(phone);
      if (!parentName.trim()) fields.parentName = "Enter their name.";
      if (check.problem) fields.phone = describePhoneProblem(check.problem);
      guardian = check.phone && parentName.trim() ? { name: parentName.trim(), phone: check.phone } : null;
    } else if (!parent) fields.guardian = "Pick the parent, or add a new one.";
    if (Object.keys(fields).length || !guardian) {
      setRefusal({ message: "Some details need fixing.", fields });
      return;
    }
    setRefusal(null);
    try {
      const made = await add.mutateAsync({
        programmeId,
        planId,
        participantName: child,
        participantAge: age,
        guardian,
        startsOn,
        paid: alreadyPaid && plan ? { method, amountPaise: amount ?? plan.pricePaise } : null,
      });
      const who = made.participantName === "" ? (parent?.name ?? parentName) : made.participantName;
      toastManager.add(
        made.status === "waitlist"
          ? { title: `${who} is on the waitlist`, description: `${programme?.name ?? "The programme"} is full. They move up when a place frees.`, type: "info" }
          : { title: `${who} enrolled in ${programme?.name ?? "the programme"}`, description: `Paid until ${dayOf(made.paidUntil)}${made.ledger.length === 0 ? " · nothing paid yet" : ""}`, type: "success" },
      );
      onAdded?.(made);
      onClose();
    } catch (error) {
      setRefusal(refusalOf(error));
    }
  };

  return (
    <DialogForm
      description={programme ? `${programme.name} · ${forChildren ? `ages ${programme.ageMin ?? "any"} to ${programme.ageMax}` : "adults"}` : "Pick a programme"}
      onClose={onClose}
      onSubmit={() => void submit()}
      pending={add.isPending}
      refusal={refusal}
      submitDisabled={!programme || !plan}
      submitLabel={forChildren ? "Add child" : "Add person"}
      title={forChildren ? "Add a child" : "Add someone"}
    >
      {!prefill.programmeId && (
        <Field name="programmeId">
          <FieldLabel>Programme</FieldLabel>
          <Select<string>
            items={choices.map((p) => ({ label: p.name, value: p.id }))}
            onValueChange={(v) => {
              if (!v) return;
              setProgrammeId(v);
              const picked = programmes.find((p) => p.id === v);
              setPlanId(picked ? (activePlans(picked)[0]?.id ?? "") : "");
            }}
            value={programmeId}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {choices.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <Field name="participantName">
          <FieldLabel>{forChildren ? "Child's name" : "Who's joining"}</FieldLabel>
          <Input autoComplete="off" onChange={(event) => setChild(event.target.value)} value={child} />
          {!forChildren && <FieldDescription>Leave empty when the payer is the one joining.</FieldDescription>}
          <FieldError />
        </Field>
        <WholeField label="Age" name="participantAge" onChange={setAge} optional value={age} />
      </div>

      {newParent ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="parentName">
            <FieldLabel>{forChildren ? "Parent's name" : "Payer's name"}</FieldLabel>
            <Input autoComplete="off" onChange={(event) => setParentName(event.target.value)} value={parentName} />
            <FieldError />
          </Field>
          <Field name="phone">
            <FieldLabel>WhatsApp number</FieldLabel>
            <Input inputMode="tel" onChange={(event) => setPhone(event.target.value)} placeholder="90000 00000" type="tel" value={phone} />
            <FieldError />
          </Field>
          <Button className="justify-self-start" onClick={() => setNewParent(false)} size="sm" variant="link">
            <UsersIcon aria-hidden="true" />
            Pick someone we know instead
          </Button>
        </div>
      ) : (
        <Field name="guardian">
          <FieldLabel>{forChildren ? "Parent" : "Payer"}</FieldLabel>
          <Combobox<Customer>
            filter={(item, query) => {
              const q = query.trim().toLowerCase();
              return !q || item.name.toLowerCase().includes(q) || item.phone.includes(q.replaceAll(/\D/g, "") || "~");
            }}
            isItemEqualToValue={(a, b) => a.id === b.id}
            itemToStringLabel={(c) => c.name}
            items={[...customers]}
            onValueChange={setParent}
            value={parent}
          >
            <ComboboxInput placeholder="Search by name or phone" />
            <ComboboxPopup>
              <ComboboxEmpty>Nobody by that name. Add them as new.</ComboboxEmpty>
              <ComboboxList>
                {(c: Customer) => (
                  <ComboboxItem key={c.id} value={c}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate">{c.name}</span>
                      <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{formatPhone(c.phone)}</span>
                    </span>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxPopup>
          </Combobox>
          <FieldError />
          <Button className="self-start" onClick={() => setNewParent(true)} size="sm" variant="link">
            <UserPlusIcon aria-hidden="true" />
            New {forChildren ? "parent" : "payer"}
          </Button>
        </Field>
      )}

      <Field name="planId" render={(props) => <div {...props} />}>
        <span className="font-medium text-sm" id="add-plan">
          Plan
        </span>
        <RadioGroup aria-labelledby="add-plan" className={cn(plans.length > 2 && "sm:grid sm:grid-cols-2")} onValueChange={(v) => {
          setPlanId(v as string);
          setAmount(null);
        }} value={planId}>
          {plans.map((p) => (
            <RadioCard key={p.id} value={p.id}>
              <span className="font-medium text-sm">{p.name}</span>
              <span className="text-muted-foreground text-sm">{planLine(p)}</span>
            </RadioCard>
          ))}
        </RadioGroup>
        <FieldError />
      </Field>
      <DateField label="Starts" name="startsOn" onChange={setStartsOn} value={startsOn} />
      <Field className="flex-row items-start gap-3">
        <Switch checked={alreadyPaid} className="mt-0.5" onCheckedChange={setAlreadyPaid} />
        <div className="flex flex-col gap-1">
          <FieldLabel>Already paid</FieldLabel>
          <FieldDescription>Off: the first period goes on their record as owed.</FieldDescription>
        </div>
      </Field>
      {alreadyPaid && plan && (
        <div className="grid gap-4 sm:grid-cols-2">
          <RupeesField label="Amount received" onChange={setAmount} paise={amount ?? plan.pricePaise} />
          <PayMethodField onChange={setMethod} value={method} />
        </div>
      )}
    </DialogForm>
  );
}
