"use client";

import { BookOpenIcon, LayoutGridIcon, ShapesIcon } from "lucide-react";
import * as React from "react";
import { type Route, hrefFor } from "@/app/router";
import { ThemeToggle } from "@/app/theme";
import { cn } from "@/lib/utils";

const LINKS = [
  { path: "/book", label: "Book", icon: BookOpenIcon },
  { path: "/desk", label: "Desk", icon: LayoutGridIcon },
  { path: "/components", label: "Components", icon: ShapesIcon },
] as const;

/**
 * The demo's own chrome: a thin bar that lets a reviewer jump between the
 * customer's side, the venue's side and the component gallery. It is not
 * part of either product surface, so it stays quiet.
 */
export function DemoBar({ route }: { route: Route }): React.ReactElement {
  const section = route.segments[0] ?? "";
  return (
    <header className="sticky top-0 z-40 border-b bg-background/88 backdrop-blur supports-[backdrop-filter]:bg-background/72" data-slot="demo-bar">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center gap-2 px-4 sm:gap-4">
        <a className="flex shrink-0 items-center gap-2 rounded-md font-semibold text-sm tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring" href="#/">
          <LogoMark />
          <span className="hidden sm:inline">Project 831</span>
        </a>
        <nav aria-label="Demo sections" className="min-w-0 flex-1">
          <ul className="flex items-center gap-0.5">
            {LINKS.map(({ path, label, icon: Icon }) => {
              const current = `/${section}` === path;
              return (
                <li key={path}>
                  <a
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-md px-2 font-medium text-muted-foreground text-sm outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:px-2.5 [&_svg]:size-4",
                      current && "bg-accent text-foreground",
                    )}
                    href={hrefFor(path)}
                  >
                    <Icon aria-hidden="true" className="hidden min-[400px]:block" />
                    {label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}

export function LogoMark({ className }: { className?: string }): React.ReactElement {
  // A court seen from above: two halves and the kitchen line.
  return (
    <svg aria-hidden="true" className={cn("size-6 shrink-0", className)} fill="none" viewBox="0 0 24 24">
      <rect className="fill-primary" height="22" rx="5" width="22" x="1" y="1" />
      <path className="stroke-primary-foreground" d="M6 6.5h12v11H6zM12 6.5v11M6 10h12M6 14h12" strokeLinecap="round" strokeWidth="1.25" />
    </svg>
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
