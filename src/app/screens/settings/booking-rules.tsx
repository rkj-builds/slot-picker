"use client";

import * as React from "react";
import { LoadError } from "@/app/book/book-page";
import { JUMP_EVENT } from "@/app/demo-jump";
import { SettingsView } from "@/app/desk/settings-view";
import { ListSkeleton } from "@/app/screens/screen-kit";
import { useStore } from "@/app/store";

/**
 * Booking rules: the desk's existing settings view, unchanged. It reads the
 * booking store, so it waits for the store; saved settings, a reset or a
 * demo jump each start its draft over (a jump may hand it unsaved edits).
 */
export function BookingRules(): React.ReactElement {
  const store = useStore();
  const [jumps, setJumps] = React.useState(0);
  React.useEffect(() => {
    const bump = (): void => setJumps((n) => n + 1);
    window.addEventListener(JUMP_EVENT, bump);
    return () => window.removeEventListener(JUMP_EVENT, bump);
  }, []);
  if (store.status === "loading") return <ListSkeleton label="Loading booking rules" rows={4} />;
  if (store.status === "error") return <LoadError onRetry={store.retryLoad} />;
  return <SettingsView key={`${jumps}:${store.resets}:${JSON.stringify(store.state.settings)}`} />;
}
