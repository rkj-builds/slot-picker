"use client";

import { CloudAlertIcon, MapPinIcon } from "lucide-react";
import * as React from "react";
import { CourtStep } from "@/app/book/court-step";
import { DoneStep } from "@/app/book/done-step";
import { type Draft, FlowContext, furthestStep, isStepId, readDraft, type StepId, STEPS, stepIndex, writeDraft } from "@/app/book/flow";
import { PayStep } from "@/app/book/pay-step";
import { ScenariosPopover } from "@/app/book/scenarios-popover";
import { WhenStep } from "@/app/book/when-step";
import { YouStep } from "@/app/book/you-step";
import { navigate, type Route } from "@/app/router";
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

  const flow = React.useMemo(() => ({ draft, update, goTo, booking }), [draft, update, goTo, booking]);
  const current = stepIndex(step);

  return (
    <FlowContext.Provider value={flow}>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 pt-6 pb-28 sm:pt-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="font-semibold text-sm tracking-tight">{VENUE.name}</span>
            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              <MapPinIcon aria-hidden="true" className="size-3" />
              {VENUE.city} · 2 pickleball courts
            </span>
          </div>
        </div>

        <nav aria-label="Booking steps">
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
          <div className="animate-fade-in" key={step}>
            {step === "court" && <CourtStep />}
            {step === "when" && <WhenStep />}
            {step === "you" && <YouStep />}
            {step === "pay" && <PayStep />}
            {step === "done" && <DoneStep />}
          </div>
        )}
      </main>
      <ScenariosPopover />
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
    <div className="mb-5 flex flex-col gap-1">
      <h1 className="font-semibold text-2xl tracking-tight outline-none" tabIndex={-1}>
        {title}
      </h1>
      {description && <p className="text-pretty text-muted-foreground text-sm">{description}</p>}
    </div>
  );
}
