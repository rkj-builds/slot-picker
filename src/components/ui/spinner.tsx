import { LoaderCircleIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

export function Spinner({ className, ...props }: React.ComponentProps<"svg">): React.ReactElement {
  return (
    <LoaderCircleIcon
      aria-hidden="true"
      className={cn("size-4 animate-spin motion-reduce:animate-none", className)}
      data-slot="spinner"
      {...props}
    />
  );
}
