"use client";

/**
 * What the desk does to a court-hour membership: sell one, renew it, add
 * hours, take a payment, refund it; and the plans they're sold on. Every
 * change goes through `memberships.*`; a refusal shows as the backend said it,
 * on the field it names.
 */
import { UserPlusIcon, UsersIcon } from "lucide-react";
import * as React from "react";
import { dayOf } from "@/app/format";
import { hoursLeft, planSummary } from "@/app/screens/people/members-model";
import { type Refusal, refusalOf } from "@/app/screens/programmes/hooks";
import { DateField, DialogForm, PayMethodField, RupeesField } from "@/app/screens/programmes/kit";
import { WholeField } from "@/app/screens/programmes/programme-form";
import { RadioCard } from "@/components/compositions/radio-card";
import { Button } from "@/components/ui/button";
import { Combobox, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxPopup } from "@/components/ui/combobox";
import { Dialog, DialogPopup } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import type { PayMethod } from "@/data/client";
import { ledgerPaid, membershipDue } from "@/data/money";
import { useWrite } from "@/data/provider";
import type { Customer, Membership, MembershipPlan } from "@/data/types";
import { formatInr } from "@/lib/money";
import { checkIndianPhone, describePhoneProblem, formatPhone } from "@/lib/phone";
import type { PlainDate } from "@/lib/plain-date";

export type MemberDialog = "renew" | "hours" | "pay" | "refund";

export function DialogShell({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }): React.ReactElement {
  return (
    <Dialog onOpenChange={(next) => !next && onClose()} open={open}>
      <DialogPopup>{open && children}</DialogPopup>
    </Dialog>
  );
}

interface Props {
  membership: Membership;
  name: string;
  onClose: () => void;
}

type Paid = { method: PayMethod; amountPaise: number } | null;

function PlanCards({ plans, value, onChange, label }: { plans: readonly MembershipPlan[]; value: string; onChange: (id: string) => void; label: string }): React.ReactElement {
  const id = React.useId();
  return (
    <Field name="planId" render={(props) => <div {...props} />}>
      <span className="font-medium text-sm" id={id}>
        {label}
      </span>
      <RadioGroup aria-labelledby={id} onValueChange={(v) => onChange(v as string)} value={value}>
        {plans.map((p) => (
          <RadioCard key={p.id} value={p.id}>
            <span className="font-medium text-sm">{p.name}</span>
            <span className="text-muted-foreground text-sm">{planSummary(p)}</span>
          </RadioCard>
        ))}
      </RadioGroup>
      <FieldError />
    </Field>
  );
}

/** "They paid now" with amount and method; off means the price goes on their record as owed. */
function PaidNow({ on, setOn, amount, setAmount, method, setMethod, owedLine }: { on: boolean; setOn: (on: boolean) => void; amount: number; setAmount: (paise: number) => void; method: PayMethod; setMethod: (m: PayMethod) => void; owedLine: string }): React.ReactElement {
  return (
    <>
      <Field className="flex-row items-center gap-3">
        <Switch checked={on} onCheckedChange={setOn} />
        <FieldLabel>They paid now</FieldLabel>
      </Field>
      {on ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <RupeesField label="Amount received" onChange={setAmount} paise={amount} />
          <PayMethodField onChange={setMethod} value={method} />
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{owedLine}</p>
      )}
    </>
  );
}

