"use client";

import { HistoryIcon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import { initialsOf } from "@/app/format";
import { hrefFor } from "@/app/router";
import { ListSkeleton, LoadFailed } from "@/app/screens/screen-kit";
import { clockOf, dayHeadingOf, dayOfInstant } from "@/app/screens/team/time-words";
import { useKeptRead } from "@/app/screens/team/use-kept-read";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import type { ActivityEntry } from "@/data/types";
import type { PlainDate } from "@/lib/plain-date";

const PAGE = 25;

/** Where an entry's subject lives on the desk, when it has a page. */
function linkFor(entry: ActivityEntry): string | null {
  if (entry.subject.type === "conversation") return hrefFor(`/desk/inbox/${entry.subject.id}`);
  return null;
}

/** What the team did, newest first, by day: who, what, when. "Show more" reaches further back. */
export function ActivityLog({ now }: { now: number }): React.ReactElement {
  const [limit, setLimit] = React.useState(PAGE);
  const log = useKeptRead(["settings", "activity", limit], (c) => c.settings.activity({ limit }));
  if (log.isError && !log.data) return <LoadFailed error={log.error} onRetry={log.refetch} what="the activity log" />;
  if (!log.data) return <ListSkeleton label="Loading activity" rows={6} />;
  if (log.data.length === 0) {
    return (
      <Empty className="rounded-2xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HistoryIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Nothing yet</EmptyTitle>
          <EmptyDescription>When someone records a payment, takes a chat or changes a booking, it shows here with their name.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const days: { day: PlainDate; entries: ActivityEntry[] }[] = [];
  for (const entry of log.data) {
    const day = dayOfInstant(entry.at);
    const group = days.at(-1);
    if (group?.day === day) group.entries.push(entry);
    else days.push({ day, entries: [entry] });
  }

  return (
    <div className="flex flex-col gap-5">
      {days.map((group) => (
        <section aria-labelledby={`activity-${group.day}`} className="flex flex-col gap-2" key={group.day}>
          <h3 className="font-medium text-muted-foreground text-sm" id={`activity-${group.day}`}>
            {dayHeadingOf(group.day, now)}
          </h3>
          <ol className="flex flex-col divide-y rounded-2xl border bg-card">
            {group.entries.map((entry) => {
              const href = linkFor(entry);
              return (
                <li className="flex items-start gap-3 px-4 py-3" key={entry.id}>
                  <Avatar className="size-7 shrink-0">
                    <AvatarFallback className="text-xs">{initialsOf(entry.actor)}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="text-sm">{href ? <Anchor className="underline-offset-4 hover:underline" href={href}>{entry.text}</Anchor> : entry.text}</p>
                    <p className="text-muted-foreground text-xs">
                      {entry.actor} · <time dateTime={new Date(entry.at).toISOString()}>{clockOf(entry.at)}</time>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      {log.data.length >= limit && (
        <Button className="self-center" loading={log.stale} onClick={() => setLimit((n) => n + PAGE)} variant="outline">
          Show more
        </Button>
      )}
    </div>
  );
}
