"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { CircleAlertIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import type * as React from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Toasts, managed outside React so any code path (a store action, a timer)
 * can raise one: `toastManager.add({ title, type: "success" })`.
 * An Undo is an `actionProps` button; Base UI announces each toast politely
 * (or urgently with `priority: "high"`) and pauses the timer on hover/focus.
 */

export const toastManager: ReturnType<typeof ToastPrimitive.createToastManager> = ToastPrimitive.createToastManager();

export const useToastManager: typeof ToastPrimitive.useToastManager = ToastPrimitive.useToastManager;

const ICONS: Record<string, React.ReactElement> = {
  success: <CircleCheckIcon aria-hidden="true" className="text-success-foreground" />,
  error: <CircleAlertIcon aria-hidden="true" className="text-destructive-foreground" />,
  warning: <TriangleAlertIcon aria-hidden="true" className="text-warning-foreground" />,
  info: <InfoIcon aria-hidden="true" className="text-info-foreground" />,
};

export function ToastProvider({
  children,
  timeout = 5000,
  ...props
}: Omit<ToastPrimitive.Provider.Props, "toastManager">): React.ReactElement {
  return (
    <ToastPrimitive.Provider timeout={timeout} toastManager={toastManager} {...props}>
      {children}
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport
          className="fixed inset-x-4 bottom-4 z-[60] mx-auto flex w-auto flex-col-reverse gap-2 sm:inset-x-auto sm:end-6 sm:bottom-6 sm:w-90"
          data-slot="toast-viewport"
        >
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  );
}

function ToastList(): React.ReactNode {
  const { toasts } = ToastPrimitive.useToastManager();
  return toasts.map((toast) => (
    <ToastPrimitive.Root
      className="relative w-full select-none rounded-xl border bg-popover text-popover-foreground shadow-lg/5 transition-[opacity,translate] duration-200 ease-out-quart data-ending-style:translate-y-2 data-ending-style:opacity-0 data-limited:hidden data-starting-style:translate-y-2 data-starting-style:opacity-0 motion-reduce:transition-none"
      data-slot="toast"
      key={toast.id}
      swipeDirection={["down", "right"]}
      toast={toast}
    >
      <ToastPrimitive.Content className="flex items-start gap-3 p-3.5 pe-10 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0">
        {toast.type ? ICONS[toast.type] : null}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <ToastPrimitive.Title className="font-medium text-sm" data-slot="toast-title" />
          <ToastPrimitive.Description className="text-muted-foreground text-sm" data-slot="toast-description" />
        </div>
        {toast.actionProps && (
          <ToastPrimitive.Action className={cn(buttonVariants({ size: "sm", variant: "outline" }), "self-center")} data-slot="toast-action" />
        )}
      </ToastPrimitive.Content>
      <ToastPrimitive.Close
        aria-label="Dismiss"
        className="absolute end-2 top-2 inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4"
        data-slot="toast-close"
      >
        <XIcon aria-hidden="true" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  ));
}

export { ToastPrimitive };
