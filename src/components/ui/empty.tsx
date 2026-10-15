import type * as React from "react";
import { cn } from "@/lib/utils";

export function Empty({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-4 text-balance px-6 py-10 text-center",
        className,
      )}
      data-slot="empty"
      {...props}
    />
  );
}

export function EmptyMedia({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      className={cn(
        "flex size-9 items-center justify-center rounded-md border bg-card text-muted-foreground shadow-sm/5 [&_svg]:size-4.5",
        className,
      )}
      data-slot="empty-media"
      {...props}
    />
  );
}

export function EmptyTitle({ className, ...props }: React.ComponentProps<"p">): React.ReactElement {
  return <p className={cn("font-medium text-sm", className)} data-slot="empty-title" {...props} />;
}

export function EmptyDescription({ className, ...props }: React.ComponentProps<"p">): React.ReactElement {
  return (
    <p className={cn("text-muted-foreground text-sm", className)} data-slot="empty-description" {...props} />
  );
}

export function EmptyContent({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-2", className)} data-slot="empty-content" {...props} />
  );
}
