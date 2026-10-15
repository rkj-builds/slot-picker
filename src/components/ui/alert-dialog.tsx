"use client";

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A dialog that interrupts to confirm something that cannot be taken back
 * lightly. Unlike Dialog, a click on the backdrop does not dismiss it, and
 * there is no corner close button: the person answers the question.
 */

export const AlertDialog: typeof AlertDialogPrimitive.Root = AlertDialogPrimitive.Root;

export function AlertDialogTrigger(props: AlertDialogPrimitive.Trigger.Props): React.ReactElement {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

export function AlertDialogClose(props: AlertDialogPrimitive.Close.Props): React.ReactElement {
  return <AlertDialogPrimitive.Close data-slot="alert-dialog-close" {...props} />;
}

export function AlertDialogPopup({ className, children, ...props }: AlertDialogPrimitive.Popup.Props): React.ReactElement {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop
        className="fixed inset-0 z-50 bg-black/32 backdrop-blur-[2px] transition-opacity duration-200 ease-out-quart data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none"
        data-slot="alert-dialog-backdrop"
      />
      <AlertDialogPrimitive.Viewport
        className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
        data-slot="alert-dialog-viewport"
      >
        <AlertDialogPrimitive.Popup
          className={cn(
            "relative flex w-full flex-col rounded-t-2xl border bg-popover text-popover-foreground shadow-lg/5 outline-none transition-[opacity,scale,translate] duration-200 ease-out-quart data-ending-style:translate-y-4 data-ending-style:opacity-0 data-starting-style:translate-y-4 data-starting-style:opacity-0 motion-reduce:transition-none sm:max-w-md sm:rounded-2xl sm:data-ending-style:translate-y-0 sm:data-ending-style:scale-98 sm:data-starting-style:translate-y-0 sm:data-starting-style:scale-98",
            className,
          )}
          data-slot="alert-dialog-popup"
          {...props}
        >
          {children}
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Viewport>
    </AlertDialogPrimitive.Portal>
  );
}

export function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div className={cn("flex flex-col gap-1.5 p-6 pb-3", className)} data-slot="alert-dialog-header" {...props} />;
}

export function AlertDialogPanel({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div className={cn("px-6 pb-4", className)} data-slot="alert-dialog-panel" {...props} />;
}

export function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 border-t bg-muted/50 px-6 py-4 sm:flex-row sm:justify-end sm:rounded-b-2xl",
        className,
      )}
      data-slot="alert-dialog-footer"
      {...props}
    />
  );
}

export function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props): React.ReactElement {
  return (
    <AlertDialogPrimitive.Title
      className={cn("font-semibold text-lg leading-tight tracking-tight", className)}
      data-slot="alert-dialog-title"
      {...props}
    />
  );
}

export function AlertDialogDescription({ className, ...props }: AlertDialogPrimitive.Description.Props): React.ReactElement {
  return (
    <AlertDialogPrimitive.Description
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="alert-dialog-description"
      {...props}
    />
  );
}

export { AlertDialogPrimitive };
