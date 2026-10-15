"use client";

import { Meter as MeterPrimitive } from "@base-ui/react/meter";
import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A measurement within a known range (the time left on a hold). Not Progress:
 * nothing is being completed, a quantity is being read. `tone` shifts the bar
 * as the value runs low; the label and value say it in words too.
 */
export function Meter({
  className,
  children,
  tone = "default",
  ...props
}: MeterPrimitive.Root.Props & { tone?: "default" | "warning" | "destructive" }): React.ReactElement {
  return (
    <MeterPrimitive.Root className={cn("flex w-full flex-col gap-1.5", className)} data-slot="meter" data-tone={tone} {...props}>
      {children}
      <MeterPrimitive.Track className="h-1.5 w-full overflow-hidden rounded-full bg-input" data-slot="meter-track">
        <MeterPrimitive.Indicator
          className={cn(
            "h-full rounded-full transition-[width,background-color] duration-500 ease-linear motion-reduce:transition-none",
            tone === "default" && "bg-primary",
            tone === "warning" && "bg-warning",
            tone === "destructive" && "bg-destructive",
          )}
          data-slot="meter-indicator"
        />
      </MeterPrimitive.Track>
    </MeterPrimitive.Root>
  );
}

export function MeterLabel({ className, ...props }: MeterPrimitive.Label.Props): React.ReactElement {
  return <MeterPrimitive.Label className={cn("font-medium text-sm", className)} data-slot="meter-label" {...props} />;
}

export function MeterValue({ className, ...props }: MeterPrimitive.Value.Props): React.ReactElement {
  return <MeterPrimitive.Value className={cn("text-muted-foreground text-sm tabular-nums", className)} data-slot="meter-value" {...props} />;
}

export { MeterPrimitive };
