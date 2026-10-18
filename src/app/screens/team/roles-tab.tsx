"use client";

import { CircleCheckIcon } from "lucide-react";
import * as React from "react";
import { useAnchoredBarHeight } from "@/app/anchored-bar";
import { DeskViewFooter } from "@/app/desk/desk-toolbar";
import { ListSkeleton, LoadFailed } from "@/app/screens/screen-kit";
import { FEATURE_LABELS, ROLE_LABELS } from "@/app/screens/team/team-words";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SegmentedControl, SegmentedControlItem } from "@/components/compositions/segmented-control";
import { Frame } from "@/components/ui/frame";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toastManager } from "@/components/ui/toast";
import { errorMessage } from "@/data/errors";
import { useRead, useWrite } from "@/data/provider";
import { type Feature, FEATURES, type RoleAccess } from "@/data/types";
import { useMediaQuery } from "@/hooks/use-media-query";

type EditableRole = keyof RoleAccess;
const EDITABLE: readonly EditableRole[] = ["manager", "staff", "coach"];

function sameAccess(a: RoleAccess, b: RoleAccess): boolean {
  return EDITABLE.every((r) => FEATURES.every((f) => a[r].includes(f) === b[r].includes(f)));
}

/**
 * Which areas each role sees: features down the side, roles across. Admin
 * has everything and can't be changed (so nobody locks the venue out). A
 * draft until saved, with the desk's save bar; ?demo=unsaved opens it with
 * Front desk given Payments, not saved yet.
 */
export function RolesTab({ admin, demoUnsaved }: { admin: boolean; demoUnsaved: boolean }): React.ReactElement {
  const access = useRead(["team", "access"], (c) => c.team.access());
  // Lives here, not in the matrix: a save remounts the matrix, and the toast's Undo still needs it.
  const save = useWrite((c, next: RoleAccess) => c.team.saveAccess(next));
  // The demo's unsaved edit applies once; after a save the matrix starts from what's stored.
  const [demoUsed, setDemoUsed] = React.useState(false);
  const demo = demoUnsaved && !demoUsed;
  if (access.isError) return <LoadFailed error={access.error} onRetry={() => void access.refetch()} what="roles and access" />;
  if (!access.data) return <ListSkeleton label="Loading roles and access" rows={9} />;
  // A save (or a refresh with new access) starts the draft over from what's stored.
  return (
    <Matrix
      admin={admin}
      // Arriving at ?demo=unsaved while the matrix is open starts it over with the demo's edit.
      key={`${demo}:${JSON.stringify(access.data)}`}
      onSave={async (next) => {
        setDemoUsed(true);
        await save.mutateAsync(next);
      }}
      saved={access.data}
      saving={save.isPending}
      startUnsaved={demo}
    />
  );
}

