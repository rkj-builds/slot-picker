"use client";

import type * as React from "react";
import { ROLE_LABELS, ROLE_LINES, ROLES } from "@/app/screens/team/team-words";
import { RadioCard } from "@/components/compositions/radio-card";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Field, FieldDescription, FieldError, FieldItem, FieldLabel } from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { RadioGroup } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/data/errors";
import { useRead } from "@/data/provider";
import type { Role } from "@/data/types";

/** The four roles as cards, each with what it can do in a line (coss p-radio-group-4). */
export function RolePicker({ value, onChange }: { value: Role; onChange: (role: Role) => void }): React.ReactElement {
  return (
    // A plain Fieldset, not a Field: a Field would claim the radios' ids, and each card's label would lose its radio.
    <Fieldset>
      <FieldsetLegend className="mb-2 font-medium text-sm">Role</FieldsetLegend>
      <RadioGroup aria-label="Role" className="grid gap-2 sm:grid-cols-2" onValueChange={(v) => onChange(v as Role)} value={value}>
        {ROLES.map((role) => (
          <RadioCard key={role} value={role}>
            <span className="font-medium text-sm">{ROLE_LABELS[role]}</span>
            <span className="text-muted-foreground text-sm">{ROLE_LINES[role]}</span>
          </RadioCard>
        ))}
      </RadioGroup>
    </Fieldset>
  );
}

/** A coach sees only the programmes they run, so a coach needs at least one. */
export function ProgrammePicker({ value, onChange, error }: { value: string[]; onChange: (ids: string[]) => void; error?: string }): React.ReactElement {
  const programmes = useRead(["programmes", "list"], (c) => c.programmes.list());
  const open = programmes.data?.programmes.filter((p) => p.status !== "finished") ?? [];
  return (
    <Field invalid={Boolean(error)} name="programmeIds" render={(props) => <Fieldset {...props} />}>
      <FieldsetLegend className="mb-2 font-medium text-sm">Programmes they coach</FieldsetLegend>
      {programmes.isError ? (
        <p className="text-destructive-foreground text-sm">{errorMessage(programmes.error)}</p>
      ) : !programmes.data ? (
        <div aria-busy="true" className="flex flex-col gap-2" role="status">
          <span className="sr-only">Loading programmes</span>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-40" />
        </div>
      ) : (
        <CheckboxGroup aria-label="Programmes they coach" className="gap-2" onValueChange={onChange} value={value}>
          {open.map((p) => (
            <FieldItem key={p.id}>
              <FieldLabel className="font-normal">
                <Checkbox value={p.id} />
                {p.name}
              </FieldLabel>
            </FieldItem>
          ))}
        </CheckboxGroup>
      )}
      {error ? <FieldError match>{error}</FieldError> : <FieldDescription>They'll see these programmes' registers and nothing else.</FieldDescription>}
    </Field>
  );
}
