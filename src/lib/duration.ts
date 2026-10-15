/**
 * Durations are never decimal. "1 hour 30 minutes", never "1.5 hours".
 *
 * Built from `Intl.NumberFormat` unit formatting joined with a unit-style
 * `Intl.ListFormat`, which reads "1 hour 30 minutes" in English and localises
 * properly elsewhere. `Intl.DurationFormat` would do a similar job, but
 * its `long` style inserts a comma in English ("1 hour, 30 minutes") and it is
 * still missing from some engines; this reads the same everywhere.
 */

export type DurationStyle = "long" | "short" | "narrow";

export interface FormatDurationOptions {
  locale?: string;
  style?: DurationStyle;
}

export function formatDuration(
  minutes: number,
  { locale, style = "long" }: FormatDurationOptions = {},
): string {
  if (!Number.isFinite(minutes) || minutes < 0) throw new RangeError(`Bad duration: ${minutes}`);
  const whole = Math.round(minutes);
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;

  const unit = (value: number, name: "hour" | "minute"): string =>
    new Intl.NumberFormat(locale, { style: "unit", unit: name, unitDisplay: style }).format(value);

  const parts: string[] = [];
  if (hours > 0) parts.push(unit(hours, "hour"));
  if (rest > 0 || hours === 0) parts.push(unit(rest, "minute"));

  // The narrow unit list is the one CLDR uses for "1 hour 30 minutes"; the
  // long form adds a comma in English. Locales that separate with a comma
  // even in narrow form (German) still get their own correct punctuation.
  return new Intl.ListFormat(locale, { type: "unit", style: "narrow" }).format(parts);
}
