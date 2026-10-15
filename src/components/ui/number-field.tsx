"use client";

import { NumberField as NumberFieldPrimitive } from "@base-ui/react/number-field";
import { MinusIcon, PlusIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A number input with − and + buttons. Base UI owns the arithmetic: arrow
 * keys step, Shift steps by `largeStep`, min/max clamp, and `format` prints
 * the value in the locale (₹ with Indian digit grouping, a % sign).
 */

export function NumberField({ className, ...props }: NumberFieldPrimitive.Root.Props): React.ReactElement {
  return <NumberFieldPrimitive.Root className={cn("flex flex-col items-start gap-1.5", className)} data-slot="number-field" {...props} />;
}

export function NumberFieldGroup({ className, ...props }: NumberFieldPrimitive.Group.Props): React.ReactElement {
  return (
    <NumberFieldPrimitive.Group
      className={cn(
        "relative flex h-8 w-full items-stretch overflow-hidden rounded-lg border border-input bg-popover shadow-xs/5 transition-[box-shadow,border-color] duration-150 ease-out-quart focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/32 data-disabled:opacity-64 data-invalid:border-destructive/60 dark:bg-input/32",
        className,
      )}
      data-slot="number-field-group"
      {...props}
    />
  );
}

const stepper =
  "flex w-8 shrink-0 cursor-pointer items-center justify-center text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent data-disabled:pointer-events-none data-disabled:opacity-40 [&_svg]:size-3.5";

export function NumberFieldDecrement({ className, ...props }: NumberFieldPrimitive.Decrement.Props): React.ReactElement {
  return (
    <NumberFieldPrimitive.Decrement className={cn(stepper, "border-e", className)} data-slot="number-field-decrement" {...props}>
      <MinusIcon aria-hidden="true" />
    </NumberFieldPrimitive.Decrement>
  );
}

export function NumberFieldIncrement({ className, ...props }: NumberFieldPrimitive.Increment.Props): React.ReactElement {
  return (
    <NumberFieldPrimitive.Increment className={cn(stepper, "border-s", className)} data-slot="number-field-increment" {...props}>
      <PlusIcon aria-hidden="true" />
    </NumberFieldPrimitive.Increment>
  );
}

export function NumberFieldInput({ className, ...props }: NumberFieldPrimitive.Input.Props): React.ReactElement {
  return (
    <NumberFieldPrimitive.Input
      className={cn("w-full min-w-0 flex-1 bg-transparent px-2.5 text-center text-base tabular-nums outline-none sm:text-sm", className)}
      data-slot="number-field-input"
      {...props}
    />
  );
}

export { NumberFieldPrimitive };