export function RenewForm({ membership: m, name, onClose, plans }: Props & { plans: readonly MembershipPlan[] }): React.ReactElement {
  const onSale = plans.filter((p) => !p.retired);
  const [planId, setPlanId] = React.useState(onSale.some((p) => p.id === m.planId) ? m.planId : (onSale[0]?.id ?? ""));
  const plan = onSale.find((p) => p.id === planId);
  const [paidNow, setPaidNow] = React.useState(true);
  const [amount, setAmount] = React.useState<number | null>(null);
  const [method, setMethod] = React.useState<PayMethod>("cash");
  const [refusal, setRefusal] = React.useState<Refusal>(null);
  const renew = useWrite((c, input: { planId: string; paid: Paid }) => c.memberships.renew(m.id, input));
  const price = plan?.pricePaise ?? 0;
  const paying = amount ?? price;
  const carries = m.status !== "expired" ? hoursLeft(m) : 0;
  const submit = async (): Promise<void> => {
    setRefusal(null);
    try {
      const after = await renew.mutateAsync({ planId, paid: paidNow && paying > 0 ? { method, amountPaise: paying } : null });
      toastManager.add({ title: `${name} renewed on ${plan?.name ?? "the plan"}`, description: `${after.hoursTotal} hours until ${dayOf(after.expiresOn)}`, type: "success" });
      onClose();
    } catch (error) {
      setRefusal(refusalOf(error));
    }
  };
  return (
    <DialogForm
      description={`${name} · ${hoursLeft(m)} of ${m.hoursTotal} hours left, ${m.status === "expired" ? "expired" : "expires"} ${dayOf(m.expiresOn)}`}
      onClose={onClose}
      onSubmit={() => void submit()}
      pending={renew.isPending}
      refusal={refusal}
      submitDisabled={!plan}
      submitLabel={plan ? `Renew for ${formatInr(price)}` : "Renew"}
      title="Renew membership"
    >
      <PlanCards label="Plan" onChange={(id) => {
        setPlanId(id);
        setAmount(null);
      }} plans={onSale} value={planId} />
      <p className="rounded-xl border bg-muted/40 p-3 text-sm">
        {carries > 0 ? `The ${carries} unused ${carries === 1 ? "hour carries" : "hours carry"} over. ` : ""}
        {m.status === "expired" ? "The new period starts today." : `The new period starts when this one ends, ${dayOf(m.expiresOn)}.`}
      </p>
      <PaidNow amount={paying} method={method} on={paidNow} owedLine={`${formatInr(price)} goes on their record as owed.`} setAmount={setAmount} setMethod={setMethod} setOn={setPaidNow} />
    </DialogForm>
  );
}

export function AddHoursForm({ membership: m, name, onClose, plan }: Props & { plan: MembershipPlan | undefined }): React.ReactElement {
  const perHour = plan ? Math.round(plan.pricePaise / plan.hours / 100) * 100 : 0;
  const [hours, setHours] = React.useState<number | null>(2);
  const [price, setPrice] = React.useState<number | null>(null);
  const [refusal, setRefusal] = React.useState<Refusal>(null);
  const add = useWrite((c, input: { hours: number; pricePaise: number }) => c.memberships.addHours(m.id, input));
  const total = price ?? perHour * (hours ?? 0);
  const submit = async (): Promise<void> => {
    setRefusal(null);
    try {
      await add.mutateAsync({ hours: hours ?? 0, pricePaise: total });
      toastManager.add({ title: `${hours ?? 0} hours added for ${name}`, description: total > 0 ? `${formatInr(total)} added to what they owe. Take it from the membership.` : undefined, type: "success" });
      onClose();
    } catch (error) {
      setRefusal(refusalOf(error));
    }
  };
  return (
    <DialogForm
      description={`${name} · ${hoursLeft(m)} of ${m.hoursTotal} hours left`}
      onClose={onClose}
      onSubmit={() => void submit()}
      pending={add.isPending}
      refusal={refusal}
      submitLabel={`Add ${hours ?? 0} ${hours === 1 ? "hour" : "hours"}`}
      title="Add hours"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <WholeField label="Hours" min={0} name="hours" onChange={setHours} value={hours} />
        <RupeesField description={perHour > 0 ? `${formatInr(perHour)} an hour on their plan.` : undefined} label="Price" name="pricePaise" onChange={setPrice} paise={total} />
      </div>
      <p className="text-muted-foreground text-sm">The price is added to what they owe; take it with Take payment.</p>
    </DialogForm>
  );
}

export function PayForm({ membership: m, name, onClose }: Props): React.ReactElement {
  const due = membershipDue(m);
  const [amount, setAmount] = React.useState(due);
  const [method, setMethod] = React.useState<PayMethod>("cash");
  const [refusal, setRefusal] = React.useState<Refusal>(null);
  const pay = useWrite((c, input: { method: PayMethod; amountPaise: number }) => c.memberships.recordPayment(m.id, input));
  const submit = async (): Promise<void> => {
    setRefusal(null);
    try {
      await pay.mutateAsync({ method, amountPaise: amount });
      toastManager.add({ title: `${formatInr(amount)} recorded for ${name}`, description: due - amount > 0 ? `${formatInr(due - amount)} still due` : "Paid in full", type: "success" });
      onClose();
    } catch (error) {
      setRefusal(refusalOf(error));
    }
  };
  return (
    <DialogForm description={`${name} · ${formatInr(due)} due on this membership`} onClose={onClose} onSubmit={() => void submit()} pending={pay.isPending} refusal={refusal} submitLabel={`Record ${formatInr(amount)}`} title="Take payment">
      <RupeesField description="Part payments are fine." label="Amount received" onChange={setAmount} paise={amount} />
      <PayMethodField onChange={setMethod} value={method} />
    </DialogForm>
  );
}

