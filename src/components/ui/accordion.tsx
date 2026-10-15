"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDownIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

export function Accordion({ className, ...props }: AccordionPrimitive.Root.Props): React.ReactElement {
  return <AccordionPrimitive.Root className={cn("flex w-full flex-col", className)} data-slot="accordion" {...props} />;
}

export function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props): React.ReactElement {
  return <AccordionPrimitive.Item className={cn("border-b last:border-b-0", className)} data-slot="accordion-item" {...props} />;
}

export function AccordionTrigger({ className, children, ...props }: AccordionPrimitive.Trigger.Props): React.ReactElement {
  return (
    <AccordionPrimitive.Header className="flex" data-slot="accordion-header">
      <AccordionPrimitive.Trigger
        className={cn(
          "group/accordion flex flex-1 cursor-pointer items-center justify-between gap-4 rounded-md py-3 text-start font-medium text-sm outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring data-disabled:pointer-events-none data-disabled:opacity-64",
          className,
        )}
        data-slot="accordion-trigger"
        {...props}
      >
        {children}
        <ChevronDownIcon
          aria-hidden="true"
          className="size-4 shrink-0 opacity-72 transition-transform duration-200 ease-out-quart group-data-panel-open/accordion:rotate-180"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionPanel({ className, children, ...props }: AccordionPrimitive.Panel.Props): React.ReactElement {
  return (
    <AccordionPrimitive.Panel
      className="h-(--accordion-panel-height) overflow-hidden transition-[height] duration-200 ease-out-quart data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none"
      data-slot="accordion-panel"
      {...props}
    >
      <div className={cn("pb-3 text-muted-foreground text-sm", className)}>{children}</div>
    </AccordionPrimitive.Panel>
  );
}

export { AccordionPrimitive };
