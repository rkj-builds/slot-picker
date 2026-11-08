"use client";

import { ArrowLeftIcon } from "lucide-react";
import * as React from "react";
import { ResourcesContext, type ResourcesContextValue, type ResourcesScreen, type ResourcesStatus } from "@/components/compositions/resources/context";
import { LinkEditor } from "@/components/compositions/resources/link-editor";
import { ResourcesNav, ResourcesNavSelect } from "@/components/compositions/resources/nav";
import { ResourceBooker } from "@/components/compositions/resources/resource-booker";
import { ResourceBookings } from "@/components/compositions/resources/resource-bookings";
import { ResourceEditor } from "@/components/compositions/resources/resource-editor";
import { ResourceList } from "@/components/compositions/resources/resource-list";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { PlainDate } from "@/lib/plain-date";
import type { Resource, ResourceBooking, ResourceLink } from "@/lib/resources";
import { cn } from "@/lib/utils";

export type { ResourcesScreen, ResourcesStatus } from "@/components/compositions/resources/context";

const PROJECT_831 = { name: "Project 831", line: "Jamshedpur" };

export interface ResourcesProps {
  /** The things people book: courts, rooms, desks, racquets. Empty shows the first-run state. */
  resources: readonly Resource[];
  /** Every booking on them, on the venue's clock. */
  bookings: readonly ResourceBooking[];
  /** The link whose "Who is booked" page and booking page are shown. */
  link: ResourceLink;
  /** The screen that is open, when the parent owns it (a docs page does; a product usually won't). */
  screen?: ResourcesScreen;
  /** Called on every change of screen, controlled or not: to keep the URL in step. */
  onScreenChange?: (screen: ResourcesScreen) => void;
  /** Where an uncontrolled Resources opens. */
  defaultScreen?: ResourcesScreen;
  /** The resource the Resource screen edits, by id. Left out, the first one. */
  resourceId?: string;
  /** The day the Bookings and booking page open on. */
  date: PlainDate;
  /** The venue's zone: every time is printed on it. */
  timeZone: string;
  locale?: string;
  /** The moment it is, for starts that have passed. Defaults to the real clock. */
  now?: number;
  /** How the list is: loading shows skeletons, error says so and offers Try again. */
  status?: ResourcesStatus;
  onRetry?: () => void;
  /** The account the sidebar is signed in to: a name and one line under it. Project 831, Jamshedpur unless told otherwise. */
  venue?: { name: string; line: string };
  /** Show Cal.com's sidebar around the screens. Off, a screen stands alone, as in a story. */
  nav?: boolean;
  /** Called with a new or changed resource. Resolve to keep it; reject to say why not. */
  onSaveResource: (resource: Resource) => Promise<void>;
  /** Called when the link's "Who is booked" changes. */
  onLinkChange: (link: ResourceLink) => void;
  /** Called when someone books from the booking page: the booking, already landed on a resource. */
  onBook: (booking: ResourceBooking) => Promise<void>;
  /** Merged onto the frame, as on every coss part. */
  className?: string;
}

/** A thing with hours, a capacity and its own bookings. Cal.com with Resources beside Availability: the list, a resource, the link that books any free one, Bookings by resource, and the booking page. */
export function Resources({
  resources,
  bookings,
  link,
  screen: screenProp,
  onScreenChange,
  defaultScreen = "list",
  resourceId: resourceIdProp,
  date,
  timeZone,
  locale,
  now: nowProp,
  status = "ready",
  onRetry,
  venue = PROJECT_831,
  nav = true,
  onSaveResource,
  onLinkChange,
  onBook,
  className,
}: ResourcesProps): React.ReactElement {
  // The clock is read once, on mount, when the parent doesn't pass one: a past start is past for the whole visit.
  const [mountedAt] = React.useState(() => Date.now());
  const now = nowProp ?? mountedAt;
  const [ownScreen, setOwnScreen] = React.useState<ResourcesScreen>(defaultScreen);
  const screen = screenProp ?? ownScreen;
  const [ownResourceId, setOwnResourceId] = React.useState<string | null>(resourceIdProp ?? null);
  const resourceId = ownResourceId ?? resourceIdProp ?? resources[0]?.id ?? null;

  const open = React.useCallback(
    (next: ResourcesScreen, id?: string): void => {
      if (id !== undefined) setOwnResourceId(id);
      setOwnScreen(next);
      onScreenChange?.(next);
    },
    [onScreenChange],
  );

  const value = React.useMemo<ResourcesContextValue>(
    () => ({ resources, bookings, link, screen, open, resourceId, date, timeZone, locale, now, status, onRetry, venue, saveResource: onSaveResource, changeLink: onLinkChange, book: onBook }),
    [resources, bookings, link, screen, open, resourceId, date, timeZone, locale, now, status, onRetry, venue, onSaveResource, onLinkChange, onBook],
  );

  const admin = screen !== "book";
  let pane: React.ReactElement;
  switch (screen) {
    case "list":
      pane = <ResourceList />;
      break;
    case "new":
      pane = <ResourceEditor key="new" mode="new" />;
      break;
    case "resource":
      pane = <ResourceEditor key={resourceId ?? "first"} mode="edit" />;
      break;
    case "link":
      pane = <LinkEditor />;
      break;
    case "bookings":
      pane = <ResourceBookings />;
      break;
    case "book":
      pane = (
        <div className="flex flex-1 flex-col gap-5 p-4 @md/pane:p-6" data-screen="book">
          <ResourceBooker />
        </div>
      );
      break;
  }

  return (
    <ResourcesContext.Provider value={value}>
      {/* coss's Sidebar reads its state from SidebarProvider; the provider's own div is the frame. */}
      {/* Tall enough for the sidebar's footer to sit at the bottom wherever the sidebar shows; a phone's frame hugs its screen. */}
      <SidebarProvider
        className={cn("@container/root flex min-h-0 w-full min-w-0 overflow-hidden rounded-xl border bg-background text-foreground", nav && admin && "@3xl/root:min-h-[34rem]", className)}
        data-screen={screen}
        data-slot="resources"
      >
        {nav && admin && <ResourcesNav />}
        <div className="flex min-w-0 flex-1 flex-col">
          {nav && admin && <ResourcesNavSelect />}
          {nav && !admin && (
            <div className="flex items-center justify-between gap-3 border-b px-3 py-2" data-slot="resources-public-bar">
              <span className="truncate font-mono text-muted-foreground text-xs">cal.com/{venue.name.toLowerCase().replace(/\s+/g, "-")}/{link.slug}</span>
              <Button onClick={() => open("list")} size="xs" variant="ghost">
                <ArrowLeftIcon aria-hidden="true" className="rtl:rotate-180" />
                Back to the app
              </Button>
            </div>
          )}
          {/* A new screen fades in once (160 ms, 2 px); under reduced motion it is simply there. */}
          <div className="@container/pane flex flex-1 flex-col motion-safe:animate-fade-in" data-slot="resources-screen" key={`${screen}:${resourceId ?? ""}`}>
            {pane}
          </div>
        </div>
      </SidebarProvider>
    </ResourcesContext.Provider>
  );
}
