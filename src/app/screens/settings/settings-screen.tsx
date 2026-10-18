"use client";

import { ActivityIcon, BellIcon, BuildingIcon, CalendarCogIcon } from "lucide-react";
import type * as React from "react";
import { Anchor } from "@/app/anchor";
import { sectionById, type ScreenProps } from "@/app/desk/sections";
import { hrefFor, navigate } from "@/app/router";
import { PageHeader, Screen } from "@/app/screens/screen-kit";
import { ActivityLog } from "@/app/screens/settings/activity-log";
import { BookingRules } from "@/app/screens/settings/booking-rules";
import { GeneralSettings } from "@/app/screens/settings/general-settings";
import { NotificationSettings } from "@/app/screens/settings/notification-settings";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

type SettingsPage = "rules" | "general" | "notifications" | "activity";

const PAGES: readonly { id: SettingsPage; label: string; line: string; path: string; icon: React.ComponentType<{ "aria-hidden"?: "true"; className?: string }> }[] = [
  { id: "rules", label: "Booking rules", line: "Deposits, pay-first customers, hours and prices.", path: "/desk/settings", icon: CalendarCogIcon },
  { id: "general", label: "General", line: "The venue's name, address, time zone and contact email.", path: "/desk/settings/general", icon: BuildingIcon },
  { id: "notifications", label: "Notifications", line: "Which events alert the team on the dashboard.", path: "/desk/settings/notifications", icon: BellIcon },
  { id: "activity", label: "Activity", line: "What the team did recently, newest first.", path: "/desk/settings/activity", icon: ActivityIcon },
];

/**
 * Settings in Cal.com's layout: sections listed on the left, each a URL
 * (#/desk/settings is Booking rules, then /general, /notifications,
 * /activity), the page's form cards on the right in a readable width. On a
 * phone the section list becomes a select at the top.
 */
export function SettingsScreen({ sub, now }: ScreenProps): React.ReactElement {
  const section = sectionById("settings");
  const current = PAGES.find((p) => p.id === sub[0]) ?? PAGES[0];
  const page: SettingsPage = current?.id ?? "rules";
  const phone = useMediaQuery("max-md");

  return (
    <Screen>
      <PageHeader description={section.line} title={section.label} />
      <div className={cn("grid gap-6", !phone && "grid-cols-[12rem_minmax(0,1fr)] gap-8")}>
        {phone ? (
          <Field>
            <FieldLabel>Section</FieldLabel>
            <Select<SettingsPage>
              items={PAGES.map((p) => ({ label: p.label, value: p.id }))}
              onValueChange={(v) => {
                const target = PAGES.find((p) => p.id === v);
                if (target) navigate(target.path);
              }}
              value={page}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {PAGES.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </Field>
        ) : (
          <nav aria-label="Settings sections" className="sticky top-32 self-start">
            <ul className="flex flex-col gap-0.5">
              {PAGES.map((p) => (
                <li key={p.id}>
                  <Anchor
                    aria-current={p.id === page ? "page" : undefined}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium text-muted-foreground text-sm outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-accent aria-[current=page]:text-foreground"
                    href={hrefFor(p.path)}
                  >
                    <p.icon aria-hidden="true" className="size-4 shrink-0" />
                    {p.label}
                  </Anchor>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div className={cn("flex min-w-0 flex-col gap-5", page !== "rules" && "max-w-3xl")}>
          <div className="flex flex-col gap-0.5">
            <h2 className="font-semibold text-lg">{current?.label}</h2>
            <p className="text-muted-foreground text-sm">{current?.line}</p>
          </div>
          {page === "rules" ? <BookingRules /> : page === "general" ? <GeneralSettings now={now} /> : page === "notifications" ? <NotificationSettings /> : <ActivityLog now={now} />}
        </div>
      </div>
    </Screen>
  );
}
