"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import type * as React from "react";
import { cn } from "@/lib/utils";

/** A single-thumb slider; the thumb carries the accessible name via `thumbLabel`. */
export function Slider({
  className,
  thumbLabel,
  ...props
}: SliderPrimitive.Root.Props & { thumbLabel?: string }): React.ReactElement {
  return (
    <SliderPrimitive.Root className={cn("w-full data-disabled:opacity-64", className)} data-slot="slider" {...props}>
      <SliderPrimitive.Control className="flex h-5 w-full touch-none select-none items-center" data-slot="slider-control">
        <SliderPrimitive.Track className="relative h-1.5 w-full rounded-full bg-input" data-slot="slider-track">
          <SliderPrimitive.Indicator className="rounded-full bg-primary" data-slot="slider-indicator" />
          <SliderPrimitive.Thumb
            aria-label={thumbLabel}
            className="size-4.5 rounded-full border border-primary/40 bg-background shadow-sm outline-none transition-[box-shadow] focus-visible:ring-4 focus-visible:ring-ring/40 data-dragging:ring-4 data-dragging:ring-ring/24"
            data-slot="slider-thumb"
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { SliderPrimitive };
