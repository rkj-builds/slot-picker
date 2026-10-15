import { ChevronRightIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

export function Breadcrumb(props: React.ComponentProps<"nav">): React.ReactElement {
  return <nav aria-label="Breadcrumb" data-slot="breadcrumb" {...props} />;
}

export function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">): React.ReactElement {
  return <ol className={cn("flex flex-wrap items-center gap-1.5 text-muted-foreground text-sm", className)} data-slot="breadcrumb-list" {...props} />;
}

export function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">): React.ReactElement {
  return <li className={cn("inline-flex items-center gap-1.5", className)} data-slot="breadcrumb-item" {...props} />;
}

export function BreadcrumbLink({ className, children, ...props }: React.ComponentProps<"a">): React.ReactElement {
  return (
    <a
      className={cn("rounded-sm outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring", className)}
      data-slot="breadcrumb-link"
      {...props}
    >
      {children}
    </a>
  );
}

export function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">): React.ReactElement {
  return <span aria-current="page" className={cn("font-medium text-foreground", className)} data-slot="breadcrumb-page" {...props} />;
}

export function BreadcrumbSeparator({ className, ...props }: React.ComponentProps<"li">): React.ReactElement {
  return (
    <li aria-hidden="true" className={cn("[&_svg]:size-3.5", className)} data-slot="breadcrumb-separator" role="presentation" {...props}>
      <ChevronRightIcon />
    </li>
  );
}
