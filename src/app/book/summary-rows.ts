import type { SummaryRow } from "@/app/book/step-actions";

/** The booking as chosen so far, as summary rows: court and players, then the time once there is one, then the price. */
export function bookingRows({
  court,
  players,
  day,
  time,
  duration,
  price,
}: {
  court: string;
  players: number;
  day: string | null;
  time: string | null;
  duration: string | null;
  price: string | null;
}): SummaryRow[] {
  return [
    { label: "Court", value: court },
    { label: "Players", value: String(players) },
    { label: "Date", value: day },
    { label: "Time", value: time },
    { label: "Duration", value: duration },
    { label: "Price", value: price, emphasis: true },
  ];
}
