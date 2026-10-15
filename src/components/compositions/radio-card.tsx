import type * as React from "react";
import { Label } from "@/components/ui/label";
import { Radio } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

/**
 * A whole card that picks one option: coss's own card-radio pattern
 * (particle p-radio-group-4), a coss `Label` wrapping a coss `Radio` and the
 * option's text, so the card is the click target and the radio keeps Base
 * UI's roving focus. Use inside a coss `RadioGroup`.
 */
export function RadioCard({
  value,
  disabled,
  className,
  children,
}: {
  value: unknown;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Label
      className={cn(
        "flex w-full items-start gap-2 rounded-lg border p-3 font-normal hover:bg-accent/50 has-data-checked:border-primary/48 has-data-checked:bg-accent/50 has-data-disabled:pointer-events-none has-data-disabled:opacity-64",
        className,
      )}
      data-slot="radio-card"
    >
      <Radio disabled={disabled} value={value} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">{children}</span>
    </Label>
  );
}
