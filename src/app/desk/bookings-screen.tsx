"use client";

import type * as React from "react";
import { BookingDetailPage } from "@/app/desk/booking-detail-page";
import { isBookingsView } from "@/app/desk/bookings-filters";
import { BookingsView } from "@/app/desk/bookings-view";
import type { ScreenProps } from "@/app/desk/sections";

/**
 * #/desk/bookings and below: a status view (#/desk/bookings/payment-due) or,
 * for anything else after it, one booking's page (#/desk/bookings/<id>).
 */
export function BookingsScreen({ route, sub, today, now }: ScreenProps): React.ReactElement {
  const first = sub[0];
  if (first !== undefined && !isBookingsView(first)) return <BookingDetailPage id={first} key={first} now={now} />;
  return <BookingsView now={now} route={route} today={today} view={first ?? "upcoming"} />;
}
