"use client";

/**
 * One list of what the desk can do to a booking, so the booking panel's
 * footer, the bookings table's row menu and the day grid's right-click menu
 * always offer the same actions in the same order with the same words.
 */
import { BanknoteIcon, CircleSlashIcon, LinkIcon, PanelRightOpenIcon, UserXIcon } from "lucide-react";
import type * as React from "react";
import { useDeskActions } from "@/app/desk/desk-actions";
import { useDeskUi } from "@/app/desk/desk-ui";
import { type Booking, deskState, duePaise } from "@/lib/booking";

export interface BookingAction {
  id: "open" | "record-cash" | "copy-link" | "no-show" | "cancel";
  label: string;
  icon: React.ComponentType<{ "aria-hidden"?: boolean | "true"; className?: string }>;
  destructive?: boolean;
  run: () => void;
}

export function useBookingActions(booking: Booking, now: number, { includeOpen = true } = {}): BookingAction[] {
  const ui = useDeskUi();
  const actions = useDeskActions();
  const ds = deskState(booking, now);
  const live = ds !== "cancelled" && ds !== "expired";
  const isBooking = booking.kind === "booking";
  const due = duePaise(booking);
  const list: BookingAction[] = [];
  if (includeOpen) list.push({ id: "open", label: "Open", icon: PanelRightOpenIcon, run: () => ui.openBooking(booking.id) });
  if (live && isBooking && due > 0 && ds !== "held") list.push({ id: "record-cash", label: "Record cash", icon: BanknoteIcon, run: () => ui.recordCash(booking.id) });
  if (live && isBooking && due > 0) list.push({ id: "copy-link", label: "Copy payment link", icon: LinkIcon, run: () => void actions.copyPaymentLink(booking) });
  if (isBooking && booking.status === "confirmed") list.push({ id: "no-show", label: "Mark no-show", icon: UserXIcon, run: () => void actions.markNoShow(booking) });
  if (live)
    list.push({
      id: "cancel",
      label: ds === "held" ? "Release hold" : isBooking ? "Cancel booking" : "Remove block",
      icon: CircleSlashIcon,
      destructive: true,
      run: () => ui.cancel(booking.id),
    });
  return list;
}
