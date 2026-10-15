import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex h-5 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2 font-medium text-xs [&_svg]:size-3 [&_svg]:shrink-0",
  {
    defaultVariants: { variant: "default" },
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-input bg-transparent text-foreground",
        success: "border-success/24 bg-success/8 text-success-foreground",
        warning: "border-warning/32 bg-warning/10 text-warning-foreground",
        destructive: "border-destructive/24 bg-destructive/8 text-destructive-foreground",
        info: "border-info/24 bg-info/8 text-info-foreground",
      },
    },
  },
);

export interface BadgeProps extends useRender.ComponentProps<"span"> {
  variant?: VariantProps<typeof badgeVariants>["variant"];
}

export function Badge({ className, variant, render, ...props }: BadgeProps): React.ReactElement {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">({ className: cn(badgeVariants({ variant }), className), "data-slot": "badge" } as React.ComponentProps<"span">, props),
    render,
  });
}
