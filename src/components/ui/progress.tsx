"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import type * as React from "react";
import { cn } from "@/lib/utils";

/** Progress of a task. A `null` value is indeterminate. */
export function Progress({ className, children, ...props }: ProgressPrimitive.Root.Props): React.ReactElement {
  return (
    <ProgressPrimitive.Root className={cn("flex w-full flex-col gap-1.5", className)} data-slot="progress" {...props}>
      {children}
      <ProgressPrimitive.Track className="h-1.5 w-full overflow-hidden rounded-full bg-input" data-slot="progress-track">
        <ProgressPrimitive.Indicator
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out-quart data-indeterminate:w-1/3 data-indeterminate:animate-pulse motion-reduce:transition-none"
          data-slot="progress-indicator"
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props): React.ReactElement {
  return <ProgressPrimitive.Label className={cn("font-medium text-sm", className)} data-slot="progress-label" {...props} />;
}

export function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props): React.ReactElement {
  return <ProgressPrimitive.Value className={cn("text-muted-foreground text-sm tabular-nums", className)} data-slot="progress-value" {...props} />;
}

export { ProgressPrimitive };
