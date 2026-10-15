"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const Menu: typeof MenuPrimitive.Root = MenuPrimitive.Root;

export function MenuTrigger(props: MenuPrimitive.Trigger.Props): React.ReactElement {
  return <MenuPrimitive.Trigger data-slot="menu-trigger" {...props} />;
}

export function MenuPopup({
  className,
  children,
  side = "bottom",
  align = "end",
  sideOffset = 4,
  ...props
}: MenuPrimitive.Popup.Props & {
  side?: MenuPrimitive.Positioner.Props["side"];
  align?: MenuPrimitive.Positioner.Props["align"];
  sideOffset?: MenuPrimitive.Positioner.Props["sideOffset"];
}): React.ReactElement {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        align={align}
        className="z-50"
        collisionPadding={8}
        data-slot="menu-positioner"
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          className={cn(
            "min-w-44 origin-(--transform-origin) rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg/5 outline-none transition-[opacity,scale] duration-150 ease-out-quart data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0 motion-reduce:transition-none",
            className,
          )}
          data-slot="menu-popup"
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

export const menuItemVariants = cva(
  "flex min-h-8 cursor-default select-none items-center gap-2 rounded-md px-2 py-1 text-sm outline-none data-disabled:pointer-events-none data-disabled:opacity-64 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:opacity-80",
  {
    defaultVariants: { variant: "default" },
    variants: {
      variant: {
        default: "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        destructive: "text-destructive-foreground data-highlighted:bg-destructive/8",
      },
    },
  },
);

export function MenuItem({
  className,
  variant,
  ...props
}: MenuPrimitive.Item.Props & VariantProps<typeof menuItemVariants>): React.ReactElement {
  return (
    <MenuPrimitive.Item className={cn(menuItemVariants({ variant }), className)} data-slot="menu-item" data-variant={variant ?? "default"} {...props} />
  );
}

export function MenuGroup(props: MenuPrimitive.Group.Props): React.ReactElement {
  return <MenuPrimitive.Group data-slot="menu-group" {...props} />;
}

export function MenuGroupLabel({ className, ...props }: MenuPrimitive.GroupLabel.Props): React.ReactElement {
  return (
    <MenuPrimitive.GroupLabel
      className={cn("px-2 py-1.5 font-medium text-muted-foreground text-xs", className)}
      data-slot="menu-group-label"
      {...props}
    />
  );
}

export function MenuSeparator({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Separator>): React.ReactElement {
  return <MenuPrimitive.Separator className={cn("mx-2 my-1 h-px bg-border", className)} data-slot="menu-separator" {...props} />;
}

export { MenuPrimitive };
