/**
 * What can be done to a booking right now, decided in one place: the detail
 * page's buttons, the list's row menu and the bulk bar all ask here, so the
 * same booking never offers an action on one screen and refuses it on
 * another. Pure: the booking, the viewer's permissions and the clock in, a
 * list of actions out, each enabled or disabled with the reason a person can
 * act on. Nothing is hidden for being unavailable; it is disabled and says why.
 *
 * The desk works in arrears (bookings are settled and corrected after the
 * fact), so being in the past never blocks an action by itself.
 */
import { startTimeOf } from "@/app/format";
import { ROLE_LABELS } from "@/data/mock/db";
import type { Viewer } from "@/data/types";
import { type Booking, bookingEnd, bookingStart, duePaise, isHoldActive, paidPaise } from "@/lib/booking";

export type BookingActionId = "record-payment" | "send-reminder" | "edit" | "check-in" | "undo-check-in" | "no-show" | "undo-no-show" | "cancel" | "restore";

/** Menu sections, in Cal.com's order: money, then changes, then after the time, then destructive. */
export type BookingActionGroup = "money" | "change" | "after" | "destructive";

export interface BookingActionState {
  id: BookingActionId;
  label: string;
  group: BookingActionGroup;
  enabled: boolean;
  /** Why it is disabled, in a sentence; null when enabled. */
  reason: string | null;
  destructive: boolean;
}

export interface BookingRuleContext {
  booking: Booking;
  viewer: Pick<Viewer, "role" | "can">;
  now: number;
  /** Checked in at the desk (from the booking's detail); false when unknown. */
  checkedIn?: boolean;
  /** Whether the booking has a customer to message. */
  hasCustomer?: boolean;
}

const ONE_HOUR = 3_600_000;

function roleCant(viewer: BookingRuleContext["viewer"], words: string): string {
  return `${ROLE_LABELS[viewer.role]} can't ${words}. Ask an admin.`;
}

/** The label the cancel action carries for this kind of booking. */
export function cancelLabel(booking: Pick<Booking, "status" | "kind">): string {
  if (booking.status === "held") return "Release hold";
  return booking.kind === "booking" ? "Cancel booking" : "Remove block";
}

/** Every action that applies to this booking, in menu order. A pair (check in / undo, cancel / put back) shows the half that fits its state. */
export function bookingActions(ctx: BookingRuleContext): BookingActionState[] {
  const { booking: b, viewer, now } = ctx;
  const customerBooking = b.kind === "booking";
  const writeBlock = viewer.can.writeBookings ? null : roleCant(viewer, "change bookings");
  const started = bookingStart(b) <= now;
  const ended = bookingEnd(b) <= now;
  const held = b.status === "held" && isHoldActive(b, now);
  const gone = b.status === "cancelled" || b.status === "expired" || (b.status === "held" && !held);
  const due = duePaise(b);
  const first = (...reasons: (string | null | false | undefined)[]): string | null => reasons.find((r): r is string => typeof r === "string") ?? null;
  const make = (id: BookingActionId, label: string, group: BookingActionGroup, reason: string | null, destructive = false): BookingActionState => ({
    id,
    label,
    group,
    enabled: reason === null,
    reason,
    destructive,
  });
  const goneReason = b.status === "cancelled" ? "It's cancelled. Put it back first." : gone ? "The hold ran out, so there is no booking." : null;
  const notCustomer = customerBooking ? null : "Only for customer bookings.";

  const list: BookingActionState[] = [
    make(
      "record-payment",
      "Record payment",
      "money",
      first(
        notCustomer,
        goneReason,
        held && "They're paying online now. Wait for the hold to finish.",
        due <= 0 && "Nothing is due.",
        writeBlock,
        !viewer.can.handleMoney && roleCant(viewer, "take or record money"),
      ),
    ),
    make(
      "send-reminder",
      "Send reminder",
      "money",
      first(
        notCustomer,
        goneReason,
        ctx.hasCustomer === false && "There's no customer to remind.",
        b.status === "no-show" && "It was a no-show.",
        ended && "It has already happened.",
        writeBlock,
      ),
    ),
    make(
      "edit",
      "Move or edit",
      "change",
      first(goneReason, held && "They're paying for this hold now.", b.status === "no-show" && "It was a no-show. Undo that first.", writeBlock),
    ),
  ];

  if (ctx.checkedIn) list.push(make("undo-check-in", "Undo check-in", "change", writeBlock));
  else
    list.push(
      make(
        "check-in",
        "Check in",
        "change",
        first(
          notCustomer,
          goneReason,
          held && "Confirm the booking first.",
          b.status === "no-show" && "It was a no-show. Undo that first.",
          !started && bookingStart(b) - now > ONE_HOUR && `Check-in opens an hour before ${startTimeOf(b)}.`,
          writeBlock,
        ),
      ),
    );

  if (b.status === "no-show") list.push(make("undo-no-show", "Undo no-show", "after", writeBlock));
  else
    list.push(
      make(
        "no-show",
        "Mark no-show",
        "after",
        first(
          notCustomer,
          goneReason,
          held && "It's still a hold.",
          !started && `Available once it starts at ${startTimeOf(b)}.`,
          ctx.checkedIn && "They checked in. Undo the check-in first.",
          writeBlock,
        ),
      ),
    );

  if (b.status === "cancelled") list.push(make("restore", "Put back", "destructive", writeBlock));
  else
    list.push(
      make(
        "cancel",
        cancelLabel(b),
        "destructive",
        first(gone && "The hold ran out; there is nothing to cancel.", writeBlock, paidPaise(b) > 0 && !viewer.can.refund && roleCant(viewer, "refund or give credit")),
        true,
      ),
    );
  return list;
}

/** One action's state, for a button that stands on its own. */
export function bookingAction(id: BookingActionId, ctx: BookingRuleContext): BookingActionState | undefined {
  return bookingActions(ctx).find((a) => a.id === id);
}
