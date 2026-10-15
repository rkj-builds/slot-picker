"use client";

import { Field as FieldPrimitive } from "@base-ui/react/field";
import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Label, control, description and error, wired together by Base UI: the
 * label points at the control, the description and error are announced with
 * it, and `data-invalid` flows down so every part can style the failure.
 */

export function Field({ className, ...props }: FieldPrimitive.Root.Props): React.ReactElement {
  return <FieldPrimitive.Root className={cn("flex flex-col items-start gap-1.5", className)} data-slot="field" {...props} />;
}

export function FieldLabel({ className, ...props }: FieldPrimitive.Label.Props): React.ReactElement {
  return (
    <FieldPrimitive.Label
      className={cn("inline-flex items-center gap-2 font-medium text-sm data-disabled:opacity-64", className)}
      data-slot="field-label"
      {...props}
    />
  );
}

export function FieldDescription({ className, ...props }: FieldPrimitive.Description.Props): React.ReactElement {
  return (
    <FieldPrimitive.Description className={cn("text-muted-foreground text-xs", className)} data-slot="field-description" {...props} />
  );
}

export function FieldError({ className, ...props }: FieldPrimitive.Error.Props): React.ReactElement {
  return (
    <FieldPrimitive.Error
      className={cn("animate-fade-in text-destructive-foreground text-xs", className)}
      data-slot="field-error"
      {...props}
    />
  );
}

export const FieldControl: typeof FieldPrimitive.Control = FieldPrimitive.Control;
export const FieldValidity: typeof FieldPrimitive.Validity = FieldPrimitive.Validity;

export { FieldPrimitive };
