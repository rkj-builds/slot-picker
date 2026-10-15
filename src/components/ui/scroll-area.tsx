"use client";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Native scrolling with thin, theme-matched scrollbars that appear on hover
 * or scroll. The viewport is focusable so keyboard users can scroll it.
 */
export function ScrollArea({
  className,
  children,
  viewportClassName,
  viewportLabel,
  ...props
}: ScrollAreaPrimitive.Root.Props & { viewportClassName?: string; viewportLabel?: string }): React.ReactElement {
  return (
    <ScrollAreaPrimitive.Root className={cn("relative min-h-0 overflow-hidden", className)} data-slot="scroll-area" {...props}>
      <ScrollAreaPrimitive.Viewport
        aria-label={viewportLabel}
        className={cn(
          "size-full overscroll-contain rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          viewportClassName,
        )}
        data-slot="scroll-area-viewport"
        role={viewportLabel ? "region" : undefined}
        tabIndex={viewportLabel ? 0 : undefined}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar orientation="vertical" />
      <ScrollBar orientation="horizontal" />
      <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" />
    </ScrollAreaPrimitive.Root>
  );
}

export function ScrollBar({ className, ...props }: ScrollAreaPrimitive.Scrollbar.Props): React.ReactElement {
  return (
    <ScrollAreaPrimitive.Scrollbar
      className={cn(
        "m-0.5 flex opacity-0 transition-opacity delay-300 duration-150 data-hovering:opacity-100 data-hovering:delay-0 data-scrolling:opacity-100 data-scrolling:delay-0 data-[orientation=horizontal]:h-1.5 data-[orientation=vertical]:w-1.5 data-[orientation=horizontal]:flex-col",
        className,
      )}
      data-slot="scroll-area-scrollbar"
      {...props}
    >
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-foreground/24" data-slot="scroll-area-thumb" />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollAreaPrimitive };
