"use client";

import { CheckIcon, ClockIcon, HandIcon, SearchIcon, SearchXIcon, UserRoundIcon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import { initialsOf } from "@/app/format";
import { firstName, INBOX_TABS, inboxHref, needsReply } from "@/app/screens/inbox/inbox-tabs";
import { LoadFailed } from "@/app/screens/screen-kit";
import { LinkTabs } from "@/app/screens/team/link-tabs";
import { stampOf, waitOf, waitTone } from "@/app/screens/team/time-words";
import { useKeptRead } from "@/app/screens/team/use-kept-read";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import type { Conversation, ConversationTab } from "@/data/types";
import { cn } from "@/lib/utils";

/** The search box settles before it asks the backend, so typing a name is one request, not one per letter. */
function useSettled(value: string, ms = 200): string {
  const [settled, setSettled] = React.useState(value);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

/**
 * The conversation list: tabs (each a URL, with how many are waiting on a
 * reply), a search by name or number, and the rows. One read fetches all
 * three tabs, so the counts and the list never disagree.
 */
export function ConversationList({ tab, openId, now }: { tab: ConversationTab; openId: string | null; now: number }): React.ReactElement {
  const [query, setQuery] = React.useState("");
  const q = useSettled(query.trim());
  const lists = useKeptRead(["inbox", "lists", q], async (c) => {
    const [leads = [], customers = [], team = []] = await Promise.all(INBOX_TABS.map((t) => c.inbox.conversations({ tab: t.id, q })));
    return { leads, customers, team } satisfies Record<ConversationTab, Conversation[]>;
  });
  const rows = lists.data?.[tab];
  const empty = INBOX_TABS.find((t) => t.id === tab)?.empty;

  return (
    <section aria-labelledby="inbox-list-heading" className="flex min-h-0 flex-col" data-slot="conversation-list">
      <h2 className="sr-only" id="inbox-list-heading">
        Conversations
      </h2>
      <div className="flex flex-col gap-3 border-b p-3">
        <LinkTabs
          label="Conversation types"
          tabs={INBOX_TABS.map((t) => {
            const waiting = lists.data?.[t.id].filter(needsReply).length;
            return { href: inboxHref(t.id), label: t.label, current: t.id === tab, count: waiting, countLabel: `${waiting} waiting on a reply` };
          })}
        />
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput aria-label="Search conversations" onChange={(event) => setQuery(event.target.value)} placeholder="Name or number" type="search" value={query} />
        </InputGroup>
      </div>
      <div aria-busy={lists.refreshing || undefined} className="min-h-0 flex-1 overflow-y-auto">
        {lists.isError ? (
          <LoadFailed error={lists.error} onRetry={lists.refetch} what="conversations" />
        ) : !rows ? (
          <RowsSkeleton />
        ) : rows.length === 0 ? (
          q ? (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchXIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No one matches “{q}”</EmptyTitle>
                <EmptyDescription>Try part of the name, or at least three digits of the number.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => setQuery("")} variant="outline">
                  Clear search
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CheckIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>{empty?.title}</EmptyTitle>
                <EmptyDescription>{empty?.line}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )
        ) : (
          <ul aria-label={INBOX_TABS.find((t) => t.id === tab)?.label} className="flex flex-col">
            {rows.map((c) => (
              <ConversationRow conversation={c} key={c.id} now={now} open={c.id === openId} tab={tab} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ConversationRow({ conversation: c, open, tab, now }: { conversation: Conversation; open: boolean; tab: ConversationTab; now: number }): React.ReactElement {
  const unread = c.unread > 0;
  return (
    <li className="border-b last:border-b-0">
      <Anchor
        aria-current={open ? "page" : undefined}
        className="flex gap-3 px-3 py-3 outline-none hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset aria-[current=page]:bg-accent"
        href={inboxHref(tab, c.id)}
      >
        <Avatar className="size-9 shrink-0">
          <AvatarFallback>{initialsOf(c.name)}</AvatarFallback>
        </Avatar>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-baseline gap-2">
            <span className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium")}>{c.name}</span>
            <span className="sr-only">, </span>
            <span className={cn("ms-auto shrink-0 text-xs tabular-nums", unread ? "font-medium text-foreground" : "text-muted-foreground")}>{stampOf(c.lastMessageAt, now)}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="sr-only">, </span>
            <span className={cn("line-clamp-1 min-w-0 flex-1 text-sm", unread ? "text-foreground" : "text-muted-foreground")}>{c.lastMessage}</span>
            {unread && (
              <Badge className="tabular-nums" variant="default">
                {c.unread}
                <span className="sr-only"> unread</span>
              </Badge>
            )}
          </span>
          <RowFlags conversation={c} now={now} />
        </span>
      </Anchor>
    </li>
  );
}

function RowFlags({ conversation: c, now }: { conversation: Conversation; now: number }): React.ReactElement | null {
  const waiting = c.status === "open" && c.waitingSince !== null;
  if (!waiting && c.status !== "done" && !c.assigneeName && !c.manual) return null;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="sr-only">, </span>
      {waiting && c.waitingSince !== null && (
        <Badge variant={waitTone(c.waitingSince, now)}>
          <ClockIcon aria-hidden="true" />
          Waiting {waitOf(c.waitingSince, now)}
        </Badge>
      )}
      {c.status === "done" && (
        <Badge variant="success">
          <CheckIcon aria-hidden="true" />
          Done
        </Badge>
      )}
      {c.manual && (
        <span className="flex items-center gap-1 text-muted-foreground text-xs">
          <HandIcon aria-hidden="true" className="size-3" />
          By hand
        </span>
      )}
      {c.assigneeName && (
        <span className="flex items-center gap-1 text-muted-foreground text-xs">
          <UserRoundIcon aria-hidden="true" className="size-3" />
          <span className="sr-only">With </span>
          {firstName(c.assigneeName)}
        </span>
      )}
    </span>
  );
}

function RowsSkeleton(): React.ReactElement {
  return (
    <div aria-busy="true" className="flex flex-col" role="status">
      <span className="sr-only">Loading conversations</span>
      {[0, 1, 2, 3, 4].map((i) => (
        <div className="flex gap-3 border-b px-3 py-3" key={i}>
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2 pt-0.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
