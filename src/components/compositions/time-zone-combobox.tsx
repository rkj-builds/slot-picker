"use client";

import { GlobeIcon } from "lucide-react";
import type * as React from "react";
import {
  Combobox,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxSeparator,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { useTimeZoneCombobox, type ZoneGroup, type ZoneOption } from "@/primitives/time-zone";

export interface TimeZoneComboboxProps {
  value: string;
  onValueChange: (timeZone: string) => void;
  /** Offsets are shown as they are at this instant: pass the day being looked at, so DST is right for it. */
  at: number;
  locale?: string;
  size?: "sm" | "default" | "lg";
  zones?: readonly string[];
  className?: string;
  /** For a Field label: `aria-labelledby` or a plain `aria-label`. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  id?: string;
}

/**
 * Pick a zone: coss Combobox (Base UI's ARIA combobox and keyboard) over the
 * TimeZone primitive's grouped, searchable options. Each row reads
 * "Kolkata, Asia, GMT+5:30"; search matches cities, countries' long names
 * ("india"), regions and offsets ("+5:30").
 */
export function TimeZoneCombobox({ value, onValueChange, at, locale, size = "default", zones, className, id, ...aria }: TimeZoneComboboxProps): React.ReactElement {
  const { rootProps } = useTimeZoneCombobox({ value, onValueChange, at, locale, zones });
  return (
    <Combobox {...rootProps}>
      <ComboboxInput
        {...aria}
        className={cn("tabular-nums", className)}
        id={id}
        placeholder="City, country or offset"
        size={size}
        startAddon={<GlobeIcon />}
      />
      <ComboboxPopup className="w-[min(22rem,var(--available-width))]">
        <ComboboxEmpty>No zone by that name or offset.</ComboboxEmpty>
        <ComboboxList>
          {(group: ZoneGroup) => (
            <ComboboxGroup items={group.items} key={group.value}>
              <ComboboxGroupLabel>{group.value}</ComboboxGroupLabel>
              <ComboboxCollection>
                {(zone: ZoneOption) => (
                  <ComboboxItem key={zone.value} value={zone}>
                    <span className="flex w-full items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate">
                        {zone.city}
                        {zone.area && <span className="text-muted-foreground">, {zone.area}</span>}
                      </span>
                      <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{zone.offsetLabel}</span>
                    </span>
                  </ComboboxItem>
                )}
              </ComboboxCollection>
              <ComboboxSeparator />
            </ComboboxGroup>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}
