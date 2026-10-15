import type * as React from "react";
import { cn } from "@/lib/utils";

/** A plain label, for controls that live outside a Field. */
export function Label({ className, ...props }: React.ComponentProps<"label">): React.ReactElement {
  return (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control -- the caller passes htmlFor or wraps the control
    <label
      className={cn("inline-flex cursor-default items-center gap-2 font-medium text-sm", className)}
      data-slot="label"
      {...props}
    />
  );
}
