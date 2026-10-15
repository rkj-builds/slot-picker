"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * One-of-many choice drawn as a pill strip. Semantically a radio group, so
 * arrow keys move between options and the chosen one is announced as checked.
 * Base UI's Radio Group owns the roving focus and the hidden input.
 */

export const segmentedControlItemVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent font-medium text-muted-foreground outline-2 outline-transparent transition-[outline-color,color,background-color] duration-150 ease-out-quart hover:text-foreground focus-visible:outline-ring data-checked:bg-background data-checked:text-foreground data-checked:shadow-sm/5 data-disabled:pointer-events-none data-disabled:opacity-64 dark:data-checked:bg-input [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    defaultVariants: { size: "default" },
    variants: {
      size: {
        default: "h-7.5 px-2.5 text-sm",
        lg: "h-8.5 px-3 text-sm",
        sm: "h-6.5 px-2 text-xs",
      },
    },
  },
);

type Size = NonNullable<VariantProps<typeof segmentedControlItemVariants>["size"]>;

const SegmentedControlContext = React.createContext<{ size: Size; fill: boolean }>({
  size: "default",
  fill: false,
});

export function SegmentedControl<Value>({
  className,
  size = "default",
  fill = false,
  ...props
}: RadioGroupPrimitive.Props<Value> & {
  size?: Size;
  /** Take the full width and give every item an equal share. */
  fill?: boolean;
}): React.ReactElement {
  return (
    <SegmentedControlContext.Provider value={{ size, fill }}>
      <RadioGroupPrimitive
        className={cn(
          "relative z-0 flex w-fit items-center justify-center gap-0.5 rounded-lg bg-muted p-0.5",
          fill && "w-full",
          className,
        )}
        data-fill={fill || undefined}
        data-size={size}
        data-slot="segmented-control"
        {...props}
      />
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
      className={cn(
        segmentedControlItemVariants({ size }),
        // A comfortable hit target on touch, without changing the visual height.
        "after:absolute after:inset-x-0 after:top-1/2 after:h-full after:min-h-6 after:-translate-y-1/2 pointer-coarse:after:min-h-11",
        fill && "min-w-0 flex-1 basis-0 px-1",
        className,
      )}
      data-slot="segmented-control-item"
      {...props}
    >
      {fill ? <span className="min-w-0 truncate">{children}</span> : children}
    </RadioPrimitive.Root>
  );
}

export { RadioGroupPrimitive, RadioPrimitive };
