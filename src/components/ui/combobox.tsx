"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";
import type * as React from "react";
import { inputVariants } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Type to filter a known list, then pick one. Base UI does the filtering,
 * the listbox semantics and the active-descendant highlighting; the input
 * keeps focus the whole time, so typing never stops working.
 */

export const Combobox: typeof ComboboxPrimitive.Root = ComboboxPrimitive.Root;

export function ComboboxInput({
  className,
  showClear = true,
  ...props
}: ComboboxPrimitive.Input.Props & { showClear?: boolean }): React.ReactElement {
  return (
    <ComboboxPrimitive.InputGroup className="relative w-full" data-slot="combobox-input-group">
      <ComboboxPrimitive.Input className={cn(inputVariants(), "pe-14", className)} data-slot="combobox-input" {...props} />
      <div className="absolute inset-y-0 end-1 flex items-center">
        {showClear && (
          <ComboboxPrimitive.Clear
            aria-label="Clear"
            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5"
            data-slot="combobox-clear"
          >
            <XIcon aria-hidden="true" />
          </ComboboxPrimitive.Clear>
        )}
        <ComboboxPrimitive.Trigger
          aria-label="Show options"
          className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5"
          data-slot="combobox-trigger"
        >
          <ChevronsUpDownIcon aria-hidden="true" />
        </ComboboxPrimitive.Trigger>
      </div>
    </ComboboxPrimitive.InputGroup>
  );
}

export function ComboboxPopup({
  className,
  children,
  sideOffset = 4,
  ...props
}: ComboboxPrimitive.Popup.Props & { sideOffset?: ComboboxPrimitive.Positioner.Props["sideOffset"] }): React.ReactElement {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner className="z-50" data-slot="combobox-positioner" sideOffset={sideOffset}>
        <ComboboxPrimitive.Popup
          className={cn(
            "w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) rounded-lg border bg-popover text-popover-foreground shadow-lg/5 transition-[opacity,scale] duration-150 ease-out-quart data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0 motion-reduce:transition-none",
            className,
          )}
          data-slot="combobox-popup"
          {...props}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

export function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.List
      className={cn("max-h-[min(18rem,var(--available-height))] scroll-py-1 overflow-y-auto overscroll-contain p-1 data-empty:p-0", className)}
      data-slot="combobox-list"
      {...props}
    />
  );
}

export function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.Item
      className={cn(
        "grid min-h-8 cursor-default grid-cols-[1rem_minmax(0,1fr)] items-center gap-2 rounded-md py-1 ps-2 pe-3 text-sm outline-none data-disabled:pointer-events-none data-disabled:opacity-64 data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        className,
      )}
      data-slot="combobox-item"
      {...props}
    >
      <ComboboxPrimitive.ItemIndicator className="col-start-1" data-slot="combobox-item-indicator">
        <CheckIcon aria-hidden="true" className="size-4" />
      </ComboboxPrimitive.ItemIndicator>
      <div className="col-start-2 min-w-0">{children}</div>
    </ComboboxPrimitive.Item>
  );
}

export function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.Empty
      className={cn("px-3 py-2.5 text-muted-foreground text-sm empty:m-0 empty:p-0", className)}
      data-slot="combobox-empty"
      {...props}
    />
  );
}

export { ComboboxPrimitive };
