/**
 * How the booking screens word what happened: a refusal as a toast, a time
 * of day, and the reminder cooldown with when the next may go.
 */
import { LOCALE } from "@/app/format";
import { toastManager } from "@/components/ui/toast";
import { errorMessage, isDataError } from "@/data/errors";
import { VENUE } from "@/lib/venue";

/** A toast for a write the backend refused: its own sentence. */
export function toastRefusal(title: string, error: unknown): void {
  toastManager.add({ title, description: errorMessage(error), type: "error" });
}

/** "4:35 pm", in the venue's zone. */
export function clockTime(at: number): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: VENUE.timeZone, hour: "numeric", minute: "2-digit" }).format(at);
}

/** The cooldown refusal, with when the next reminder may go. */
export function cooldownLine(error: unknown): string {
  if (isDataError(error) && error.code === "cooldown" && error.retryAt) return `${error.message} The next can go at ${clockTime(error.retryAt)}.`;
  return errorMessage(error);
}
