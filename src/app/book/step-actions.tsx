"use client";

import type * as React from "react";
import { useAnchoredBarHeight } from "@/app/anchored-bar";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

/** One line of the live summary: "Court" → "Court 2". A missing value reads as "Not chosen yet". */
export interface SummaryRow {
  label: string;
  value: React.ReactNode | null;
  /** The money line that matters most (the total, or what is paid now). */
  emphasis?: boolean;
}

export interface StepActionsProps {
  /** The summary's heading on a laptop; defaults to "Your booking". */
  title?: string;
  /** The live summary, filled in as the customer chooses. */
  rows: readonly SummaryRow[];
  /** Something time-bound shown above the summary, such as the hold countdown on the Pay step. */
  status?: React.ReactNode;
  /** A short line under the summary: what happens when the primary action is pressed. */
  note?: React.ReactNode;
  /** The previous step. Absent on the first step. */
  onBack?: () => void;
  /** The step's one primary action: a coss Button. */
  primary: React.ReactNode;
  /** Phone and tablet only: a quieter action beside the one-line summary (the full summary in a Drawer, say). The laptop rail already shows everything. */
  extra?: React.ReactNode;
  /** Shown instead of rows on a phone, when the rows would be too long for one line. */
  compactLine?: React.ReactNode;
}

/** The booking page's sticky offsets: under the demo bar (3rem + 1px) and the sticky stepper (3rem + 1px). */
export const UNDER_STEPPER = "lg:top-[calc(6rem+2px+1.5rem)]";

/**
 * A step's content and its actions. On a laptop, two columns: the step's
 * cards on the left and a sticky summary Card on the right, whose footer
 * holds Back and the primary action. On a phone or tablet, one column with
 * the same summary and actions in a bar anchored to the bottom of the
 * viewport. Either way the primary action never scrolls out of reach.
 */
export function StepLayout({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex flex-1 flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
      {actions}
    </div>
  );
}

/** Group a step's content in a coss Card with a plain header, so each decision has its own titled surface. */
export function StepCard({
  title,
  description,
  action,
  children,
  className,
  panelClassName,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  panelClassName?: string;
}): React.ReactElement {
  return (
    <Card className={className} data-step-card="">
      <CardHeader>
        <h2>
          <CardTitle className="text-base" render={<span className="block" />}>
            {title}
          </CardTitle>
        </h2>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardPanel className={panelClassName}>{children}</CardPanel>
    </Card>
  );
}

export function StepActions(props: StepActionsProps): React.ReactElement {
  const wide = useMediaQuery("lg");
  return wide ? <SummaryRail {...props} /> : <ActionBar {...props} />;
}

const NOT_CHOSEN = <span className="text-muted-foreground">Not chosen yet</span>;

/** Laptop: a sticky coss Card beside the step, header / summary / footer actions. */
function SummaryRail({ title = "Your booking", rows, status, note, onBack, primary }: StepActionsProps): React.ReactElement {
  return (
    <Card
      aria-label={title}
      className={cn("sticky", UNDER_STEPPER)}
      data-book-actions="rail"
      render={<section />}
    >
      <CardHeader>
        <h2>
          <CardTitle className="text-base" render={<span className="block" />}>
            {title}
          </CardTitle>
        </h2>
      </CardHeader>
      <CardPanel className="flex flex-col gap-4">
        {status}
        {rows.length > 0 && (
          <dl aria-live="polite" className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm" data-slot="book-summary">
            {rows.map((row) => (
              <SummaryPair key={row.label} row={row} />
            ))}
          </dl>
        )}
        {note && <p className="text-muted-foreground text-xs">{note}</p>}
      </CardPanel>
      <CardFooter className={cn("gap-2", onBack ? "grid grid-cols-[auto_1fr]" : "flex")}>
        {onBack && (
          <Button onClick={onBack} size="lg" variant="outline">
            Back
          </Button>
        )}
        <div className="flex min-w-0 flex-1 *:w-full">{primary}</div>
      </CardFooter>
    </Card>
  );
}

/** One dt/dd pair in a div (a valid dl group) on the dl's subgrid, so the money line can carry one rule across both columns. */
function SummaryPair({ row }: { row: SummaryRow }): React.ReactElement {
  return (
    <div className={cn("col-span-2 grid grid-cols-subgrid", row.emphasis && "mt-1 border-t pt-3")}>
      <dt className={cn("text-muted-foreground", row.emphasis && "font-medium text-foreground")}>{row.label}</dt>
      <dd className={cn("text-end tabular-nums", row.emphasis && "font-semibold")}>{row.value ?? NOT_CHOSEN}</dd>
    </div>
  );
}

/**
 * Phone and tablet: a bar anchored to the bottom of the viewport. Its surface
 * runs edge to edge (a full-bleed backdrop behind the column), its content
 * lines up with the column, and it clears the home indicator.
 */
function ActionBar({ title = "Your booking", rows, status, note, onBack, primary, extra, compactLine }: StepActionsProps): React.ReactElement {
  const chosen = rows.filter((r) => r.value !== null && r.value !== undefined);
  const ref = useAnchoredBarHeight<HTMLElement>();
  return (
    <section
      aria-label={title}
      ref={ref}
      className={cn(
        "sticky bottom-0 z-30 isolate mt-auto -mb-px flex flex-col gap-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        // The anchored surface: full-bleed behind the column, with a hairline on top.
        "before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-dvw before:-translate-x-1/2 before:border-t before:border-border before:bg-background/94 before:shadow-[0_-8px_24px_-12px_--theme(--color-black/12%)] before:backdrop-blur-md",
      )}
      data-book-actions="bar"
    >
      <div className="flex items-center gap-3">
        <div aria-live="polite" className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm" data-slot="book-action-summary">
          {status}
          {compactLine ?? (
            <p className="truncate tabular-nums">
              {chosen.length === 0 ? (
                <span className="text-muted-foreground">Nothing chosen yet</span>
              ) : (
                chosen.map((row, i) => (
                  <span className={cn(row.emphasis && "font-semibold")} key={row.label}>
                    {i > 0 && <span aria-hidden="true" className="text-muted-foreground/60">{" · "}</span>}
                    {row.value}
                  </span>
                ))
              )}
            </p>
          )}
          {note && <p className="truncate text-muted-foreground text-xs">{note}</p>}
        </div>
        {extra}
      </div>
      <div className="flex items-center gap-2">
        {onBack && (
          <Button onClick={onBack} size="lg" variant="outline">
            Back
          </Button>
        )}
        <div className="flex min-w-0 flex-1 justify-end max-sm:*:w-full">{primary}</div>
      </div>
    </section>
  );
}
