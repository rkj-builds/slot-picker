"use client";

import { BookOpenIcon, LandPlotIcon, LayoutGridIcon, ShapesIcon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import { type Route, hrefFor } from "@/app/router";
import { ThemeToggle } from "@/app/theme";
import { Button } from "@/components/ui/button";
import { segmentedControlItemVariants, segmentedControlRootClassName } from "@/lib/segmented-control";
import { cn } from "@/lib/utils";

const LINKS = [
  { path: "/book", label: "Book", icon: BookOpenIcon },
  { path: "/desk", label: "Desk", icon: LayoutGridIcon },
  { path: "/components", label: "Components", icon: ShapesIcon },
] as const;

const linkClassName = segmentedControlItemVariants({ size: "sm", state: "current" });

/**
 * The demo's own chrome: a thin bar that lets a reviewer jump between the
 * customer's side, the venue's side and the component gallery. It is not
 * part of either product surface, so it stays quiet. The sections are
 * coss's segmented navigation links (particle p-navigation-2): links with
 * `aria-current="page"`, not tabs.
 */
export function DemoBar({ route }: { route: Route }): React.ReactElement {
  const section = route.segments[0] ?? "";
  return (
    <header className="sticky top-0 z-40 border-b bg-background/88 backdrop-blur supports-[backdrop-filter]:bg-background/72" data-slot="demo-bar">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center gap-2 px-4 sm:gap-4">
        <Button className="shrink-0 px-1 font-semibold tracking-tight" render={<Anchor href="#/" />} variant="ghost">
          <LogoMark />
          <span className="hidden sm:inline">Project 831</span>
        </Button>
        <nav aria-label="Demo sections" className="min-w-0 flex-1">
          <div className={segmentedControlRootClassName}>
            {LINKS.map(({ path, label, icon: Icon }) => (
              <Anchor aria-current={`/${section}` === path ? "page" : undefined} className={linkClassName} href={hrefFor(path)} key={path}>
                <Icon aria-hidden="true" className="max-[400px]:hidden" />
                {label}
              </Anchor>
            ))}
          </div>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}

/** The venue's mark: a court seen from above, as a lucide icon on the primary colour. */
export function LogoMark({ className }: { className?: string }): React.ReactElement {
  return (
    <span aria-hidden="true" className={cn("flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground", className)}>
      <LandPlotIcon className="size-[62%] opacity-100" />
    </span>
  );
}

/** Move focus to the page's heading after navigation, so screen readers hear where they are. */
export function useFocusHeadingOnNavigate(key: string): void {
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    const heading = document.querySelector<HTMLElement>("main h1");
    if (heading) {
      if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }, [key]);
}
