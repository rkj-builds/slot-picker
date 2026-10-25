"use client";

import { ArrowRightIcon } from "lucide-react";
import * as React from "react";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { attemptJoin, placeLabel, type WaitlistPlace, type WaitlistState } from "@/lib/waitlist";

export type { WaitlistPlace, WaitlistState } from "@/lib/waitlist";

export interface WaitlistProps {
  /** What is full: a course, a court, a role. */
  item: string;
  /** Why it is full, in a line under the item. */
  status?: string;
  /** Called on Join. Resolve with the place in line; reject to show the error state, with the same button as the retry. */
  onJoin: () => Promise<WaitlistPlace>;
  /** Called when the person confirms they want to leave. Return false to keep them on the list. */
  onCancel?: () => boolean | Promise<boolean>;
  /** The state, when the parent owns it (the docs page does; a product usually won't). */
  state?: WaitlistState;
  /** Called on every change of state, controlled or not: to log a join, or to keep a parent in step. */
  onStateChange?: (state: WaitlistState) => void;
  /** Where an uncontrolled Waitlist starts. */
  defaultState?: WaitlistState;
  /** The place to show when `state` is "joined" and `onJoin` has not run, as on a docs page. */
  place?: WaitlistPlace;
  /** What the button says while `onJoin` is pending. */
  joiningLabel?: string;
  /** What the error line says when `onJoin` rejects without a message of its own. */
  errorLabel?: string;
  /** Merged onto the card, as on every coss part. */
  className?: string;
  /** Your own arrangement of the parts (WaitlistHeader, WaitlistPosition, WaitlistActions…). Left out, the default layout renders. */
  children?: React.ReactNode;
}

interface WaitlistContextValue {
  item: string;
  state: WaitlistState;
  place: WaitlistPlace | undefined;
  error: string | null;
  joiningLabel: string;
  errorLabel: string;
  join: () => void;
  leave: () => Promise<void>;
  positionRef: React.RefObject<HTMLDivElement | null>;
}

const WaitlistContext = React.createContext<WaitlistContextValue | null>(null);

function useWaitlist(part: string): WaitlistContextValue {
  const ctx = React.useContext(WaitlistContext);
  if (!ctx) throw new Error(`<${part}> must be inside <Waitlist>`);
  return ctx;
}

/** A place in line for something that is full. It asks once, keeps the person's place, and never takes it away by accident. */
export function Waitlist({
  item,
  status,
  onJoin,
  onCancel,
  state: stateProp,
  onStateChange,
  defaultState = "idle",
  place: placeProp,
  joiningLabel = "Checking for cancellations…",
  errorLabel = "The list did not answer. Nothing was lost.",
  className,
  children,
}: WaitlistProps): React.ReactElement {
  const [ownState, setOwnState] = React.useState<WaitlistState>(defaultState);
  const state = stateProp ?? ownState;
  const [ownPlace, setOwnPlace] = React.useState<WaitlistPlace | undefined>(undefined);
  const place = ownPlace ?? placeProp;
  const [error, setError] = React.useState<string | null>(null);
  const positionRef = React.useRef<HTMLDivElement | null>(null);
  const alive = React.useRef(true);
  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const setState = React.useCallback(
    (next: WaitlistState): void => {
      setOwnState(next);
      onStateChange?.(next);
    },
    [onStateChange],
  );

  // A join that lands moves focus to the place in line, so the result is read out and the eye lands on it.
  // Only a transition does this: a Waitlist that mounts already joined (a docs page) must not steal focus.
  const previous = React.useRef(state);
  React.useEffect(() => {
    if (previous.current === "joining" && state === "joined") positionRef.current?.focus();
    previous.current = state;
  }, [state]);

  const join = React.useCallback((): void => {
    if (!attemptJoin(state).ok) return;
    setError(null);
    setState("joining");
    onJoin().then(
      (result) => {
        if (!alive.current) return;
        setOwnPlace(result);
        setState("joined");
      },
      (reason: unknown) => {
        if (!alive.current) return;
        setError(reason instanceof Error && reason.message ? reason.message : errorLabel);
        setState("error");
      },
    );
  }, [state, onJoin, setState, errorLabel]);

  const leave = React.useCallback(async (): Promise<void> => {
    const confirmed = onCancel ? await onCancel() : true;
    if (!alive.current || !confirmed) return;
    setOwnPlace(undefined);
    setState("idle");
  }, [onCancel, setState]);

  const value = React.useMemo<WaitlistContextValue>(() => ({ item, state, place, error, joiningLabel, errorLabel, join, leave, positionRef }), [item, state, place, error, joiningLabel, errorLabel, join, leave]);

  const live = state === "joined" && place ? `You're on the list. Position ${place.position}, ${placeLabel(place).split(" · ")[1]}.` : state === "joining" ? joiningLabel : "";

  return (
    <WaitlistContext.Provider value={value}>
      <Card aria-busy={state === "joining" || undefined} className={cn("w-full max-w-sm", className)} data-slot="waitlist" data-state={state}>
        {/* One live region from mount, so a screen reader hears each change and the DOM never gains a region mid-flow. */}
        <p aria-live="polite" className="sr-only" role="status">
          {live}
        </p>
        {children ?? (
          <>
            <WaitlistHeader>
              <WaitlistTitle />
              {status ? <WaitlistStatus>{status}</WaitlistStatus> : null}
            </WaitlistHeader>
            <WaitlistBody>
              <WaitlistPosition />
              <WaitlistActions />
            </WaitlistBody>
          </>
        )}
      </Card>
    </WaitlistContext.Provider>
  );
}

