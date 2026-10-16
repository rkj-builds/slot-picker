/**
 * TimeZone: zones as data (every IANA zone, live offsets, grouped by region,
 * searchable) and the hook that feeds a Base UI Combobox. The markup is the
 * caller's: Base UI's unstyled parts, or coss's Combobox.
 */
export { describeZone, FALLBACK_ZONES, groupZones, listTimeZones, matchesZone, timeZoneGroups, type ZoneGroup, type ZoneOption } from "@/primitives/time-zone/zones";
export { type TimeZoneComboboxRootProps, type UseTimeZoneComboboxParameters, useTimeZoneCombobox } from "@/primitives/time-zone/use-time-zone-combobox";
