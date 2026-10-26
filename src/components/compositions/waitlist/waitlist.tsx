"use client";

import { CircleAlertIcon, Clock3Icon } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { attemptJoin, placeLabel, type WaitlistPlace, type WaitlistState } from "@/lib/waitlist";

export type { WaitlistPlace, WaitlistState } from "@/lib/waitlist";

export interface WaitlistProps {
  /** What is full: a course, a court, a role. */
  item: string;
  /** The badge above the item while it is full. One or two words. */
  status?: string;
  /** The slots that are taken, already formatted for the viewer. Shown struck through, so "full" is something you see. */
  slots?: readonly string[];
  /** Called on Join. Resolve with the place in line; reject to show the reason in the footer, with the same button as the retry. */
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
  /** What the footer says when `onJoin` rejects without a message of its own. */
  errorLabel?: string;
  /** One line in the footer: the viewer's time zone, a date. A failed join shows its reason in its place. */
  meta?: React.ReactNode;
  /** Merged onto the card, as on every coss part. */
  className?: string;
  /** Your own arrangement of the parts (WaitlistHeader, WaitlistBody, WaitlistFooter…). Left out, the default layout renders. */
  children?: React.ReactNode;
}

interface WaitlistContextValue {
  item: string;
  status: string;
  slots: readonly string[];
  meta: React.ReactNode;
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
  status = "Full",
  slots = [],
  onJoin,
  onCancel,
  state: stateProp,
  onStateChange,
  defaultState = "idle",
  place: placeProp,
  joiningLabel = "Checking for cancellations…",
  errorLabel = "The list did not answer. Nothing was lost.",
  meta,
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

  const value = React.useMemo<WaitlistContextValue>(
    () => ({ item, status, slots, meta, state, place, error, joiningLabel, errorLabel, join, leave, positionRef }),
    [item, status, slots, meta, state, place, error, joiningLabel, errorLabel, join, leave],
  );

  const live = state === "joined" && place ? `You're on the list. Position ${place.position}, ${placeLabel(place).split(" · ")[1]}.` : state === "joining" ? joiningLabel : "";

  return (
    <WaitlistContext.Provider value={value}>
      <Card aria-busy={state === "joining" || undefined} className={cn("w-full max-w-xs", className)} data-slot="waitlist" data-state={state}>
        {/* One live region from mount, so a screen reader hears each change and the DOM never gains a region mid-flow. */}
        <p aria-live="polite" className="sr-only" role="status">
          {live}
        </p>
        {children ?? (
          <>
            <WaitlistHeader>
              <WaitlistStatus />
              <WaitlistTitle />
            </WaitlistHeader>
            <WaitlistBody>
              <WaitlistSlots />
              <WaitlistPosition />
              <WaitlistActions />
            </WaitlistBody>
            <WaitlistFooter />
          </>
        )}
      </Card>
    </WaitlistContext.Provider>
  );
}

/** The status badge, then the item. Padding set here, not inferred from which siblings exist. */
export function WaitlistHeader({ className, ...props }: React.ComponentProps<typeof CardHeader>): React.ReactElement {
  return <CardHeader className={cn("flex flex-col items-start gap-2.5 p-6 pb-4", className)} data-slot="waitlist-header" {...props} />;
}

export function WaitlistTitle({ children, className, ...props }: React.ComponentProps<typeof CardTitle>): React.ReactElement {
  const { item } = useWaitlist("WaitlistTitle");
  return (
    // coss's CardTitle is leading-none, set for one line; an item name can wrap, so it gets the guide's 125% and balanced lines.
    // Every string a prop supplies sits in <bdi>: it keeps its own punctuation order (English inside a right-to-left page),
    // while the block around it keeps the card's direction, so it still aligns to the card's start.
    <CardTitle className={cn("text-balance leading-tight", className)} data-slot="waitlist-title" {...props}>
      {children ?? <bdi>{item}</bdi>}
    </CardTitle>
  );
}

/** "Full" while it is; "On the list" once joined. A badge, so it reads before the title does. */
export function WaitlistStatus({ className, children, ...props }: React.ComponentProps<typeof Badge>): React.ReactElement {
  const { state, status } = useWaitlist("WaitlistStatus");
  const joined = state === "joined";
  return (
    <Badge className={className} data-slot="waitlist-status" variant={joined ? "success" : "secondary"} {...props}>
      {children ?? (joined ? "On the list" : status)}
    </Badge>
  );
}

/** Everything between the header and the footer, one gap apart. */
export function WaitlistBody({ className, ...props }: React.ComponentProps<typeof CardPanel>): React.ReactElement {
  return <CardPanel className={cn("flex flex-col gap-3 px-6 pt-0 pb-6", className)} data-slot="waitlist-body" {...props} />;
}

