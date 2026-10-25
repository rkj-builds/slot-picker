"use client";

import { BlocksIcon, BookOpenIcon, EllipsisIcon, LandPlotIcon, LayoutGridIcon, ShapesIcon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import { DemoControl } from "@/app/demo-control";
import { type Route, hrefFor } from "@/app/router";
import { type Theme, ThemeToggle, useTheme } from "@/app/theme";
import { Button } from "@/components/ui/button";
import { Menu, MenuGroup, MenuGroupLabel, MenuLinkItem, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { useMediaQuery } from "@/hooks/use-media-query";
import { segmentedControlItemVariants, segmentedControlRootClassName } from "@/lib/segmented-control";
import { cn } from "@/lib/utils";

/** The two product surfaces: always in the bar. */
const PRIMARY = [
  { path: "/book", label: "Book", icon: BookOpenIcon },
  { path: "/desk", label: "Desk", icon: LayoutGridIcon },
] as const;
/** The reviewer's pages: in the bar on a wide screen, in the More menu on a narrow one. */
const SECONDARY = [
  { path: "/components", label: "Components", icon: ShapesIcon },
  { path: "/primitives", label: "Primitives", icon: BlocksIcon },
] as const;

const linkClassName = segmentedControlItemVariants({ size: "sm", state: "current" });

const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "system", label: "Match the system" },
  { value: "dark", label: "Dark" },
];

/**
 * The demo's own chrome: a thin bar that lets a reviewer jump between the
 * customer's side, the venue's side and the reference pages. It is not part
 * of either product surface, so it stays quiet. The sections are coss's
 * segmented navigation links (particle p-navigation-2): links with
 * `aria-current="page"`, not tabs.
 *
 * Wide (800 px and up): every section and the theme switch in the bar.
 * Narrow: Book and Desk stay in the bar; Components, Primitives and the
 * theme move into a coss Menu, so nothing collides down to 320 px.
 */
export function DemoBar({ route }: { route: Route }): React.ReactElement {
  const section = `/${route.segments[0] ?? ""}`;
  const wide = useMediaQuery("md");
  const [theme, setTheme] = useTheme();
  const links = wide ? [...PRIMARY, ...SECONDARY] : PRIMARY;
  const secondaryCurrent = SECONDARY.find((l) => l.path === section);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/88 backdrop-blur supports-[backdrop-filter]:bg-background/72" data-slot="demo-bar">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center gap-2 px-4 sm:gap-4">
        <Button aria-label="Project 831, home" className="shrink-0 px-1 font-semibold" render={<Anchor href="#/" />} variant="ghost">
          <LogoMark />
          <span aria-hidden="true" className="hidden lg:inline">
            Project 831
          </span>
        </Button>
        <nav aria-label="Demo sections" className="min-w-0 flex-1">
          <div className={segmentedControlRootClassName}>
            {links.map(({ path, label, icon: Icon }) => (
              <Anchor aria-current={section === path ? "page" : undefined} className={linkClassName} href={hrefFor(path)} key={path}>
                <Icon aria-hidden="true" className="max-[400px]:hidden" />
                {label}
              </Anchor>
            ))}
          </div>
        </nav>
        <DemoControl />
        {wide ? (
          <ThemeToggle onValueChange={setTheme} value={theme} />
        ) : (
          <Menu>
            <MenuTrigger
              render={
                <Button
                  aria-label={secondaryCurrent ? `More: other pages and theme. Current page: ${secondaryCurrent.label}` : "More: other pages and theme"}
                  className={cn("shrink-0", secondaryCurrent && "bg-accent")}
                  size="icon"
                  variant="ghost"
                />
              }
            >
              <EllipsisIcon aria-hidden="true" />
            </MenuTrigger>
            <MenuPopup align="end">
              <MenuGroup>
                <MenuGroupLabel>Pages</MenuGroupLabel>
                {SECONDARY.map(({ path, label, icon: Icon }) => (
                  <MenuLinkItem aria-current={section === path ? "page" : undefined} href={hrefFor(path)} key={path}>
                    <Icon aria-hidden="true" />
                    {label}
                  </MenuLinkItem>
                ))}
              </MenuGroup>
              <MenuSeparator />
              <MenuGroup>
                <MenuGroupLabel>Theme</MenuGroupLabel>
                <MenuRadioGroup onValueChange={(v) => setTheme(v as Theme)} value={theme}>
                  {THEMES.map(({ value, label }) => (
                    <MenuRadioItem key={value} value={value}>
                      {label}
                    </MenuRadioItem>
                  ))}
                </MenuRadioGroup>
              </MenuGroup>
            </MenuPopup>
          </Menu>
        )}
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
