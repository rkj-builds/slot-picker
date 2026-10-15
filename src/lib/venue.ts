/**
 * The venue: Project 831, two pickleball courts in Jamshedpur, and the
 * settings the desk can change. Prices and hours are mock values.
 */
import type { VenueSchedule } from "@/lib/availability";
import type { Paise } from "@/lib/money";
import { type PlainDate, type Weekday, weekdayOf } from "@/lib/plain-date";

export const VENUE = {
  name: "Project 831",
  city: "Jamshedpur",
  address: "Project 831, Jamshedpur, Jharkhand",
  timeZone: "Asia/Kolkata",
} as const;

export type CourtId = "court-1" | "court-2";

export interface Court {
  id: CourtId;
  name: string;
}

export const COURTS: readonly Court[] = [
  { id: "court-1", name: "Court 1" },
  { id: "court-2", name: "Court 2" },
];

export const SLOT_STEP_MINUTES = 30;
export const DURATIONS_MINUTES: readonly number[] = [60, 90, 120];
export const WEEKDAYS: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export interface DayHours {
  open: number;
  close: number;
  closed: boolean;
}

export interface VenueSettings {
  /** Share of the price taken up front when a part payment is offered. */
  depositPercent: number;
  /** Days on which a booking is only held against money. */
  prepayDays: Weekday[];
  /** How long a court is held while someone pays. */
  holdMinutes: number;
  /** Ask a first-time customer for a deposit on any day. */
  requirePaymentForNewCustomers: boolean;
  hours: Record<Weekday, DayHours>;
  /** Per hour, off-peak. */
  basePricePaise: Paise;
  /** Per hour, in the peak band and (optionally) all weekend. */
  peakPricePaise: Paise;
  peakStartMinute: number;
  peakEndMinute: number;
  weekendIsPeak: boolean;
}

const allDay = (): DayHours => ({ open: 6 * 60, close: 23 * 60, closed: false });

export const DEFAULT_SETTINGS: VenueSettings = {
  depositPercent: 50,
  prepayDays: ["sat", "sun"],
  holdMinutes: 15,
  requirePaymentForNewCustomers: false,
  hours: { mon: allDay(), tue: allDay(), wed: allDay(), thu: allDay(), fri: allDay(), sat: allDay(), sun: allDay() },
  basePricePaise: 70_000,
  peakPricePaise: 80_000,
  peakStartMinute: 17 * 60,
  peakEndMinute: 23 * 60,
  weekendIsPeak: true,
};

export function scheduleFromSettings(settings: VenueSettings): VenueSchedule {
  const weeklyHours = Object.fromEntries(
    WEEKDAYS.map((day) => {
      const h = settings.hours[day];
      return [day, h.closed || h.close <= h.open ? [] : [[h.open, h.close] as const]];
    }),
  ) as unknown as VenueSchedule["weeklyHours"];
  return { timeZone: VENUE.timeZone, slotStepMinutes: SLOT_STEP_MINUTES, durationsMinutes: DURATIONS_MINUTES, weeklyHours };
}

export function isWeekend(date: PlainDate): boolean {
  const day = weekdayOf(date);
  return day === "sat" || day === "sun";
}

export function isPeak(settings: VenueSettings, date: PlainDate, minuteOfDay: number): boolean {
  if (settings.weekendIsPeak && isWeekend(date)) return true;
  return minuteOfDay >= settings.peakStartMinute && minuteOfDay < settings.peakEndMinute;
}

/** The hourly rate in force at a wall-clock minute. */
export function hourlyRateAt(settings: VenueSettings, date: PlainDate, minuteOfDay: number): Paise {
  return isPeak(settings, date, minuteOfDay) ? settings.peakPricePaise : settings.basePricePaise;
}

/**
 * The price of a booking, summed per 30-minute block so a booking that
 * crosses into the peak band pays peak only for the part inside it.
 */
export function priceFor(settings: VenueSettings, date: PlainDate, startMinute: number, durationMinutes: number): Paise {
  let total = 0;
  for (let m = startMinute; m < startMinute + durationMinutes; m += SLOT_STEP_MINUTES) {
    total += Math.round((hourlyRateAt(settings, date, m) * SLOT_STEP_MINUTES) / 60);
  }
  return total;
}

export function courtName(id: string): string {
  return COURTS.find((c) => c.id === id)?.name ?? id;
}

export const WEEKDAY_LABEL: Record<Weekday, { short: string; long: string }> = {
  mon: { short: "Mon", long: "Monday" },
  tue: { short: "Tue", long: "Tuesday" },
  wed: { short: "Wed", long: "Wednesday" },
  thu: { short: "Thu", long: "Thursday" },
  fri: { short: "Fri", long: "Friday" },
  sat: { short: "Sat", long: "Saturday" },
  sun: { short: "Sun", long: "Sunday" },
};

/** "Saturday and Sunday", "Friday, Saturday and Sunday". */
export function listDays(days: readonly Weekday[]): string {
  const ordered = WEEKDAYS.filter((d) => days.includes(d)).map((d) => WEEKDAY_LABEL[d].long);
  return new Intl.ListFormat("en-IN", { type: "conjunction" }).format(ordered);
}
