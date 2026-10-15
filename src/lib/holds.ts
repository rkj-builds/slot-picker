/**
 * Holds: a court is reserved for a few minutes while someone pays. A hold
 * blocks the slot for everyone else until it is paid, released or expires;
 * an expired hold frees the slot without anyone having to act.
 */
import { type Booking, isHoldActive } from "@/lib/booking";

export function holdExpiry(now: number, minutes: number): number {
  return now + Math.round(minutes * 60_000);
}

/** Milliseconds left on a hold, never negative. */
export function holdRemainingMs(b: Pick<Booking, "status" | "holdExpiresAt">, now: number): number {
  if (b.status !== "held" || b.holdExpiresAt === null) return 0;
  return Math.max(0, b.holdExpiresAt - now);
}

/** "14:59", "0:07" — a countdown that never shows a decimal or a negative. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** "14 minutes 59 seconds left" — the same countdown for a screen reader. */
export function describeCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const parts: string[] = [];
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  if (seconds > 0 || minutes === 0) parts.push(`${seconds} ${seconds === 1 ? "second" : "seconds"}`);
  return `${parts.join(" ")} left`;
}

/** The same array when nothing expired, so a periodic sweep never re-renders for nothing. */
export function expireHolds(bookings: Booking[], now: number): Booking[] {
  if (!bookings.some((b) => b.status === "held" && !isHoldActive(b, now))) return bookings;
  return bookings.map((b) => (b.status === "held" && !isHoldActive(b, now) ? { ...b, status: "expired", holdExpiresAt: null } : b));
}

export function nextHoldExpiry(bookings: readonly Booking[], now: number): number | null {
  let next: number | null = null;
  for (const b of bookings) {
    if (isHoldActive(b, now) && b.holdExpiresAt !== null && (next === null || b.holdExpiresAt < next)) next = b.holdExpiresAt;
  }
  return next;
}
