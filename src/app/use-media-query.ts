import * as React from "react";

/** A media query as state, re-read when it flips. Without `matchMedia` it reports `fallback`. */
export function useMediaQuery(query: string, fallback = true): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== "function") return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return React.useSyncExternalStore(
    subscribe,
    () => (typeof window.matchMedia === "function" ? window.matchMedia(query).matches : fallback),
    () => fallback,
  );
}
