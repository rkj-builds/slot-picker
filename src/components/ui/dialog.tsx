"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A modal dialog. Base UI owns the focus trap, scroll lock, Escape and
 * returning focus to the trigger on close; this file only dresses it.
 * On a phone the popup rises from the bottom edge, where a thumb can reach it.
 */

export const Dialog: typeof DialogPrimitive.Root = DialogPrimitive.Root;

export function DialogTrigger(props: DialogPrimitive.Trigger.Props): React.ReactElement {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

export function DialogClose(props: DialogPrimitive.Close.Props): React.ReactElement {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

export function DialogBackdrop({ className, ...props }: DialogPrimitive.Backdrop.Props): React.ReactElement {
  return (
    <DialogPrimitive.Backdrop
      className={cn(
        "fixed inset-0 z-50 bg-black/32 backdrop-blur-[2px] transition-opacity duration-200 ease-out-quart data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none",
        className,
      )}
      data-slot="dialog-backdrop"
      {...props}
    />
  );
}

export function DialogPopup({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  /** Render the corner close button. Off for flows that must end with a choice. */
  showCloseButton?: boolean;
}): React.ReactElement {
  return (
    <DialogPrimitive.Portal>
      <DialogBackdrop />
      <DialogPrimitive.Viewport
        className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4"
        data-slot="dialog-viewport"
      >
        <DialogPrimitive.Popup
          className={cn(
            "relative flex max-h-[calc(100dvh-2rem)] w-full min-w-0 flex-col rounded-t-2xl border bg-popover text-popover-foreground shadow-lg/5 outline-none transition-[opacity,scale,translate] duration-200 ease-out-quart data-ending-style:translate-y-4 data-ending-style:opacity-0 data-starting-style:translate-y-4 data-starting-style:opacity-0 motion-reduce:transition-none sm:max-w-lg sm:rounded-2xl sm:data-ending-style:translate-y-0 sm:data-ending-style:scale-98 sm:data-starting-style:translate-y-0 sm:data-starting-style:scale-98",
            className,
          )}
          data-slot="dialog-popup"
          {...props}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              aria-label="Close"
              className="absolute end-2 top-2"
              data-slot="dialog-close-button"
              render={<Button size="icon" variant="ghost" />}
            >
              <XIcon aria-hidden="true" />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div className={cn("flex flex-col gap-1.5 p-6 pe-12 pb-3", className)} data-slot="dialog-header" {...props} />;
}

export function DialogPanel({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-3", className)} data-slot="dialog-panel" {...props} />;
}

export function DialogFooter({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 border-t bg-muted/50 px-6 py-4 sm:flex-row sm:justify-end sm:rounded-b-2xl",
        className,
      )}
      data-slot="dialog-footer"
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props): React.ReactElement {
  return (
    <DialogPrimitive.Title
      className={cn("font-semibold text-lg leading-tight tracking-tight", className)}
      data-slot="dialog-title"
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props): React.ReactElement {
  return (
    <DialogPrimitive.Description
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="dialog-description"
      {...props}
    />
  );
}

export { DialogPrimitive };
