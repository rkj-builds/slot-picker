"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { DeskSlotsContext } from "@/app/desk/desk-ui";
import { useMediaQuery } from "@/hooks/use-media-query";

/**
 * A view's controls (the day's date and actions, the bookings filters),
 * rendered into the desk's sticky header so they stay in reach while the
 * grid or the table scrolls under them. Outside the desk (or before the
 * header has mounted) it renders in place. `inlineOnPhone`: a toolbar that
 * wraps to several rows on a phone stays in the page there, so the sticky
 * header never takes a third of the screen.
 */
export function DeskViewToolbar({ children, inlineOnPhone = false }: { children: React.ReactNode; inlineOnPhone?: boolean }): React.ReactElement {
  const slot = React.useContext(DeskSlotsContext).toolbar;
  const phone = useMediaQuery("max-md");
  return slot && !(inlineOnPhone && phone) ? createPortal(children, slot) : <>{children}</>;
}

/**
 * A view's bar anchored to the bottom of the desk's main area, edge to edge
 * beside the sidebar (Settings' save bar). Outside the desk it renders in place.
 */
export function DeskViewFooter({ children }: { children: React.ReactNode }): React.ReactElement {
  const slot = React.useContext(DeskSlotsContext).footer;
  return slot ? createPortal(children, slot) : <>{children}</>;
}
