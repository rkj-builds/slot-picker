"use client";

/**
 * A hash router in forty lines. GitHub Pages serves one file, so every route
 * lives after the "#": `#/book/when`, `#/desk/bookings?q=meera`. The back
 * button, reloads and shared links all work with no server rewrites.
 */
import * as React from "react";

export interface Route {
  /** Path segments: "#/desk/settings" → ["desk", "settings"]. */
  segments: string[];
  query: URLSearchParams;
  /** The raw hash path, "/desk/settings". */
  path: string;
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, "");
  const [pathPart = "", queryPart = ""] = raw.split("?");
  const segments = pathPart.split("/").filter(Boolean).map(decodeURIComponent);
  return { segments, query: new URLSearchParams(queryPart), path: `/${segments.join("/")}` };
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function useRoute(): Route {
  const hash = React.useSyncExternalStore(subscribe, () => window.location.hash, () => "");
  return React.useMemo(() => parseHash(hash), [hash]);
}

/** Go somewhere: `navigate("/desk", { date: "2026-10-17" })`. `replace` skips a history entry. */
export function navigate(path: string, query?: Record<string, string | null | undefined>, { replace = false } = {}): void {
  const href = hrefFor(path, query);
  if (replace) {
    window.history.replaceState(null, "", href);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = href.slice(1);
  }
}

export function hrefFor(path: string, query?: Record<string, string | null | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) if (value) params.set(key, value);
  const qs = params.toString();
  return `#${path}${qs ? `?${qs}` : ""}`;
}