export function RefundForm({ membership: m, name, onClose }: Props): React.ReactElement {
  const paid = Math.max(0, ledgerPaid(m.ledger));
  const unusedShare = m.hoursTotal > 0 ? Math.round((paid * hoursLeft(m)) / m.hoursTotal / 100) * 100 : 0;
  const [amount, setAmount] = React.useState(unusedShare);
  const [reason, setReason] = React.useState("");
  const [refusal, setRefusal] = React.useState<Refusal>(null);
  const refund = useWrite((c, input: { amountPaise: number; reason: string }) => c.memberships.refund(m.id, input));
  const submit = async (): Promise<void> => {
    setRefusal(null);
    try {
      await refund.mutateAsync({ amountPaise: amount, reason });
      toastManager.add({ title: `${formatInr(amount)} refunded to ${name}`, description: "The membership has ended.", type: "success" });
      onClose();
    } catch (error) {
      setRefusal(refusalOf(error));
    }
  };
  return (
    <DialogForm
      description={`${formatInr(paid)} paid. A refund ends the membership: the ${hoursLeft(m)} hours left can't be used after it. This can't be undone.`}
      destructive
      onClose={onClose}
      onSubmit={() => void submit()}
      pending={refund.isPending}
      refusal={refusal}
      submitLabel={`Refund ${formatInr(amount)}`}
      title={`Refund ${name}?`}
    >
      <RupeesField description={`The unused hours' share is ${formatInr(unusedShare)}.`} label="Amount to refund" onChange={setAmount} paise={amount} />
      <Field name="reason">
        <FieldLabel>Reason</FieldLabel>
        <Textarea onChange={(event) => setReason(event.target.value)} placeholder="Moving out of the city" rows={2} value={reason} />
        <FieldDescription>For the accounts.</FieldDescription>
        <FieldError />
      </Field>
    </DialogForm>
  );
}

