import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import * as React from "react";
import { BookingSlotPicker, type BookingSelection } from "@/components/booking/booking-slot-picker";
import type { SlotGridStatus } from "@/components/booking/slot-grid";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { makeReservations, schedule, spaces } from "@/demo/fixtures";
import { formatDuration } from "@/lib/duration";
import { formatDay, formatTime } from "@/lib/format";
import { canonicalZone, isValidTimeZone, localTimeZone, zoneCityLabel } from "@/lib/time-zone";

type Theme = "light" | "system" | "dark";
const THEME_KEY = "slot-picker:theme";

const VIEWER_ZONES = ["Asia/Kolkata", "America/New_York", "Europe/London", "Asia/Tokyo", "Australia/Sydney"];

function readTheme(): Theme {
  const fromQuery = new URLSearchParams(window.location.search).get("theme");
  if (fromQuery === "light" || fromQuery === "dark") return fromQuery;
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* storage may be blocked */
  }
  return "system";
}

function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = React.useState<Theme>(readTheme);
  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
    try {
      if (theme === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* storage may be blocked */
    }
  }, [theme]);
  return [theme, setTheme];
}

export function App(): React.ReactElement {
  const [theme, setTheme] = useTheme();
  // `?now=2026-10-17T03:30:00Z` pins the clock, so screenshots and demos are repeatable.
  // `?locale=en-US` overrides the browser locale, to show every label following it.
  const [locale] = React.useState(() => new URLSearchParams(window.location.search).get("locale") ?? undefined);
  // `?tz=America/New_York&slot=2026-10-17T19:00&duration=90` seeds a viewer and a selection.
  const [seed] = React.useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tz = params.get("tz");
    const duration = Number(params.get("duration"));
    return {
      tz: tz && isValidTimeZone(tz) ? canonicalZone(tz) : null,
      slot: params.get("slot") ?? undefined,
      duration: Number.isFinite(duration) && duration > 0 ? duration : undefined,
    };
  });
  const [now] = React.useState(() => {
    const pinned = new URLSearchParams(window.location.search).get("now");
    const parsed = pinned ? Date.parse(pinned) : Number.NaN;
    return Number.isNaN(parsed) ? Date.now() : parsed;
  });
  const reservations = React.useMemo(() => makeReservations(now), [now]);

  const local = React.useMemo(() => localTimeZone(), []);
  const zones = React.useMemo(() => [...new Set([local, ...VIEWER_ZONES, ...(seed.tz ? [seed.tz] : [])])], [local, seed.tz]);
  const [viewerTimeZone, setViewerTimeZone] = React.useState(seed.tz ?? local);
  const [status, setStatus] = React.useState<SlotGridStatus>("ready");
  const [confirmed, setConfirmed] = React.useState<BookingSelection | null>(null);

  return (
    <TooltipProvider delay={300}>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="font-semibold text-xl tracking-tight">Slot Picker</h1>
              <p className="max-w-md text-balance text-muted-foreground text-sm">
                A time-zone-aware booking grid for a venue in one zone and a viewer in another.
                Built on Base UI.
              </p>
            </div>
            <SegmentedControl<Theme> aria-label="Theme" onValueChange={setTheme} size="sm" value={theme}>
              <SegmentedControlItem<Theme> aria-label="Light theme" value="light">
                <SunIcon aria-hidden="true" />
              </SegmentedControlItem>
              <SegmentedControlItem<Theme> aria-label="Follow the system theme" value="system">
                <MonitorIcon aria-hidden="true" />
              </SegmentedControlItem>
              <SegmentedControlItem<Theme> aria-label="Dark theme" value="dark">
                <MoonIcon aria-hidden="true" />
              </SegmentedControlItem>
            </SegmentedControl>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-dashed px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">You are in</span>
              <Select<string> items={zones.map((z) => ({ label: zoneCityLabel(z), value: z }))} onValueChange={(next) => next && setViewerTimeZone(next)} value={viewerTimeZone}>
                <SelectTrigger aria-label="Your time zone" className="min-w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {zones.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {zoneCityLabel(zone)}
                      {zone === local ? " (detected)" : ""}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">State</span>
              <SegmentedControl<SlotGridStatus> aria-label="Demo state" onValueChange={setStatus} size="sm" value={status}>
                <SegmentedControlItem<SlotGridStatus> value="ready">Live</SegmentedControlItem>
                <SegmentedControlItem<SlotGridStatus> value="loading">Loading</SegmentedControlItem>
                <SegmentedControlItem<SlotGridStatus> value="error">Error</SegmentedControlItem>
              </SegmentedControl>
            </div>
          </div>
        </header>

        <div className="rounded-2xl border bg-card p-5 shadow-sm/5 sm:p-6">
          <BookingSlotPicker
            defaultDurationMinutes={seed.duration}
            defaultSlotId={seed.slot}
            locale={locale}
            now={now}
            onConfirm={setConfirmed}
            onRetry={() => setStatus("ready")}
            reservations={reservations}
            schedule={schedule}
            spaces={spaces}
            status={status}
            viewerTimeZone={viewerTimeZone}
          />
        </div>

        <p aria-live="polite" className="min-h-5 text-muted-foreground text-sm">
          {confirmed && (
            <>
              Confirmed: {spaces.find((s) => s.id === confirmed.spaceId)?.name} · {formatDay(confirmed.date, locale)} ·{" "}
              {formatTime(confirmed.slot.start, { locale, timeZone: schedule.timeZone })} ·{" "}
              {formatDuration(confirmed.durationMinutes, { locale })}
            </>
          )}
        </p>

        <footer className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
          <span>Derived from the booking engine behind Project 831, a pickleball venue in Jamshedpur.</span>
          <span>
            Keys: ← → ↑ ↓ · Home / End · Page Up / Down between periods
          </span>
        </footer>
      </main>
    </TooltipProvider>
  );
}
