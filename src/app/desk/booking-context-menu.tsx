"use client";

import type * as React from "react";
import { useBookingActions } from "@/app/desk/booking-actions";
import { bookingTitle } from "@/app/desk/booking-visuals";
import { useDeskActions } from "@/app/desk/desk-actions";
import { useStore } from "@/app/store";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuGroup,
  ContextMenuGroupLabel,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { type Booking, customerById } from "@/lib/booking";

/**
 * Right-click (or long-press) a booking on the day for the same actions as
 * its panel: coss ContextMenu around the block (particles p-context-menu-5,
 * -6 and -8: a labelled group, icons, a switch item, a destructive item last).
 * The trigger is a plain wrapper, as coss asks; the block inside stays a button.
 */
export function BookingContextMenu({
  booking,
  now,
  className,
  style,
  children,
}: {
  booking: Booking;
  now: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}): React.ReactElement {
  const { state } = useStore();
  const deskActions = useDeskActions();
  const actions = useBookingActions(booking, now);
  const customer = booking.kind === "booking" ? customerById(state.customers, booking.customerId) : undefined;
  const safe = actions.filter((a) => !a.destructive);
  const destructive = actions.filter((a) => a.destructive);

  return (
    <ContextMenu>
      <ContextMenuTrigger className={className} data-slot="booking-context-trigger" style={style}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuPopup className="min-w-52">
        <ContextMenuGroup>
          <ContextMenuGroupLabel>{bookingTitle(booking, state.customers)}</ContextMenuGroupLabel>
          {safe.map(({ id, label, icon: Icon, run }) => (
            <ContextMenuItem closeOnClick key={id} onClick={run}>
              <Icon aria-hidden="true" />
              {label}
            </ContextMenuItem>
          ))}
        </ContextMenuGroup>
        {customer && (
          <>
            <ContextMenuSeparator />
            <ContextMenuCheckboxItem checked={customer.payFirst} onCheckedChange={(value) => void deskActions.setPayFirst(customer, value)} variant="switch">
              Pay first
            </ContextMenuCheckboxItem>
          </>
        )}
        {destructive.length > 0 && <ContextMenuSeparator />}
        {destructive.map(({ id, label, icon: Icon, run }) => (
          <ContextMenuItem closeOnClick key={id} onClick={run} variant="destructive">
            <Icon aria-hidden="true" />
            {label}
          </ContextMenuItem>
        ))}
      </ContextMenuPopup>
    </ContextMenu>
  );
}
