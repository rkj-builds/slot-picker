"use client";

import { ArrowLeftIcon, CheckIcon, ClipboardPenIcon, ClockIcon, ContactIcon, HandIcon, RotateCcwIcon, UserRoundCheckIcon, UserRoundXIcon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import { hrefFor } from "@/app/router";
import { firstName, inboxHref } from "@/app/screens/inbox/inbox-tabs";
import { LogActionDialog } from "@/app/screens/inbox/log-action-dialog";
import { MessageLog } from "@/app/screens/inbox/message-log";
import { ReplyComposer } from "@/app/screens/inbox/reply-composer";
import { LoadFailed } from "@/app/screens/screen-kit";
import { waitOf, waitTone } from "@/app/screens/team/time-words";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toastManager } from "@/components/ui/toast";
import { errorMessage } from "@/data/errors";
import { useRead, useWrite } from "@/data/provider";
import type { Conversation, ConversationTab, Viewer } from "@/data/types";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

/** Roles that may take a chat over from the bot (the backend refuses the rest). */
const DESK_ROLES: readonly Viewer["role"][] = ["admin", "manager", "staff"];

function failed(title: string, error: unknown): void {
  toastManager.add({ title, description: errorMessage(error), type: "error" });
}

/**
 * One conversation: who it is, whether the bot or a person answers, who has
 * it and what was done (the triage bar), the messages, and the reply box.
 * Opening it marks it read.
 */
export function ChatPane({ id, tab, now, phone }: { id: string; tab: ConversationTab; now: number; phone: boolean }): React.ReactElement {
  const conversation = useRead(["inbox", "conversation", id], (c) => c.inbox.get(id));
  const viewer = useRead(["viewer"], (c) => c.team.viewer());
  const markRead = useWrite((c, conversationId: string) => c.inbox.markRead(conversationId));
  const { mutate: markReadNow } = markRead;
  const unread = (conversation.data?.unread ?? 0) > 0;
  React.useEffect(() => {
    if (unread) markReadNow(id);
  }, [id, unread, markReadNow]);

  const send = useWrite((c, body: string) => c.inbox.send(id, body));
  const sendBody = async (body: string): Promise<boolean> => {
    try {
      await send.mutateAsync(body);
      return true;
    } catch (error) {
      failed("Couldn't send", error);
      return false;
    }
  };

  const back = phone ? (
    <Button className="-ms-2 self-start text-muted-foreground" render={<Anchor href={inboxHref(tab)} />} size="sm" variant="ghost">
      <ArrowLeftIcon aria-hidden="true" />
      All conversations
    </Button>
  ) : null;

  if (conversation.isError) {
    return (
      <section aria-label="Conversation" className="flex min-h-0 flex-col justify-center gap-2 border-s p-3">
        {back}
        <LoadFailed error={conversation.error} onRetry={() => void conversation.refetch()} what="this conversation" />
      </section>
    );
  }
  const c = conversation.data;
  if (!c) return <PaneSkeleton />;
  const canTakeOver = viewer.data ? DESK_ROLES.includes(viewer.data.role) : false;
  const lockedReason = !canTakeOver
    ? "Only the desk can reply here. A coach can read the chat."
    : `The bot is answering ${firstName(c.name)}. Turn on Reply by hand to write.`;

  return (
    <section aria-labelledby="chat-title" className={cn("flex min-h-0 flex-col", !phone && "border-s")} data-slot="chat-pane">
      <header className="flex flex-col gap-3 border-b px-3 py-3 sm:px-5">
        {back}
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="truncate font-semibold text-lg" id="chat-title">
              {c.name}
            </h2>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-sm">
              <span className="tabular-nums">{formatPhone(c.phone)}</span>
              {c.customerId ? (
                <Anchor className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline" href={hrefFor(`/desk/customers/${c.customerId}`)}>
                  <ContactIcon aria-hidden="true" className="size-3.5" />
                  Customer profile
                </Anchor>
              ) : (
                <span>Not a customer yet</span>
              )}
            </p>
          </div>
          <ManualSwitch canTakeOver={canTakeOver} conversation={c} />
        </div>
      </header>
      <TriageBar conversation={c} now={now} viewer={viewer.data ?? null} />
      <MessageLog canResend={c.manual && canTakeOver} conversation={c} now={now} onResend={(body) => void sendBody(body)} />
      <ReplyComposer locked={!c.manual || !canTakeOver} lockedReason={lockedReason} name={c.name} onSend={sendBody} sending={send.isPending} />
    </section>
  );
}

