import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const alertVariants = cva(
  "relative grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5 rounded-xl border px-4 py-3 text-sm has-[>svg]:grid-cols-[1rem_minmax(0,1fr)] [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:row-span-2",
  {
    defaultVariants: { variant: "default" },
    variants: {
      variant: {
        default: "bg-card text-card-foreground [&>svg]:text-muted-foreground",
        info: "border-info/24 bg-info/6 [&>svg]:text-info-foreground",
        success: "border-success/24 bg-success/6 [&>svg]:text-success-foreground",
        warning: "border-warning/32 bg-warning/8 [&>svg]:text-warning-foreground",
        error: "border-destructive/24 bg-destructive/6 [&>svg]:text-destructive-foreground",
      },
    },
  },
);

export function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>): React.ReactElement {
  return <div className={cn(alertVariants({ variant }), className)} data-slot="alert" data-variant={variant ?? "default"} {...props} />;
}

export function AlertTitle({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div className={cn("col-start-2 font-medium", className)} data-slot="alert-title" {...props} />;
}

export function AlertDescription({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div className={cn("col-start-2 text-muted-foreground", className)} data-slot="alert-description" {...props} />;
}
