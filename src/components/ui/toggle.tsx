"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const toggleVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border font-medium text-sm outline-none transition-[background-color,border-color,color,box-shadow] duration-150 ease-out-quart pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-disabled:pointer-events-none data-disabled:opacity-64 data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:hover:bg-primary/90 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    defaultVariants: { size: "default", variant: "outline" },
    variants: {
      size: {
        default: "h-8 min-w-8 px-2.5",
        sm: "h-7 min-w-7 px-2 text-xs",
      },
      variant: {
        outline: "border-input bg-popover shadow-xs/5 dark:bg-input/32",
        ghost: "border-transparent",
      },
    },
  },
);

export function Toggle({
  className,
  size,
  variant,
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>): React.ReactElement {
  return <TogglePrimitive className={cn(toggleVariants({ size, variant }), className)} data-slot="toggle" {...props} />;
}

export { TogglePrimitive };
