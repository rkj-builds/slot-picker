"use client";

import { SearchIcon } from "lucide-react";
import * as React from "react";
import { LoadError } from "@/app/book/book-page";
import { useNow } from "@/app/clock";
import { BookingSheet } from "@/app/desk/booking-sheet";
import { BookingsView } from "@/app/desk/bookings-view";
import { DeskCommandPalette } from "@/app/desk/command-palette";
import { DayView } from "@/app/desk/day-view";
import { DeskOverlays } from "@/app/desk/desk-dialogs";
import { type DeskSection, DeskSidebar } from "@/app/desk/desk-sidebar";
import { type DeskUi, DeskUiContext, type NewBookingPrefill } from "@/app/desk/desk-ui";
import { InsightsView } from "@/app/desk/insights-view";
import { NewBookingDialog } from "@/app/desk/new-booking-dialog";
import { SettingsView } from "@/app/desk/settings-view";
import { hrefFor, type Route } from "@/app/router";
import { useStore } from "@/app/store";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { isPlainDate, type PlainDate, todayIn } from "@/lib/plain-date";
import { VENUE } from "@/lib/venue";

const TITLES: Record<DeskSection, { title: string; line: string }> = {
  day: { title: "Day", line: `${VENUE.name} · two courts, by the half hour` },
  bookings: { title: "Bookings", line: "Every booking, its status and what is still due" },
  insights: { title: "Insights", line: "What happened once courts needed money up front" },
  settings: { title: "Settings", line: "The rules online booking follows" },
};

/** The sidebar sits under the demo bar (h-12 plus its 1px border), not over it. */
const BELOW_DEMO_BAR: React.CSSProperties = { top: "calc(3rem + 1px)", height: "calc(100svh - 3rem - 1px)" };

/**
 * The venue's side, in coss's app shell: a Sidebar for the views, a header
 * with the breadcrumb and the ⌘K palette, the view itself. #/desk is the day,
 * #/desk/bookings the list, #/desk/insights the numbers, #/desk/settings the
 * rules. The date lives in the URL too (?date=2026-10-17), so a link to a
 * busy Saturday is shareable.
 */
export function DeskPage({ route }: { route: Route }): React.ReactElement {
  const store = useStore();
  const now = useNow(1000);
  const today = todayIn(VENUE.timeZone, now);
  const sub = route.segments[1];
  const section: DeskSection = sub === "bookings" || sub === "insights" || sub === "settings" ? sub : "day";
  const dateParam = route.query.get("date") ?? "";
  const date: PlainDate = isPlainDate(dateParam) ? dateParam : today;

  const [sheetId, setSheetId] = React.useState<string | null>(null);
  const [cashId, setCashId] = React.useState<string | null>(null);
  const [cancelId, setCancelId] = React.useState<string | null>(null);
  const [prefill, setPrefill] = React.useState<NewBookingPrefill | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);

  // A booking opened on one view should not follow the desk to another.
  const [sheetSection, setSheetSection] = React.useState(section);
  if (sheetSection !== section) {
    setSheetSection(section);
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

  const query = route.query.get("q") ?? "";
  const body =
    store.status === "loading" ? (
      <DeskSkeleton />
    ) : store.status === "error" ? (
      <LoadError onRetry={store.retryLoad} />
    ) : section === "settings" ? (
      <SettingsView key={JSON.stringify(store.state.settings)} />
    ) : section === "day" ? (
      <DayView date={date} now={now} today={today} />
    ) : section === "bookings" ? (
      <BookingsView initialQuery={query} key={query} now={now} today={today} />
    ) : (
      <InsightsView today={today} />
    );
  const { title, line } = TITLES[section];

  return (
    <DeskUiContext.Provider value={ui}>
      <SidebarProvider className="min-h-0 flex-1">
        <DeskSidebar date={dateParam || null} onSearch={() => setSearchOpen(true)} section={section} style={BELOW_DEMO_BAR} />
        <SidebarInset className="min-w-0">
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-4 sm:py-6">
            <header className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ms-1" />
                <Separator className="h-4" orientation="vertical" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href={hrefFor("/desk")}>Desk</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{title}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <Button className="ms-auto text-muted-foreground" onClick={() => setSearchOpen(true)} variant="outline">
                  <SearchIcon aria-hidden="true" />
                  <span className="max-sm:sr-only">Search and jump</span>
                  <KbdGroup aria-hidden="true" className="max-sm:hidden">
                    <Kbd>⌘</Kbd>
                    <Kbd>K</Kbd>
                  </KbdGroup>
                </Button>
              </div>
              <div className="flex flex-col">
                <h1 className="font-semibold text-2xl tracking-tight outline-none">{title}</h1>
                <p className="text-muted-foreground text-sm">{line}</p>
              </div>
            </header>
            {body}
          </div>
        </SidebarInset>

        <DeskCommandPalette date={date} now={now} onOpenChange={setSearchOpen} open={searchOpen} today={today} />
      </SidebarProvider>

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
