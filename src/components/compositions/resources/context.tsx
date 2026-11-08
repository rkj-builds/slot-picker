"use client";

import * as React from "react";
import type { PlainDate } from "@/lib/plain-date";
import type { Resource, ResourceBooking, ResourceLink } from "@/lib/resources";

export type ResourcesScreen = "list" | "new" | "resource" | "link" | "bookings" | "book";
export type ResourcesStatus = "ready" | "loading" | "error";

export interface ResourcesContextValue {
  resources: readonly Resource[];
  bookings: readonly ResourceBooking[];
  link: ResourceLink;
  screen: ResourcesScreen;
  /** Open a screen; the Resource screen takes the id of the resource to edit. */
  open: (screen: ResourcesScreen, resourceId?: string) => void;
  resourceId: string | null;
  date: PlainDate;
  timeZone: string;
  locale: string | undefined;
  now: number;
  status: ResourcesStatus;
  onRetry: (() => void) | undefined;
  venue: { name: string; line: string };
  saveResource: (resource: Resource) => Promise<void>;
  changeLink: (link: ResourceLink) => void;
  book: (booking: ResourceBooking) => Promise<void>;
}

export const ResourcesContext = React.createContext<ResourcesContextValue | null>(null);

export function useResources(part: string): ResourcesContextValue {
  const ctx = React.useContext(ResourcesContext);
  if (!ctx) throw new Error(`<${part}> must be inside <Resources>`);
  return ctx;
}
