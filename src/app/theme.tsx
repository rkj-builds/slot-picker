"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import * as React from "react";
import { SegmentedControl, SegmentedControlItem } from "@/components/compositions/segmented-control";

export type Theme = "light" | "system" | "dark";
const THEME_KEY = "slot-picker:theme";

function readTheme(): Theme {
  const fromQuery = new URLSearchParams(window.location.search).get("theme");
  if (fromQuery === "light" || fromQuery === "dark") return fromQuery;
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* storage may be blocked */
  }
  return "system";
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = React.useState<Theme>(readTheme);
  React.useEffect(() => {
    // coss themes with a `.dark` class on <html>; "system" follows the OS live.
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (): void => {
      root.classList.toggle("dark", theme === "dark" || (theme === "system" && media.matches));
    };
    apply();
    media.addEventListener("change", apply);
    try {
      if (theme === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* storage may be blocked */
    }
    return () => {
      media.removeEventListener("change", apply);
    };
  }, [theme]);
  return [theme, setTheme];
}

export function ThemeToggle(): React.ReactElement {
  const [theme, setTheme] = useTheme();
  return (
    <SegmentedControl<Theme> aria-label="Theme" onValueChange={setTheme} size="sm" value={theme}>
      <SegmentedControlItem<Theme> aria-label="Light theme" value="light">
        <SunIcon aria-hidden="true" />
      </SegmentedControlItem>
      <SegmentedControlItem<Theme> aria-label="Follow the system theme" value="system">
        <MonitorIcon aria-hidden="true" />
      </SegmentedControlItem>
      <SegmentedControlItem<Theme> aria-label="Dark theme" value="dark">
        <MoonIcon aria-hidden="true" />
      </SegmentedControlItem>
    </SegmentedControl>
  );
}
