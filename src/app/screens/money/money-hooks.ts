"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { navigate, type Route } from "@/app/router";
import { useRead } from "@/data/provider";
import type { Viewer } from "@/data/types";

export function useViewer(): UseQueryResult<Viewer> {
  return useRead(["viewer"], (c) => c.team.viewer());
}

/** Change some of the URL's query and keep the rest. Filters and ranges replace the entry, so Back leaves the page rather than undoing a filter. */
export function setQuery(route: Route, patch: Record<string, string | null>): void {
  const next: Record<string, string | null> = Object.fromEntries(route.query.entries());
  navigate(route.path, { ...next, ...patch }, { replace: true });
}
