"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { DeskSlotsContext } from "@/app/desk/desk-ui";

/**
 * A view's bar anchored to the bottom of the desk's main area, edge to edge
 * beside the sidebar (Settings' save bar). Outside the desk it renders in place.
 */
export function DeskViewFooter({ children }: { children: React.ReactNode }): React.ReactElement {
  const slot = React.useContext(DeskSlotsContext).footer;
  return slot ? createPortal(children, slot) : <>{children}</>;
}
