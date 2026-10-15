"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * One-of-many. `Radio` is the classic dot; `RadioCard` is a whole card that
 * is the radio, for choices that need a sentence and a number each (payment
 * options, courts). Both keep Base UI's arrow-key roving and hidden input.
 */

export function RadioGroup<Value>({ className, ...props }: RadioGroupPrimitive.Props<Value>): React.ReactElement {
  return <RadioGroupPrimitive className={cn("flex flex-col gap-3", className)} data-slot="radio-group" {...props} />;
}

export function Radio<Value>({ className, ...props }: RadioPrimitive.Root.Props<Value>): React.ReactElement {
  return (
    <RadioPrimitive.Root
      className={cn(
        "relative inline-flex size-4.5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-input bg-popover shadow-xs/5 outline-none transition-[background-color,border-color] duration-150 ease-out-quart focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-checked:border-primary data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-64 dark:not-data-checked:bg-input/32 sm:size-4",
        className,
      )}
      data-slot="radio"
      {...props}
    >
      <RadioPrimitive.Indicator className="size-1.5 rounded-full bg-primary-foreground data-unchecked:hidden" data-slot="radio-indicator" />
    </RadioPrimitive.Root>
  );
}

export function RadioCard<Value>({ className, children, ...props }: RadioPrimitive.Root.Props<Value>): React.ReactElement {
  return (
    <RadioPrimitive.Root
      className={cn(
        "group/radio-card relative flex w-full cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 text-start shadow-xs/5 outline-none transition-[border-color,background-color,box-shadow] duration-150 ease-out-quart hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-checked:border-primary data-checked:bg-accent/40 data-checked:shadow-[inset_0_0_0_1px_var(--color-primary)] data-disabled:cursor-not-allowed data-disabled:opacity-64",
        className,
      )}
      data-slot="radio-card"
      nativeButton
      render={<button type="button" />}
      {...props}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-input bg-popover transition-colors group-data-checked/radio-card:border-primary group-data-checked/radio-card:bg-primary"
      >
        <span className="size-1.5 rounded-full bg-primary-foreground opacity-0 group-data-checked/radio-card:opacity-100" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">{children}</span>
    </RadioPrimitive.Root>
  );
}

export { RadioGroupPrimitive, RadioPrimitive };
