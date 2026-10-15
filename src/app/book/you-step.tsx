"use client";

import { HandCoinsIcon, MessageCircleIcon, ShieldCheckIcon, SmileIcon } from "lucide-react";
import * as React from "react";
import { StepHeading } from "@/app/book/book-page";
import { useFlow } from "@/app/book/flow";
import { SlotTakenNotice } from "@/app/book/slot-taken-notice";
import { whenOf } from "@/app/format";
import { useStore } from "@/app/store";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { OTPField, OTPFieldInput, OTPFieldSeparator } from "@/components/ui/otp-field";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import type { Alternative } from "@/lib/checkout";
import { formatInr } from "@/lib/money";
import { checkIndianPhone, describePhoneProblem, formatPhone } from "@/lib/phone";
import { customerByPhone } from "@/lib/store";
import { courtName } from "@/lib/venue";

/** The demo's pay-first customer, used by the "Flagged customer" scenario. */
const FLAGGED = { name: "Rohan Mehta", phone: "+919000000106" };

/** The demo's one-time code. The real 831 sends a fresh one on WhatsApp. */
export const DEMO_CODE = "123456";
const CODE_LENGTH = DEMO_CODE.length;
const CODE_SLOTS = Array.from({ length: CODE_LENGTH }, (_, i) => `code-slot-${i}`);

/**
 * Name, number, a one-time code for the number, notes. A coss Form: each
 * Field validates itself on submit and the form focuses the first problem;
 * the number is confirmed once per visit with a coss OTP Field.
 */
