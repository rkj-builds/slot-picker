"use client";

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import type * as React from "react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

/**
 * The sidebar's own collapse control, the last item in its footer: the
 * sidebar is the thing being collapsed, so the control lives on it, not on
 * the page (⌘B and the rail on its edge do the same). On a phone the sidebar
 * is a sheet that closes by itself, so there is nothing to draw.
 */
export function SidebarCollapseItem(): React.ReactElement | null {
  const { state, isMobile, toggleSidebar } = useSidebar();
  if (isMobile) return null;
  const collapsed = state === "collapsed";
  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={toggleSidebar} tooltip="Expand sidebar (⌘B)">
        {collapsed ? <PanelLeftOpenIcon aria-hidden="true" /> : <PanelLeftCloseIcon aria-hidden="true" />}
        <span>{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
        <KbdGroup aria-hidden="true" className="ms-auto group-data-[collapsible=icon]:hidden">
          <Kbd>⌘</Kbd>
          <Kbd>B</Kbd>
        </KbdGroup>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
