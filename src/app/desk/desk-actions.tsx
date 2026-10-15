"use client";

/**
 * Every desk action goes through here: run it after the simulated round
 * trip, then say what happened in a toast with an Undo that puts the exact
 * previous booking (and customer) back.
 */
import * as React from "react";
import { useClock } from "@/app/clock";
import { whenOf } from "@/app/format";
import { useStore } from "@/app/store";
import { toastManager } from "@/components/ui/toast";
import { type Booking, type Customer, customerById, duePaise, makeId, paidPaise } from "@/lib/booking";
import { formatInr } from "@/lib/money";
import type { CancelResolution } from "@/lib/store";
import { courtName } from "@/lib/venue";

export interface DeskActions {
  recordCash: (booking: Booking, amountPaise: number) => Promise<void>;
  markNoShow: (booking: Booking) => Promise<void>;
  cancel: (booking: Booking, resolution: CancelResolution) => Promise<void>;
  setPayFirst: (customer: Customer, value: boolean) => Promise<void>;
  copyPaymentLink: (booking: Booking) => Promise<void>;
  create: (booking: Booking, customer?: Customer) => Promise<void>;
}

export function paymentLinkFor(booking: Booking): string {
  return `https://pay.example.com/${booking.id}`;
}

export function useDeskActions(): DeskActions {
  const { commit, dispatch, state } = useStore();
  const { now } = useClock();
  const stateRef = React.useRef(state);
  React.useLayoutEffect(() => {
    stateRef.current = state;
  });

  return React.useMemo<DeskActions>(() => {
    const who = (b: Booking): string => (b.kind === "booking" ? (customerById(stateRef.current.customers, b.customerId)?.name ?? "Walk-in") : b.title);
    const undo = (onClick: () => void): { children: string; onClick: () => void } => ({ children: "Undo", onClick });

    return {
      async recordCash(booking, amountPaise) {
        await commit({ type: "record-cash", bookingId: booking.id, amountPaise, at: now(), entryId: makeId("le") });
        const left = duePaise(booking) - amountPaise;
        toastManager.add({
          title: `${formatInr(amountPaise)} cash recorded`,
          description: `${who(booking)} · ${left > 0 ? `${formatInr(left)} still due` : "fully paid"}`,
          type: "success",
          actionProps: undo(() => dispatch({ type: "restore", booking })),
        });
      },
      async markNoShow(booking) {
        await commit({ type: "mark-no-show", bookingId: booking.id });
        toastManager.add({
          title: "Marked as a no-show",
          description: `${who(booking)} · ${courtName(booking.courtId)}, ${whenOf(booking)}`,
          type: "warning",
          actionProps: undo(() => dispatch({ type: "restore", booking })),
        });
      },
      async cancel(booking, resolution) {
        const customer = customerById(stateRef.current.customers, booking.customerId);
        const paid = paidPaise(booking);
        await commit({ type: "cancel", bookingId: booking.id, resolution, at: now(), entryId: makeId("le") });
        toastManager.add({
          title: booking.status === "held" ? "Hold released" : "Booking cancelled",
          description:
            paid <= 0 ? `${who(booking)} · nothing to refund` : resolution === "credit" ? `${formatInr(paid)} added as credit for ${who(booking)}` : `${formatInr(paid)} refund started`,
          type: "info",
          actionProps: undo(() => dispatch({ type: "restore", booking, customer })),
        });
      },
      async setPayFirst(customer, value) {
        await commit({ type: "set-customer-flag", customerId: customer.id, flag: "payFirst", value });
        toastManager.add({
          title: value ? `${customer.name} pays first from now on` : `${customer.name} can pay at the venue again`,
          description: value ? "Their next booking asks for full payment before it holds a court." : "The usual rules apply to their bookings.",
          type: "info",
          actionProps: undo(() => dispatch({ type: "set-customer-flag", customerId: customer.id, flag: "payFirst", value: !value })),
        });
      },
      async copyPaymentLink(booking) {
        const link = paymentLinkFor(booking);
        try {
          await navigator.clipboard.writeText(link);
          toastManager.add({ title: "Payment link copied", description: `Opens checkout for ${formatInr(duePaise(booking))}. Paste it into WhatsApp.`, type: "success" });
        } catch {
          toastManager.add({ title: "Could not copy the link", description: link, type: "error" });
        }
      },
      async create(booking, customer) {
        await commit({ type: "create", booking, customer });
        toastManager.add({
          title: "Booking added",
          description: `${who(booking)} · ${courtName(booking.courtId)}, ${whenOf(booking)}`,
          type: "success",
          actionProps: undo(() => dispatch({ type: "remove", bookingId: booking.id })),
        });
      },
    };
  }, [commit, dispatch, now]);
}
