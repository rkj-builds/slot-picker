"use client";

import type * as React from "react";
import { Anchor } from "@/app/anchor";
import { Badge } from "@/components/ui/badge";
import { segmentedControlItemVariants, segmentedControlRootClassName } from "@/lib/segmented-control";
import { cn } from "@/lib/utils";

export interface LinkTab {
  href: string;
  label: string;
  current: boolean;
  /** A number beside the label; `countLabel` says what it counts to a screen reader ("3 waiting"). */
  count?: number;
  countLabel?: string;
}

/**
 * Tabs that are links (coss particle p-navigation-1): each tab is its own
 * URL, so a tab can be shared, reloaded and reached with Back. Drawn with the
 * segmented-control recipe's "current" state; a link marks itself with
 * aria-current="page" rather than role="tab", since activating it navigates.
 * Scrolls sideways on a phone instead of wrapping.
 */
export function LinkTabs({ label, tabs, className }: { label: string; tabs: readonly LinkTab[]; className?: string }): React.ReactElement {
  return (
    <nav aria-label={label} className={cn("-mx-1 max-w-full overflow-x-auto px-1 py-0.5", className)}>
      <ul className={segmentedControlRootClassName}>
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Anchor aria-current={tab.current ? "page" : undefined} className={segmentedControlItemVariants({ state: "current" })} href={tab.href}>
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <>
                  <Badge aria-hidden="true" className="tabular-nums" size="sm" variant={tab.current ? "default" : "outline"}>
                    {tab.count}
                  </Badge>
                  <span className="sr-only">, {tab.countLabel ?? tab.count}</span>
                </>
              )}
            </Anchor>
          </li>
        ))}
      </ul>
    </nav>
  );
}
