"use client";

import { Field as FieldPrimitive } from "@base-ui/react/field";
import type * as React from "react";
import { inputVariants } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** A multi-line input that registers with the surrounding Field like Input does. */
export function Textarea({ className, ...props }: React.ComponentProps<"textarea">): React.ReactElement {
  return (
    <FieldPrimitive.Control
      className={cn(inputVariants(), "h-auto min-h-18 resize-y py-2", className)}
      data-slot="textarea"
      render={<textarea {...props} />}
    />
  );
}
