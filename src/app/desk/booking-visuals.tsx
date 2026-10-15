import { BanIcon, BanknoteIcon, CircleCheckIcon, CircleSlashIcon, GraduationCapIcon, HourglassIcon, PieChartIcon, TimerOffIcon, UserXIcon } from "lucide-react";
import type * as React from "react";
import type { BadgeProps } from "@/components/ui/badge";
import { type Booking, type Customer, DESK_STATE_LABEL, type DeskState, customerById } from "@/lib/booking";

/**
 * How each booking state looks. Never colour alone: every state has its own
 * icon, its own word, and a border or texture that survives greyscale.
 * `block` sits on a coss Button, so it also names the hover tint.
 */
export const STATE_META: Record<DeskState, { icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>; block: string; badge: BadgeProps["variant"] }> = {
  paid: { icon: CircleCheckIcon, block: "border-success/40 bg-success/8 hover:bg-success/12 border-s-4 border-s-success", badge: "success" },
  "part-paid": { icon: PieChartIcon, block: "border-info/40 bg-info/8 hover:bg-info/12 border-s-4 border-s-info", badge: "info" },
  due: { icon: BanknoteIcon, block: "border-warning/50 bg-warning/8 hover:bg-warning/12 border-dashed border-s-4 border-s-warning", badge: "warning" },
  held: { icon: HourglassIcon, block: "border-dashed border-foreground/30 bg-hatch bg-background hover:bg-accent/50", badge: "outline" },
  coaching: { icon: GraduationCapIcon, block: "border-transparent bg-secondary hover:bg-secondary/80", badge: "secondary" },
  blocked: { icon: BanIcon, block: "border-transparent bg-hatch bg-muted hover:bg-muted/80 text-muted-foreground", badge: "secondary" },
  "no-show": { icon: UserXIcon, block: "border-destructive/40 bg-destructive/6 hover:bg-destructive/10 border-s-4 border-s-destructive [&_[data-name]]:line-through", badge: "destructive" },
  cancelled: { icon: CircleSlashIcon, block: "border-dashed border-foreground/20 bg-background hover:bg-accent/50 text-muted-foreground [&_[data-name]]:line-through", badge: "secondary" },
  expired: { icon: TimerOffIcon, block: "border-dashed border-foreground/20 bg-background hover:bg-accent/50 text-muted-foreground", badge: "secondary" },
};

export function stateLabel(state: DeskState): string {
  return DESK_STATE_LABEL[state];
}

export function bookingTitle(booking: Booking, customers: readonly Customer[]): string {
  if (booking.kind !== "booking") return booking.title || (booking.kind === "coaching" ? "Coaching" : "Blocked");
  return customerById(customers, booking.customerId)?.name ?? (booking.title || "Walk-in");
}
