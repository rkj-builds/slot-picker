"use client";

/**
 * Parts the programme and people screens share: tabs that are links, a
 * disabled button that says why, a date field, money and payment-method
 * fields, a refusal shown inside a form, a save bar and a guard against
 * leaving with unsaved work. Composed from coss parts only.
 */
import { CalendarIcon, CircleAlertIcon, CircleCheckIcon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import { useAnchoredBarHeight } from "@/app/anchored-bar";
import { DeskViewFooter } from "@/app/desk/desk-toolbar";
import { longDayOf } from "@/app/format";
import { SegmentedControl, SegmentedControlItem } from "@/components/compositions/segmented-control";
import { LazyCalendar } from "@/components/booking/lazy-calendar";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { NumberField, NumberFieldGroup, NumberFieldInput } from "@/components/ui/number-field";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import type { PayMethod } from "@/data/client";
import type { LeaveGuard, Refusal } from "@/app/screens/programmes/hooks";
import { fromLocalDate, type PlainDate, toLocalDate } from "@/lib/plain-date";
import { segmentedControlItemVariants, segmentedControlRootClassName } from "@/lib/segmented-control";
import { cn } from "@/lib/utils";

/**
 * A button the viewer's role can't use: it stays visible and focusable,
 * reads as disabled, and its tooltip (and description, for screen readers)
 * says why. Hiding it would leave people wondering where it went.
 */
export function Gated({ allowed, reason, children }: { allowed: boolean; reason: string; children: React.ReactElement<React.ComponentProps<"button">> }): React.ReactElement {
  const id = React.useId();
  if (allowed) return children;
  const locked = React.cloneElement(children, {
    "aria-disabled": true,
    "aria-describedby": id,
    className: cn(children.props.className, "cursor-not-allowed opacity-64"),
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault(),
  });
  return (
    <>
      <Tooltip>
        <TooltipTrigger render={locked} />
        <TooltipPopup>{reason}</TooltipPopup>
      </Tooltip>
      <span hidden id={id}>
        {reason}
      </span>
    </>
  );
}

/* ── Navigation ─────────────────────────────────────────────────────── */

export interface LinkTab {
  href: string;
  label: string;
  current: boolean;
  count?: number;
}

/**
 * Tabs that are URLs (coss's segmented navigation, particle p-navigation-1):
 * links with aria-current, so Back, reload and a shared link all land on the
 * same tab. Scrolls sideways on a phone rather than wrapping.
 */
export function LinkTabs({ label, tabs, className }: { label: string; tabs: readonly LinkTab[]; className?: string }): React.ReactElement {
  return (
    <nav aria-label={label} className={cn("-mx-1 max-w-full overflow-x-auto px-1 pb-1", className)}>
      <div className={segmentedControlRootClassName}>
        {tabs.map((tab) => (
          <Anchor aria-current={tab.current ? "page" : undefined} className={segmentedControlItemVariants({ state: "current" })} href={tab.href} key={tab.href}>
            {tab.label}
            {tab.count !== undefined && (
              <Badge className="tabular-nums" size="sm" variant={tab.current ? "secondary" : "outline"}>
                {tab.count}
              </Badge>
            )}
          </Anchor>
        ))}
      </div>
    </nav>
  );
}

/* ── Fields ─────────────────────────────────────────────────────────── */

/** A day, picked on coss's calendar in a popover. `name` ties it to the backend's field errors. */
export function DateField({ label, value, onChange, name, description, disabled }: { label: string; value: PlainDate; onChange: (date: PlainDate) => void; name?: string; description?: string; disabled?: boolean }): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const labelId = React.useId();
  const valueId = React.useId();
  return (
    <Field className="gap-2" disabled={disabled} name={name}>
      <span className="font-medium text-sm" id={labelId}>
        {label}
      </span>
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger render={<Button aria-labelledby={`${labelId} ${valueId}`} className="w-full justify-start font-normal" disabled={disabled} variant="outline" />}>
          <CalendarIcon aria-hidden="true" />
          <span id={valueId}>{longDayOf(value)}</span>
        </PopoverTrigger>
        <PopoverPopup align="start">
          <LazyCalendar
            defaultMonth={toLocalDate(value)}
            mode="single"
            onSelect={(date) => {
              if (!date) return;
              onChange(fromLocalDate(date));
              setOpen(false);
            }}
            selected={toLocalDate(value)}
          />
        </PopoverPopup>
      </Popover>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError />
    </Field>
  );
}

