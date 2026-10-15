"use client";

import { ArrowDownIcon, ArrowUpIcon, CornerDownLeftIcon } from "lucide-react";
import * as React from "react";
import { bookingTitle } from "@/app/desk/booking-visuals";
import { useDeskUi } from "@/app/desk/desk-ui";
import { dayOf, longDayOf, timeRangeOf } from "@/app/format";
import { navigate } from "@/app/router";
import { useStore } from "@/app/store";
import { useAutocompleteFilter } from "@/components/ui/autocomplete";
import {
  Command,
  CommandCollection,
  CommandDialog,
  CommandDialogPopup,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useSidebar } from "@/components/ui/sidebar";
import { deskState, sortBookings } from "@/lib/booking";
import { formatPhone } from "@/lib/phone";
import { addDays, compareDates, type PlainDate, weekdayOf } from "@/lib/plain-date";
import { COURTS, courtName } from "@/lib/venue";

interface PaletteItem {
  value: string;
  label: string;
  /** Extra words the search matches: phone numbers, court names, "tomorrow". */
  keywords?: string[];
  hint?: string;
  shortcut?: string;
  run: () => void;
}

interface PaletteGroup {
  value: string;
  items: PaletteItem[];
}

/**
 * ⌘K / Ctrl+K on the desk: coss Command in a CommandDialog (particle
 * p-command-1). Go to a view, jump to a date, find a customer (opens their
 * bookings) or a booking (opens its panel), start a new booking.
 */
export function DeskCommandPalette({
  open,
  onOpenChange,
  date,
  today,
  now,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The date the day view is showing. */
  date: PlainDate;
  today: PlainDate;
  now: number;
}): React.ReactElement {
  const { state } = useStore();
  const ui = useDeskUi();
  const { toggleSidebar } = useSidebar();

  React.useEffect(() => {
    const down = (event: KeyboardEvent): void => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      onOpenChange(!open);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const groups = React.useMemo<PaletteGroup[]>(() => {
    const go = (path: string, query?: Record<string, string | null>) => () => navigate(path, query);
    const hours = state.settings.hours[weekdayOf(date)];
    const dates: PaletteItem[] = [-1, 0, 1, 2, 3, 4, 5, 6].map((offset) => {
      const d = addDays(today, offset);
      const word = offset === -1 ? "Yesterday" : offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : null;
      return {
        value: `date:${d}`,
        label: word ? `${word}, ${dayOf(d)}` : dayOf(d),
        keywords: [longDayOf(d), d],
        run: go("/desk", { date: d === today ? null : d }),
      };
    });
    const nearby = state.bookings
      .filter((b) => compareDates(b.date, addDays(today, -7)) >= 0 && compareDates(b.date, addDays(today, 7)) <= 0)
      .filter((b) => !["cancelled", "expired"].includes(deskState(b, now)))
      .sort(sortBookings);
    return [
      {
        value: "Go to",
        items: [
          { value: "go:day", label: "Day", hint: "Courts by half hour", run: go("/desk", { date: date === today ? null : date }) },
          { value: "go:bookings", label: "Bookings", hint: "Search, filter, export", run: go("/desk/bookings") },
          { value: "go:insights", label: "Insights", hint: "Cancellations by payment", run: go("/desk/insights") },
          { value: "go:settings", label: "Settings", hint: "Deposits, hours, prices", keywords: ["deposit", "hours", "pay-first"], run: go("/desk/settings") },
          { value: "go:book", label: "Booking page", hint: "What customers see", run: go("/book") },
        ],
      },
      {
        value: "Actions",
        items: [
          {
            value: "action:new-booking",
            label: `New booking on ${dayOf(date)}`,
            keywords: ["add", "walk-in", "phone call"],
            run: () => ui.newBooking({ courtId: COURTS[0]?.id ?? "court-1", date, startMinute: hours.open }),
          },
          { value: "action:sidebar", label: "Collapse or expand the sidebar", keywords: ["navigation", "menu"], shortcut: "⌘B", run: toggleSidebar },
        ],
      },
      { value: "Jump to a date", items: dates },
      {
        value: "Customers",
        items: state.customers.map((c) => ({
          value: `customer:${c.id}`,
          label: c.name,
          hint: formatPhone(c.phone),
          keywords: [c.phone, c.phone.replace(/^\+91/, "")],
          run: go("/desk/bookings", { q: c.name }),
        })),
      },
      {
        value: "Bookings",
        items: nearby.map((b) => ({
          value: `booking:${b.id}`,
          label: `${bookingTitle(b, state.customers)} · ${dayOf(b.date)}, ${timeRangeOf(b)}`,
          hint: courtName(b.courtId),
          keywords: [courtName(b.courtId)],
          run: () => ui.openBooking(b.id),
        })),
      },
    ];
  }, [state, date, today, now, ui, toggleSidebar]);

  const { contains } = useAutocompleteFilter({ sensitivity: "base" });
  const filter = React.useCallback(
    (item: unknown, query: string): boolean => {
      const it = item as PaletteItem;
      return contains(it.label, query) || Boolean(it.hint && contains(it.hint, query)) || Boolean(it.keywords?.some((k) => contains(k, query)));
    },
    [contains],
  );

  const select = (item: PaletteItem): void => {
    onOpenChange(false);
    item.run();
  };

  return (
    <CommandDialog onOpenChange={onOpenChange} open={open}>
      <CommandDialogPopup aria-label="Search and jump">
        <Command filter={filter} itemToStringValue={(item: unknown) => (item as PaletteItem).label} items={groups}>
          <CommandInput aria-label="Search the desk" placeholder="Jump to a date, find a customer or booking…" />
          <CommandPanel>
            <CommandEmpty>Nothing matches. Try a name, a phone number or a day.</CommandEmpty>
            <CommandList>
              {(group: PaletteGroup) => (
                <React.Fragment key={group.value}>
                  <CommandGroup items={group.items}>
                    <CommandGroupLabel>{group.value}</CommandGroupLabel>
                    <CommandCollection>
                      {(item: PaletteItem) => (
                        <CommandItem key={item.value} onClick={() => select(item)} value={item}>
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {item.hint && <span className="shrink-0 text-muted-foreground text-xs">{item.hint}</span>}
                          {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
                        </CommandItem>
                      )}
                    </CommandCollection>
                  </CommandGroup>
                  <CommandSeparator />
                </React.Fragment>
              )}
            </CommandList>
          </CommandPanel>
          <CommandFooter>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <KbdGroup>
                  <Kbd>
                    <ArrowUpIcon aria-label="Up" />
                  </Kbd>
                  <Kbd>
                    <ArrowDownIcon aria-label="Down" />
                  </Kbd>
                </KbdGroup>
                <span>Move</span>
              </div>
              <div className="flex items-center gap-2">
                <Kbd>
                  <CornerDownLeftIcon aria-label="Enter" />
                </Kbd>
                <span>Open</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Kbd>Esc</Kbd>
              <span>Close</span>
            </div>
          </CommandFooter>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  );
}
