"use client";

import * as React from "react";
import type { DataClient } from "@/data/client";
import { useRead } from "@/data/provider";

/**
 * A read whose key changes as someone types or pages (a search, "Load
 * older"): the last answer stays on screen while the next one loads, so the
 * list doesn't drop to a skeleton on every keystroke. `refreshing` says a
 * newer answer is on its way.
 */
export function useKeptRead<T>(key: readonly unknown[], read: (client: DataClient) => Promise<T>): {
  data: T | undefined;
  error: Error | null;
  isError: boolean;
  refreshing: boolean;
  /** What's on screen is the previous key's answer; this key's hasn't come yet. */
  stale: boolean;
  refetch: () => void;
} {
  const result = useRead(key, read);
  const [kept, setKept] = React.useState<T | undefined>(result.data);
  if (result.data !== undefined && result.data !== kept) setKept(result.data);
  return {
    data: result.data ?? kept,
    error: result.error,
    isError: result.isError,
    refreshing: result.isFetching,
    stale: result.data === undefined && kept !== undefined,
    refetch: () => void result.refetch(),
  };
}