/** Whole rupees. The value is paise; `name` ties it to the backend's field errors. */
export function RupeesField({ label, paise, onChange, name = "amount", description, className }: { label: string; paise: number; onChange: (paise: number) => void; name?: string; description?: React.ReactNode; className?: string }): React.ReactElement {
  const id = React.useId();
  return (
    <Field className={cn("gap-2", className)} name={name}>
      <NumberField
        format={{ style: "currency", currency: "INR", maximumFractionDigits: 0 }}
        id={id}
        locale="en-IN"
        min={0}
        onValueChange={(v) => onChange(Math.round((v ?? 0) * 100))}
        step={1}
        value={paise / 100}
      >
        <Label htmlFor={id}>{label}</Label>
        <NumberFieldGroup className="w-full sm:w-44">
          <NumberFieldInput className="tabular-nums" />
        </NumberFieldGroup>
      </NumberField>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError />
    </Field>
  );
}

export function PayMethodField({ value, onChange, label = "How they paid" }: { value: PayMethod; onChange: (method: PayMethod) => void; label?: string }): React.ReactElement {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-sm" id={id}>
        {label}
      </span>
      <SegmentedControl<PayMethod> aria-labelledby={id} fill onValueChange={onChange} value={value}>
        <SegmentedControlItem<PayMethod> value="cash">Cash</SegmentedControlItem>
        <SegmentedControlItem<PayMethod> value="online">UPI or card</SegmentedControlItem>
      </SegmentedControl>
    </div>
  );
}

/* ── Refusals ───────────────────────────────────────────────────────── */

/** The backend's refusal, as it said it, at the top of a form. */
export function FormRefusal({ message }: { message: string | null }): React.ReactElement | null {
  if (!message) return null;
  return (
    <Alert role="alert" variant="error">
      <CircleAlertIcon aria-hidden="true" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

/* ── Unsaved work ───────────────────────────────────────────────────── */

/**
 * The anchored bar a draft page saves from (Settings uses the same): it says
 * whether anything is unsaved, and Discard and Save stay disabled until it is.
 */
export function SaveBar({
  label,
  dirty,
  status,
  saveLabel,
  onSave,
  onDiscard,
  saving = false,
  formId,
}: {
  label: string;
  dirty: boolean;
  /** What to say when nothing is unsaved, or a count when something is. */
  status: React.ReactNode;
  saveLabel: string;
  onSave?: () => void;
  onDiscard: () => void;
  saving?: boolean;
  formId?: string;
}): React.ReactElement {
  const ref = useAnchoredBarHeight<HTMLElement>();
  return (
    <DeskViewFooter>
      <section aria-label={label} className="border-t bg-background/94 pb-[env(safe-area-inset-bottom)] backdrop-blur-md" data-slot="savebar" ref={ref}>
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-end gap-2 px-4 py-3">
          <span aria-live="polite" className="me-auto flex items-center gap-1.5 text-muted-foreground text-sm">
            {dirty ? (
              <Badge variant="warning">{status}</Badge>
            ) : (
              <>
                <CircleCheckIcon aria-hidden="true" className="size-4" />
                {status}
              </>
            )}
          </span>
          <Button disabled={!dirty || saving} onClick={onDiscard} variant="ghost">
            Discard
          </Button>
          <Button disabled={!dirty} form={formId} loading={saving} onClick={onSave} type={formId ? "submit" : "button"}>
            {saveLabel}
          </Button>
        </div>
      </section>
    </DeskViewFooter>
  );
}


/** The question `useLeaveGuard` asks: stay, or leave and lose the changes. */
export function LeaveDialog({ guard, title, description, leaveLabel }: { guard: LeaveGuard; title: string; description: string; leaveLabel: string }): React.ReactElement {
  return (
    <AlertDialog onOpenChange={(open) => !open && guard.stay()} open={guard.target !== null}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="ghost" />}>Stay</AlertDialogClose>
          <Button onClick={guard.leave} variant="destructive">
            {leaveLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

/** One dialog's form: header, the refusal if any, the fields, Cancel and the verb. */
export function DialogForm({
  title,
  description,
  refusal,
  children,
  submitLabel,
  pending,
  onSubmit,
  onClose,
  destructive = false,
  submitDisabled = false,
}: {
  title: string;
  description: React.ReactNode;
  refusal: Refusal;
  children: React.ReactNode;
  submitLabel: string;
  pending: boolean;
  onSubmit: () => void;
  onClose: () => void;
  destructive?: boolean;
  submitDisabled?: boolean;
}): React.ReactElement {
  return (
    <Form
      className="contents"
      errors={refusal?.fields}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-5">
        <FormRefusal message={refusal?.message ?? null} />
        {children}
      </DialogPanel>
      <DialogFooter>
        <Button disabled={pending} onClick={onClose} variant="ghost">
          Cancel
        </Button>
        <Button disabled={submitDisabled} loading={pending} type="submit" variant={destructive ? "destructive" : "default"}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </Form>
  );
}