/** "Reply by hand": off, the bot answers; on, it stays quiet and the team replies. Reversible, so Undo rather than a confirm. */
function ManualSwitch({ conversation: c, canTakeOver }: { conversation: Conversation; canTakeOver: boolean }): React.ReactElement {
  const setManual = useWrite((client, manual: boolean) => client.inbox.setManual(c.id, manual));
  const descriptionId = React.useId();
  const first = firstName(c.name);
  const change = async (manual: boolean, undo = true): Promise<void> => {
    try {
      await setManual.mutateAsync(manual);
      toastManager.add({
        title: manual ? `Replying to ${first} by hand` : `The bot is answering ${first} again`,
        type: "success",
        ...(undo ? { actionProps: { children: "Undo", onClick: () => void change(!manual, false) } } : {}),
      });
    } catch (error) {
      failed(manual ? "Couldn't take over the chat" : "Couldn't hand the chat back", error);
    }
  };
  return (
    <Field className="max-w-xs flex-row items-start gap-3" disabled={!canTakeOver}>
      <Switch aria-describedby={descriptionId} checked={c.manual} className="mt-0.5" disabled={!canTakeOver || setManual.isPending} onCheckedChange={(v) => void change(v)} />
      <div className="flex flex-col gap-0.5">
        <FieldLabel>Reply by hand</FieldLabel>
        <FieldDescription id={descriptionId}>
          {!canTakeOver ? "Only the desk can take a chat over from the bot." : c.manual ? "The bot stays quiet here. The team replies." : "Off: the booking bot answers on its own."}
        </FieldDescription>
      </div>
    </Field>
  );
}

/**
 * Triage: who has this chat and what happened. Take it (so two people don't
 * answer one lead), release it, log what you did (which closes it), or
 * reopen it.
 */
function TriageBar({ conversation: c, now, viewer }: { conversation: Conversation; now: number; viewer: Viewer | null }): React.ReactElement {
  const claim = useWrite((client, take: boolean) => client.inbox.claim(c.id, take));
  const reopen = useWrite((client) => client.inbox.reopen(c.id));
  const [logging, setLogging] = React.useState(false);
  const mine = viewer !== null && c.assignedTo === viewer.memberId;
  const someoneElse = c.assignedTo !== null && !mine;
  const owner = c.assigneeName ? firstName(c.assigneeName) : "Someone else";

  const take = async (value: boolean, undo = true): Promise<void> => {
    try {
      await claim.mutateAsync(value);
      toastManager.add({
        title: value ? `Took the chat with ${c.name}` : `Released the chat with ${c.name}`,
        description: value ? "Others see it's yours." : "Anyone on the desk can take it now.",
        type: "success",
        ...(undo ? { actionProps: { children: "Undo", onClick: () => void take(!value, false) } } : {}),
      });
    } catch (error) {
      failed(value ? "Couldn't take the chat" : "Couldn't release the chat", error);
    }
  };
  const doReopen = async (): Promise<void> => {
    try {
      await reopen.mutateAsync(undefined);
      toastManager.add({ title: `Reopened the chat with ${c.name}`, type: "success" });
    } catch (error) {
      failed("Couldn't reopen the chat", error);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-muted/40 px-3 py-2 sm:px-5" data-slot="triage-bar">
      <p className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm">
        {c.status === "done" ? (
          <Badge variant="success">
            <CheckIcon aria-hidden="true" />
            Done
          </Badge>
        ) : c.waitingSince !== null ? (
          <Badge variant={waitTone(c.waitingSince, now)}>
            <ClockIcon aria-hidden="true" />
            Waiting {waitOf(c.waitingSince, now)}
          </Badge>
        ) : null}
        <span className="text-muted-foreground">
          {mine ? "You have this one." : someoneElse ? `${owner} has this one.` : c.status === "done" ? "Nobody needs to reply." : "Nobody has taken this yet."}
        </span>
        {c.manual && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <HandIcon aria-hidden="true" className="size-3.5" />
            By hand
          </span>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {c.status === "done" ? (
          <Button loading={reopen.isPending} onClick={() => void doReopen()} size="sm" variant="outline">
            <RotateCcwIcon aria-hidden="true" />
            Reopen
          </Button>
        ) : (
          <>
            {mine ? (
              <Button loading={claim.isPending} onClick={() => void take(false)} size="sm" variant="ghost">
                <UserRoundXIcon aria-hidden="true" />
                Release
              </Button>
            ) : (
              <Button disabled={someoneElse} loading={claim.isPending} onClick={() => void take(true)} size="sm" variant="outline">
                <UserRoundCheckIcon aria-hidden="true" />
                Take this
              </Button>
            )}
            <Button onClick={() => setLogging(true)} size="sm" variant="outline">
              <ClipboardPenIcon aria-hidden="true" />
              Log what you did
            </Button>
          </>
        )}
      </div>
      <LogActionDialog conversation={c} onOpenChange={setLogging} open={logging} />
    </div>
  );
}

function PaneSkeleton(): React.ReactElement {
  return (
    <div aria-busy="true" className="flex min-h-0 flex-col gap-4 border-s p-5" role="status">
      <span className="sr-only">Loading the conversation</span>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-10 w-3/5 rounded-2xl" />
      <Skeleton className="h-10 w-2/5 self-end rounded-2xl" />
    </div>
  );
}
