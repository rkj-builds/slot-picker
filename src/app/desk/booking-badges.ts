/**
 * How a booking's state and money read as badges, and the icon each action
 * carries, so the page, the list and the menus look the same.
 */
import {
  BanknoteIcon,
  BellRingIcon,
  CircleCheckIcon,
  CircleSlashIcon,
  HourglassIcon,
  MoveIcon,
  PieChartIcon,
  RotateCcwIcon,
  TimerOffIcon,
  UserCheckIcon,
  UserXIcon,
  WalletIcon,
} from "lucide-react";
import type * as React from "react";
import type { BookingActionId } from "@/app/desk/booking-rules";
import type { BadgeProps } from "@/components/ui/badge";
import { type Booking, isHoldActive, paidPaise, paymentState } from "@/lib/booking";
import { formatInr } from "@/lib/money";

type Icon = React.ComponentType<{ "aria-hidden"?: boolean | "true"; className?: string }>;

export const ACTION_ICONS: Record<BookingActionId, Icon> = {
  "record-payment": BanknoteIcon,
  "send-reminder": BellRingIcon,
  edit: MoveIcon,
  "check-in": UserCheckIcon,
  "undo-check-in": RotateCcwIcon,
  "no-show": UserXIcon,
  "undo-no-show": RotateCcwIcon,
  cancel: CircleSlashIcon,
  restore: RotateCcwIcon,
};

export interface BadgeSpec {
  label: string;
  variant: BadgeProps["variant"];
  icon: Icon;
}

/** Where the booking stands, apart from money. */
export function statusBadge(b: Booking, now: number, checkedIn = false): BadgeSpec {
  if (b.status === "cancelled") return { label: "Cancelled", variant: "secondary", icon: CircleSlashIcon };
  if (b.status === "no-show") return { label: "No-show", variant: "error", icon: UserXIcon };
  if (b.status === "expired" || (b.status === "held" && !isHoldActive(b, now))) return { label: "Hold expired", variant: "secondary", icon: TimerOffIcon };
  if (b.status === "held") return { label: "Held, awaiting payment", variant: "outline", icon: HourglassIcon };
  if (checkedIn) return { label: "Checked in", variant: "success", icon: UserCheckIcon };
  if (b.kind === "coaching") return { label: "Coaching", variant: "secondary", icon: CircleCheckIcon };
  if (b.kind === "blocked") return { label: "Blocked", variant: "secondary", icon: CircleSlashIcon };
  return { label: "Confirmed", variant: "outline", icon: CircleCheckIcon };
}

/** What has happened to the money; null for blocks and coaching, which carry none. */
export function paymentBadge(b: Booking): BadgeSpec | null {
  if (b.kind !== "booking") return null;
  if (b.status === "cancelled") {
    const credit = b.ledger.find((e) => e.kind === "credit-issued");
    const refund = b.ledger.find((e) => e.kind === "refund");
    if (credit) return { label: `${formatInr(credit.amountPaise)} kept as credit`, variant: "info", icon: WalletIcon };
    if (refund) return { label: `${formatInr(refund.amountPaise)} refunded`, variant: "secondary", icon: RotateCcwIcon };
    return null;
  }
  const state = paymentState(b);
  if (state === "paid") return { label: "Paid", variant: "success", icon: CircleCheckIcon };
  if (state === "part-paid") return { label: `${formatInr(Math.max(0, paidPaise(b)))} of ${formatInr(b.pricePaise)} paid`, variant: "info", icon: PieChartIcon };
  return { label: "Unpaid", variant: "warning", icon: BanknoteIcon };
}

