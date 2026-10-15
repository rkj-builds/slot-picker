"use client";

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A panel that slides in from an edge: a Dialog underneath, so it has the
 * same focus trap, Escape and focus return. Used for detail views that keep
 * the page behind them in context (the desk's booking panel).
 */

export const Sheet: typeof SheetPrimitive.Root = SheetPrimitive.Root;

export function SheetTrigger(props: SheetPrimitive.Trigger.Props): React.ReactElement {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

export function SheetClose(props: SheetPrimitive.Close.Props): React.ReactElement {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

export const sheetPopupVariants = cva(
  "fixed z-50 flex flex-col bg-popover text-popover-foreground shadow-lg/5 outline-none transition-[translate,opacity] duration-250 ease-out-quart motion-reduce:transition-none",
  {
    defaultVariants: { side: "right" },
    variants: {
      side: {
        right:
          "inset-y-0 end-0 h-dvh w-full border-s sm:max-w-md data-ending-style:translate-x-full data-starting-style:translate-x-full rtl:data-ending-style:-translate-x-full rtl:data-starting-style:-translate-x-full",
        left: "inset-y-0 start-0 h-dvh w-full border-e sm:max-w-md data-ending-style:-translate-x-full data-starting-style:-translate-x-full",
        bottom:
          "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t data-ending-style:translate-y-full data-starting-style:translate-y-full",
      },
    },
  },
);

export function SheetPopup({
  className,
  children,
  side,
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props &
  VariantProps<typeof sheetPopupVariants> & { showCloseButton?: boolean }): React.ReactElement {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Backdrop
        className="fixed inset-0 z-50 bg-black/32 transition-opacity duration-250 ease-out-quart data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none"
        data-slot="sheet-backdrop"
      />
      <SheetPrimitive.Popup
        className={cn(sheetPopupVariants({ side }), className)}
        data-side={side ?? "right"}
        data-slot="sheet-popup"
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            aria-label="Close"
            className="absolute end-3 top-3"
            data-slot="sheet-close-button"
            render={<Button size="icon" variant="ghost" />}
          >
            <XIcon aria-hidden="true" />
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div className={cn("flex flex-col gap-1.5 border-b p-5 pe-14", className)} data-slot="sheet-header" {...props} />;
}

export function SheetPanel({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto p-5", className)} data-slot="sheet-panel" {...props} />;
}

export function SheetFooter({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div className={cn("flex flex-wrap gap-2 border-t bg-muted/50 p-4", className)} data-slot="sheet-footer" {...props} />
  );
}

export function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props): React.ReactElement {
  return (
    <SheetPrimitive.Title
      className={cn("font-semibold text-lg leading-tight tracking-tight", className)}
      data-slot="sheet-title"
      {...props}
    />
  );
}

export function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props): React.ReactElement {
  return (
    <SheetPrimitive.Description
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="sheet-description"
      {...props}
    />
  );
}

export { SheetPrimitive };
