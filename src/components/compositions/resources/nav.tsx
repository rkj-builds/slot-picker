"use client";

import {
  CalendarIcon,
  CalendarRangeIcon,
  ChartColumnIcon,
  ClockIcon,
  ExternalLinkIcon,
  HomeIcon,
  LandPlotIcon,
  LayoutGridIcon,
  LinkIcon,
  RouteIcon,
  SettingsIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react";
import type * as React from "react";
import { type ResourcesScreen, useResources } from "@/components/compositions/resources/context";
import { Badge } from "@/components/ui/badge";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

type Icon = React.ComponentType<{ "aria-hidden"?: boolean | "true"; className?: string }>;

/** Cal.com's sidebar on 9 November 2026, with Resources beside Availability. Only the pages this proposal draws are live. */
const ITEMS: readonly { label: string; icon: Icon; screen?: ResourcesScreen; isNew?: boolean }[] = [
  { label: "Home", icon: HomeIcon },
  { label: "Links", icon: LinkIcon, screen: "link" },
  { label: "Events", icon: CalendarRangeIcon },
  { label: "Bookings", icon: CalendarIcon, screen: "bookings" },
  { label: "Availability", icon: ClockIcon },
  { label: "Resources", icon: LandPlotIcon, screen: "list", isNew: true },
  { label: "Teams", icon: UsersIcon },
  { label: "Apps", icon: LayoutGridIcon },
  { label: "Routing", icon: RouteIcon },
  { label: "Workflows", icon: ZapIcon },
  { label: "Insights", icon: ChartColumnIcon },
];

const LIVE: readonly { value: ResourcesScreen; label: string }[] = [
  { value: "list", label: "Resources" },
  { value: "link", label: "Links · Book a court" },
  { value: "bookings", label: "Bookings" },
  { value: "book", label: "The booking page" },
];

function sectionOf(screen: ResourcesScreen): ResourcesScreen {
  return screen === "new" || screen === "resource" ? "list" : screen;
}

/** The app's navigation: coss Sidebar, static, hidden on a phone where ResourcesNavSelect takes over. */
export function ResourcesNav(): React.ReactElement {
  const { screen, open, venue } = useResources("ResourcesNav");
  const current = sectionOf(screen);
  return (
    <Sidebar className="hidden h-auto w-52 shrink-0 border-e @3xl/root:flex" collapsible="none" data-slot="resources-nav">
      <SidebarHeader className="px-3 pt-3">
        <div className="flex items-center gap-2 px-1">
          <span aria-hidden="true" className="size-6 rounded-md bg-foreground" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-semibold text-sm">{venue.name}</span>
            <span className="truncate text-muted-foreground text-xs">{venue.line}</span>
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Cal.com">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {ITEMS.map(({ label, icon: Icon, screen: target, isNew }) => (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton
                      aria-current={target && target === current ? "page" : undefined}
                      disabled={!target}
                      isActive={target === current}
                      onClick={target ? () => open(target) : undefined}
                      title={target ? undefined : "Cal.com's own page; not part of this proposal"}
                    >
                      <Icon aria-hidden="true" />
                      <span>{label}</span>
                      {isNew && (
                        <Badge className="ms-auto" size="sm" variant="success">
                          New
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </nav>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton aria-current={current === "book" ? "page" : undefined} isActive={current === "book"} onClick={() => open("book")}>
              <ExternalLinkIcon aria-hidden="true" />
              <span>View public page</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton disabled title="Cal.com's own page; not part of this proposal">
              <SettingsIcon aria-hidden="true" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

/** On a phone the sidebar folds into one control: which page is open. */
export function ResourcesNavSelect(): React.ReactElement {
  const { screen, open, venue } = useResources("ResourcesNavSelect");
  const current = sectionOf(screen);
  return (
    <div className="flex items-center justify-between gap-3 border-b px-3 py-2 @3xl/root:hidden" data-slot="resources-nav-select">
      <span className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className="size-5 shrink-0 rounded-md bg-foreground" />
        <span className="truncate font-semibold text-sm">{venue.name}</span>
      </span>
      <Select<ResourcesScreen> items={LIVE} onValueChange={(v) => v !== null && open(v)} value={current}>
        <SelectTrigger aria-label="Page" className="w-44" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {LIVE.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </div>
  );
}
