/**
 * TimeZone: zones as data (every IANA zone, live offsets, grouped by region,
 * searchable by city, old name, abbreviation or offset, optionally with the
 * viewer's own zone pinned first) and the hook that feeds a Base UI Combobox.
 * The markup is the caller's: Base UI's unstyled parts, or coss's Combobox.
 */
export {
  describeZone,
  FALLBACK_ZONES,
  groupZones,
  listTimeZones,
  matchesZone,
  PINNED_GROUP_LABEL,
  pinZone,
  timeZoneGroups,
  zoneAbbreviations,
  type ZoneGroup,
  type ZoneOption,
} from "@/primitives/time-zone/zones";
export { type TimeZoneComboboxRootProps, type UseTimeZoneComboboxParameters, useTimeZoneCombobox } from "@/primitives/time-zone/use-time-zone-combobox";
