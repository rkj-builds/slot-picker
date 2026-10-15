"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon, MinusIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props): React.ReactElement {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "relative inline-flex size-4.5 shrink-0 cursor-pointer items-center justify-center rounded-[0.3rem] border border-input bg-popover shadow-xs/5 outline-none transition-[background-color,border-color,box-shadow] duration-150 ease-out-quart pointer-coarse:after:absolute pointer-coarse:after:size-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground data-disabled:cursor-not-allowed data-disabled:opacity-64 data-invalid:border-destructive/60 dark:not-data-checked:not-data-indeterminate:bg-input/32 sm:size-4",
        className,
      )}
      data-slot="checkbox"
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className="flex items-center justify-center data-unchecked:hidden [&_svg]:size-3.5 sm:[&_svg]:size-3"
        data-slot="checkbox-indicator"
        render={(indicatorProps, state) => (
          <span {...indicatorProps}>
            {state.indeterminate ? <MinusIcon aria-hidden="true" strokeWidth={3} /> : <CheckIcon aria-hidden="true" strokeWidth={3} />}
          </span>
        )}
      />
    </CheckboxPrimitive.Root>
  );
}

export { CheckboxPrimitive };