/** Sell a membership to someone we know, or someone new. */
export function SellForm({ customers, plans, today, onClose }: { customers: readonly Customer[]; plans: readonly MembershipPlan[]; today: PlainDate; onClose: () => void }): React.ReactElement {
  const onSale = plans.filter((p) => !p.retired);
  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const [isNew, setIsNew] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [planId, setPlanId] = React.useState(onSale[0]?.id ?? "");
  const plan = onSale.find((p) => p.id === planId);
  const [startsOn, setStartsOn] = React.useState<PlainDate>(today);
  const [paidNow, setPaidNow] = React.useState(true);
  const [amount, setAmount] = React.useState<number | null>(null);
  const [method, setMethod] = React.useState<PayMethod>("cash");
  const [refusal, setRefusal] = React.useState<Refusal>(null);
  const sell = useWrite((c, input: { customer: { id: string } | { name: string; phone: string }; planId: string; startsOn: PlainDate; paid: Paid }) => c.memberships.sell(input));
  const price = plan?.pricePaise ?? 0;
  const paying = amount ?? price;

  const submit = async (): Promise<void> => {
    const fields: Record<string, string> = {};
    let who: { id: string } | { name: string; phone: string } | null = customer ? { id: customer.id } : null;
    if (isNew) {
      const check = checkIndianPhone(phone);
      if (!newName.trim()) fields.newName = "Enter their name.";
      if (check.problem) fields.phone = describePhoneProblem(check.problem);
      who = check.phone && newName.trim() ? { name: newName.trim(), phone: check.phone } : null;
    } else if (!customer) fields.customer = "Pick who is buying, or add someone new.";
    if (Object.keys(fields).length || !who) {
      setRefusal({ message: "Some details need fixing.", fields });
      return;
    }
    setRefusal(null);
    try {
      const made = await sell.mutateAsync({ customer: who, planId, startsOn, paid: paidNow && paying > 0 ? { method, amountPaise: paying } : null });
      toastManager.add({ title: `${plan?.name ?? "Membership"} sold to ${customer?.name ?? newName.trim()}`, description: `${made.hoursTotal} hours until ${dayOf(made.expiresOn)}`, type: "success" });
      onClose();
    } catch (error) {
      setRefusal(refusalOf(error));
    }
  };

  return (
    <DialogForm
      description="Court hours paid in advance, used booking by booking."
      onClose={onClose}
      onSubmit={() => void submit()}
      pending={sell.isPending}
      refusal={refusal}
      submitDisabled={!plan}
      submitLabel={plan ? `Sell ${plan.name}` : "Sell membership"}
      title="Sell membership"
    >
      {isNew ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="newName">
            <FieldLabel>Name</FieldLabel>
            <Input autoComplete="off" onChange={(event) => setNewName(event.target.value)} value={newName} />
            <FieldError />
          </Field>
          <Field name="phone">
            <FieldLabel>WhatsApp number</FieldLabel>
            <Input inputMode="tel" onChange={(event) => setPhone(event.target.value)} placeholder="90000 00000" type="tel" value={phone} />
            <FieldError />
          </Field>
          <Button className="justify-self-start" onClick={() => setIsNew(false)} size="sm" variant="link">
            <UsersIcon aria-hidden="true" />
            Pick someone we know instead
          </Button>
        </div>
      ) : (
        <Field name="customer">
          <FieldLabel>Member</FieldLabel>
          <Combobox<Customer>
            filter={(item, query) => {
              const q = query.trim().toLowerCase();
              return !q || item.name.toLowerCase().includes(q) || item.phone.includes(q.replaceAll(/\D/g, "") || "~");
            }}
            isItemEqualToValue={(a, b) => a.id === b.id}
            itemToStringLabel={(c) => c.name}
            items={[...customers]}
            onValueChange={setCustomer}
            value={customer}
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
          <Button className="self-start" onClick={() => setIsNew(true)} size="sm" variant="link">
            <UserPlusIcon aria-hidden="true" />
            Someone new
          </Button>
        </Field>
      )}
      <PlanCards label="Plan" onChange={(id) => {
        setPlanId(id);
        setAmount(null);
      }} plans={onSale} value={planId} />
      <DateField label="Starts" name="startsOn" onChange={setStartsOn} value={startsOn} />
      <PaidNow amount={paying} method={method} on={paidNow} owedLine={`${formatInr(price)} goes on their record as owed.`} setAmount={setAmount} setMethod={setMethod} setOn={setPaidNow} />
    </DialogForm>
  );
}

/** Add or edit a plan. A plan in use is never deleted: retire it and it stops being sold. */
export function PlanForm({ plan, onClose }: { plan: MembershipPlan | null; onClose: () => void }): React.ReactElement {
  const [draft, setDraft] = React.useState<MembershipPlan>(plan ?? { id: "", name: "", hours: 10, validDays: 30, pricePaise: 0, retired: false });
  const [refusal, setRefusal] = React.useState<Refusal>(null);
  const save = useWrite((c, input: MembershipPlan) => c.memberships.savePlan(input));
  const submit = async (): Promise<void> => {
    setRefusal(null);
    try {
      const saved = await save.mutateAsync({ ...draft, name: draft.name.trim() });
      toastManager.add({ title: plan ? `${saved.name} saved` : `${saved.name} added`, description: plan ? "Members already on it keep what they bought." : "It's on sale from now.", type: "success" });
      onClose();
    } catch (error) {
      setRefusal(refusalOf(error));
    }
  };
  return (
    <DialogForm
      description={plan ? "Changes apply to new sales and renewals." : "A pack of court hours, valid for a number of days."}
      onClose={onClose}
      onSubmit={() => void submit()}
      pending={save.isPending}
      refusal={refusal}
      submitLabel={plan ? "Save plan" : "Add plan"}
      title={plan ? `Edit ${plan.name}` : "New plan"}
    >
      <Field name="name">
        <FieldLabel>Name</FieldLabel>
        <Input autoComplete="off" onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="10 hours" value={draft.name} />
        <FieldError />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <WholeField label="Hours" name="hours" onChange={(hours) => setDraft({ ...draft, hours: hours ?? 0 })} value={draft.hours} />
        <WholeField label="Valid for (days)" name="validDays" onChange={(validDays) => setDraft({ ...draft, validDays: validDays ?? 0 })} value={draft.validDays} />
        <RupeesField label="Price" name="pricePaise" onChange={(pricePaise) => setDraft({ ...draft, pricePaise })} paise={draft.pricePaise} />
      </div>
    </DialogForm>
  );
}