export function YouStep(): React.ReactElement {
  const { draft, update, goTo } = useFlow();
  const store = useStore();
  const [busy, setBusy] = React.useState(false);
  const [taken, setTaken] = React.useState<Alternative[] | null>(null);
  const [codeSentTo, setCodeSentTo] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [codeError, setCodeError] = React.useState<string | null>(null);
  const codeRef = React.useRef<HTMLDivElement>(null);

  // The flagged scenario fills the form with a customer the venue asks to pay first.
  const { flagged } = store.scenarios;
  React.useEffect(() => {
    if (flagged && draft.phone !== formatPhone(FLAGGED.phone)) update({ name: FLAGGED.name, phone: formatPhone(FLAGGED.phone) });
    // Only when the scenario is switched on, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flagged]);

  const phone = checkIndianPhone(draft.phone).phone;
  const returning = phone ? customerByPhone(store.state, phone) : undefined;
  const verified = phone !== null && draft.verifiedPhone === phone;
  const awaitingCode = !verified && codeSentTo !== null && codeSentTo === phone;

  if (draft.date === null || draft.startMinute === null) return <></>;
  const span = { date: draft.date, startMinute: draft.startMinute, durationMinutes: draft.durationMinutes };

  const hold = async (slot = span, courtId = draft.courtId): Promise<void> => {
    const checked = checkIndianPhone(draft.phone).phone;
    if (!checked) return;
    setBusy(true);
    const result = await store.holdSlot({
      courtId: courtId === "any" ? null : courtId,
      date: slot.date,
      startMinute: slot.startMinute,
      durationMinutes: slot.durationMinutes,
      players: draft.players,
      name: draft.name,
      phone: checked,
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

  const sendCode = (to: string): void => {
    setCodeSentTo(to);
    setCode("");
    setCodeError(null);
    toastManager.add({
      id: "demo-code",
      title: `Demo code: ${DEMO_CODE}`,
      description: `The real 831 sends this to ${formatPhone(to)} on WhatsApp.`,
      type: "info",
    });
    // Focus the first box once it renders.
    window.setTimeout(() => codeRef.current?.querySelector("input")?.focus(), 0);
  };

  const checkCode = (value: string): void => {
    if (!phone) return;
    if (value === DEMO_CODE) {
      setCodeError(null);
      update({ verifiedPhone: phone });
      void hold();
    } else {
      setCodeError("That code is not right. Check the latest message and try again.");
      setCode("");
      codeRef.current?.querySelector("input")?.focus();
    }
  };

  // Runs only when every Field is valid; the Form focuses the first invalid one otherwise.
  const submit = (): void => {
    if (!phone) return;
    if (verified) return void hold();
    if (!awaitingCode) return sendCode(phone);
    // An incomplete code never gets here: the OTP Field is invalid, so the Form stops and focuses it.
    checkCode(code);
  };

  return (
    <section>
      <StepHeading description={`${courtName(draft.courtId === "any" ? "Any court" : draft.courtId)} · ${whenOf(span)}`} title="Your details" />
      <Form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
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

        <Fieldset className="flex flex-col gap-5">
          <FieldsetLegend className="sr-only">Who is booking</FieldsetLegend>
          <Field className="w-full" name="name" validate={() => (draft.name.trim() ? null : "Tell us who is booking.")}>
            <FieldLabel>Name</FieldLabel>
            <Input autoComplete="name" onChange={(event) => update({ name: event.target.value })} placeholder="Who is booking" size="lg" type="text" value={draft.name} />
            <FieldError />
          </Field>

          <Field
            className="w-full"
            name="phone"
            validate={() => {
              const problem = checkIndianPhone(draft.phone).problem;
              return problem ? describePhoneProblem(problem) : null;
            }}
          >
            <FieldLabel>Mobile number</FieldLabel>
            <InputGroup>
              <InputGroupInput
                autoComplete="tel-national"
                inputMode="tel"
                onBlur={() => {
                  const check = checkIndianPhone(draft.phone);
                  if (check.phone) update({ phone: formatPhone(check.phone).replace(/^\+91 /, "") });
                }}
                onChange={(event) => update({ phone: event.target.value })}
                placeholder="98765 43210"
                size="lg"
                type="tel"
                value={draft.phone.replace(/^\+91 /, "")}
              />
              <InputGroupAddon>
                <InputGroupText>+91</InputGroupText>
              </InputGroupAddon>
              {verified && (
                <InputGroupAddon align="inline-end">
                  <Badge variant="success">
                    <ShieldCheckIcon aria-hidden="true" />
                    Verified
                  </Badge>
                </InputGroupAddon>
              )}
            </InputGroup>
            <FieldError />
            <FieldDescription>For the confirmation and nothing else. We check it once with a code on WhatsApp.</FieldDescription>
          </Field>

          {awaitingCode && (
            <Field className="w-full" invalid={Boolean(codeError)}>
              <FieldLabel>Code sent to {formatPhone(codeSentTo)}</FieldLabel>
              <OTPField
                aria-describedby="code-help"
                length={CODE_LENGTH}
                onValueChange={(value) => {
                  setCode(value);
                  if (codeError) setCodeError(null);
                }}
                onValueComplete={checkCode}
                ref={codeRef}
                size="lg"
                value={code}
              >
                {CODE_SLOTS.map((key, i) => (
                  <React.Fragment key={key}>
                    {i === CODE_LENGTH / 2 && <OTPFieldSeparator />}
                    <OTPFieldInput aria-label={i === 0 ? undefined : `Character ${i + 1} of ${CODE_LENGTH}`} />
                  </React.Fragment>
                ))}
              </OTPField>
              {/* Shown for a wrong code, and when Base UI's own check finds the code incomplete on submit. */}
              <FieldError>{codeError ?? `Enter the ${CODE_LENGTH}-digit code.`}</FieldError>
              <FieldDescription className="flex flex-wrap items-center gap-1" id="code-help">
                <MessageCircleIcon aria-hidden="true" className="size-3.5" />
                Check WhatsApp for a {CODE_LENGTH}-digit code.
                <Button className="h-auto px-0 py-0 text-xs sm:h-auto" onClick={() => sendCode(codeSentTo)} size="xs" variant="link">
                  Send it again
                </Button>
              </FieldDescription>
            </Field>
          )}
        </Fieldset>

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
            {awaitingCode ? "Verify and hold" : "Hold this court"}
          </Button>
        </div>
        <p className="text-end text-muted-foreground text-xs">We hold the court for {store.scenarios.shortHold ? "30 seconds" : `${store.state.settings.holdMinutes} minutes`} while you pay.</p>
      </Form>
    </section>
  );
}
