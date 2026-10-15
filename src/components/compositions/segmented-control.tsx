"use client";

import * as React from "react";
import { RadioGroupPrimitive, RadioPrimitive } from "@/components/ui/radio-group";
import {
  type SegmentedControlSize,
  segmentedControlItemVariants,
  segmentedControlRootClassName,
} from "@/lib/segmented-control";
import { cn } from "@/lib/utils";

/**
 * A one-of-many choice drawn as a pill strip, the way coss documents it
 * (skills/coss/references/segmented-control.md, particle p-radio-group-8):
 * coss's Radio Group primitives dressed with coss's `@coss/segmented-control`
 * recipe. Exactly one value always stays selected, so it is a radio group,
 * not a toggle group. Product additions: `fill` (equal-width items across
 * the row) and the generic `Value`.
 */

const SegmentedControlContext = React.createContext<{ size: SegmentedControlSize; fill: boolean }>({
  fill: false,
  size: "default",
});

export function SegmentedControl<Value>({
  className,
  size = "default",
  fill = false,
  children,
  ...props
}: RadioGroupPrimitive.Props<Value> & {
  size?: SegmentedControlSize;
  /** Take the full width and give every item an equal share. */
  fill?: boolean;
}): React.ReactElement {
  return (
    <SegmentedControlContext.Provider value={{ fill, size }}>
    <RadioGroupPrimitive
      className={cn(segmentedControlRootClassName, fill && "w-full", className)}
      data-fill={fill || undefined}
      data-size={size}
      data-slot="segmented-control"
      {...props}
    >
      {children}
    </RadioGroupPrimitive>
    </SegmentedControlContext.Provider>
  );
}

export function SegmentedControlItem<Value>({
  className,
  children,
  ...props
}: RadioPrimitive.Root.Props<Value>): React.ReactElement {
  const { size, fill } = React.useContext(SegmentedControlContext);
  return (
    <RadioPrimitive.Root
      className={segmentedControlItemVariants({
        className: cn(fill && "min-w-0 flex-1 basis-0", className),
        size,
        state: "checked",
      })}
      data-slot="segmented-control-item"
      {...props}
    >
      {fill ? <span className="min-w-0 truncate">{children}</span> : children}
    </RadioPrimitive.Root>
  );
}
