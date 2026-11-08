import * as React from "react";
import { COURTS, DEMO_DATE, DEMO_LOCALE, DEMO_NOW, DEMO_ZONE, LINK, RAHUL } from "@/app/components/resources-demo-data";
import { Resources, type ResourcesScreen, type ResourcesStatus } from "@/components/compositions/resources";
import type { Resource, ResourceBooking, ResourceLink } from "@/lib/resources";

export interface ResourcesDemoProps {
  screen?: ResourcesScreen;
  onScreenChange?: (screen: ResourcesScreen) => void;
  defaultScreen?: ResourcesScreen;
  resourceId?: string;
  nav?: boolean;
  status?: ResourcesStatus;
  /** Start from other data than the two courts and the one booking. */
  resources?: readonly Resource[];
  bookings?: readonly ResourceBooking[];
  link?: ResourceLink;
  /** Milliseconds a save or a booking takes, so the busy states are real. */
  latency?: number;
  className?: string;
}

/**
 * The instance this page was built for: Project 831's two courts on one
 * Cal.com account, the real hours, and the booking the agent made. Saves and
 * bookings land in React state after a short wait; nothing leaves the page.
 */
export function ResourcesDemo({
  screen,
  onScreenChange,
  defaultScreen,
  resourceId,
  nav,
  status,
  resources: initialResources = COURTS,
  bookings: initialBookings = [RAHUL],
  link: initialLink = LINK,
  latency = 350,
  className,
}: ResourcesDemoProps): React.ReactElement {
  const [resources, setResources] = React.useState<readonly Resource[]>(initialResources);
  const [bookings, setBookings] = React.useState<readonly ResourceBooking[]>(initialBookings);
  const [link, setLink] = React.useState<ResourceLink>(initialLink);
  const wait = React.useCallback(() => new Promise<void>((resolve) => window.setTimeout(resolve, latency)), [latency]);

  const onSaveResource = React.useCallback(
    async (resource: Resource): Promise<void> => {
      await wait();
      setResources((prev) => (prev.some((r) => r.id === resource.id) ? prev.map((r) => (r.id === resource.id ? resource : r)) : [...prev, resource]));
    },
    [wait],
  );
  const onBook = React.useCallback(
    async (booking: ResourceBooking): Promise<void> => {
      await wait();
      setBookings((prev) => [...prev, booking]);
    },
    [wait],
  );

  return (
    <Resources
      bookings={bookings}
      className={className}
      date={DEMO_DATE}
      defaultScreen={defaultScreen}
      link={link}
      locale={DEMO_LOCALE}
      nav={nav}
      now={DEMO_NOW}
      onBook={onBook}
      onLinkChange={setLink}
      onSaveResource={onSaveResource}
      onScreenChange={onScreenChange}
      resourceId={resourceId}
      resources={resources}
      screen={screen}
      status={status}
      timeZone={DEMO_ZONE}
      venue={{ name: "Project 831", line: "Jamshedpur" }}
    />
  );
}
