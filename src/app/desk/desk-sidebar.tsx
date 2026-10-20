"use client";

import { Anchor } from "@/app/anchor";
import { BookOpenIcon, ChevronsUpDownIcon, SearchIcon, SettingsIcon } from "lucide-react";
import type * as React from "react";
import { LogoMark } from "@/app/app-shell";
import { type DeskSection, SECTION_GROUPS, SECTIONS } from "@/app/desk/sections";
import { SidebarCollapseItem } from "@/app/desk/sidebar-collapse";
import { hrefFor } from "@/app/router";
import type { Viewer } from "@/data/types";
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


/**
 * The desk's navigation: coss Sidebar, collapsible to icons on a laptop
 * (⌘B, the rail on its edge, or the last item in its footer) and a sheet on
 * a phone. The header is the venue switcher; the footer opens the command
 * palette and collapses the sidebar.
 * Links carry the shown date along, so Bookings → Day lands where you were.
 */
export function DeskSidebar({
  section,
  date,
  onSearch,
  style,
  viewer,
}: {
  section: DeskSection;
  /** Who is signed in; areas their role doesn't have are left out. Null while loading: show everything. */
  viewer: Viewer | null;
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
          {SECTION_GROUPS.map((group) => {
            const links = SECTIONS.filter((s) => s.group === group && (!viewer || !s.feature || viewer.features.includes(s.feature)));
            if (links.length === 0) return null;
            return (
              <SidebarGroup key={group}>
                <SidebarGroupLabel>{group}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {links.map(({ id, label, path, icon: Icon }) => (
                      <SidebarMenuItem key={id}>
                        <SidebarMenuButton
                          aria-current={section === id ? "page" : undefined}
                          isActive={section === id}
                          render={<Anchor href={id === "day" || id === "bookings" ? link(path) : hrefFor(path)} />}
                          tooltip={label}
                        >
                          <Icon aria-hidden="true" />
                          <span>{label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                    {group === "Venue" && (
                      <SidebarMenuItem>
                        <SidebarMenuButton render={<Anchor href={hrefFor("/book")} />} tooltip="Booking page">
                          <BookOpenIcon aria-hidden="true" />
                          <span>Booking page</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
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
          <SidebarCollapseItem />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
