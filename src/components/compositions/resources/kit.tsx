import type * as React from "react";
import { cn } from "@/lib/utils";

/** The account's mark: its own image, or its initial on a quiet square, as Cal.com draws an avatar without a photo. */
export function VenueMark({ venue, className }: { venue: { name: string; mark?: string }; className?: string }): React.ReactElement {
  return venue.mark ? (
    <img alt="" className={cn("size-6 shrink-0 rounded-md object-cover", className)} height={24} src={venue.mark} width={24} />
  ) : (
    <span aria-hidden="true" className={cn("flex size-6 shrink-0 items-center justify-center rounded-md bg-muted font-medium text-muted-foreground text-xs", className)}>
      {venue.name.slice(0, 1)}
    </span>
  );
}

/** A screen's frame: padding and one rhythm between its sections. */
export function Pane({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div className={cn("flex flex-1 flex-col gap-5 p-4 @md/pane:p-6", className)} data-slot="resources-pane" {...props} />;
}

/**
 * How a Cal.com page opens: the title and its one line on the left, the
 * page's controls on the right, in one row that wraps on a phone.
 */
export function ScreenHeader({ title, line, actions, back }: { title: React.ReactNode; line?: React.ReactNode; actions?: React.ReactNode; back?: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex flex-col gap-2" data-slot="resources-header">
      {back}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        {/* The words give way before the controls wrap: the block shrinks, the line wraps inside it. */}
        <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
          <h2 className="font-semibold text-lg leading-tight">{title}</h2>
          {line && <p className="max-w-prose text-pretty text-muted-foreground text-sm">{line}</p>}
        </div>
        {actions && <div className="ms-auto flex flex-wrap items-center justify-end gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/**
 * The settings nav of a Cal.com editor: groups of pages down the left. Only
 * the pages this proposal draws are live; the rest are Cal.com's own, shown
 * so the new page sits where it would.
 */
export function SettingsNav<Page extends string>({
  label,
  groups,
  value,
  onValueChange,
}: {
  label: string;
  groups: readonly { title: string; pages: readonly { value?: Page; label: string; isNew?: boolean }[] }[];
  value: Page;
  onValueChange: (page: Page) => void;
}): React.ReactElement {
  return (
    // A group, not a landmark: the same editor can sit twice on a docs page, and landmarks must be unique.
    <div aria-label={label} className="flex flex-col gap-4 @2xl/pane:w-44 @2xl/pane:shrink-0" data-slot="settings-nav" role="group">
      {groups.map((group) => (
        <div className="flex flex-col gap-1" key={group.title}>
          <span className="px-2 font-medium text-muted-foreground text-xs">{group.title}</span>
          <ul className="flex flex-wrap gap-1 @2xl/pane:flex-col">
            {group.pages.map((page) => {
              const target = page.value;
              const active = target !== undefined && target === value;
              return (
                <li key={page.label}>
                  <button
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "bg-accent font-medium text-foreground" : "text-foreground hover:bg-accent",
                      target === undefined && "pointer-events-none opacity-50",
                    )}
                    disabled={target === undefined}
                    onClick={target === undefined ? undefined : () => onValueChange(target)}
                    title={target === undefined ? "Cal.com's own page; not part of this proposal" : undefined}
                    type="button"
                  >
                    <span className="min-w-0 truncate">{page.label}</span>
                    {page.isNew && <span className="ms-auto rounded-sm bg-success/8 px-1 font-medium text-[.625rem] text-success-foreground leading-4 dark:bg-success/16">New</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
