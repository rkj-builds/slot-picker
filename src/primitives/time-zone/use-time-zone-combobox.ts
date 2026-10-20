"use client";

import * as React from "react";
import { canonicalZone } from "@/lib/time-zone";
import { describeZone, listTimeZones, matchesZone, PINNED_GROUP_LABEL, pinZone, timeZoneGroups, type ZoneGroup, type ZoneOption } from "@/primitives/time-zone/zones";

export interface UseTimeZoneComboboxParameters {
  /** The chosen zone id. */
  value: string;
  onValueChange: (timeZone: string) => void;
  /** Offsets are shown as they are at this instant (the day being looked at), so DST is right for that day. */
  at: number;
  locale?: string;
  /** Limit the list (tests, a venue's short list). Defaults to every zone the engine knows. */
  zones?: readonly string[];
  /**
   * A zone listed first, in a group of its own (usually the viewer's, `localTimeZone()`).
   * Off by default; the zone is taken out of its region so it appears once.
   */
  pinned?: string | null;
  /** The pinned group's label. Default "Your time zone". */
  pinnedLabel?: string;
}

export interface TimeZoneComboboxRootProps {
  items: ZoneGroup[];
  value: ZoneOption;
  onValueChange: (zone: ZoneOption | null) => void;
  filter: (zone: ZoneOption, query: string) => boolean;
  itemToStringLabel: (zone: ZoneOption) => string;
  isItemEqualToValue: (a: ZoneOption, b: ZoneOption) => boolean;
  autoHighlight: boolean;
}

/**
 * The model for a time-zone picker: grouped options with live offsets,
 * search over city, region, long name and offset, and the props a Base UI
 * Combobox.Root needs. Spread `rootProps` onto any Combobox root, styled or
 * bare; Base UI supplies the ARIA combobox pattern and the keyboard.
 */
export function useTimeZoneCombobox({ value, onValueChange, at, locale, zones, pinned = null, pinnedLabel = PINNED_GROUP_LABEL }: UseTimeZoneComboboxParameters): {
  rootProps: TimeZoneComboboxRootProps;
  selected: ZoneOption;
  groups: ZoneGroup[];
} {
  // Offsets change only at transitions; recomputing per hour of `at` is plenty.
  const hour = Math.floor(at / 3_600_000) * 3_600_000;
  const ids = zones ?? listTimeZones();
  const groups = React.useMemo(() => {
    const all = timeZoneGroups(hour, locale, ids);
    return pinned ? pinZone(all, pinned, hour, locale, pinnedLabel) : all;
  }, [hour, locale, ids, pinned, pinnedLabel]);
  const current = canonicalZone(value);
  const selected = React.useMemo(
    () => groups.flatMap((g) => g.items).find((z) => z.value === current) ?? describeZone(current, hour, locale),
    [groups, current, hour, locale],
  );
  return {
    groups,
    selected,
    rootProps: {
      items: groups,
      value: selected,
      onValueChange: (zone) => {
        if (zone) onValueChange(zone.value);
      },
      filter: matchesZone,
      itemToStringLabel: (zone) => zone.label,
      isItemEqualToValue: (a, b) => a.value === b.value,
      autoHighlight: true,
    },
  };
}
