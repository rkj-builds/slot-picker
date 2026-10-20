"use client";

import { ArrowLeftIcon } from "lucide-react";
import type * as React from "react";
import { Anchor } from "@/app/anchor";
import { SidebarCollapseItem } from "@/app/desk/sidebar-collapse";
import { hrefFor } from "@/app/router";
import { SETTINGS_PAGES, type SettingsPage } from "@/app/screens/settings/pages";
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

/**
 * Settings is its own area, as in Cal.com: the desk's sidebar gives way to
 * this one, a way back at the top and the settings pages under it, so there
 * is one navigation on screen and the sidebar itself says you have left the
 * desk. Same coss Sidebar, so ⌘B, the rail and the footer item collapse it.
 */
export function SettingsSidebar({ page, style }: { page: SettingsPage; style?: React.CSSProperties }): React.ReactElement {
  return (
    <Sidebar collapsible="icon" style={style}>
      <SidebarHeader>
        <nav aria-label="Back">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={<Anchor href={hrefFor("/desk")} />} size="lg" tooltip="Back to desk">
                <ArrowLeftIcon aria-hidden="true" />
                <span className="flex min-w-0 flex-1 flex-col text-start leading-tight">
                  <span className="truncate font-semibold">Back to desk</span>
                  <span className="truncate text-muted-foreground text-xs">Day, bookings, people, money</span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </nav>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Settings sections">
          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {SETTINGS_PAGES.map(({ id, label, path, icon: Icon }) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton aria-current={page === id ? "page" : undefined} isActive={page === id} render={<Anchor href={hrefFor(path)} />} tooltip={label}>
                      <Icon aria-hidden="true" />
                      <span>{label}</span>
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
          <SidebarCollapseItem />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
