"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import type * as React from "react";
import { cn } from "@/lib/utils";

/** An on/off setting that takes effect immediately, announced as a switch. */
export function Switch({ className, ...props }: SwitchPrimitive.Root.Props): React.ReactElement {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative inline-flex h-5 w-8.5 shrink-0 cursor-pointer items-center rounded-full p-0.5 outline-none transition-[background-color,box-shadow] duration-200 ease-out-quart pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-checked:bg-primary data-unchecked:bg-input data-disabled:cursor-not-allowed data-disabled:opacity-64 dark:data-unchecked:bg-input/80",
        className,
      )}
      data-slot="switch"
      {...props}
    >
      <SwitchPrimitive.Thumb
        className="pointer-events-none block size-4 rounded-full bg-background shadow-sm transition-[translate] duration-200 ease-out-quart data-checked:translate-x-3.5 motion-reduce:transition-none rtl:data-checked:-translate-x-3.5"
        data-slot="switch-thumb"
      />
    </SwitchPrimitive.Root>
  );
}

export { SwitchPrimitive };
