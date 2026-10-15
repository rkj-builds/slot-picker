/**
 * Money is integer paise, always. Rupees exist only on screen.
 *
 * A float rupee amount cannot represent ₹0.10 exactly, and a split that is
 * computed in floats can lose or invent a paisa. Every amount in the domain
 * is a whole number of paise; every split puts the rounding remainder on one
 * side, so the parts always add back to the whole.
 */

export type Paise = number;

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(fractionDigits: 0 | 2): Intl.NumberFormat {
  const key = String(fractionDigits);
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(key, f);
  }
  return f;
}

/** "₹1,25,000" for whole rupees, "₹412.50" when there are paise. Indian digit grouping. */
export function formatInr(paise: Paise): string {
  assertPaise(paise);
  return paise % 100 === 0 ? formatter(0).format(paise / 100) : formatter(2).format(paise / 100);
}

export function rupees(amount: number): Paise {
  const paise = Math.round(amount * 100);
  assertPaise(paise);
  return paise;
}

export function toRupees(paise: Paise): number {
  return paise / 100;
}

/**
 * Split `total` into a part paid now and the rest, by a whole-number percent.
 * The "now" part is rounded half-up to the paisa; the balance takes whatever
 * is left, so `now + later === total` for every input.
 */
export function splitPaise(total: Paise, percent: number): { now: Paise; later: Paise } {
  assertPaise(total);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new RangeError(`Bad percent: ${percent}`);
  const now = Math.min(total, Math.floor((total * percent + 50) / 100));
  return { now, later: total - now };
}

export function sumPaise(values: readonly Paise[]): Paise {
  return values.reduce((a, b) => a + b, 0);
}

function assertPaise(value: number): void {
  if (!Number.isSafeInteger(value)) throw new RangeError(`Paise must be a whole number, got ${value}`);
}
