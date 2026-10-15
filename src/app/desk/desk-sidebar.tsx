"use client";

import { Anchor } from "@/app/anchor";
import { BookOpenIcon, CalendarDaysIcon, ChartColumnIcon, ChevronsUpDownIcon, ListIcon, SearchIcon, SettingsIcon } from "lucide-react";
import type * as React from "react";
import { LogoMark } from "@/app/app-shell";
import { hrefFor } from "@/app/router";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Menu, MenuGroup, MenuGroupLabel, MenuLinkItem, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { VENUE } from "@/lib/venue";

export type DeskSection = "day" | "bookings" | "insights" | "settings";

const DESK_LINKS: { section: DeskSection; label: string; path: string; icon: React.ComponentType<{ "aria-hidden"?: boolean | "true" }> }[] = [
  { section: "day", label: "Day", path: "/desk", icon: CalendarDaysIcon },
  { section: "bookings", label: "Bookings", path: "/desk/bookings", icon: ListIcon },
  { section: "insights", label: "Insights", path: "/desk/insights", icon: ChartColumnIcon },
];

/**
 * The desk's navigation: coss Sidebar, collapsible to icons on a laptop
 * (⌘B, or the trigger in the page header) and a sheet on a phone. The
 * header is the venue switcher; the footer opens the command palette.
 * Links carry the shown date along, so Bookings → Day lands where you were.
 */
export function DeskSidebar({
  section,
  date,
  onSearch,
  style,
}: {
  section: DeskSection;
  /** The date in the URL, if any, kept when moving between views. */
  date: string | null;
  onSearch: () => void;
  style?: React.CSSProperties;
}): React.ReactElement {
  const link = (path: string): string => hrefFor(path, { date });
  return (
    <Sidebar collapsible="icon" style={style}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Menu>
              <SidebarMenuButton aria-label={`Venue: ${VENUE.name}, ${VENUE.city}. Switch venue`} render={<MenuTrigger />} size="lg">
                <LogoMark className="size-8" />
                <span className="flex min-w-0 flex-1 flex-col text-start leading-tight">
                  <span className="truncate font-semibold">{VENUE.name}</span>
                  <span className="truncate text-muted-foreground text-xs">{VENUE.city} · 2 courts</span>
                </span>
                <ChevronsUpDownIcon aria-hidden="true" className="ms-auto" />
              </SidebarMenuButton>
              <MenuPopup align="start" className="min-w-56">
                <MenuGroup>
                  <MenuGroupLabel>Venues</MenuGroupLabel>
                  <MenuRadioGroup value="project-831">
                    <MenuRadioItem value="project-831">
                      {VENUE.name} · {VENUE.city}
                    </MenuRadioItem>
                  </MenuRadioGroup>
                </MenuGroup>
                <MenuSeparator />
                <MenuLinkItem href={hrefFor("/book")}>
                  <BookOpenIcon aria-hidden="true" />
                  Open the booking page
                </MenuLinkItem>
                <MenuLinkItem href={hrefFor("/desk/settings")}>
                  <SettingsIcon aria-hidden="true" />
                  Venue settings
                </MenuLinkItem>
              </MenuPopup>
            </Menu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Desk">
        <SidebarGroup>
          <SidebarGroupLabel>Desk</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {DESK_LINKS.map(({ section: s, label, path, icon: Icon }) => (
                <SidebarMenuItem key={s}>
                  <SidebarMenuButton
                    aria-current={section === s ? "page" : undefined}
                    isActive={section === s}
                    render={<Anchor href={link(path)} />}
                    tooltip={label}
                  >
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Venue</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  aria-current={section === "settings" ? "page" : undefined}
                  isActive={section === "settings"}
                  render={<Anchor href={hrefFor("/desk/settings")} />}
                  tooltip="Settings"
                >
                  <SettingsIcon aria-hidden="true" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Anchor href={hrefFor("/book")} />} tooltip="Booking page">
                  <BookOpenIcon aria-hidden="true" />
                  <span>Booking page</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        </nav>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onSearch} tooltip="Search and jump (⌘K)">
              <SearchIcon aria-hidden="true" />
              <span>Search and jump</span>
              <KbdGroup aria-hidden="true" className="ms-auto group-data-[collapsible=icon]:hidden">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </KbdGroup>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
