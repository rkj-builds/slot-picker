"use client";

/**
 * One clock for the whole app. `?now=2026-10-17T13:00:00Z` pins the start
 * (for screenshots and demos); time still moves forward from there, so hold
 * countdowns tick. Tests pass a fixed `now` and an `advance` handle.
 */
import * as React from "react";

interface ClockValue {
  now: () => number;
}

const ClockContext = React.createContext<ClockValue>({ now: () => Date.now() });

export function ClockProvider({ children, start }: { children: React.ReactNode; start?: number }): React.ReactElement {
  // Read the real clock once, when the provider mounts, to find the offset to the pinned start.
  const [value] = React.useState<ClockValue>(() => {
    if (start === undefined) return { now: () => Date.now() };
    const offset = start - Date.now();
    return { now: () => Date.now() + offset };
  });
  return <ClockContext.Provider value={value}>{children}</ClockContext.Provider>;
}

export function useClock(): ClockValue {
  return React.useContext(ClockContext);
}

/** The current time, re-read every `intervalMs` (and on mount). */
export function useNow(intervalMs = 1000): number {
  const { now } = useClock();
  const [value, setValue] = React.useState(now);
  React.useEffect(() => {
    const id = window.setInterval(() => setValue(now()), intervalMs);
    return () => window.clearInterval(id);
  }, [now, intervalMs]);
  return value;
}

export function pinnedNowFromUrl(): number | undefined {
  try {
    const pinned = new URLSearchParams(window.location.search).get("now");
    const parsed = pinned ? Date.parse(pinned) : Number.NaN;
    return Number.isNaN(parsed) ? undefined : parsed;
  } catch {
    return undefined;
  }
}
