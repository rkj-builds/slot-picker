import { CheckIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A numbered list of steps. The current step carries `aria-current="step"`;
 * finished steps are coss Buttons, so a person can go back to any of them, and
 * steps ahead are plain text, because skipping forward is not allowed.
 */

export type StepState = "complete" | "current" | "upcoming";

export function Stepper({ className, ...props }: React.ComponentProps<"ol">): React.ReactElement {
  return <ol className={cn("flex w-full items-center gap-1", className)} data-slot="stepper" {...props} />;
}

export function StepperItem({
  className,
  state,
  index,
  label,
  onSelect,
  ...props
}: Omit<React.ComponentProps<"li">, "onSelect"> & {
  state: StepState;
  index: number;
  label: string;
  /** Only finished steps are navigable. */
  onSelect?: () => void;
}): React.ReactElement {
  const marker = (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full border font-medium text-xs tabular-nums transition-colors duration-150 [&_svg]:size-3.5",
        state === "complete" && "border-primary bg-primary text-primary-foreground",
        state === "current" && "border-primary text-foreground ring-2 ring-primary/16",
        state === "upcoming" && "border-input text-muted-foreground",
      )}
    >
      {state === "complete" ? <CheckIcon strokeWidth={3} /> : index + 1}
    </span>
  );
  const text = (
    <span className={cn("hidden truncate text-sm sm:inline", state === "upcoming" ? "text-muted-foreground" : "font-medium")}>{label}</span>
  );
  return (
    <li
      aria-current={state === "current" ? "step" : undefined}
      className={cn("flex min-w-0 flex-1 items-center gap-2 after:h-px after:min-w-2 after:flex-1 after:bg-border last:flex-none last:after:hidden", className)}
      data-slot="stepper-item"
      data-state={state}
      {...props}
    >
      {state === "complete" && onSelect ? (
        <Button
          aria-label={`Step ${index + 1}, ${label}, done. Go back to this step`}
          className="h-auto min-w-0 gap-2 rounded-full px-0 py-0 font-normal before:rounded-full hover:bg-transparent sm:h-auto"
          onClick={onSelect}
          variant="ghost"
        >
          {marker}
          {text}
        </Button>
      ) : (
        <span className="flex min-w-0 items-center gap-2">
          <span className="sr-only">{`Step ${index + 1}, ${label}${state === "current" ? ", current" : ""}`}</span>
          {marker}
          <span aria-hidden="true" className="contents">{text}</span>
        </span>
      )}
    </li>
  );
}
