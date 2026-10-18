/**
 * The non-visual half of the programme and people screens' kit: who is
 * looking, the sentence a refusal for them carries, what a failed save hands
 * a form, and the guard against leaving unsaved work.
 */
import * as React from "react";
import { errorMessage, isDataError } from "@/data/errors";
import { ROLE_LABELS } from "@/data/mock/db";
import { useRead } from "@/data/provider";
import type { Viewer } from "@/data/types";

export function useViewer(): Viewer | undefined {
  return useRead(["viewer"], (c) => c.team.viewer()).data;
}

/** The same sentence the backend refuses with, so the tooltip and a refusal never disagree. */
export function cantSay(viewer: Viewer | undefined, what: string): string {
  return viewer ? `${ROLE_LABELS[viewer.role]} can't ${what}. Ask an admin.` : "Checking what you can do…";
}

export type Refusal = { message: string; fields: Record<string, string> } | null;

/** What a failed save hands a form: the sentence for the top, and the field errors for `<Form errors>`. */
export function refusalOf(error: unknown): { message: string; fields: Record<string, string> } {
  return { message: errorMessage(error), fields: isDataError(error) ? error.fields : {} };
}

export interface LeaveGuard {
  /** Where the person tried to go, while the page asks; null otherwise. */
  target: string | null;
  stay: () => void;
  leave: () => void;
}

/**
 * Ask before leaving a page with unsaved work (render `<LeaveDialog guard={…}>`).
 * The app routes by hash, so the guard catches a click on any in-app link
 * before it navigates; Back or a typed URL arrive as a hashchange, which it
 * answers by putting the address back and asking. Moving within the same page
 * (another query, a dialog) isn't leaving. Closing or reloading the tab gets
 * the browser's own prompt. `onLeave` runs when the person chooses to leave.
 */
export function useLeaveGuard(dirty: boolean, { onLeave }: { onLeave?: () => void } = {}): LeaveGuard {
  const [target, setTarget] = React.useState<string | null>(null);
  const live = React.useRef({ dirty, here: "", released: false, onLeave });
  React.useLayoutEffect(() => {
    live.current.dirty = dirty;
    live.current.onLeave = onLeave;
  });

  React.useEffect(() => {
    live.current.here = window.location.hash;
    const onHash = (): void => {
      const next = window.location.hash;
      const { dirty: unsaved, here, released } = live.current;
      if (!unsaved || released || next.split("?")[0] === here.split("?")[0]) {
        live.current.here = next;
        return;
      }
      window.history.replaceState(null, "", here);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      setTarget(next);
    };
    // A link is caught before it navigates, so the page never unmounts under the question.
    const onClick = (event: MouseEvent): void => {
      const { dirty: unsaved, released } = live.current;
      if (!unsaved || released || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href^='#/']") : null;
      const href = link?.getAttribute("href");
      if (!href || href.split("?")[0] === window.location.hash.split("?")[0]) return;
      event.preventDefault();
      setTarget(href);
    };
    const onUnload = (event: BeforeUnloadEvent): void => {
      if (live.current.dirty && !live.current.released) event.preventDefault();
    };
    // Back or a typed URL: put the address back and ask. If the router got there first (it can
    // re-render before the hashchange arrives), the page is already gone; drafts that matter
    // (the register's) are kept on the device for that case.
    window.addEventListener("hashchange", onHash, { capture: true });
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("hashchange", onHash, { capture: true });
      window.removeEventListener("beforeunload", onUnload);
    };
  }, []);

  return {
    target,
    stay: () => setTarget(null),
    leave: () => {
      const go = target;
      live.current.released = true;
      live.current.onLeave?.();
      setTarget(null);
      if (go) window.location.hash = go.slice(1);
    },
  };
}

/** Keep showing the last answer while a new one loads (typing in a search box shouldn't flash skeletons). */
export function useLastDefined<T>(value: T | undefined): T | undefined {
  const [last, setLast] = React.useState(value);
  if (value !== undefined && value !== last) setLast(value);
  return value ?? last;
}
