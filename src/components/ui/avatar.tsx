"use client";

import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import type * as React from "react";
import { cn } from "@/lib/utils";

export function Avatar({ className, ...props }: AvatarPrimitive.Root.Props): React.ReactElement {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "inline-flex size-8 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-muted align-middle font-medium text-xs",
        className,
      )}
      data-slot="avatar"
      {...props}
    />
  );
}

export function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props): React.ReactElement {
  return <AvatarPrimitive.Image className={cn("size-full object-cover", className)} data-slot="avatar-image" {...props} />;
}

export function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props): React.ReactElement {
  return (
    <AvatarPrimitive.Fallback
      className={cn("flex size-full items-center justify-center text-muted-foreground", className)}
      data-slot="avatar-fallback"
      {...props}
    />
  );
}

/** "Aarav Sharma" → "AS". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export { AvatarPrimitive };
