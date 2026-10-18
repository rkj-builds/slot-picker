"use client";

import * as React from "react";
import { RadioCard } from "@/components/compositions/radio-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { RadioGroup } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { errorMessage } from "@/data/errors";
import { useWrite } from "@/data/provider";
import type { Conversation, LoggedAction } from "@/data/types";

const ACTIONS: readonly { value: LoggedAction; label: string; line: string }[] = [
  { value: "called", label: "Called", line: "Spoke on the phone." },
  { value: "texted", label: "Texted", line: "Sent an SMS from the venue phone." },
  { value: "replied", label: "Replied on WhatsApp", line: "Answered from the WhatsApp app, outside this inbox." },
  { value: "walk-in", label: "Came in person", line: "They came to the desk." },
  { value: "none", label: "No action", line: "Nothing was needed, a thank-you or a spam message." },
];

/**
 * What the desk did about a chat, for the record: one of five actions and a
 * note. Saving closes the chat (it stops waiting); Reopen brings it back.
 */
export function LogActionDialog({ conversation: c, open, onOpenChange }: { conversation: Conversation; open: boolean; onOpenChange: (open: boolean) => void }): React.ReactElement {
  const [action, setAction] = React.useState<LoggedAction>("called");
  const [note, setNote] = React.useState("");
  const log = useWrite((client, input: { action: LoggedAction; note: string }) => client.inbox.logAction(c.id, input));
  const reopen = useWrite((client) => client.inbox.reopen(c.id));
  const label = ACTIONS.find((a) => a.value === action)?.label ?? "";

  const save = async (): Promise<void> => {
    try {
      await log.mutateAsync({ action, note });
      onOpenChange(false);
      toastManager.add({
        title: `Logged “${label}” for ${c.name}`,
        description: "The chat is marked done.",
        type: "success",
        actionProps: {
          children: "Reopen",
          onClick: () => void reopen.mutateAsync(undefined).catch((error: unknown) => toastManager.add({ title: "Couldn't reopen the chat", description: errorMessage(error), type: "error" })),
        },
      });
    } catch (error) {
      toastManager.add({ title: "Couldn't log it", description: errorMessage(error), type: "error" });
    }
  };

  return (
    <Dialog
      onOpenChange={(next) => !log.isPending && onOpenChange(next)}
      onOpenChangeComplete={(isOpen) => {
        if (isOpen) return;
        setAction("called");
        setNote("");
      }}
      open={open}
    >
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Log what you did</DialogTitle>
          <DialogDescription>For {c.name}. Saving marks the chat done; you can reopen it.</DialogDescription>
        </DialogHeader>
        <Form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <DialogPanel className="flex flex-col gap-5">
            <RadioGroup aria-label="What you did" onValueChange={(v) => setAction(v as LoggedAction)} value={action}>
              {ACTIONS.map((a) => (
                <RadioCard key={a.value} value={a.value}>
                  <span className="font-medium text-sm">{a.label}</span>
                  <span className="text-muted-foreground text-sm">{a.line}</span>
                </RadioCard>
              ))}
            </RadioGroup>
            <Field>
              <FieldLabel>Note</FieldLabel>
              <Textarea maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="Wants evenings; call back after 6 PM" value={note} />
              <FieldDescription>Optional. Shows in the activity log.</FieldDescription>
            </Field>
          </DialogPanel>
          <DialogFooter>
            <DialogClose disabled={log.isPending} render={<Button variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button loading={log.isPending} type="submit">
              Log and mark done
            </Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}
