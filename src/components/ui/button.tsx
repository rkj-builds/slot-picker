"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export const buttonVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-medium text-sm outline-none transition-[background-color,box-shadow,color] duration-150 ease-out-quart pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-64 data-loading:text-transparent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    defaultVariants: { size: "default", variant: "default" },
    variants: {
      size: {
        default: "h-8 px-3",
        sm: "h-7 gap-1.5 px-2.5 text-xs",
        lg: "h-10 px-4 text-base sm:text-sm",
        icon: "size-8",
        "icon-sm": "size-7",
      },
      variant: {
        default: "border-primary bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        outline:
          "border-input bg-popover text-foreground shadow-xs/5 hover:bg-accent dark:bg-input/32 dark:hover:bg-input/64",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:hover:bg-input/64",
        destructive:
          "border-destructive bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/60",
        "destructive-outline":
          "border-input bg-popover text-destructive-foreground shadow-xs/5 hover:border-destructive/32 hover:bg-destructive/4 dark:bg-input/32",
        ghost: "border-transparent text-foreground hover:bg-accent",
        link: "h-auto border-transparent px-0 text-foreground underline-offset-4 hover:underline",
      },
    },
  },
);

export interface ButtonProps extends useRender.ComponentProps<"button"> {
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  render,
  children,
  loading = false,
  disabled: disabledProp,
  ...props
}: ButtonProps): React.ReactElement {
  const disabled = Boolean(loading || disabledProp);
  const defaultProps = {
    children: (
      <>
        {children}
        {loading && <Spinner className="absolute" data-slot="button-loading-indicator" />}
      </>
    ),
    className: cn(buttonVariants({ size, variant }), className),
    "data-loading": loading || undefined,
    "data-slot": "button",
    disabled,
    type: render ? undefined : ("button" as const),
  };
  return useRender({ defaultTagName: "button", props: mergeProps<"button">(defaultProps, props), render });
}
