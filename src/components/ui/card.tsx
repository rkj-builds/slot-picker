import type * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      className={cn("flex flex-col rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}
      data-slot="card"
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div className={cn("flex flex-col gap-1 p-5 pb-3", className)} data-slot="card-header" {...props} />;
}

export function CardTitle({ className, children, ...props }: React.ComponentProps<"h3">): React.ReactElement {
  return (
    <h3 className={cn("font-semibold text-base leading-tight tracking-tight", className)} data-slot="card-title" {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">): React.ReactElement {
  return <p className={cn("text-muted-foreground text-sm", className)} data-slot="card-description" {...props} />;
}

export function CardPanel({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div className={cn("px-5 pb-5", className)} data-slot="card-panel" {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 border-t px-5 py-3.5", className)} data-slot="card-footer" {...props} />
  );
}