export function WaitlistHeader(props: React.ComponentProps<typeof CardHeader>): React.ReactElement {
  return <CardHeader data-slot="waitlist-header" {...props} />;
}

export function WaitlistTitle({ children, className, ...props }: React.ComponentProps<typeof CardTitle>): React.ReactElement {
  const { item } = useWaitlist("WaitlistTitle");
  return (
    // coss's CardTitle is leading-none, set for one line; an item name can wrap, so it gets the guide's 125% and balanced lines.
    <CardTitle className={cn("text-balance leading-tight", className)} data-slot="waitlist-title" {...props}>
      {children ?? item}
    </CardTitle>
  );
}

export function WaitlistStatus(props: React.ComponentProps<typeof CardDescription>): React.ReactElement {
  return <CardDescription data-slot="waitlist-status" {...props} />;
}

/**
 * The place in line. Rendered only once joined, and the one thing on the card that moves:
 * it rises 4px as it appears, so the eye lands on what is new. Under reduced motion it simply appears.
 */
export function WaitlistPosition({ className, ...props }: React.ComponentProps<"div">): React.ReactElement | null {
  const { state, place, positionRef } = useWaitlist("WaitlistPosition");
  if (state !== "joined" || !place) return null;
  const [number, rest] = placeLabel(place).split(" · ");
  return (
    <div
        aria-label={`Position ${number}, ${rest}`}
        className={cn("flex items-baseline gap-3 rounded-lg outline-none motion-safe:animate-waitlist-enter focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", className)}
        data-slot="waitlist-position"
        ref={positionRef}
        role="group"
        tabIndex={-1}
        {...props}
      >
        <span className="font-semibold text-4xl tabular-nums leading-none">{number}</span>
        <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
          <ArrowRightIcon aria-hidden="true" className="size-4 rtl:rotate-180" />
          {rest}
        </span>
      </div>
  );
}

/** Join, with the error line under it. Three labels share one cell, so the button never changes width. */
export function WaitlistJoin({ className, children, ...props }: React.ComponentProps<typeof Button>): React.ReactElement | null {
  const { state, error, joiningLabel, errorLabel, join } = useWaitlist("WaitlistJoin");
  if (state === "joined") return null;
  const labels: [WaitlistState, React.ReactNode][] = [
    ["idle", children ?? "Join the waitlist"],
    [
      "joining",
      <>
        <Spinner aria-hidden="true" className="size-4" />
        {joiningLabel}
      </>,
    ],
    ["error", "Try again"],
  ];
  return (
    <div className="flex flex-col gap-2" data-slot="waitlist-join">
      <Button aria-disabled={state === "joining" || undefined} className={cn("grid place-items-center", className)} data-state={state} onClick={join} {...props}>
        {labels.map(([forState, label]) => {
          const active = forState === state;
          return (
            <span aria-hidden={!active || undefined} className={cn("inline-flex items-center gap-2 [grid-area:1/1]", !active && "invisible")} key={forState}>
              {label}
            </span>
          );
        })}
      </Button>
      {/* The line is always there at its full height, so an error never pushes the card down. */}
      <p className="min-h-5 text-destructive-foreground text-sm leading-5" role="alert">
        {state === "error" ? (error ?? errorLabel) : null}
      </p>
    </div>
  );
}

/** Leave, behind a question. Closing the dialog returns focus to this button; Base UI does that. */
export function WaitlistCancel({
  children,
  title = "Are you sure?",
  description = "There is nobody behind you either. Leaving only makes the list shorter.",
  keepLabel = "Keep my place",
  leaveLabel = "Leave",
  defaultOpen = false,
}: {
  children?: React.ReactNode;
  /** Mount with the question already open (a docs page showing that state). */
  defaultOpen?: boolean;
  title?: string;
  description?: string;
  keepLabel?: string;
  leaveLabel?: string;
}): React.ReactElement | null {
  const { state, leave } = useWaitlist("WaitlistCancel");
  const [open, setOpen] = React.useState(defaultOpen);
  if (state !== "joined") return null;
  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger data-slot="waitlist-cancel" render={<Button variant="outline" />}>
        {children ?? "Leave the list"}
      </AlertDialogTrigger>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button />}>{keepLabel}</AlertDialogClose>
          <Button
            onClick={() => {
              setOpen(false);
              void leave();
            }}
            variant="ghost"
          >
            {leaveLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

/** Everything under the header in one panel with one gap, so the card's rhythm doesn't depend on which parts are showing. */
export function WaitlistBody({ className, ...props }: React.ComponentProps<typeof CardPanel>): React.ReactElement {
  // pt-0 by hand: coss zeroes it with a :has(> header) selector that the live region, first in the card, keeps from matching.
  return <CardPanel className={cn("flex flex-col gap-4 pt-0", className)} data-slot="waitlist-body" {...props} />;
}

/** Join and Leave; whichever applies renders. */
export function WaitlistActions({ cancelOpen = false, className, ...props }: React.ComponentProps<"div"> & { cancelOpen?: boolean }): React.ReactElement {
  return (
    <div className={cn("flex flex-wrap items-start gap-2", className)} data-slot="waitlist-actions" {...props}>
      <WaitlistJoin />
      <WaitlistCancel defaultOpen={cancelOpen} />
    </div>
  );
}

/** One line of context: the viewer's time zone, a date. Above the actions, so the reserved error line ends the card. */
export function WaitlistMeta({ className, ...props }: React.ComponentProps<"p">): React.ReactElement {
  return <p className={cn("text-muted-foreground text-xs", className)} data-slot="waitlist-meta" {...props} />;
}
