"use client";

/**
 * The fields of a programme, shared by "New programme" and the programme's
 * Settings tab, and the plan rows (how people pay). Each field carries the
 * name the backend uses, so a refusal lands on the field it is about.
 */
import { PlusIcon, Trash2Icon } from "lucide-react";
import * as React from "react";
import { minuteLabel } from "@/app/format";
import { DateField, RupeesField } from "@/app/screens/programmes/kit";
import { newPlan, PLAN_KIND_LABEL, type ProgrammeDraft } from "@/app/screens/programmes/programme-model";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Field, FieldDescription, FieldError, FieldItem, FieldLabel } from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput } from "@/components/ui/number-field";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ProgrammePlan } from "@/data/types";
import { addDays, type PlainDate } from "@/lib/plain-date";
import { COURTS, WEEKDAY_LABEL, WEEKDAYS } from "@/lib/venue";

/** Every half hour the venue could run a session, 6 am to 11 pm. */
const TIMES = Array.from({ length: 35 }, (_, i) => 6 * 60 + i * 30);

export function ProgrammeFields({ draft, onChange, today }: { draft: ProgrammeDraft; onChange: (draft: ProgrammeDraft) => void; today: PlainDate }): React.ReactElement {
  const set = <K extends keyof ProgrammeDraft>(key: K, value: ProgrammeDraft[K]): void => onChange({ ...draft, [key]: value });
  return (
    <div className="flex flex-col gap-6">
      <Fieldset className="flex flex-col gap-4">
        <FieldsetLegend className="font-semibold text-sm">About</FieldsetLegend>
        <Field name="name">
          <FieldLabel>Name</FieldLabel>
          <Input autoComplete="off" onChange={(e) => set("name", e.target.value)} placeholder="Weekend juniors" value={draft.name} />
          <FieldError />
        </Field>
        <Field name="description">
          <FieldLabel>Description</FieldLabel>
          <Textarea onChange={(e) => set("description", e.target.value)} placeholder="Who it's for and what to bring" rows={2} value={draft.description} />
          <FieldDescription>Parents see this when they sign up.</FieldDescription>
          <FieldError />
        </Field>
      </Fieldset>

      <Fieldset className="flex flex-col gap-4">
        <FieldsetLegend className="font-semibold text-sm">When and where</FieldsetLegend>
        <Field name="weekdays" render={(props) => <Fieldset {...props} />}>
          <FieldsetLegend className="mb-2 font-medium text-sm">Days</FieldsetLegend>
          <CheckboxGroup className="flex-row flex-wrap gap-x-4 gap-y-2" onValueChange={(days) => set("weekdays", WEEKDAYS.filter((d) => days.includes(d)))} value={draft.weekdays}>
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
          <FieldError />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <TimeField label="Starts at" name="startMinute" onChange={(v) => set("startMinute", v)} value={draft.startMinute} />
          <TimeField label="Ends at" name="endMinute" onChange={(v) => set("endMinute", v)} value={draft.endMinute} />
        </div>
        <Field name="courtIds" render={(props) => <Fieldset {...props} />}>
          <FieldsetLegend className="mb-2 font-medium text-sm">Courts</FieldsetLegend>
          <CheckboxGroup className="flex-row flex-wrap gap-x-4 gap-y-2" onValueChange={(ids) => set("courtIds", COURTS.map((c) => c.id).filter((id) => ids.includes(id)))} value={draft.courtIds}>
            {COURTS.map((c) => (
              <FieldItem key={c.id}>
                <FieldLabel className="font-normal">
                  <Checkbox value={c.id} />
                  {c.name}
                </FieldLabel>
              </FieldItem>
            ))}
          </CheckboxGroup>
          <FieldDescription>Online booking can't take these courts while a session runs.</FieldDescription>
          <FieldError />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <DateField label="First session on or after" name="startsOn" onChange={(v) => set("startsOn", v)} value={draft.startsOn} />
          <div className="flex flex-col gap-2">
            <Field className="flex-row items-center gap-2">
              <Switch checked={draft.endsOn !== null} onCheckedChange={(on) => set("endsOn", on ? addDays(draft.startsOn < today ? today : draft.startsOn, 41) : null)} />
              <FieldLabel>Has an end date</FieldLabel>
            </Field>
            {draft.endsOn !== null ? (
              <DateField label="Last session on or before" name="endsOn" onChange={(v) => set("endsOn", v)} value={draft.endsOn} />
            ) : (
              <p className="text-muted-foreground text-sm">Runs until you finish it.</p>
            )}
          </div>
        </div>
      </Fieldset>

      <Fieldset className="flex flex-col gap-4">
        <FieldsetLegend className="font-semibold text-sm">Who and how many</FieldsetLegend>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <WholeField label="Youngest" name="ageMin" onChange={(v) => set("ageMin", v)} optional value={draft.ageMin} />
          <WholeField label="Oldest" name="ageMax" onChange={(v) => set("ageMax", v)} optional value={draft.ageMax} />
          <WholeField label="Places" name="capacity" onChange={(v) => set("capacity", v ?? 0)} value={draft.capacity} />
        </div>
        <p className="text-muted-foreground text-sm">Leave an age empty for no limit. Once the places are taken, new sign-ups join the waitlist.</p>
      </Fieldset>
    </div>
  );
}

