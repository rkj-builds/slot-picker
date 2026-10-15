"use client";

import * as React from "react";
import type { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";

type CalendarProps = React.ComponentProps<typeof Calendar>;

/**
 * coss's Calendar, fetched the first time a date picker opens. The calendar
 * brings react-day-picker and date-fns with it, which nobody needs until they
 * open the popover, so they stay out of the first download. Dates are read
 * in Indian English (en-IN), loaded alongside it.
 */
const LoadedCalendar = React.lazy(async () => {
  const [{ Calendar: CossCalendar }, { enIN }] = await Promise.all([
    import("@/components/ui/calendar"),
    import("@daypicker/react/locale/en-IN"),
  ]);
  function IndianCalendar(props: CalendarProps): React.ReactElement {
    return <CossCalendar locale={enIN} {...props} />;
  }
  return { default: IndianCalendar };
});

export function LazyCalendar(props: CalendarProps): React.ReactElement {
  return (
    <React.Suspense
      fallback={
        <div aria-busy="true" className="p-3" data-slot="calendar-loading" role="status">
          <span className="sr-only">Loading the calendar</span>
          <Skeleton className="h-[17.5rem] w-[15.5rem] rounded-lg" />
        </div>
      }
    >
      <LoadedCalendar {...props} />
    </React.Suspense>
  );
}
