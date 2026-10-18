"use client";

/**
 * Hands a `DataClient` and a query cache to everything below it. Any write
 * (through `useWrite`, or pushed by the client's `subscribe`) refreshes every
 * cached read, so a screen never shows a number another screen just changed.
 * At venue scale that is cheaper than tracking which read depends on what.
 */
import { QueryClient, QueryClientProvider, useMutation, type UseMutationResult, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import * as React from "react";
import type { DataClient } from "@/data/client";

const ClientContext = React.createContext<DataClient | null>(null);

export function makeQueryClient({ test = false }: { test?: boolean } = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Fresh for a few seconds: switching views doesn't refetch, coming back later does.
        staleTime: test ? Infinity : 5_000,
        // A failure shows its error and a Retry button straight away; a person decides to retry.
        retry: false,
        refetchOnWindowFocus: !test,
        gcTime: test ? Infinity : 5 * 60_000,
      },
      mutations: { retry: false },
    },
  });
}

export function DataProvider({ client, queryClient, children }: { client: DataClient; queryClient?: QueryClient; children: React.ReactNode }): React.ReactElement {
  const [cache] = React.useState(() => queryClient ?? makeQueryClient());
  React.useEffect(() => {
    let queued = false;
    return client.subscribe(() => {
      // Many writes in one task refresh once.
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        void cache.invalidateQueries();
      });
    });
  }, [client, cache]);
  return (
    <ClientContext.Provider value={client}>
      <QueryClientProvider client={cache}>{children}</QueryClientProvider>
    </ClientContext.Provider>
  );
}

export function useDataClient(): DataClient {
  const client = React.useContext(ClientContext);
  if (!client) throw new Error("useDataClient must be used inside <DataProvider>");
  return client;
}

/**
 * A read: `useRead(["bookings", from, to], (c) => c.bookings.list({ from, to }))`.
 * The key names what is read; it must change when the arguments do.
 */
export function useRead<T>(key: readonly unknown[], read: (client: DataClient) => Promise<T>, { enabled = true }: { enabled?: boolean } = {}): UseQueryResult<T> {
  const client = useDataClient();
  return useQuery({ queryKey: key, queryFn: () => read(client), enabled });
}

/**
 * A write: `const pay = useWrite((c, input: X) => c.bookings.recordPayment(id, input))`,
 * then `await pay.mutateAsync(input)`. Every read refreshes once it settles.
 */
export function useWrite<TInput, TResult>(write: (client: DataClient, input: TInput) => Promise<TResult>): UseMutationResult<TResult, Error, TInput> {
  const client = useDataClient();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => write(client, input),
    onSettled: () => cache.invalidateQueries(),
  });
}
