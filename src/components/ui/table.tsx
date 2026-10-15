import type * as React from "react";
import { cn } from "@/lib/utils";

/** A real <table> in a horizontally scrollable frame, so a phone never scrolls the page sideways. */
export function Table({ className, frameClassName, ...props }: React.ComponentProps<"table"> & { frameClassName?: string }): React.ReactElement {
  return (
    <div className={cn("relative w-full overflow-x-auto rounded-xl border bg-card", frameClassName)} data-slot="table-frame">
      <table className={cn("w-full caption-bottom text-sm", className)} data-slot="table" {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.ComponentProps<"thead">): React.ReactElement {
  return <thead className={cn("bg-muted/50 [&_tr]:border-b", className)} data-slot="table-header" {...props} />;
}

export function TableBody({ className, ...props }: React.ComponentProps<"tbody">): React.ReactElement {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} data-slot="table-body" {...props} />;
}

export function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">): React.ReactElement {
  return <tfoot className={cn("border-t bg-muted/50 font-medium", className)} data-slot="table-footer" {...props} />;
}

export function TableRow({ className, ...props }: React.ComponentProps<"tr">): React.ReactElement {
  return <tr className={cn("border-b transition-colors hover:bg-accent/40 data-[state=selected]:bg-accent", className)} data-slot="table-row" {...props} />;
}

export function TableHead({ className, ...props }: React.ComponentProps<"th">): React.ReactElement {
  return (
    <th
      className={cn("h-9 whitespace-nowrap px-3 text-start align-middle font-medium text-muted-foreground text-xs", className)}
      data-slot="table-head"
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.ComponentProps<"td">): React.ReactElement {
  return <td className={cn("whitespace-nowrap px-3 py-2.5 align-middle tabular-nums", className)} data-slot="table-cell" {...props} />;
}

export function TableCaption({ className, ...props }: React.ComponentProps<"caption">): React.ReactElement {
  return <caption className={cn("py-3 text-muted-foreground text-xs", className)} data-slot="table-caption" {...props} />;
}
