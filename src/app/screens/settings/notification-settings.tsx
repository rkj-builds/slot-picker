"use client";

import * as React from "react";
import { ListSkeleton, LoadFailed } from "@/app/screens/screen-kit";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { toastManager } from "@/components/ui/toast";
import { errorMessage } from "@/data/errors";
import { useRead, useWrite } from "@/data/provider";
import type { NotificationPrefs } from "@/data/types";

const EVENTS: readonly { key: keyof NotificationPrefs; label: string; line: string; noun: string }[] = [
  { key: "newBooking", label: "New booking", line: "Someone books a court online.", noun: "new booking alerts" },
  { key: "cancellation", label: "Cancellation", line: "A customer or the desk cancels a booking.", noun: "cancellation alerts" },
  { key: "paymentFailed", label: "Payment failed", line: "An online payment doesn't go through.", noun: "failed payment alerts" },
  { key: "leadWaiting", label: "Lead waiting", line: "A new lead has waited an hour for a reply in the inbox.", noun: "lead alerts" },
  { key: "dailySummary", label: "Daily summary", line: "One note at 9 PM with the day's bookings and money.", noun: "the daily summary" },
];

/**
 * Team alerts, one switch per event. Each switch saves the moment it's
 * flipped and says so in a toast, so there's no Save button to forget
 * (Cal.com mixes both models on one page; this page has only one).
 */
export function NotificationSettings(): React.ReactElement {
  const prefs = useRead(["settings", "notifications"], (c) => c.settings.notifications());
  const save = useWrite((c, next: NotificationPrefs) => c.settings.saveNotifications(next));
  // The switch moves at once; it settles back if the save is refused.
  const [pending, setPending] = React.useState<{ key: keyof NotificationPrefs; value: boolean } | null>(null);

  if (prefs.isError) return <LoadFailed error={prefs.error} onRetry={() => void prefs.refetch()} what="notifications" />;
  if (!prefs.data) return <ListSkeleton label="Loading notifications" rows={5} />;
  const saved = prefs.data;

  const flip = async (key: keyof NotificationPrefs, value: boolean): Promise<void> => {
    const event = EVENTS.find((e) => e.key === key);
    setPending({ key, value });
    try {
      await save.mutateAsync({ ...saved, [key]: value });
      toastManager.add({ title: `${value ? "Turned on" : "Turned off"} ${event?.noun ?? "the alert"}`, description: "Saved.", type: "success" });
    } catch (error) {
      toastManager.add({ title: "Couldn't change the alert", description: errorMessage(error), type: "error" });
    } finally {
      setPending(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h3>
          <CardTitle render={<span className="block" />}>Team alerts</CardTitle>
        </h3>
        <CardDescription>Shown on the dashboard for everyone who can see the area. Changes save as you switch them.</CardDescription>
      </CardHeader>
      <CardPanel className="p-0">
        <ul className="flex flex-col divide-y">
          {EVENTS.map((e) => {
            const on = pending?.key === e.key ? pending.value : saved[e.key];
            return (
              <li key={e.key}>
                <Field className="flex-row items-center justify-between gap-4 px-6 py-4">
                  <div className="flex flex-col gap-0.5">
                    <FieldLabel>{e.label}</FieldLabel>
                    <FieldDescription>{e.line}</FieldDescription>
                  </div>
                  <Switch checked={on} disabled={pending !== null} onCheckedChange={(v) => void flip(e.key, v)} />
                </Field>
              </li>
            );
          })}
        </ul>
      </CardPanel>
    </Card>
  );
}