function Matrix({
  saved,
  admin,
  startUnsaved,
  saving,
  onSave,
}: {
  saved: RoleAccess;
  admin: boolean;
  startUnsaved: boolean;
  saving: boolean;
  onSave: (access: RoleAccess) => Promise<void>;
}): React.ReactElement {
  const [draft, setDraft] = React.useState<RoleAccess>(() =>
    startUnsaved && !saved.staff.includes("payments") ? { ...saved, staff: [...saved.staff, "payments"] } : saved,
  );
  const dirty = !sameAccess(draft, saved);
  const formId = React.useId();
  const phone = useMediaQuery("max-md");

  const toggle = (role: EditableRole, feature: Feature, on: boolean): void =>
    setDraft((d) => ({ ...d, [role]: on ? FEATURES.filter((f) => f === feature || d[role].includes(f)) : d[role].filter((f) => f !== feature) }));

  const submit = async (): Promise<void> => {
    try {
      await onSave(draft);
      toastManager.add({
        title: "Access saved",
        description: "Each person sees the change the next time a page loads.",
        type: "success",
        actionProps: {
          children: "Undo",
          onClick: () => void onSave(saved).catch((error: unknown) => toastManager.add({ title: "Couldn't undo", description: errorMessage(error), type: "error" })),
        },
      });
    } catch (error) {
      toastManager.add({ title: "Couldn't save access", description: errorMessage(error), type: "error" });
    }
  };

  return (
    <form
      className="flex flex-col gap-3"
      id={formId}
      onSubmit={(event) => {
        event.preventDefault();
        if (dirty && admin) void submit();
      }}
    >
      <p className="text-muted-foreground text-sm">Tick what each role can open. People only see the areas their role has, in the sidebar and in search.</p>
      {phone ? (
        <PhoneMatrix admin={admin} draft={draft} saved={saved} toggle={toggle} />
      ) : (
        <Frame>
          <Table aria-label="Roles and access" variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>Area</TableHead>
                <TableHead className="text-center">{ROLE_LABELS.admin}</TableHead>
                {EDITABLE.map((r) => (
                  <TableHead className="text-center" key={r}>
                    {ROLE_LABELS[r]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {FEATURES.map((f) => (
                <TableRow key={f}>
                  <TableCell>
                    <span className="flex flex-col">
                      <span className="font-medium">{FEATURE_LABELS[f].label}</span>
                      <span className="text-muted-foreground text-xs">{FEATURE_LABELS[f].line}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox aria-label={`${ROLE_LABELS.admin}: ${FEATURE_LABELS[f].label}, always`} checked disabled />
                  </TableCell>
                  {EDITABLE.map((r) => {
                    const changed = draft[r].includes(f) !== saved[r].includes(f);
                    return (
                      <TableCell className="text-center" data-changed={changed || undefined} key={r}>
                        <span className="relative inline-flex">
                          <Checkbox
                            aria-label={`${ROLE_LABELS[r]}: ${FEATURE_LABELS[f].label}`}
                            checked={draft[r].includes(f)}
                            disabled={!admin}
                            onCheckedChange={(on) => toggle(r, f, on)}
                          />
                          {changed && <span aria-hidden="true" className="absolute -end-1.5 -top-1.5 size-2 rounded-full bg-warning" />}
                        </span>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Frame>
      )}
      <p className="text-muted-foreground text-xs">Admin always has every area, so the venue can't be locked out.</p>
      {admin && (
        <DeskViewFooter>
          <SaveBar dirty={dirty} formId={formId} onDiscard={() => setDraft(saved)} saving={saving} />
        </DeskViewFooter>
      )}
    </form>
  );
}

/**
 * The matrix on a phone: four columns don't fit, so pick a role, then tick
 * its areas in a list. Same draft, same save bar.
 */
function PhoneMatrix({
  draft,
  saved,
  admin,
  toggle,
}: {
  draft: RoleAccess;
  saved: RoleAccess;
  admin: boolean;
  toggle: (role: EditableRole, feature: Feature, on: boolean) => void;
}): React.ReactElement {
  const [role, setRole] = React.useState<EditableRole>("staff");
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl aria-label="Role" fill onValueChange={(v) => setRole(v)} value={role}>
        {EDITABLE.map((r) => (
          <SegmentedControlItem key={r} value={r}>
            {ROLE_LABELS[r]}
            {!sameAccess({ ...saved, [r]: draft[r] }, saved) && <span className="sr-only"> (changed)</span>}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      <ul aria-label={`${ROLE_LABELS[role]} can open`} className="flex flex-col divide-y rounded-2xl border bg-card">
        {FEATURES.map((f) => (
          <li key={f}>
            <Label className="flex items-start gap-3 px-4 py-3 font-normal">
              <Checkbox checked={draft[role].includes(f)} className="mt-0.5" disabled={!admin} onCheckedChange={(on) => toggle(role, f, on)} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium text-sm">{FEATURE_LABELS[f].label}</span>
                <span className="text-muted-foreground text-xs">{FEATURE_LABELS[f].line}</span>
              </span>
              {draft[role].includes(f) !== saved[role].includes(f) && <Badge variant="warning">Changed</Badge>}
            </Label>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The desk's save bar (as on Booking rules): always in sight, Discard and Save off until something changed. */
function SaveBar({ dirty, formId, saving, onDiscard }: { dirty: boolean; formId: string; saving: boolean; onDiscard: () => void }): React.ReactElement {
  const ref = useAnchoredBarHeight<HTMLElement>();
  return (
    <section aria-label="Save access" className="border-t bg-background/94 pb-[env(safe-area-inset-bottom)] backdrop-blur-md" ref={ref}>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-end gap-2 px-4 py-3">
        <span aria-live="polite" className="me-auto flex items-center gap-1.5 text-muted-foreground text-sm">
          {dirty ? (
            <Badge variant="warning">Unsaved changes</Badge>
          ) : (
            <>
              <CircleCheckIcon aria-hidden="true" className="size-4" />
              All changes saved
            </>
          )}
        </span>
        <Button disabled={!dirty || saving} onClick={onDiscard} variant="ghost">
          Discard
        </Button>
        <Button disabled={!dirty} form={formId} loading={saving} type="submit">
          Save access
        </Button>
      </div>
    </section>
  );
}
