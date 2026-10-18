"use client";

/**
 * Small pieces the booking screens share: a badge, a button that stays
 * focusable when unavailable so its reason can be read, and the row menu
 * built from the rules module.
 */
import { EllipsisIcon, PanelRightOpenIcon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import { ACTION_ICONS, type BadgeSpec } from "@/app/desk/booking-badges";
import type { BookingActionId, BookingActionState } from "@/app/desk/booking-rules";
import { DisabledWithReason } from "@/app/desk/disabled-with-reason";
import { Badge } from "@/components/ui/badge";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Drawer, DrawerHeader, DrawerMenu, DrawerMenuGroup, DrawerMenuItem, DrawerMenuSeparator, DrawerPanel, DrawerPopup, DrawerTitle } from "@/components/ui/drawer";
import { Menu, MenuGroup, MenuItem, MenuLinkItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { useMediaQuery } from "@/hooks/use-media-query";

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
  if (action.enabled) {
    return (
      <Button className={className} onClick={onRun} {...props}>
        <Icon aria-hidden="true" />
        {action.label}
      </Button>
    );
  }
  return (
    <DisabledWithReason className={className} reason={action.reason ?? ""} {...props}>
      <Icon aria-hidden="true" />
      {action.label}
    </DisabledWithReason>
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
