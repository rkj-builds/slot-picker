"use client";

import * as React from "react";
import { ProgrammePicker, RolePicker } from "@/app/screens/team/role-fields";
import { aRole } from "@/app/screens/team/team-words";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";
import { errorMessage, isDataError } from "@/data/errors";
import { useWrite } from "@/data/provider";
import type { Role } from "@/data/types";

interface Draft {
  name: string;
  email: string;
  role: Role;
  programmeIds: string[];
}

const EMPTY: Draft = { name: "", email: "", role: "staff", programmeIds: [] };
/** The demo's "invite with mistakes": a used email and a coach with no programme, checked as it opens. */
const WITH_MISTAKES: Draft = { name: "", email: "sunil@example.com", role: "coach", programmeIds: [] };

/**
 * Invite someone: name, email, a role picked from cards that say what each
 * can do, and for a coach, the programmes they run. The backend checks
 * everything and its answer lands on the fields. Opened by #/desk/team?invite=1
 * (?invite=check opens it with mistakes, already checked).
 */
export function InviteDialog({ open, withMistakes, onOpenChange }: { open: boolean; withMistakes: boolean; onOpenChange: (open: boolean) => void }): React.ReactElement {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="sm:max-w-xl">{open && <InviteForm onDone={() => onOpenChange(false)} withMistakes={withMistakes} />}</DialogPopup>
    </Dialog>
  );
}

function InviteForm({ withMistakes, onDone }: { withMistakes: boolean; onDone: () => void }): React.ReactElement {
  const [draft, setDraft] = React.useState<Draft>(withMistakes ? WITH_MISTAKES : EMPTY);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [refusal, setRefusal] = React.useState<string | null>(null);
  const invite = useWrite((c, input: Draft) => c.team.invite(input));
  const set = <K extends keyof Draft>(key: K, value: Draft[K]): void => {
    setDraft((d) => ({ ...d, [key]: value }));
    // A field's error clears once it's edited; the backend checks again on send.
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([field]) => field !== key)));
  };

  const submit = React.useCallback(
    async (input: Draft): Promise<void> => {
      setRefusal(null);
      try {
        const member = await invite.mutateAsync(input);
        toastManager.add({ title: `Invite sent to ${member.name}`, description: `${member.email} gets a link to join as ${aRole(member.role)}.`, type: "success" });
        onDone();
      } catch (error) {
        if (isDataError(error) && Object.keys(error.fields).length > 0) setErrors(error.fields);
        else setRefusal(errorMessage(error));
      }
    },
    [invite, onDone],
  );

  // The demo's state opens already checked, so the backend's answers show on the fields.
  const checked = React.useRef(false);
  React.useEffect(() => {
    if (!withMistakes || checked.current) return;
    checked.current = true;
    void submit(WITH_MISTAKES);
  }, [withMistakes, submit]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Invite someone</DialogTitle>
        <DialogDescription>They get an email with a link to set a password and join the venue.</DialogDescription>
      </DialogHeader>
      <Form
        className="contents"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit(draft);
        }}
      >
        <DialogPanel className="flex flex-col gap-5">
          {refusal && (
            <Alert variant="error">
              <AlertDescription>{refusal}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field invalid={Boolean(errors.name)} name="name">
              <FieldLabel>Name</FieldLabel>
              <Input autoComplete="off" onChange={(e) => set("name", e.target.value)} value={draft.name} />
              {errors.name && <FieldError match>{errors.name}</FieldError>}
            </Field>
            <Field invalid={Boolean(errors.email)} name="email">
              <FieldLabel>Email</FieldLabel>
              <Input autoComplete="off" onChange={(e) => set("email", e.target.value)} inputMode="email" placeholder="name@example.com" value={draft.email} />
              {errors.email ? <FieldError match>{errors.email}</FieldError> : <FieldDescription>They sign in with this.</FieldDescription>}
            </Field>
          </div>
          <RolePicker onChange={(role) => set("role", role)} value={draft.role} />
          {draft.role === "coach" && <ProgrammePicker error={errors.programmeIds} onChange={(ids) => set("programmeIds", ids)} value={draft.programmeIds} />}
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button loading={invite.isPending} type="submit">
            Send invite
          </Button>
        </DialogFooter>
      </Form>
    </>
  );
}
