import { ActivityIcon, BellIcon, BuildingIcon, CalendarCogIcon } from "lucide-react";
import type * as React from "react";

export type SettingsPage = "rules" | "general" | "notifications" | "activity";

export interface SettingsPageDef {
  id: SettingsPage;
  label: string;
  line: string;
  path: string;
  icon: React.ComponentType<{ "aria-hidden"?: "true"; className?: string }>;
}

/**
 * The settings area's pages, each a URL: #/desk/settings is Booking rules,
 * then /general, /notifications, /activity. The settings sidebar lists them,
 * the desk header names the current one, and the screen renders it.
 */
const RULES: SettingsPageDef = { id: "rules", label: "Booking rules", line: "Deposits, pay-first customers, hours and prices.", path: "/desk/settings", icon: CalendarCogIcon };

export const SETTINGS_PAGES: readonly SettingsPageDef[] = [
  RULES,
  { id: "general", label: "General", line: "The venue's name, address, time zone and contact email.", path: "/desk/settings/general", icon: BuildingIcon },
  { id: "notifications", label: "Notifications", line: "Which events alert the team on the dashboard.", path: "/desk/settings/notifications", icon: BellIcon },
  { id: "activity", label: "Activity", line: "What the team did recently, newest first.", path: "/desk/settings/activity", icon: ActivityIcon },
];

/** The page a settings route's sub-segments name; Booking rules when none does. */
export function settingsPageFor(sub: readonly string[]): SettingsPageDef {
  return SETTINGS_PAGES.find((p) => p.id === sub[0]) ?? RULES;
}
