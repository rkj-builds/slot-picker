"use client";

import type * as React from "react";
import type { ScreenProps } from "@/app/desk/sections";
import { navigate } from "@/app/router";
import { PageHeader, Screen } from "@/app/screens/screen-kit";
import { ActivityLog } from "@/app/screens/settings/activity-log";
import { BookingRules } from "@/app/screens/settings/booking-rules";
import { GeneralSettings } from "@/app/screens/settings/general-settings";
import { NotificationSettings } from "@/app/screens/settings/notification-settings";
import { SETTINGS_PAGES, type SettingsPage, settingsPageFor } from "@/app/screens/settings/pages";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

/**
 * One settings page: its title and line (the page's only heading; the
 * sidebar says Settings), then its form cards in a readable width (Booking
 * rules is wider: the hours and prices table needs it). The pages are listed
 * in the settings sidebar (src/app/desk/settings-sidebar.tsx); on a phone,
 * where the sidebar is a closed sheet, a select at the top moves between them.
 */
export function SettingsScreen({ sub, now }: ScreenProps): React.ReactElement {
  const current = settingsPageFor(sub);
  const page: SettingsPage = current.id;
  const phone = useMediaQuery("max-md");

  return (
    <Screen>
      {phone && (
        <Field>
          <FieldLabel>Section</FieldLabel>
          <Select<SettingsPage>
            items={SETTINGS_PAGES.map((p) => ({ label: p.label, value: p.id }))}
            onValueChange={(v) => {
              const target = SETTINGS_PAGES.find((p) => p.id === v);
              if (target) navigate(target.path);
            }}
            value={page}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {SETTINGS_PAGES.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Field>
      )}
      <div className={cn("flex min-w-0 flex-col gap-5", page !== "rules" && "max-w-3xl")}>
        <PageHeader description={current.line} title={current.label} />
        {page === "rules" ? <BookingRules /> : page === "general" ? <GeneralSettings now={now} /> : page === "notifications" ? <NotificationSettings /> : <ActivityLog now={now} />}
      </div>
    </Screen>
  );
}