/** The taken slots, struck through, until the person joins. Each one is read as "taken". */
export function WaitlistSlots({ className, ...props }: React.ComponentProps<"ul">): React.ReactElement | null {
  const { state, slots, status } = useWaitlist("WaitlistSlots");
  if (state === "joined" || slots.length === 0) return null;
  return (
    <ul aria-label={`${status}: every slot taken`} className={cn("grid grid-cols-3 gap-1.5", className)} data-slot="waitlist-slots" {...props}>
      {slots.map((slot) => (
        <li className="rounded-md border border-border border-dashed py-1.5 text-center text-muted-foreground text-xs tabular-nums" key={slot}>
          <s className="decoration-muted-foreground/60">{slot}</s>
          <span className="sr-only"> taken</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The place in line, once joined, in the space the slots held. The one thing on the card that moves:
 * it rises 4px as it appears, so the eye lands on what is new. Under reduced motion it simply appears.
 */
export function WaitlistPosition({ className, ...props }: React.ComponentProps<"div">): React.ReactElement | null {
  const { state, place, positionRef } = useWaitlist("WaitlistPosition");
  if (state !== "joined" || !place) return null;
  const [number, rest] = placeLabel(place).split(" · ");
  return (
    <div
      aria-label={`Position ${number}, ${rest}`}
      className={cn(
        "flex items-center gap-3.5 rounded-lg bg-muted px-4 py-3 outline-none motion-safe:animate-waitlist-enter focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      data-slot="waitlist-position"
      ref={positionRef}
      role="group"
      tabIndex={-1}
      {...props}
    >
      <span className="font-semibold text-3xl tabular-nums leading-none">{number}</span>
      <span className="flex flex-col text-sm leading-snug">
        <span>
          <bdi>in line</bdi>
        </span>
        <span className="text-muted-foreground">
          <bdi>{rest}</bdi>
        </span>
      </span>
    </div>
  );
}

/** Join, full width. Three labels share one cell, so the button never changes size while it works. */
export function WaitlistJoin({ className, children, ...props }: React.ComponentProps<typeof Button>): React.ReactElement | null {
  const { state, joiningLabel, join } = useWaitlist("WaitlistJoin");
  if (state === "joined") return null;
  const labels: [WaitlistState, React.ReactNode][] = [
    ["idle", <bdi key="idle">{children ?? "Join the waitlist"}</bdi>],
    [
      "joining",
      <>
        <Spinner aria-hidden="true" className="size-4" />
        <bdi>{joiningLabel}</bdi>
      </>,
    ],
    ["error", <bdi key="error">Try again</bdi>],
  ];
  return (
    <Button aria-disabled={state === "joining" || undefined} className={cn("grid w-full place-items-center", className)} data-slot="waitlist-join" data-state={state} onClick={join} {...props}>
      {labels.map(([forState, label]) => {
        const active = forState === state;
        return (
          <span aria-hidden={!active || undefined} className={cn("inline-flex items-center gap-2 [grid-area:1/1]", !active && "invisible")} key={forState}>
            {label}
          </span>
        );
      })}
    </Button>
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
      <AlertDialogTrigger data-slot="waitlist-cancel" render={<Button className="w-full" variant="outline" />}>
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

/** Join or Leave; whichever applies renders, at full width. */
export function WaitlistActions({ cancelOpen = false }: { cancelOpen?: boolean }): React.ReactElement {
  return (
    <>
      <WaitlistJoin />
      <WaitlistCancel defaultOpen={cancelOpen} />
    </>
  );
}

/** One line of context, as the meta prop or as children. */
export function WaitlistMeta({ className, ...props }: React.ComponentProps<"p">): React.ReactElement {
  return <p className={cn("text-muted-foreground text-xs", className)} data-slot="waitlist-meta" {...props} />;
}

/**
 * The footer line: the meta (a time zone, a date), or, when a join fails, the reason in its place.
 * Both sit in one grid cell, so an error changes the words and never the card's height.
 */
export function WaitlistFooter({ className, children, ...props }: React.ComponentProps<typeof CardFooter>): React.ReactElement {
  const { meta, state, error, errorLabel } = useWaitlist("WaitlistFooter");
  const failed = state === "error";
  const line = children ?? meta;
  return (
    <CardFooter className={cn("grid border-t px-6 py-3", className)} data-slot="waitlist-footer" {...props}>
      <div aria-hidden={failed || undefined} className={cn("flex items-start gap-1.5 text-muted-foreground text-xs [grid-area:1/1]", failed && "invisible")}>
        {line ? <Clock3Icon aria-hidden="true" className="size-3 h-lh shrink-0" /> : null}
        {typeof line === "string" ? (
          <WaitlistMeta>
            <bdi>{line}</bdi>
          </WaitlistMeta>
        ) : (
          line
        )}
      </div>
      <p className={cn("flex items-start gap-1.5 text-destructive-foreground text-xs [grid-area:1/1]", !failed && "invisible")} role="alert">
        {failed ? (
          <>
            <CircleAlertIcon aria-hidden="true" className="size-3 h-lh shrink-0" />
            <bdi>{error ?? errorLabel}</bdi>
          </>
        ) : null}
      </p>
    </CardFooter>
  );
}
