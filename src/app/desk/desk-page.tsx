"use client";

import { ArrowLeftIcon, CalendarDaysIcon, ChartColumnIcon, ListIcon, SettingsIcon } from "lucide-react";
import * as React from "react";
import { LoadError } from "@/app/book/book-page";
import { useNow } from "@/app/clock";
import { BookingSheet } from "@/app/desk/booking-sheet";
import { BookingsView } from "@/app/desk/bookings-view";
import { DayView } from "@/app/desk/day-view";
import { DeskOverlays } from "@/app/desk/desk-dialogs";
import { type DeskUi, DeskUiContext, type NewBookingPrefill } from "@/app/desk/desk-ui";
import { InsightsView } from "@/app/desk/insights-view";
import { NewBookingDialog } from "@/app/desk/new-booking-dialog";
import { SettingsView } from "@/app/desk/settings-view";
import { hrefFor, navigate, type Route } from "@/app/router";
import { useStore } from "@/app/store";
import { DayStepper } from "@/components/booking/day-stepper";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { isPlainDate, type PlainDate, todayIn } from "@/lib/plain-date";
import { LOCALE } from "@/app/format";
import { VENUE } from "@/lib/venue";

type Tab = "day" | "bookings" | "insights";

/**
 * The venue's side. #/desk is the day, #/desk/bookings the list,
 * #/desk/insights the numbers, #/desk/settings the rules. The date lives in
 * the URL too (?date=2026-10-17), so a link to a busy Saturday is shareable.
 */
export function DeskPage({ route }: { route: Route }): React.ReactElement {
  const store = useStore();
  const now = useNow(1000);
  const today = todayIn(VENUE.timeZone, now);
  const sub = route.segments[1];
  const tab: Tab = sub === "bookings" || sub === "insights" ? sub : "day";
  const dateParam = route.query.get("date") ?? "";
  const date: PlainDate = isPlainDate(dateParam) ? dateParam : today;

  const [sheetId, setSheetId] = React.useState<string | null>(null);
  const [cashId, setCashId] = React.useState<string | null>(null);
  const [cancelId, setCancelId] = React.useState<string | null>(null);
  const [prefill, setPrefill] = React.useState<NewBookingPrefill | null>(null);

  // A booking opened on one view should not follow the desk to another.
  const [sheetTab, setSheetTab] = React.useState(tab);
  if (sheetTab !== tab) {
    setSheetTab(tab);
    setSheetId(null);
  }

  const ui = React.useMemo<DeskUi>(
    () => ({
      openBooking: setSheetId,
      recordCash: setCashId,
      cancel: setCancelId,
      newBooking: setPrefill,
      cashId,
      cancelId,
      closeCash: () => setCashId(null),
      closeCancel: () => setCancelId(null),
    }),
    [cashId, cancelId],
  );

  const settings = sub === "settings";
  const body =
    store.status === "loading" ? (
      <DeskSkeleton />
    ) : store.status === "error" ? (
      <LoadError onRetry={store.retryLoad} />
    ) : settings ? (
      <SettingsView key={JSON.stringify(store.state.settings)} />
    ) : tab === "day" ? (
      <DayView date={date} now={now} />
    ) : tab === "bookings" ? (
      <BookingsView now={now} today={today} />
    ) : (
      <InsightsView today={today} />
    );

  return (
    <DeskUiContext.Provider value={ui}>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6">
        {settings ? (
          <div className="flex flex-col gap-2">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href={hrefFor("/desk")}>Desk</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Settings</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex items-center gap-2">
              <a aria-label="Back to the desk" className={buttonVariants({ size: "icon", variant: "ghost" })} href={hrefFor("/desk")}>
                <ArrowLeftIcon aria-hidden="true" />
              </a>
              <h1 className="font-semibold text-2xl tracking-tight">Settings</h1>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col">
                <h1 className="font-semibold text-2xl tracking-tight">Desk</h1>
                <span className="text-muted-foreground text-sm">{VENUE.name} · two courts</span>
              </div>
              <div className="flex items-center gap-2">
                {tab === "day" && (
                  <DayStepper
                    locale={LOCALE}
                    now={now}
                    onValueChange={(next) => navigate("/desk", { date: next === today ? null : next })}
                    timeZone={VENUE.timeZone}
                    value={date}
                  />
                )}
                <a className={buttonVariants({ variant: "outline" })} href={hrefFor("/desk/settings")}>
                  <SettingsIcon aria-hidden="true" />
                  <span className="max-sm:sr-only">Settings</span>
                </a>
              </div>
            </div>
            <Tabs onValueChange={(value) => navigate(value === "day" ? "/desk" : `/desk/${String(value)}`, { date: dateParam || null })} value={tab}>
              <TabsList aria-label="Desk views" variant="underline">
                <TabsTab value="day">
                  <CalendarDaysIcon aria-hidden="true" />
                  Day
                </TabsTab>
                <TabsTab value="bookings">
                  <ListIcon aria-hidden="true" />
                  Bookings
                </TabsTab>
                <TabsTab value="insights">
                  <ChartColumnIcon aria-hidden="true" />
                  Insights
                </TabsTab>
              </TabsList>
            </Tabs>
          </div>
        )}
        {body}
      </main>

      <BookingSheet bookingId={sheetId} onClose={() => setSheetId(null)} />
      {sheetId === null && <DeskOverlays />}
      <NewBookingDialog onClose={() => setPrefill(null)} prefill={prefill} />
    </DeskUiContext.Provider>
  );
}

function DeskSkeleton(): React.ReactElement {
  return (
    <div aria-busy="true" className="flex flex-col gap-4" role="status">
      <span className="sr-only">Loading the desk</span>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton className="h-17" key={i} />
        ))}
      </div>
      <Skeleton className="h-[28rem] rounded-2xl" />
    </div>
  );
}
