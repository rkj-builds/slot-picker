"use client";

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * A button the viewer can't use, kept focusable (aria-disabled, not
 * disabled) so the reason is reachable: read out with the button, and shown
 * in a tooltip on hover or focus.
 */
export function DisabledWithReason({ reason, children, className, variant = "outline", ...props }: { reason: string } & Omit<ButtonProps, "onClick" | "disabled">): React.ReactElement {
  const id = React.useId();
  // The reason sits beside the button, not in it, so it describes the button without becoming part of its name.
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={<Button aria-describedby={id} aria-disabled="true" className={cn("cursor-not-allowed opacity-64", className)} onClick={(event) => event.preventDefault()} variant={variant} {...props} />}
        >
          {children}
        </TooltipTrigger>
        <TooltipPopup className="max-w-64">{reason}</TooltipPopup>
      </Tooltip>
      <span className="sr-only" id={id}>
        {reason}
      </span>
    </>
  );
}
