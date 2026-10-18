"use client";

/**
 * The booking actions that need no form: send a reminder, check in, mark a
 * no-show, put back. Each runs on the data client, then says what happened
 * in a toast, with Undo when the change can be undone. The detail page, the
 * row menu and the bulk bar all run them from here, so they read the same.
 */
import * as React from "react";
import { type BookingTarget, toastRefusal } from "@/app/desk/booking-dialogs";
import { LOCALE, startTimeOf, whenOf } from "@/app/format";
import { toastManager } from "@/components/ui/toast";
import type { DataClient } from "@/data/client";
import { errorMessage, isDataError } from "@/data/errors";
import { useDataClient, useWrite } from "@/data/provider";
import { VENUE } from "@/lib/venue";

/** "4:35 pm", in the venue's zone. */
export function clockTime(at: number): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: VENUE.timeZone, hour: "numeric", minute: "2-digit" }).format(at);
}

/** The cooldown refusal, with when the next reminder may go. */
export function cooldownLine(error: unknown): string {
  if (isDataError(error) && error.code === "cooldown" && error.retryAt) return `${error.message} The next can go at ${clockTime(error.retryAt)}.`;
  return errorMessage(error);
}

export type BookingCommand = "send-reminder" | "check-in" | "undo-check-in" | "no-show" | "undo-no-show" | "restore";

function undoWith(client: DataClient, run: (c: DataClient) => Promise<unknown>): { children: string; onClick: () => void } {
  return {
    children: "Undo",
    onClick: () => {
      run(client).catch((error: unknown) => toastRefusal("Couldn't undo", error));
    },
  };
}

/** Run a command and toast the outcome. Resolves true when it went through. */
export function useBookingCommand(): { run: (command: BookingCommand, target: BookingTarget) => Promise<boolean>; pending: BookingCommand | null } {
  const client = useDataClient();
  const [pending, setPending] = React.useState<BookingCommand | null>(null);
  const write = useWrite(async (c, { command, id }: { command: BookingCommand; id: string }) => {
    switch (command) {
      case "send-reminder":
        return c.bookings.sendReminder(id);
      case "check-in":
        return c.bookings.checkIn(id, true);
      case "undo-check-in":
        return c.bookings.checkIn(id, false);
      case "no-show":
        return c.bookings.markNoShow(id);
      case "undo-no-show":
      case "restore":
        return c.bookings.restore(id);
    }
  });

  const run = React.useCallback(
    async (command: BookingCommand, { booking, name }: BookingTarget): Promise<boolean> => {
      setPending(command);
      try {
        await write.mutateAsync({ command, id: booking.id });
      } catch (error) {
        if (command === "send-reminder") toastManager.add({ title: "Reminder not sent", description: cooldownLine(error), type: isDataError(error) && error.code === "cooldown" ? "warning" : "error" });
        else toastRefusal(command === "restore" ? "Couldn't put it back" : "That didn't go through", error);
        return false;
      } finally {
        setPending(null);
      }
      const id = booking.id;
      switch (command) {
        case "send-reminder":
          toastManager.add({ title: `Reminder sent to ${name}`, description: `On WhatsApp, for ${whenOf(booking)}.`, type: "success" });
          break;
        case "check-in":
          toastManager.add({ title: `${name} checked in`, description: `${startTimeOf(booking)} start`, type: "success", actionProps: undoWith(client, (c) => c.bookings.checkIn(id, false)) });
          break;
        case "undo-check-in":
          toastManager.add({ title: "Check-in undone", description: name, type: "info", actionProps: undoWith(client, (c) => c.bookings.checkIn(id, true)) });
          break;
        case "no-show":
          toastManager.add({ title: `${name} marked as a no-show`, description: whenOf(booking), type: "warning", actionProps: undoWith(client, (c) => c.bookings.restore(id)) });
          break;
        case "undo-no-show":
          toastManager.add({ title: "No-show undone", description: `${name} · back to confirmed`, type: "info", actionProps: undoWith(client, (c) => c.bookings.markNoShow(id)) });
          break;
        case "restore":
          toastManager.add({ title: "Booking put back", description: `${name} · ${whenOf(booking)}`, type: "success" });
          break;
      }
      return true;
    },
    [client, write],
  );
  return { run, pending };
}
