"use client";

import { CloudAlertIcon, MapPinIcon } from "lucide-react";
import * as React from "react";
import { CourtStep } from "@/app/book/court-step";
import { DoneStep } from "@/app/book/done-step";
import { type Draft, FlowContext, furthestStep, isStepId, readDraft, type StepId, STEPS, stepIndex, writeDraft } from "@/app/book/flow";
import { PayStep } from "@/app/book/pay-step";
import { WhenStep } from "@/app/book/when-step";
import { YouStep } from "@/app/book/you-step";
import { navigate, type Route } from "@/app/router";
import { DRAFT_EVENT } from "@/app/demo-jump";
import { useStore } from "@/app/store";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Stepper, StepperItem } from "@/components/compositions/stepper";
import { toastManager } from "@/components/ui/toast";
import { VENUE } from "@/lib/venue";

/**
 * The customer's booking flow, mobile-first: five steps, each with its own
 * URL (#/book/court … #/book/done), so the back button walks back through
 * the steps and a reload lands on the same one.
 */
export function BookPage({ route }: { route: Route }): React.ReactElement {
  const store = useStore();
  const [draft, setDraft] = React.useState<Draft>(readDraft);
  const booking = draft.bookingId ? store.state.bookings.find((b) => b.id === draft.bookingId) : undefined;

  const requested: StepId = isStepId(route.segments[1]) ? route.segments[1] : "court";
  const furthest = furthestStep(draft, booking);
  const settled = booking?.status === "confirmed" || booking?.status === "cancelled";
  const step: StepId = settled ? "done" : stepIndex(requested) > stepIndex(furthest) ? furthest : requested;

  const update = React.useCallback((patch: Partial<Draft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      writeDraft(next);
      return next;
    });
  }, []);
  const goTo = React.useCallback((next: StepId) => navigate(`/book/${next}`), []);

  // A demo jump writes a draft from outside the flow; pick it up.
  React.useEffect(() => {
    const reload = (): void => setDraft(readDraft());
    window.addEventListener(DRAFT_EVENT, reload);
    return () => window.removeEventListener(DRAFT_EVENT, reload);
  }, []);

  // The URL asked for a step the draft cannot reach yet: show the right one, without a history entry.
  React.useEffect(() => {
    if (route.segments[1] !== step) navigate(`/book/${step}`, undefined, { replace: true });
  }, [route.segments, step]);

  // Walking back past "Pay" lets the court go, so nobody else is blocked by a hold the customer left.
  // Only a step backwards counts: on the way forward the hold exists a moment before the URL says "pay".
  const { dispatch } = store;
  const previousStep = React.useRef<StepId>(step);
  React.useEffect(() => {
    const wentBack = stepIndex(previousStep.current) >= stepIndex("pay") && stepIndex(step) < stepIndex("pay");
    previousStep.current = step;
    if (!wentBack || !booking) return;
    // The URL is the external system here: a back button press must let the court go.
    if (booking.status === "held") {
      dispatch({ type: "release-hold", bookingId: booking.id });
      toastManager.add({ title: "Hold released", description: "The court is free for others again while you change your booking.", type: "info" });
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to navigation, which happens outside React
    if (booking.status === "held" || booking.status === "expired") update({ bookingId: null });
  }, [booking, step, dispatch, update]);

  // Which way the last step change went, for the step's entrance (forward slides in from the end, back from the start).
  const [shown, setShown] = React.useState<{ step: StepId; direction: "forward" | "back" }>({ step, direction: "forward" });
  if (shown.step !== step) setShown({ step, direction: stepIndex(step) >= stepIndex(shown.step) ? "forward" : "back" });

  const flow = React.useMemo(() => ({ draft, update, goTo, booking }), [draft, update, goTo, booking]);
  const current = stepIndex(step);

  return (
    <FlowContext.Provider value={flow}>
      {/* Clips the full-bleed backdrops of the sticky stepper and action bar, without becoming a scroll container. */}
      <div className="flex flex-1 flex-col overflow-x-clip">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 pt-6 sm:pt-10 lg:max-w-5xl lg:pb-12">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="font-semibold text-sm tracking-tight">{VENUE.name}</span>
            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              <MapPinIcon aria-hidden="true" className="size-3" />
              {VENUE.city} · 2 pickleball courts
            </span>
          </div>
        </div>

        {/* The stepper stays under the demo bar; its backdrop runs edge to edge so it reads as part of the page chrome. */}
        <nav
          aria-label="Booking steps"
          className="sticky top-[calc(3rem+1px)] z-20 isolate -my-3 py-3 before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-dvw before:-translate-x-1/2 before:border-b before:border-border before:bg-background/94 before:backdrop-blur-md"
          data-slot="book-stepper"
        >
          <Stepper>
            {STEPS.map((s, i) => (
              <StepperItem
                index={i}
                key={s.id}
                label={s.label}
                onSelect={step === "done" ? undefined : () => goTo(s.id)}
                state={i < current ? "complete" : i === current ? "current" : "upcoming"}
              />
            ))}
          </Stepper>
        </nav>

        {store.status === "loading" ? (
          <StepSkeleton />
        ) : store.status === "error" ? (
          <LoadError onRetry={store.retryLoad} />
        ) : (
          // Motion: the step slides 12px in the direction you moved, so forward and back feel different. Off under reduced motion.
          <div className="flex flex-1 flex-col motion-safe:animate-step-in" data-direction={shown.direction} data-slot="book-step" key={step}>
            {step === "court" && <CourtStep />}
            {step === "when" && <WhenStep />}
            {step === "you" && <YouStep />}
            {step === "pay" && <PayStep />}
            {step === "done" && <DoneStep />}
          </div>
        )}
      </main>
      </div>
    </FlowContext.Provider>
  );
}

function StepSkeleton(): React.ReactElement {
  return (
    <div aria-busy="true" className="flex flex-col gap-4" role="status">
      <span className="sr-only">Loading courts and times</span>
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
      <Card>
        <CardPanel className="flex flex-col gap-3 pt-5">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </CardPanel>
      </Card>
    </div>
  );
}

export function LoadError({ onRetry }: { onRetry: () => void }): React.ReactElement {
  return (
    <div role="alert">
      <Empty className="rounded-2xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CloudAlertIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Could not reach the venue</EmptyTitle>
          <EmptyDescription>Courts and times did not load. Check your connection and try again.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onRetry} variant="outline">
            Try again
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}

/** The heading every step starts with; it receives focus when the step changes. */
export function StepHeading({ title, description }: { title: string; description?: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-semibold text-2xl tracking-tight outline-none" tabIndex={-1}>
        {title}
      </h1>
      {description && <p className="text-pretty text-muted-foreground text-sm">{description}</p>}
    </div>
  );
}
