import { DirectionProvider } from "@base-ui/react/direction-provider";
import type * as React from "react";
import { cn } from "@/lib/utils";

export type Direction = "ltr" | "rtl";

/**
 * A preview frame that can run right-to-left on its own: Base UI reads the direction from
 * DirectionProvider, Tailwind's `rtl:` variants read it from the `dir` attribute. Both are set here.
 */
export function DirectionFrame({ dir, className, children, ...props }: React.ComponentProps<"div"> & { dir: Direction }): React.ReactElement {
  return (
    <DirectionProvider direction={dir}>
      <div className={cn("rounded-xl border border-border bg-background p-6", className)} data-slot="direction-frame" dir={dir} {...props}>
        {children}
      </div>
    </DirectionProvider>
  );
}
