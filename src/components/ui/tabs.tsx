"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Tabs with a sliding indicator. Two looks: `default` is a pill strip on a
 * muted track (the segmented look), `underline` is a quiet line for page-level
 * navigation. Base UI owns the arrow-key model and the tab/panel wiring.
 */

type Variant = "default" | "underline";

const TabsVariantContext = React.createContext<Variant>("default");

export function Tabs({ className, ...props }: TabsPrimitive.Root.Props): React.ReactElement {
  return <TabsPrimitive.Root className={cn("flex flex-col gap-3", className)} data-slot="tabs" {...props} />;
}

export function TabsList({
  className,
  variant = "default",
  children,
  ...props
}: TabsPrimitive.List.Props & { variant?: Variant }): React.ReactElement {
  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.List
        className={cn(
          "relative z-0 flex w-fit items-center gap-x-0.5 text-muted-foreground",
          variant === "default" ? "rounded-lg bg-muted p-0.5" : "gap-x-1 border-b",
          className,
        )}
        data-slot="tabs-list"
        data-variant={variant}
        {...props}
      >
        {children}
        <TabsPrimitive.Indicator
          className={cn(
            "absolute -z-1 w-(--active-tab-width) translate-x-(--active-tab-left) transition-[width,translate] duration-200 ease-out-quart motion-reduce:transition-none",
            variant === "default"
              ? "top-0.5 h-[calc(100%-0.25rem)] rounded-md bg-background shadow-sm/5 dark:bg-input"
              : "-bottom-px h-0.5 bg-primary",
          )}
          data-slot="tabs-indicator"
        />
      </TabsPrimitive.List>
    </TabsVariantContext.Provider>
  );
}

export function TabsTab({ className, ...props }: TabsPrimitive.Tab.Props): React.ReactElement {
  const variant = React.useContext(TabsVariantContext);
  return (
    <TabsPrimitive.Tab
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium text-sm outline-none transition-colors duration-150 ease-out-quart hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-active:text-foreground data-disabled:pointer-events-none data-disabled:opacity-64 [&_svg]:size-4 [&_svg]:shrink-0",
        variant === "default" ? "h-7.5 px-3" : "h-9 px-2.5",
        className,
      )}
      data-slot="tabs-tab"
      {...props}
    />
  );
}

export function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props): React.ReactElement {
  return <TabsPrimitive.Panel className={cn("outline-none", className)} data-slot="tabs-panel" {...props} />;
}

export { TabsPrimitive };
