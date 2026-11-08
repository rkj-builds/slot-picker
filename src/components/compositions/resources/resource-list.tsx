"use client";

import { ChevronRightIcon, CloudAlertIcon, LandPlotIcon, PlusIcon } from "lucide-react";
import type * as React from "react";
import { useResources } from "@/components/compositions/resources/context";
import { Pane, ScreenHeader } from "@/components/compositions/resources/kit";
import { capacityLine, weekLines } from "@/components/compositions/resources/words";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { RESOURCE_KINDS, upcomingCount } from "@/lib/resources";

const LINE = "Courts, rooms and desks people book. Each keeps its own hours and its own bookings.";

/** The Resources page: a new item beside Availability. A list of things, with hours and how many bookings each takes at once. */
export function ResourceList(): React.ReactElement {
  const { resources, bookings, status, onRetry, open, date, timeZone, locale } = useResources("ResourceList");
  const newButton = (
    <Button onClick={() => open("new")}>
      <PlusIcon aria-hidden="true" />
      New resource
    </Button>
  );

  return (
    <Pane data-screen="list">
      <ScreenHeader actions={status === "ready" && resources.length > 0 ? newButton : undefined} line={LINE} title="Resources" />
      {status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-3" role="status">
          <span className="sr-only">Loading resources</span>
          {[0, 1].map((i) => (
            <Skeleton className="h-16 rounded-xl" key={i} />
          ))}
        </div>
      ) : status === "error" ? (
        <Empty className="rounded-xl border border-dashed py-10 md:py-10" role="alert">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CloudAlertIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Couldn’t load resources</EmptyTitle>
            <EmptyDescription>Nothing changed. Check the connection and try again.</EmptyDescription>
          </EmptyHeader>
          {onRetry && (
            <EmptyContent>
              <Button onClick={onRetry} variant="outline">
                Try again
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : resources.length === 0 ? (
        <Empty className="rounded-xl border border-dashed py-10 md:py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LandPlotIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Nothing is bookable yet</EmptyTitle>
            <EmptyDescription>A court, a room, a desk, a pair of racquets. Give it hours and a capacity, and a link can book it.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{newButton}</EmptyContent>
        </Empty>
      ) : (
        <ul aria-label="Resources" className="flex flex-col divide-y rounded-xl border" data-slot="resource-rows">
          {resources.map((r) => {
            const upcoming = upcomingCount(bookings, r.id, date);
            const kind = RESOURCE_KINDS.find((k) => k.value === r.kind)?.label ?? r.kind;
            return (
              <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 p-4 @xl/pane:grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_6.5rem_auto]" data-resource={r.id} key={r.id}>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <Button className="h-auto px-0 py-0 font-medium text-base sm:h-auto sm:text-sm" onClick={() => open("resource", r.id)} variant="link">
                      <bdi>{r.name}</bdi>
                    </Button>
                    <Badge variant="outline">{kind}</Badge>
                    {!r.active && <Badge variant="warning">Paused</Badge>}
                  </span>
                  <span className="text-muted-foreground text-xs">{capacityLine(r.atOnce, r.people)}</span>
                </div>
                <dl className="col-span-2 flex flex-col gap-0.5 text-xs @xl/pane:col-span-1" data-slot="resource-hours">
                  {weekLines(r.hours, timeZone, locale).map((seg) => (
                    <div className="flex gap-2" key={seg.days}>
                      <dt className="w-16 shrink-0 text-muted-foreground">{seg.days}</dt>
                      <dd className="tabular-nums">{seg.hours}</dd>
                    </div>
                  ))}
                </dl>
                <span className="col-start-1 text-muted-foreground text-xs tabular-nums @xl/pane:col-start-auto @xl/pane:text-end">{upcoming === 0 ? "None upcoming" : `${upcoming} upcoming`}</span>
                <ChevronRightIcon aria-hidden="true" className="col-start-2 row-start-1 size-4 text-muted-foreground rtl:rotate-180 @xl/pane:col-start-auto @xl/pane:row-start-auto" />
              </li>
            );
          })}
        </ul>
      )}
    </Pane>
  );
}
