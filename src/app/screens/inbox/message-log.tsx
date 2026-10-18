"use client";

import { CheckCheckIcon, CheckIcon, CircleAlertIcon, ClockIcon, MessageSquareDashedIcon, RotateCcwIcon } from "lucide-react";
import * as React from "react";
import { LoadFailed } from "@/app/screens/screen-kit";
import { clockOf, dayHeadingOf, dayOfInstant } from "@/app/screens/team/time-words";
import { useKeptRead } from "@/app/screens/team/use-kept-read";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { Conversation, Delivery, Message } from "@/data/types";
import type { PlainDate } from "@/lib/plain-date";
import { cn } from "@/lib/utils";

const DELIVERY: Record<Delivery, { label: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: "true" }>; className: string }> = {
  sending: { label: "Sending", icon: ClockIcon, className: "" },
  sent: { label: "Sent", icon: CheckIcon, className: "" },
  delivered: { label: "Delivered", icon: CheckCheckIcon, className: "" },
  read: { label: "Read", icon: CheckCheckIcon, className: "text-info-foreground" },
  failed: { label: "Not delivered", icon: CircleAlertIcon, className: "text-destructive-foreground" },
};

/**
 * The chat, oldest at the top, grouped by day. It opens on the latest page
 * and scrolled to the bottom; "Load older messages" asks for the page before
 * and keeps the reader where they were. New messages (a reply, a delivery
 * tick) arrive with every refresh of the read.
 */
export function MessageLog({
  conversation,
  now,
  canResend,
  onResend,
}: {
  conversation: Conversation;
  now: number;
  /** Failed messages can go again only while the team is replying by hand. */
  canResend: boolean;
  onResend: (body: string) => void;
}): React.ReactElement {
  const [pages, setPages] = React.useState(1);
  const log = useKeptRead(["inbox", "messages", conversation.id, pages], async (c) => {
    let messages: Message[] = [];
    let before: number | undefined;
    let hasMore = false;
    for (let i = 0; i < pages; i += 1) {
      const page = await c.inbox.messages(conversation.id, before);
      messages = [...page.messages, ...messages];
      hasMore = page.hasMore;
      before = page.messages[0]?.at;
      if (!page.hasMore) break;
    }
    return { messages, hasMore };
  });

  const scroller = React.useRef<HTMLDivElement>(null);
  const messages = log.data?.messages;
  const firstId = messages?.[0]?.id;
  const lastId = messages?.at(-1)?.id;
  const seen = React.useRef<{ firstId?: string; lastId?: string; height: number }>({ height: 0 });
  React.useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const before = seen.current;
    if (lastId !== before.lastId) el.scrollTop = el.scrollHeight;
    else if (firstId !== before.firstId) el.scrollTop += el.scrollHeight - before.height;
    seen.current = { firstId, lastId, height: el.scrollHeight };
  }, [firstId, lastId]);

  const days: { day: PlainDate; messages: Message[] }[] = [];
  for (const m of messages ?? []) {
    const day = dayOfInstant(m.at);
    const group = days.at(-1);
    if (group?.day === day) group.messages.push(m);
    else days.push({ day, messages: [m] });
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5" ref={scroller}>
      {log.isError && !messages ? (
        <LoadFailed error={log.error} onRetry={log.refetch} what="the messages" />
      ) : !messages ? (
        <LogSkeleton />
      ) : messages.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquareDashedIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No messages yet</EmptyTitle>
            <EmptyDescription>Anything {conversation.name} sends, and every reply, shows here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {log.data?.hasMore && (
            <Button className="self-center" loading={log.stale} onClick={() => setPages((p) => p + 1)} size="sm" variant="outline">
              Load older messages
            </Button>
          )}
          {log.isError && (
            <p className="self-center text-destructive-foreground text-sm" role="alert">
              Couldn't load older messages.{" "}
              <Button className="h-auto p-0" onClick={log.refetch} size="sm" variant="link">
                Try again
              </Button>
            </p>
          )}
          <div aria-label={`Messages with ${conversation.name}`} className="flex flex-col gap-4" role="log">
            {days.map((group) => (
              <section aria-labelledby={`day-${group.day}`} className="flex flex-col gap-2" key={group.day}>
                <h3 className="sticky top-0 z-10 self-center rounded-full border bg-background px-2.5 py-0.5 font-medium text-muted-foreground text-xs shadow-xs/5" id={`day-${group.day}`}>
                  {dayHeadingOf(group.day, now)}
                </h3>
                <ol className="flex flex-col gap-2">
                  {group.messages.map((m) => (
                    <Bubble canResend={canResend} from={conversation.name} key={m.id} message={m} onResend={onResend} />
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({ message: m, from, canResend, onResend }: { message: Message; from: string; canResend: boolean; onResend: (body: string) => void }): React.ReactElement {
  const out = m.direction === "out";
  const failed = m.delivery === "failed";
  const who = out ? (m.author ?? "Bot") : from;
  const tick = DELIVERY[m.delivery];
  const Tick = tick.icon;
  return (
    <li className={cn("flex max-w-[min(85%,36rem)] flex-col gap-1", out ? "items-end self-end" : "items-start self-start")} data-direction={m.direction}>
      <p
        className={cn(
          "wrap-break-word whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
          out ? "rounded-ee-md bg-info/10 dark:bg-info/20" : "rounded-es-md bg-muted",
          failed && "border border-destructive/40 bg-destructive/6 dark:bg-destructive/12",
        )}
      >
        <span className="sr-only">{who}: </span>
        {m.body}
      </p>
      <p className="flex items-center gap-1 text-muted-foreground text-xs">
        {out && (
          <>
            <span aria-hidden="true">{who}</span>
            <span aria-hidden="true">·</span>
          </>
        )}
        <time className="tabular-nums" dateTime={new Date(m.at).toISOString()}>
          {clockOf(m.at)}
        </time>
        {out && (
          <span className={cn("flex items-center", tick.className)}>
            <Tick aria-hidden="true" className="size-3.5" />
            <span className="sr-only">, {tick.label}</span>
          </span>
        )}
      </p>
      {failed && (
        <div className="flex flex-col items-end gap-1.5 text-end">
          <p className="text-destructive-foreground text-xs">{m.failure ?? "WhatsApp couldn't deliver this."}</p>
          {canResend ? (
            <Button onClick={() => onResend(m.body)} size="xs" variant="outline">
              <RotateCcwIcon aria-hidden="true" />
              Send again
            </Button>
          ) : (
            <p className="text-muted-foreground text-xs">Turn on Reply by hand to send it again.</p>
          )}
        </div>
      )}
    </li>
  );
}

function LogSkeleton(): React.ReactElement {
  return (
    <div aria-busy="true" className="flex flex-col gap-3" role="status">
      <span className="sr-only">Loading messages</span>
      {["w-3/5 self-start", "w-2/5 self-end", "w-1/2 self-start", "w-3/5 self-end"].map((c) => (
        <Skeleton className={cn("h-10 rounded-2xl", c)} key={c} />
      ))}
    </div>
  );
}
