"use client";

import { SearchIcon } from "lucide-react";
import * as React from "react";
import { LoadError } from "@/app/book/book-page";
import { useNow } from "@/app/clock";
import { BookingSheet } from "@/app/desk/booking-sheet";
import { DeskCommandPalette } from "@/app/desk/command-palette";
import { DayView } from "@/app/desk/day-view";
import { DeskOverlays } from "@/app/desk/desk-dialogs";
import { DeskSidebar } from "@/app/desk/desk-sidebar";
import { type DeskSection, sectionById, sectionOf } from "@/app/desk/sections";
import { ListSkeleton, NoAccess } from "@/app/screens/screen-kit";
import { useRead } from "@/data/provider";
import { DeskSlotsContext, type DeskUi, DeskUiContext, type NewBookingPrefill, type RepeatRef } from "@/app/desk/desk-ui";
import { BlockCourtsDialog, RepeatBlockDialog } from "@/app/desk/repeat-dialogs";
import { InsightsView } from "@/app/desk/insights-view";
import { NewBookingDialog } from "@/app/desk/new-booking-dialog";
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

/** The sidebar sits under the demo bar (h-12 plus its 1px border), not over it. */
const BELOW_DEMO_BAR: React.CSSProperties = { top: "calc(3rem + 1px)", height: "calc(100svh - 3rem - 1px)" };

/**
 * The venue's side, in coss's app shell: a Sidebar for the views, a header
 * with the breadcrumb and the ⌘K palette, the view itself. #/desk is the day,
 * #/desk/bookings the list, #/desk/insights the numbers; the other areas are
 * screens (src/app/desk/sections.tsx), Settings among them. The date lives in the URL too (?date=2026-10-17), so a link to a
 * busy Saturday is shareable.
 */
export function DeskPage({ route }: { route: Route }): React.ReactElement {
  const store = useStore();
  const now = useNow(1000);
  const today = todayIn(VENUE.timeZone, now);
  const section: DeskSection = sectionOf(route);
  const def = sectionById(section);
  const viewer = useRead(["viewer"], (c) => c.team.viewer());
  const dateParam = route.query.get("date") ?? "";
  const date: PlainDate = isPlainDate(dateParam) ? dateParam : today;

  const [sheetId, setSheetId] = React.useState<string | null>(null);
  const [cashId, setCashId] = React.useState<string | null>(null);
  const [cancelId, setCancelId] = React.useState<string | null>(null);
  const [prefill, setPrefill] = React.useState<NewBookingPrefill | null>(null);
  const [repeatRef, setRepeatRef] = React.useState<RepeatRef | null>(null);
  // ?block=1 opens Block courts for the day (the demo's jump to the Repeat editor).
  const [blockDate, setBlockDate] = React.useState<PlainDate | null>(() => (route.query.get("block") === "1" ? date : null));
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [toolbarSlot, setToolbarSlot] = React.useState<HTMLElement | null>(null);
  const [footerSlot, setFooterSlot] = React.useState<HTMLElement | null>(null);
  const slots = React.useMemo(() => ({ toolbar: toolbarSlot, footer: footerSlot }), [toolbarSlot, footerSlot]);

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
      openRepeat: setRepeatRef,
      blockCourts: setBlockDate,
      cashId,
      cancelId,
      closeCash: () => setCashId(null),
      closeCancel: () => setCancelId(null),
    }),
    [cashId, cancelId, setSheetId, setCashId, setCancelId, setPrefill, setRepeatRef, setBlockDate],
  );

  const Screen = def.screen;
  const body =
    viewer.data && def.feature && !viewer.data.features.includes(def.feature) ? (
      <NoAccess area={def.label} viewer={viewer.data} />
    ) : Screen ? (
      <React.Suspense fallback={<ListSkeleton label={`Loading ${def.label.toLowerCase()}`} />}>
        <Screen now={now} route={route} sub={route.segments.slice(2)} today={today} />
      </React.Suspense>
    ) : store.status === "loading" ? (
      <DeskSkeleton />
    ) : store.status === "error" ? (
      <LoadError onRetry={store.retryLoad} />
    ) : section === "day" ? (
      <DayView date={date} now={now} today={today} />
    ) : (
      <InsightsView today={today} />
    );
  const title = def.label;
  const line = section === "day" ? `${VENUE.name} · two courts, by the half hour` : def.line;

  return (
    <DeskUiContext.Provider value={ui}>
      <SidebarProvider className="min-h-0 flex-1">
        <DeskSidebar date={dateParam || null} onSearch={() => setSearchOpen(true)} section={section} style={BELOW_DEMO_BAR} viewer={viewer.data ?? null} />
        <SidebarInset className="min-w-0">
          {/*
            The desk's toolbar, anchored under the demo bar: where you are and the search on the first row,
            the view's own controls (date and actions, or the filters) on the second. The page scrolls under it.
          */}
          <header className="sticky top-[calc(3rem+1px)] z-20 border-b bg-background/94 backdrop-blur-md" data-desk-toolbar="">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-2.5 px-4 py-2.5">
              <div className="flex min-h-9 items-center gap-2">
                <SidebarTrigger className="-ms-1" />
                <Separator className="h-4" orientation="vertical" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href={hrefFor("/desk")}>Desk</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {route.segments.length > 2 ? <BreadcrumbLink href={hrefFor(def.path)}>{title}</BreadcrumbLink> : <BreadcrumbPage>{title}</BreadcrumbPage>}
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
              <div className="empty:hidden" data-desk-toolbar-slot="" ref={setToolbarSlot} />
            </div>
          </header>
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 pt-5 pb-6 sm:pt-6">
            {!Screen && (
              <div className="flex flex-col">
                <h1 className="font-semibold text-2xl tracking-tight outline-none">{title}</h1>
                <p className="text-muted-foreground text-sm">{line}</p>
              </div>
            )}
            <DeskSlotsContext.Provider value={slots}>{body}</DeskSlotsContext.Provider>
          </div>
          <div className="sticky bottom-0 z-20 empty:hidden" data-desk-footer-slot="" ref={setFooterSlot} />
        </SidebarInset>

        <DeskCommandPalette date={date} now={now} onOpenChange={setSearchOpen} open={searchOpen} today={today} />
      </SidebarProvider>

      <BookingSheet bookingId={sheetId} onClose={() => setSheetId(null)} />
      {sheetId === null && <DeskOverlays />}
      <NewBookingDialog onClose={() => setPrefill(null)} prefill={prefill} />
      <BlockCourtsDialog date={blockDate} onClose={() => setBlockDate(null)} />
      <RepeatBlockDialog onClose={() => setRepeatRef(null)} target={repeatRef} />
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
