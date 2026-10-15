"use client";

import { Input as InputPrimitive } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The shared look for every text-like control: a soft inset border, a ring
 * on focus, and a red border when the surrounding Field is invalid.
 * Base UI's Input registers with Field, so validity and labels just work.
 */
export const inputVariants = cva(
  "w-full min-w-0 rounded-lg border border-input bg-popover text-foreground shadow-xs/5 outline-none transition-[box-shadow,border-color] duration-150 ease-out-quart placeholder:text-muted-foreground/72 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/32 aria-invalid:border-destructive/60 data-invalid:border-destructive/60 data-invalid:focus-visible:ring-destructive/24 data-disabled:opacity-64 disabled:opacity-64 dark:bg-input/32 [&::-webkit-search-cancel-button]:hidden",
  {
    defaultVariants: { size: "default" },
    variants: {
      size: {
        default: "h-8 px-2.5 text-base sm:text-sm",
        sm: "h-7 px-2 text-sm",
        lg: "h-10 px-3 text-base sm:text-sm",
      },
    },
  },
);

export function Input({
  className,
  size,
  ...props
}: Omit<InputPrimitive.Props, "size"> & VariantProps<typeof inputVariants>): React.ReactElement {
  return <InputPrimitive className={cn(inputVariants({ size }), className)} data-slot="input" {...props} />;
}

export { InputPrimitive };
