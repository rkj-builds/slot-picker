"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { toggleVariants } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

/**
 * A row of toggles sharing one value array. With `multiple`, any number can be
 * pressed (the prepay weekdays). Arrow keys move between items, as in a toolbar.
 */

type ToggleVariants = VariantProps<typeof toggleVariants>;
const ToggleGroupContext = React.createContext<ToggleVariants>({});

export function ToggleGroup<Value extends string>({
  className,
  size,
  variant,
  ...props
}: ToggleGroupPrimitive.Props<Value> & ToggleVariants): React.ReactElement {
  return (
    <ToggleGroupContext.Provider value={{ size, variant }}>
      <ToggleGroupPrimitive<Value> className={cn("flex flex-wrap items-center gap-1", className)} data-slot="toggle-group" {...props} />
    </ToggleGroupContext.Provider>
  );
}

export function ToggleGroupItem({ className, ...props }: TogglePrimitive.Props): React.ReactElement {
  const { size, variant } = React.useContext(ToggleGroupContext);
  return <TogglePrimitive className={cn(toggleVariants({ size, variant }), className)} data-slot="toggle-group-item" {...props} />;
}

export { ToggleGroupPrimitive };
