"use client";

/**
 * The store: the pure reducer from src/lib/store.ts, plus what a real
 * backend would add around it — latency (300–600 ms, so every skeleton is
 * real), persistence (localStorage, best effort), a sweep that releases
 * expired holds, and the demo scenarios that force failure paths.
 */
import * as React from "react";
import { useClock } from "@/app/clock";
import { nextHoldExpiry } from "@/lib/holds";
import { attemptHold, attemptPay, type HoldRequest, type HoldResult, type PayResult } from "@/lib/checkout";
import type { PayMode } from "@/lib/booking";
import { todayIn } from "@/lib/plain-date";
import { seedState } from "@/lib/seed";
import { type Action, type AppState, parseStoredState, reducer } from "@/lib/store";
import { VENUE } from "@/lib/venue";

export const STORAGE_KEY = "project-831:state";

export interface Scenarios {
  /** Step 2 opens on the next Saturday. */
  weekend: boolean;
  /** Step 3 is filled with a customer the venue has flagged pay-first. */
  flagged: boolean;
  /** The first payment attempt on each booking is declined. */
  paymentFails: boolean;
  /** Someone else books the court while you are paying. */
  slotRace: boolean;
  /** Holds last 30 seconds instead of the venue's setting. */
  shortHold: boolean;
}

export const NO_SCENARIOS: Scenarios = { weekend: false, flagged: false, paymentFails: false, slotRace: false, shortHold: false };

export type LoadStatus = "loading" | "ready" | "error";

interface StoreValue {
  state: AppState;
  status: LoadStatus;
  dispatch: (action: Action) => void;
  holdSlot: (request: HoldRequest) => Promise<HoldResult>;
  pay: (bookingId: string, mode: PayMode, method: "upi" | "card") => Promise<PayResult>;
  /** Run a desk action after the simulated round trip. */
  commit: (action: Action) => Promise<void>;
  retryLoad: () => void;
  reset: () => void;
  scenarios: Scenarios;
  setScenario: (key: keyof Scenarios, value: boolean) => void;
}

const StoreContext = React.createContext<StoreValue | null>(null);

export interface StoreProviderProps {
  children: React.ReactNode;
  /** Start from this state instead of storage or the seed (tests). */
  initialState?: AppState;
  /** [min, max] simulated latency in ms. */
  latency?: readonly [number, number];
  /** Fail the first load, to show the error state (`?offline=1`). */
  failFirstLoad?: boolean;
  persist?: boolean;
  initialScenarios?: Partial<Scenarios>;
}

function readStored(now: number): AppState {
  let stored: AppState | null = null;
  try {
    stored = parseStoredState(localStorage.getItem(STORAGE_KEY));
  } catch {
    stored = null;
  }
  // The demo is relative to today: a new venue day starts from a fresh seed.
  if (stored?.seededOn === todayIn(VENUE.timeZone, now)) return stored;
  return seedState(now);
}

export function StoreProvider({
  children,
  initialState,
  latency = [300, 600],
  failFirstLoad = false,
  persist = true,
  initialScenarios,
}: StoreProviderProps): React.ReactElement {
  const { now } = useClock();
  const [state, dispatch] = React.useReducer(reducer, undefined, () => initialState ?? readStored(now()));
  const [status, setStatus] = React.useState<LoadStatus>(latency[1] === 0 && !failFirstLoad ? "ready" : "loading");
  const [scenarios, setScenarios] = React.useState<Scenarios>({ ...NO_SCENARIOS, ...initialScenarios });
  // The async API reads the latest state and scenarios when its latency ends, not when it was called.
  const stateRef = React.useRef(state);
  const scenariosRef = React.useRef(scenarios);
  React.useLayoutEffect(() => {
    stateRef.current = state;
    scenariosRef.current = scenarios;
  });
  const declined = React.useRef(new Set<string>());
  const raced = React.useRef(new Set<string>());
  const failNext = React.useRef(failFirstLoad);

  const wait = React.useCallback((): Promise<void> => {
    const [min, max] = latency;
    const ms = min + Math.random() * (max - min);
    return ms <= 0 ? Promise.resolve() : new Promise((resolve) => window.setTimeout(resolve, ms));
  }, [latency]);

  const finishLoad = React.useCallback(
    (): Promise<void> =>
      wait().then(() => {
        if (failNext.current) {
          failNext.current = false;
          setStatus("error");
        } else setStatus("ready");
      }),
    [wait],
  );

  const load = React.useCallback(() => {
    setStatus("loading");
    void finishLoad();
  }, [finishLoad]);

  React.useEffect(() => {
    if (latency[1] > 0 || failFirstLoad) void finishLoad();
    // Load once on mount; retries call load() directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist, best effort: private windows and blocked storage simply do not remember.
  React.useEffect(() => {
    if (!persist) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage may be full or blocked */
    }
  }, [state, persist]);

  // Release holds the moment they expire, not on the next click.
  React.useEffect(() => {
    const next = nextHoldExpiry(state.bookings, now());
    if (next === null) return;
    const id = window.setTimeout(() => dispatch({ type: "expire-holds", now: now() }), Math.max(0, next - now()) + 50);
    return () => window.clearTimeout(id);
  }, [state.bookings, now]);

  const holdSlot = React.useCallback(
    async (request: HoldRequest): Promise<HoldResult> => {
      await wait();
      const result = attemptHold(stateRef.current, { ...request, holdSeconds: scenariosRef.current.shortHold ? 30 : undefined }, now());
      if (result.ok) {
        stateRef.current = reducer(stateRef.current, result.action);
        dispatch(result.action);
      }
      return result;
    },
    [now, wait],
  );

  const pay = React.useCallback(
    async (bookingId: string, mode: PayMode, method: "upi" | "card"): Promise<PayResult> => {
      await wait();
      const s = scenariosRef.current;
      const decline = mode !== "venue" && s.paymentFails && !declined.current.has(bookingId);
      const race = s.slotRace && !raced.current.has(bookingId);
      if (decline) declined.current.add(bookingId);
      if (race) raced.current.add(bookingId);
      const result = attemptPay(stateRef.current, bookingId, mode, now(), { method, decline, race });
      const action = result.action;
      if (action) {
        stateRef.current = reducer(stateRef.current, action);
        dispatch(action);
      }
      return result;
    },
    [now, wait],
  );

  const commit = React.useCallback(
    async (action: Action): Promise<void> => {
      await wait();
      stateRef.current = reducer(stateRef.current, action);
      dispatch(action);
    },
    [wait],
  );

  const reset = React.useCallback(() => {
    declined.current.clear();
    raced.current.clear();
    dispatch({ type: "reset", state: seedState(now()) });
  }, [now]);

  const setScenario = React.useCallback((key: keyof Scenarios, value: boolean) => {
    setScenarios((prev) => ({ ...prev, [key]: value }));
  }, []);

  const value = React.useMemo<StoreValue>(
    () => ({ state, status, dispatch, holdSlot, pay, commit, retryLoad: load, reset, scenarios, setScenario }),
    [state, status, holdSlot, pay, commit, load, reset, scenarios, setScenario],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = React.useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside <StoreProvider>");
  return value;
}
