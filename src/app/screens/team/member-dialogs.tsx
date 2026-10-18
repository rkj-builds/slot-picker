"use client";

import * as React from "react";
import { ProgrammePicker, RolePicker } from "@/app/screens/team/role-fields";
import { aRole, ROLE_LABELS } from "@/app/screens/team/team-words";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { toastManager } from "@/components/ui/toast";
import { errorMessage, isDataError } from "@/data/errors";
import { useWrite } from "@/data/provider";
import type { Role, TeamMember } from "@/data/types";

export interface MemberAction {
  kind: "role" | "disable" | "remove";
  member: TeamMember;
}

/** The row menu's dialogs. The backend's refusal ("the venue needs at least one admin") shows inside the dialog, where the decision is. */
export function MemberDialogs({ action, onClose }: { action: MemberAction | null; onClose: () => void }): React.ReactElement {
  // Keep the last action on screen while a dialog animates out.
  const [last, setLast] = React.useState(action);
  if (action && action !== last) setLast(action);
  const shown = action ?? last;
  return (
    <>
      <ChangeRoleDialog member={shown?.kind === "role" ? shown.member : null} onClose={onClose} open={action?.kind === "role"} />
      <ConfirmDialog action={shown?.kind === "disable" || shown?.kind === "remove" ? shown : null} onClose={onClose} open={action?.kind === "disable" || action?.kind === "remove"} />
    </>
  );
}

function ChangeRoleDialog({ member, open, onClose }: { member: TeamMember | null; open: boolean; onClose: () => void }): React.ReactElement {
  return (
    <Dialog onOpenChange={(next) => !next && onClose()} open={open}>
      <DialogPopup className="sm:max-w-xl">{member && <ChangeRoleForm key={member.id} member={member} onDone={onClose} />}</DialogPopup>
    </Dialog>
  );
}

function ChangeRoleForm({ member, onDone }: { member: TeamMember; onDone: () => void }): React.ReactElement {
  const [role, setRole] = React.useState<Role>(member.role);
  const [programmeIds, setProgrammeIds] = React.useState<string[]>(member.programmeIds);
  const [problem, setProblem] = React.useState<{ fields: Record<string, string>; message: string | null }>({ fields: {}, message: null });
  const update = useWrite((c, patch: { role: Role; programmeIds: string[] }) => c.team.update(member.id, patch));
  const unchanged = role === member.role && (role !== "coach" || programmeIds.join() === member.programmeIds.join());

  const save = async (): Promise<void> => {
    if (role === "coach" && programmeIds.length === 0) {
      setProblem({ fields: { programmeIds: "A coach needs at least one programme" }, message: null });
      return;
    }
    try {
      const next = await update.mutateAsync({ role, programmeIds: role === "coach" ? programmeIds : [] });
      toastManager.add({ title: `${next.name} is now ${aRole(next.role)}`, description: "It applies the next time a page of theirs loads.", type: "success" });
      onDone();
    } catch (error) {
      setProblem({ fields: isDataError(error) ? error.fields : {}, message: errorMessage(error) });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Change {member.name}'s role</DialogTitle>
        <DialogDescription>Now {ROLE_LABELS[member.role]}. What they can see follows Roles & access.</DialogDescription>
      </DialogHeader>
      <Form
        className="contents"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <DialogPanel className="flex flex-col gap-5">
          {problem.message && (
            <Alert variant="error">
              <AlertDescription>{problem.message}</AlertDescription>
            </Alert>
          )}
          <RolePicker onChange={setRole} value={role} />
          {role === "coach" && <ProgrammePicker error={problem.fields.programmeIds} onChange={setProgrammeIds} value={programmeIds} />}
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button disabled={unchanged} loading={update.isPending} type="submit">
            Change role
          </Button>
        </DialogFooter>
      </Form>
    </>
  );
}

/** Disable access, or remove from the team (cancel an invite). Both destructive, both confirmed. */
function ConfirmDialog({ action, open, onClose }: { action: MemberAction | null; open: boolean; onClose: () => void }): React.ReactElement {
  const [refusal, setRefusal] = React.useState<string | null>(null);
  const disable = useWrite((c, id: string) => c.team.update(id, { status: "disabled" }));
  const enable = useWrite((c, id: string) => c.team.update(id, { status: "active" }));
  const remove = useWrite((c, id: string) => c.team.remove(id));
  const busy = disable.isPending || remove.isPending;
  const m = action?.member;
  const invited = m?.status === "invited";

  const copy =
    action?.kind === "disable"
      ? {
          title: `Disable ${m?.name}'s access?`,
          body: "They're signed out on every device and can't sign in until an admin enables them again. Nothing they did is lost.",
          confirm: "Disable access",
        }
      : invited
        ? { title: `Cancel ${m?.name}'s invite?`, body: "The link in their email stops working. You can invite them again later.", confirm: "Cancel invite" }
        : {
            title: `Remove ${m?.name} from the team?`,
            body: "They lose access straight away and every device they use is signed out. Their bookings and notes stay. You can invite them again later.",
            confirm: "Remove from team",
          };

  const confirm = async (): Promise<void> => {
    if (!action) return;
    setRefusal(null);
    const member = action.member;
    try {
      if (action.kind === "disable") {
        await disable.mutateAsync(member.id);
        toastManager.add({
          title: `Disabled ${member.name}'s access`,
          type: "success",
          actionProps: {
            children: "Undo",
            onClick: () =>
              void enable.mutateAsync(member.id).then(
                () => toastManager.add({ title: `Enabled ${member.name}'s access`, type: "success" }),
                (error: unknown) => toastManager.add({ title: "Couldn't enable access", description: errorMessage(error), type: "error" }),
              ),
          },
        });
      } else {
        await remove.mutateAsync(member.id);
        toastManager.add({ title: invited ? `Cancelled ${member.name}'s invite` : `Removed ${member.name} from the team`, type: "success" });
      }
      onClose();
    } catch (error) {
      setRefusal(errorMessage(error));
    }
  };

  return (
    <AlertDialog
      onOpenChange={(next) => !next && !busy && onClose()}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) setRefusal(null);
      }}
      open={open}
    >
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.body}</AlertDialogDescription>
        </AlertDialogHeader>
        {refusal && (
          <div className="px-6 pb-2">
            <Alert variant="error">
              <AlertDescription>{refusal}</AlertDescription>
            </Alert>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogClose disabled={busy} render={<Button variant="ghost" />}>
            Keep {invited ? "the invite" : "access"}
          </AlertDialogClose>
          <Button loading={busy} onClick={() => void confirm()} variant="destructive">
            {copy.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
