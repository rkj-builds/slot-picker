"use client";

import * as React from "react";
import { ListSkeleton, LoadFailed } from "@/app/screens/screen-kit";
import { TimeZoneCombobox } from "@/components/compositions/time-zone-combobox";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { errorMessage, isDataError } from "@/data/errors";
import { useRead, useWrite } from "@/data/provider";
import type { VenueProfile } from "@/data/types";

/** The venue's profile. One form card, Save in its footer, off until something changes (Cal.com's settings card). */
export function GeneralSettings({ now }: { now: number }): React.ReactElement {
  const profile = useRead(["settings", "profile"], (c) => c.settings.profile());
  const viewer = useRead(["viewer"], (c) => c.team.viewer());
  if (profile.isError) return <LoadFailed error={profile.error} onRetry={() => void profile.refetch()} what="the venue's details" />;
  if (!profile.data) return <ListSkeleton label="Loading the venue's details" rows={5} />;
  return <ProfileForm canEdit={viewer.data?.can.editSettings ?? false} key={JSON.stringify(profile.data)} now={now} saved={profile.data} />;
}

function ProfileForm({ saved, canEdit, now }: { saved: VenueProfile; canEdit: boolean; now: number }): React.ReactElement {
  const [draft, setDraft] = React.useState(saved);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const save = useWrite((c, next: VenueProfile) => c.settings.saveProfile(next));
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = <K extends keyof VenueProfile>(key: K, value: VenueProfile[K]): void => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([field]) => field !== key)));
  };

  const submit = async (): Promise<void> => {
    try {
      await save.mutateAsync(draft);
      toastManager.add({ title: "Venue details saved", description: "The booking page and messages use them from now on.", type: "success" });
    } catch (error) {
      if (isDataError(error) && Object.keys(error.fields).length > 0) setErrors(error.fields);
      else toastManager.add({ title: "Couldn't save the venue's details", description: errorMessage(error), type: "error" });
    }
  };

  return (
    <Form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (dirty && canEdit) void submit();
      }}
    >
      <Card>
        <CardHeader>
          <h3>
            <CardTitle render={<span className="block" />}>Venue</CardTitle>
          </h3>
          <CardDescription>Shown on the booking page, receipts and WhatsApp messages.</CardDescription>
        </CardHeader>
        <CardPanel>
          <fieldset className="grid gap-5 sm:grid-cols-2" disabled={!canEdit}>
            <legend className="sr-only">Venue details</legend>
            <Field className="sm:col-span-2" invalid={Boolean(errors.name)} name="name">
              <FieldLabel>Venue name</FieldLabel>
              <Input onChange={(e) => set("name", e.target.value)} value={draft.name} />
              {errors.name && <FieldError match>{errors.name}</FieldError>}
            </Field>
            <Field invalid={Boolean(errors.city)} name="city">
              <FieldLabel>City</FieldLabel>
              <Input onChange={(e) => set("city", e.target.value)} value={draft.city} />
              {errors.city && <FieldError match>{errors.city}</FieldError>}
            </Field>
            <Field invalid={Boolean(errors.contactEmail)} name="contactEmail">
              <FieldLabel>Contact email</FieldLabel>
              {/* Text with an email keyboard: the backend checks the address and says what is wrong, rather than the browser blocking the send. */}
              <Input autoComplete="email" inputMode="email" onChange={(e) => set("contactEmail", e.target.value)} value={draft.contactEmail} />
              {errors.contactEmail ? <FieldError match>{errors.contactEmail}</FieldError> : <FieldDescription>Where customers' email replies go.</FieldDescription>}
            </Field>
            <Field className="sm:col-span-2" invalid={Boolean(errors.address)} name="address">
              <FieldLabel>Address</FieldLabel>
              <Textarea onChange={(e) => set("address", e.target.value)} rows={2} value={draft.address} />
              {errors.address && <FieldError match>{errors.address}</FieldError>}
            </Field>
            <Field className="sm:col-span-2" invalid={Boolean(errors.timeZone)} name="timeZone">
              <FieldLabel>Time zone</FieldLabel>
              <TimeZoneCombobox at={now} onValueChange={(zone) => set("timeZone", zone)} value={draft.timeZone} />
              {errors.timeZone ? <FieldError match>{errors.timeZone}</FieldError> : <FieldDescription>Every time on the desk and the booking page is in this zone. Prices are in Indian rupees.</FieldDescription>}
            </Field>
          </fieldset>
        </CardPanel>
        <CardFooter className="flex flex-wrap items-center justify-end gap-3 border-t">
          {!canEdit && <p className="me-auto text-muted-foreground text-sm">Only an admin, or a manager given Settings, can change these.</p>}
          {dirty && canEdit && (
            <Button onClick={() => setDraft(saved)} variant="ghost">
              Discard
            </Button>
          )}
          <Button disabled={!dirty || !canEdit} loading={save.isPending} type="submit">
            Save venue details
          </Button>
        </CardFooter>
      </Card>
    </Form>
  );
}
