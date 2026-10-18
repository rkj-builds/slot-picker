"use client";

import { LockIcon, SendIcon } from "lucide-react";
import * as React from "react";
import { firstName } from "@/app/screens/inbox/inbox-tabs";
import { Button } from "@/components/ui/button";
import { Composer, ComposerActionGroup, ComposerActions, ComposerInput, ComposerSubmit, type ComposerValue, getComposerText } from "@/components/ui/composer";
import { cn } from "@/lib/utils";

/** WhatsApp's own limit for one message. */
export const MESSAGE_LIMIT = 4096;
/** The count shows once a message gets this close to the limit. */
const COUNT_FROM = MESSAGE_LIMIT - 500;

/**
 * Write back: coss Composer over a plain textarea. Enter sends, Shift+Enter
 * starts a new line. While the bot is answering the chat the box is locked,
 * and says so, so two voices never answer one person.
 */
export function ReplyComposer({
  name,
  locked,
  lockedReason,
  sending,
  onSend,
}: {
  name: string;
  locked: boolean;
  lockedReason: string;
  sending: boolean;
  /** Resolves true when the message went, so the box clears; false keeps the text to try again. */
  onSend: (body: string) => Promise<boolean>;
}): React.ReactElement {
  const [value, setValue] = React.useState<ComposerValue>([]);
  const text = getComposerText(value);
  const length = text.trim().length;
  const over = length > MESSAGE_LIMIT;
  const hintId = React.useId();
  const countId = React.useId();

  return (
    <div className="flex flex-col gap-1.5 border-t bg-background/60 p-3" data-slot="reply-composer">
      <Composer
        disabled={locked}
        onSubmit={(draft) => {
          const body = getComposerText(draft).trim();
          if (!body || over || sending) return;
          void onSend(body).then((sent) => sent && setValue([]));
        }}
        onValueChange={setValue}
        submitDisabled={over || sending}
        submitOnEnter="always"
        value={value}
      >
        <ComposerInput
          render={
            <textarea
              aria-describedby={cn(hintId, length >= COUNT_FROM && countId)}
              aria-invalid={over || undefined}
              aria-label={`Reply to ${name}`}
              placeholder={locked ? "The bot is answering" : `Write to ${firstName(name)}…`}
            />
          }
        />
        <ComposerActions>
          <ComposerActionGroup>
            {length >= COUNT_FROM && (
              <span className={cn("px-1 text-xs tabular-nums", over ? "font-medium text-destructive-foreground" : "text-muted-foreground")} id={countId}>
                {over ? `${(length - MESSAGE_LIMIT).toLocaleString("en-IN")} characters too long` : `${(MESSAGE_LIMIT - length).toLocaleString("en-IN")} characters left`}
              </span>
            )}
          </ComposerActionGroup>
          <ComposerActionGroup align="end">
            <ComposerSubmit
              render={
                <Button aria-label="Send" loading={sending} size="icon-sm">
                  <SendIcon aria-hidden="true" />
                </Button>
              }
            />
          </ComposerActionGroup>
        </ComposerActions>
      </Composer>
      <p className={cn("flex items-center gap-1.5 text-xs", locked ? "text-foreground" : "text-muted-foreground")} id={hintId}>
        {locked && <LockIcon aria-hidden="true" className="size-3.5 shrink-0" />}
        {locked ? lockedReason : "Enter sends. Shift + Enter starts a new line."}
      </p>
    </div>
  );
}