function TimeField({ label, name, value, onChange }: { label: string; name: string; value: number; onChange: (minute: number) => void }): React.ReactElement {
  return (
    <Field name={name}>
      <FieldLabel>{label}</FieldLabel>
      <Select<number> items={TIMES.map((m) => ({ label: minuteLabel(m), value: m }))} onValueChange={(v) => v !== null && onChange(v)} value={value}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {TIMES.map((m) => (
            <SelectItem key={m} value={m}>
              {minuteLabel(m)}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
      <FieldError />
    </Field>
  );
}

/** A whole number; `optional` lets it be empty (null). */
export function WholeField({ label, name, value, onChange, optional = false, min = 0, className }: { label: string; name: string; value: number | null; onChange: (value: number | null) => void; optional?: boolean; min?: number; className?: string }): React.ReactElement {
  const id = React.useId();
  return (
    <Field className={className} name={name}>
      <NumberField id={id} min={min} onValueChange={(v) => onChange(v === null ? (optional ? null : min) : Math.round(v))} step={1} value={value}>
        <Label htmlFor={id}>{label}</Label>
        <NumberFieldGroup>
          <NumberFieldDecrement aria-label={`${label}, one less`} />
          <NumberFieldInput className="tabular-nums" placeholder={optional ? "Any" : undefined} />
          <NumberFieldIncrement aria-label={`${label}, one more`} />
        </NumberFieldGroup>
      </NumberField>
      <FieldError />
    </Field>
  );
}

/* ── Plans ──────────────────────────────────────────────────────────── */

/** One way to pay: a name, a price and what it buys. Used in New programme and in Add plan. */
export function PlanFields({ plan, onChange, index }: { plan: ProgrammePlan; onChange: (plan: ProgrammePlan) => void; index?: number }): React.ReactElement {
  const prefix = index === undefined ? "" : `Plan ${index + 1}, `;
  const kinds = Object.keys(PLAN_KIND_LABEL) as ProgrammePlan["kind"][];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field className="sm:col-span-2">
        <FieldLabel>{prefix}name</FieldLabel>
        <Input autoComplete="off" onChange={(e) => onChange({ ...plan, name: e.target.value })} placeholder="Every session, one month" value={plan.name} />
        <FieldError />
      </Field>
      <Field>
        <FieldLabel>{prefix}what it buys</FieldLabel>
        <Select<ProgrammePlan["kind"]>
          items={kinds.map((k) => ({ label: PLAN_KIND_LABEL[k], value: k }))}
          onValueChange={(kind) => kind && onChange({ ...plan, kind, sessions: kind === "pack" ? (plan.sessions ?? 4) : kind === "drop-in" ? 1 : null })}
          value={plan.kind}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {kinds.map((k) => (
              <SelectItem key={k} value={k}>
                {PLAN_KIND_LABEL[k]}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </Field>
      <RupeesField label={`${prefix}price`} name={`plan-${plan.id}-price`} onChange={(pricePaise) => onChange({ ...plan, pricePaise })} paise={plan.pricePaise} />
      {plan.kind === "pack" && <WholeField label={`${prefix}sessions in the pack`} min={1} name={`plan-${plan.id}-sessions`} onChange={(sessions) => onChange({ ...plan, sessions })} value={plan.sessions} />}
    </div>
  );
}

/** The plan rows of a new programme: at least one, add more, remove any but the last. */
export function PlanList({ plans, onChange }: { plans: ProgrammePlan[]; onChange: (plans: ProgrammePlan[]) => void }): React.ReactElement {
  return (
    <Field name="plans" render={(props) => <Fieldset {...props} />}>
      <FieldsetLegend className="font-semibold text-sm">How people pay</FieldsetLegend>
      <p className="mb-3 text-muted-foreground text-sm">Add a plan for each way to pay. You can add or retire plans later.</p>
      <ol className="flex flex-col gap-3">
        {plans.map((plan, i) => (
          <li className="flex flex-col gap-3 rounded-xl border p-3" key={plan.id}>
            <PlanFields index={i} onChange={(next) => onChange(plans.map((p) => (p.id === plan.id ? next : p)))} plan={plan} />
            {plans.length > 1 && (
              <Button className="self-start" onClick={() => onChange(plans.filter((p) => p.id !== plan.id))} size="sm" variant="ghost">
                <Trash2Icon aria-hidden="true" />
                Remove plan {i + 1}
              </Button>
            )}
          </li>
        ))}
      </ol>
      <Button className="mt-3 self-start" onClick={() => onChange([...plans, newPlan()])} size="sm" variant="outline">
        <PlusIcon aria-hidden="true" />
        Add another plan
      </Button>
      <FieldError />
    </Field>
  );
}
