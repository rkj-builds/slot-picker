/**
 * A waitlist's state machine, with no React in it: which moves are allowed from
 * where, and what each one leads to. The Waitlist composition drives it; the
 * tests pin it down.
 */

export type WaitlistState = "idle" | "joining" | "joined" | "error";

/** Where someone stands once they are on the list. */
export interface WaitlistPlace {
  /** 1 is the front. */
  position: number;
  /** Who is ahead, by name, in order. Empty at the front. */
  ahead: readonly string[];
}

export type WaitlistEvent =
  | { type: "join" }
  | { type: "joined"; place: WaitlistPlace }
  | { type: "fail"; message: string }
  | { type: "retry" }
  | { type: "leave" };

export type JoinRefusal = "already-joined" | "joining" | "closed";

/** Whether a join can start from this state: the next state, or the reason it can't. */
export function attemptJoin(state: WaitlistState, { closed = false }: { closed?: boolean } = {}): { ok: true; next: "joining" } | { ok: false; reason: JoinRefusal } {
  if (closed) return { ok: false, reason: "closed" };
  if (state === "joined") return { ok: false, reason: "already-joined" };
  if (state === "joining") return { ok: false, reason: "joining" };
  return { ok: true, next: "joining" };
}

/** The next state for an event, or the same state when the event means nothing here. */
export function reduce(state: WaitlistState, event: WaitlistEvent): WaitlistState {
  switch (event.type) {
    case "join":
    case "retry":
      return attemptJoin(state).ok ? "joining" : state;
    case "joined":
      return state === "joining" ? "joined" : state;
    case "fail":
      return state === "joining" ? "error" : state;
    case "leave":
      return state === "joined" ? "idle" : state;
  }
}

/** "1 · nobody ahead of you", "4 · 3 ahead of you". */
export function placeLabel(place: WaitlistPlace): string {
  const n = place.ahead.length;
  return `${place.position} · ${n === 0 ? "nobody" : n === 1 ? "1 person" : `${n} people`} ahead of you`;
}
