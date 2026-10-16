/**
 * Time zones as data: every IANA zone the engine knows, each with a city, a
 * region and its offset at a given instant. Offsets are computed at an
 * instant, never stored, because they change: New York is GMT−4 on
 * 31 Oct 2026 and GMT−5 on 1 Nov.
 */
import { canonicalZone, zoneCityLabel, zoneOffsetMinutes } from "@/lib/time-zone";

/** For engines without `Intl.supportedValuesOf`: the zones people most often pick, one per offset band. */
export const FALLBACK_ZONES: readonly string[] = [
  "Pacific/Honolulu", "America/Anchorage", "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York",
  "America/Halifax", "America/Sao_Paulo", "America/Argentina/Buenos_Aires", "Atlantic/Azores", "UTC", "Europe/London", "Europe/Lisbon",
  "Europe/Paris", "Europe/Berlin", "Africa/Lagos", "Africa/Cairo", "Africa/Johannesburg", "Europe/Athens", "Europe/Istanbul",
  "Africa/Nairobi", "Asia/Riyadh", "Asia/Tehran", "Asia/Dubai", "Asia/Kabul", "Asia/Karachi", "Asia/Kolkata", "Asia/Colombo",
  "Asia/Kathmandu", "Asia/Dhaka", "Asia/Yangon", "Asia/Bangkok", "Asia/Jakarta", "Asia/Singapore", "Asia/Shanghai", "Asia/Hong_Kong",
  "Australia/Perth", "Asia/Tokyo", "Asia/Seoul", "Australia/Adelaide", "Australia/Brisbane", "Australia/Sydney", "Pacific/Noumea",
  "Pacific/Auckland", "Pacific/Chatham", "Pacific/Tongatapu", "Pacific/Kiritimati",
];

const REGION_LABEL: Readonly<Record<string, string>> = {
  Africa: "Africa",
  America: "Americas",
  Antarctica: "Antarctica",
  Arctic: "Arctic",
  Asia: "Asia",
  Atlantic: "Atlantic",
  Australia: "Australia",
  Europe: "Europe",
  Indian: "Indian Ocean",
  Pacific: "Pacific",
  UTC: "UTC",
};
const REGION_ORDER = ["UTC", "Asia", "Europe", "Africa", "Americas", "Australia", "Pacific", "Atlantic", "Indian Ocean", "Antarctica", "Arctic"];

let cached: string[] | null = null;

/** Every zone the engine supports, under current names (Asia/Calcutta → Asia/Kolkata), plus UTC. */
export function listTimeZones(source?: readonly string[]): string[] {
  if (!source && cached) return cached;
  let ids: readonly string[] = source ?? FALLBACK_ZONES;
  if (!source) {
    try {
      const supported = (Intl as { supportedValuesOf?: (key: "timeZone") => string[] }).supportedValuesOf?.("timeZone");
      if (supported && supported.length > 0) ids = supported;
    } catch {
      /* an engine without it uses the fallback list */
    }
  }
  const out = [...new Set(ids.map(canonicalZone).filter((id) => id === "UTC" || (id.includes("/") && !id.startsWith("Etc/"))))];
  if (!out.includes("UTC")) out.push("UTC");
  if (!source) cached = out;
  return out;
}

export interface ZoneOption {
  /** The IANA id: "Asia/Kolkata". */
  value: string;
  /** "Kolkata", "Buenos Aires". */
  city: string;
  /** "Asia", "Americas". */
  region: string;
  /** What sits between region and city, if anything: "Argentina", "Indiana". */
  area: string;
  offsetMinutes: number;
  /** "GMT+5:30", in the reader's locale. */
  offsetLabel: string;
  /** "India Standard Time": for search and for screen readers. */
  longName: string;
  /** "Kolkata (GMT+5:30)": what the input shows once chosen. */
  label: string;
}

const longFormatters = new Map<string, Intl.DateTimeFormat>();
const offsetFormatters = new Map<string, Intl.DateTimeFormat>();

function formatter(cache: Map<string, Intl.DateTimeFormat>, locale: string | undefined, timeZone: string, timeZoneName: "long" | "shortOffset"): Intl.DateTimeFormat {
  const key = `${locale ?? ""}|${timeZone}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName });
    cache.set(key, f);
  }
  return f;
}

function namePart(f: Intl.DateTimeFormat, at: number): string {
  return f.formatToParts(at).find((p) => p.type === "timeZoneName")?.value ?? "";
}

/** One zone at one instant: its city, region and live offset. */
export function describeZone(id: string, at: number, locale?: string): ZoneOption {
  const value = canonicalZone(id);
  const segments = value.split("/");
  const region = value === "UTC" ? "UTC" : (REGION_LABEL[segments[0] ?? ""] ?? segments[0] ?? "");
  const city = value === "UTC" ? "Coordinated Universal Time" : zoneCityLabel(value);
  const area = segments.length > 2 ? (segments[1] ?? "").replaceAll("_", " ") : "";
  const offsetLabel = namePart(formatter(offsetFormatters, locale, value, "shortOffset"), at) || "GMT";
  const longName = namePart(formatter(longFormatters, locale, value, "long"), at);
  return {
    value,
    city,
    region,
    area,
    offsetMinutes: zoneOffsetMinutes(at, value),
    offsetLabel,
    longName,
    label: value === "UTC" ? `UTC (${offsetLabel})` : `${city} (${offsetLabel})`,
  };
}

export interface ZoneGroup {
  /** The region label, e.g. "Asia". */
  value: string;
  items: ZoneOption[];
}

/** Zones grouped by region; inside a region, west to east by offset, then by city. */
export function groupZones(zones: readonly ZoneOption[]): ZoneGroup[] {
  const byRegion = new Map<string, ZoneOption[]>();
  for (const z of zones) byRegion.set(z.region, [...(byRegion.get(z.region) ?? []), z]);
  const rank = (r: string): number => {
    const i = REGION_ORDER.indexOf(r);
    return i < 0 ? REGION_ORDER.length : i;
  };
  return [...byRegion.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([value, items]) => ({ value, items: items.sort((a, b) => a.offsetMinutes - b.offsetMinutes || a.city.localeCompare(b.city)) }));
}

function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * Does `zone` match what someone typed? City, id, region, area, the long
 * name ("india", "pacific time") and the offset ("+5:30", "gmt-5", "utc+1").
 */
export function matchesZone(zone: ZoneOption, query: string): boolean {
  const q = fold(query.trim()).replace(/^utc(?=[+−-])/, "gmt").replace("−", "-");
  if (!q) return true;
  const offset = fold(zone.offsetLabel).replace("−", "-");
  const haystack = [zone.city, zone.value.replaceAll("_", " "), zone.region, zone.area, zone.longName].map(fold);
  if (haystack.some((h) => h.includes(q))) return true;
  if (/^[+-]\d/.test(q)) return offset === `gmt${q}` || offset.startsWith(`gmt${q}:`);
  return offset === q || (q.startsWith("gmt") && q.length > 3 && (offset === q || offset.startsWith(`${q}:`)));
}

/** Every zone, described at `at`, grouped by region. */
export function timeZoneGroups(at: number, locale?: string, ids: readonly string[] = listTimeZones()): ZoneGroup[] {
  return groupZones(ids.map((id) => describeZone(id, at, locale)));
}
