"use client";

/**
 * The demo's data: the mock backend (src/data/mock) wired to the booking
 * store, the clock and the Demo menu. A real venue replaces this one
 * component with `<DataProvider client={itsOwnAdapter}>`.
 *
 * It also holds the demo-only controls the Demo menu needs: who you are
 * signed in as (to see each role's screens and refusals) and "fail the next
 * request".
 */
import type { QueryClient } from "@tanstack/react-query";
import * as React from "react";
import { useClock } from "@/app/clock";
import { useStore } from "@/app/store";
import { createMockClient, MockDb, seedTables } from "@/data/mock";
import { parseStoredTables, type Tables } from "@/data/mock/db";
import { TEAM_IDS } from "@/data/mock/seed";
import { DataProvider } from "@/data/provider";
import type { Action } from "@/lib/store";
import type { TeamMember } from "@/data/types";
import { todayIn } from "@/lib/plain-date";
import { VENUE } from "@/lib/venue";

export const DB_STORAGE_KEY = "project-831:db";

interface DemoSession {
  memberId: string;
  /** Everyone the demo can sign in as (active team members). */
  people: readonly Pick<TeamMember, "id" | "name" | "role">[];
  setMemberId: (id: string) => void;
  /** The next request (any screen) fails as if the network dropped. */
  failNextRequest: () => void;
}

const DemoSessionContext = React.createContext<DemoSession | null>(null);

export function useDemoSession(): DemoSession {
  const value = React.useContext(DemoSessionContext);
  if (!value) throw new Error("useDemoSession must be used inside <MockDataProvider>");
  return value;
}

function readTables(now: number, persist: boolean): Tables {
  if (persist) {
    try {
      const stored = parseStoredTables(localStorage.getItem(DB_STORAGE_KEY), todayIn(VENUE.timeZone, now));
      if (stored) return stored;
    } catch {
      /* private window or blocked storage: start from the seed */
    }
  }
  return seedTables(now);
}

export interface MockDataProviderProps {
  children: React.ReactNode;
  /** [min, max] simulated latency in ms; [0, 0] in tests. */
  latency?: readonly [number, number];
  persist?: boolean;
  /** Start from these tables (tests). */
  initialTables?: Tables;
  initialMemberId?: string;
  queryClient?: QueryClient;
}

export function MockDataProvider({ children, latency = [250, 550], persist = true, initialTables, initialMemberId = TEAM_IDS.owner, queryClient }: MockDataProviderProps): React.ReactElement {
  const store = useStore();
  const { now } = useClock();
  const [db] = React.useState(() => new MockDb(initialTables ?? readTables(now(), persist)));
  const [memberId, setMemberId] = React.useState(initialMemberId);

  // The backend reads these when a call lands, not when the provider rendered.
  const live = React.useRef({ store, memberId, latency });
  React.useLayoutEffect(() => {
    live.current = { store, memberId, latency };
  });
  const failNext = React.useRef(false);
  const realtime = latency[1] > 0;

  const readState = React.useCallback(() => live.current.store.current(), []);
  const apply = React.useCallback((action: Action) => live.current.store.apply(action), []);
  const currentMember = React.useCallback(() => live.current.memberId, []);
  const wait = React.useCallback((): Promise<void> => {
    const [min, max] = live.current.store.scenarios.slowNetwork ? [2500, 4000] : live.current.latency;
    const ms = min + Math.random() * (max - min);
    return ms <= 0 ? Promise.resolve() : new Promise((resolve) => window.setTimeout(resolve, ms));
  }, []);
  const takeFailure = React.useCallback((): boolean => {
    if (!failNext.current) return false;
    failNext.current = false;
    return true;
  }, []);
  const later = React.useCallback(
    (run: () => void, ms: number): void => {
      if (realtime) window.setTimeout(run, ms);
    },
    [realtime],
  );
  const client = React.useMemo(
    // The client only calls these when a request runs, never while rendering.
    // eslint-disable-next-line react-hooks/refs
    () => createMockClient({ db, now, bridge: { read: readState, apply }, memberId: currentMember, wait, takeFailure, later }),
    [db, now, readState, apply, currentMember, wait, takeFailure, later],
  );

  // The booking flow writes to the store directly; tell the cache when it does.
  const { state, resets } = store;
  const firstState = React.useRef(true);
  React.useEffect(() => {
    if (firstState.current) {
      firstState.current = false;
      return;
    }
    db.emit();
  }, [state, db]);

  // "Reset demo data" starts these tables over too.
  const firstReset = React.useRef(resets);
  React.useEffect(() => {
    if (resets === firstReset.current) return;
    firstReset.current = resets;
    db.replace(seedTables(now()));
  }, [resets, db, now]);

  // Persist, best effort.
  React.useEffect(() => {
    if (!persist) return;
    return db.subscribe(() => {
      try {
        localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db.read()));
      } catch {
        /* storage may be full or blocked */
      }
    });
  }, [db, persist]);

  const switchMember = React.useCallback(
    (id: string) => {
      setMemberId(id);
      live.current = { ...live.current, memberId: id };
      db.emit();
    },
    [db],
  );
  const team = React.useSyncExternalStore(
    React.useCallback((listener: () => void) => db.subscribe(listener), [db]),
    () => db.read().team,
  );
  const people = React.useMemo(() => team.filter((m) => m.status === "active").map(({ id, name, role }) => ({ id, name, role })), [team]);
  const session = React.useMemo<DemoSession>(
    () => ({
      memberId,
      people,
      setMemberId: switchMember,
      failNextRequest: () => {
        failNext.current = true;
      },
    }),
    [memberId, people, switchMember],
  );

  return (
    <DemoSessionContext.Provider value={session}>
      <DataProvider client={client} queryClient={queryClient}>
        {children}
      </DataProvider>
    </DemoSessionContext.Provider>
  );
}
