"use client";

import { HandCoinsIcon, SmileIcon } from "lucide-react";
import * as React from "react";
import { StepHeading } from "@/app/book/book-page";
import { useFlow } from "@/app/book/flow";
import { SlotTakenNotice } from "@/app/book/slot-taken-notice";
import { whenOf } from "@/app/format";
import { useStore } from "@/app/store";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Alternative } from "@/lib/checkout";
import { formatInr } from "@/lib/money";
import { checkIndianPhone, describePhoneProblem, formatPhone } from "@/lib/phone";
import { customerByPhone } from "@/lib/store";
import { courtName } from "@/lib/venue";

/** The demo's pay-first customer, used by the "Flagged customer" scenario. */
const FLAGGED = { name: "Rohan Mehta", phone: "+919000000106" };

export function YouStep(): React.ReactElement {
  const { draft, update, goTo } = useFlow();
  const store = useStore();
  const [errors, setErrors] = React.useState<{ name?: string; phone?: string }>({});
  const [busy, setBusy] = React.useState(false);
  const [taken, setTaken] = React.useState<Alternative[] | null>(null);
  const nameRef = React.useRef<HTMLInputElement>(null);
  const phoneRef = React.useRef<HTMLInputElement>(null);

  // The flagged scenario fills the form with a customer the venue asks to pay first.
  const { flagged } = store.scenarios;
  React.useEffect(() => {
    if (flagged && draft.phone !== formatPhone(FLAGGED.phone)) update({ name: FLAGGED.name, phone: formatPhone(FLAGGED.phone) });
    // Only when the scenario is switched on, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flagged]);

  const phone = checkIndianPhone(draft.phone).phone;
  const returning = phone ? customerByPhone(store.state, phone) : undefined;

  if (draft.date === null || draft.startMinute === null) return <></>;
  const span = { date: draft.date, startMinute: draft.startMinute, durationMinutes: draft.durationMinutes };

  const hold = async (slot = span, courtId = draft.courtId): Promise<void> => {
    const nameError = draft.name.trim() ? undefined : "Tell us who is booking.";
    const phoneCheck = checkIndianPhone(draft.phone);
    const phoneError = phoneCheck.problem ? describePhoneProblem(phoneCheck.problem) : undefined;
    setErrors({ name: nameError, phone: phoneError });
    if (nameError) return nameRef.current?.focus();
    if (phoneError || !phoneCheck.phone) return phoneRef.current?.focus();

    setBusy(true);
    const result = await store.holdSlot({
      courtId: courtId === "any" ? null : courtId,
      date: slot.date,
      startMinute: slot.startMinute,
      durationMinutes: slot.durationMinutes,
      players: draft.players,
      name: draft.name,
      phone: phoneCheck.phone,
      notes: draft.notes,
    });
    setBusy(false);
    if (result.ok) {
      update({ bookingId: result.booking.id, date: slot.date, startMinute: slot.startMinute, durationMinutes: slot.durationMinutes });
      goTo("pay");
    } else {
      setTaken(result.alternatives);
    }
  };

  return (
    <section>
      <StepHeading description={`${courtName(draft.courtId === "any" ? "Any court" : draft.courtId)} · ${whenOf(span)}`} title="Your details" />
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void hold();
        }}
      >
        {taken && (
          <SlotTakenNotice
            alternatives={taken}
            busy={busy}
            description={`Someone booked ${whenOf(span)} a moment ago.`}
            onChooseAnother={() => {
              update({ startMinute: null });
              goTo("when");
            }}
            onPick={(alt) => {
              setTaken(null);
              void hold(alt, alt.courtId);
            }}
            title="That time just went"
          />
        )}

        <Field className="w-full" invalid={Boolean(errors.name)} name="name">
          <FieldLabel>Name</FieldLabel>
          <Input
            autoComplete="name"
            onChange={(event) => update({ name: event.target.value })}
            placeholder="Who is booking"
            ref={nameRef}
            size="lg"
            value={draft.name}
          />
          {errors.name && <FieldError match>{errors.name}</FieldError>}
        </Field>

        <Field className="w-full" invalid={Boolean(errors.phone)} name="phone">
          <FieldLabel>Mobile number</FieldLabel>
          <div className="relative w-full">
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-muted-foreground text-sm">
              +91
            </span>
            <Input
              autoComplete="tel-national"
              className="ps-11"
              inputMode="tel"
              onBlur={() => {
                if (!draft.phone) return;
                const check = checkIndianPhone(draft.phone);
                setErrors((prev) => ({ ...prev, phone: check.problem ? describePhoneProblem(check.problem) : undefined }));
                if (check.phone) update({ phone: formatPhone(check.phone).replace(/^\+91 /, "") });
              }}
              onChange={(event) => {
                update({ phone: event.target.value });
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              placeholder="98765 43210"
              ref={phoneRef}
              size="lg"
              type="tel"
              value={draft.phone.replace(/^\+91 /, "")}
            />
          </div>
          {errors.phone ? <FieldError match>{errors.phone}</FieldError> : <FieldDescription>For the confirmation and nothing else.</FieldDescription>}
        </Field>

        <div aria-live="polite" className="empty:hidden">
          {returning && !returning.payFirst && (
            <Alert variant="success">
              <SmileIcon aria-hidden="true" />
              <AlertTitle>Welcome back, {returning.name.split(" ")[0]}</AlertTitle>
              <AlertDescription>
                {returning.creditPaise > 0
                  ? `You have ${formatInr(returning.creditPaise)} of credit. The desk takes it off your balance at the venue.`
                  : "We found your earlier bookings under this number."}
              </AlertDescription>
            </Alert>
          )}
          {returning?.payFirst && (
            <Alert variant="info">
              <HandCoinsIcon aria-hidden="true" />
              <AlertTitle>This booking needs payment up front</AlertTitle>
              <AlertDescription>
                Welcome back, {returning.name.split(" ")[0]}. For this number, courts are confirmed once they are paid for. It takes a minute on the next
                step.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Field className="w-full" name="notes">
          <FieldLabel>
            Notes <span className="font-normal text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Textarea onChange={(event) => update({ notes: event.target.value })} placeholder="Need paddles, a coach, or a ball machine?" value={draft.notes} />
        </Field>

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button onClick={() => goTo("when")} variant="ghost">
            Back
          </Button>
          <Button loading={busy} size="lg" type="submit">
            Hold this court
          </Button>
        </div>
        <p className="text-end text-muted-foreground text-xs">We hold the court for {store.scenarios.shortHold ? "30 seconds" : `${store.state.settings.holdMinutes} minutes`} while you pay.</p>
      </form>
    </section>
  );
}
