"use client";

/**
 * Small pieces the booking screens share: the status and payment badges, a
 * button that stays focusable when unavailable so its reason can be read, and
 * the row menu built from the rules module.
 */
import {
  BanknoteIcon,
  BellRingIcon,
  CircleCheckIcon,
  CircleSlashIcon,
  EllipsisIcon,
  HourglassIcon,
  MoveIcon,
  PanelRightOpenIcon,
  PieChartIcon,
  RotateCcwIcon,
  TimerOffIcon,
  UserCheckIcon,
  UserXIcon,
  WalletIcon,
} from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import type { BookingActionId, BookingActionState } from "@/app/desk/booking-rules";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Drawer, DrawerHeader, DrawerMenu, DrawerMenuGroup, DrawerMenuItem, DrawerMenuSeparator, DrawerPanel, DrawerPopup, DrawerTitle } from "@/components/ui/drawer";
import { Menu, MenuGroup, MenuItem, MenuLinkItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-query";
import { type Booking, isHoldActive, paidPaise, paymentState } from "@/lib/booking";
import { formatInr } from "@/lib/money";
import { cn } from "@/lib/utils";

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

interface BadgeSpec {
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

export function SpecBadge({ spec, className }: { spec: BadgeSpec; className?: string }): React.ReactElement {
  const Icon = spec.icon;
  return (
    <Badge className={className} variant={spec.variant}>
      <Icon aria-hidden="true" />
      {spec.label}
    </Badge>
  );
}

/**
 * A button for an action that may be unavailable. Unavailable, it stays
 * focusable (aria-disabled, not disabled) so a keyboard or screen reader user
 * reaches it and hears why; the reason also shows in a tooltip on hover.
 */
export function ActionButton({ action, onRun, className, ...props }: { action: BookingActionState; onRun: () => void } & Omit<ButtonProps, "onClick">): React.ReactElement {
  const Icon = ACTION_ICONS[action.id];
  const reasonId = React.useId();
  if (action.enabled) {
    return (
      <Button className={className} onClick={onRun} {...props}>
        <Icon aria-hidden="true" />
        {action.label}
      </Button>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-describedby={reasonId}
            aria-disabled="true"
            className={cn("cursor-not-allowed opacity-64 hover:bg-transparent", className)}
            onClick={(event) => event.preventDefault()}
            {...props}
          />
        }
      >
        <Icon aria-hidden="true" />
        {action.label}
        <span className="sr-only" id={reasonId}>
          {action.reason}
        </span>
      </TooltipTrigger>
      <TooltipPopup className="max-w-64">{action.reason}</TooltipPopup>
    </Tooltip>
  );
}

/**
 * The row's "…": Open, then the actions in their groups (money, changes,
 * after the time, destructive). Unavailable ones stay in the list, disabled,
 * with the reason under the label. A menu on a laptop; a bottom drawer on a
 * phone, where a small popup is hard to hit (Cal.com's adaptive menu).
 */
export function BookingRowMenu({
  label,
  href,
  actions,
  onAction,
}: {
  /** "Actions for Kabir Singh, Sat, 17 Oct 7:00 – 8:00 pm" */
  label: string;
  href: string;
  actions: readonly BookingActionState[];
  onAction: (id: BookingActionId) => void;
}): React.ReactElement {
  const phone = useMediaQuery("max-md");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const groups = (["money", "change", "after", "destructive"] as const).map((g) => actions.filter((a) => a.group === g)).filter((g) => g.length > 0);
  const trigger = (
    <Button aria-label={label} className="relative z-10" size="icon-sm" variant="ghost">
      <EllipsisIcon aria-hidden="true" />
    </Button>
  );

  if (phone) {
    return (
      <>
        {React.cloneElement(trigger, { onClick: () => setDrawerOpen(true) } as Partial<ButtonProps>)}
        <Drawer onOpenChange={setDrawerOpen} open={drawerOpen}>
          <DrawerPopup showBar>
            <DrawerHeader>
              <DrawerTitle>{label.replace(/^Actions for /, "")}</DrawerTitle>
            </DrawerHeader>
            <DrawerPanel>
              <DrawerMenu aria-label="Booking actions">
                <DrawerMenuItem render={<Anchor href={href} />}>
                  <PanelRightOpenIcon aria-hidden="true" />
                  Open booking
                </DrawerMenuItem>
                {groups.map((group, i) => (
                  <React.Fragment key={group[0]?.group ?? i}>
                    <DrawerMenuSeparator />
                    <DrawerMenuGroup>
                      {group.map((a) => {
                        const Icon = ACTION_ICONS[a.id];
                        return (
                          <DrawerMenuItem
                            disabled={!a.enabled}
                            key={a.id}
                            onClick={() => {
                              setDrawerOpen(false);
                              onAction(a.id);
                            }}
                            variant={a.destructive ? "destructive" : "default"}
                          >
                            <Icon aria-hidden="true" />
                            <ItemText action={a} />
                          </DrawerMenuItem>
                        );
                      })}
                    </DrawerMenuGroup>
                  </React.Fragment>
                ))}
              </DrawerMenu>
            </DrawerPanel>
          </DrawerPopup>
        </Drawer>
      </>
    );
  }

  return (
    <Menu>
      <MenuTrigger render={trigger} />
      <MenuPopup align="end" className="w-64">
        <MenuLinkItem render={<Anchor href={href} />}>
          <PanelRightOpenIcon aria-hidden="true" />
          Open booking
        </MenuLinkItem>
        {groups.map((group, i) => (
          <React.Fragment key={group[0]?.group ?? i}>
            <MenuSeparator />
            <MenuGroup>
              {group.map((a) => {
                const Icon = ACTION_ICONS[a.id];
                return (
                  <MenuItem className="items-start" disabled={!a.enabled} key={a.id} onClick={() => onAction(a.id)} variant={a.destructive ? "destructive" : "default"}>
                    <Icon aria-hidden="true" className="mt-0.5" />
                    <ItemText action={a} />
                  </MenuItem>
                );
              })}
            </MenuGroup>
          </React.Fragment>
        ))}
      </MenuPopup>
    </Menu>
  );
}

function ItemText({ action }: { action: BookingActionState }): React.ReactElement {
  return (
    <span className="flex min-w-0 flex-col text-start">
      <span>{action.label}</span>
      {action.reason && <span className="whitespace-normal text-muted-foreground text-xs">{action.reason}</span>}
    </span>
  );
}
