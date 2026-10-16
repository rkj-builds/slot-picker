/**
 * The SlotGrid keyboard model, as a pure function over a snapshot of the
 * cells. No DOM here: the Root reads the cells in document order, measures
 * how many columns a wrapped row has, and asks this file where a key goes.
 * That keeps the model unit-testable and the same in jsdom and a browser.
 */

export type SlotGridOrientation = "horizontal" | "vertical";

export type SlotGridKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Home" | "End" | "PageUp" | "PageDown";

export const SLOT_GRID_KEYS: readonly SlotGridKey[] = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"];

export function isSlotGridKey(key: string): key is SlotGridKey {
  return (SLOT_GRID_KEYS as readonly string[]).includes(key);
}

export interface NavigationItem {
  /** Index of the cell's group (a period of the day, or a court). */
  group: number;
  /** Optional interval the cell stands for (minutes, or epoch ms). Used to move between groups "at the same time". */
  start?: number | undefined;
  end?: number | undefined;
}

export interface NavigationOptions {
  /**
   * - horizontal: cells run left to right and wrap into rows (the booking flow's start times).
   * - vertical: each group is a column and its cells run top to bottom (the desk's courts).
   */
  orientation: SlotGridOrientation;
  /** Left/Right (horizontal) wrap from the last cell to the first. */
  loop: boolean;
  /** Columns in the wrapped row that holds `index` (horizontal only). */
  columnsAt: (index: number) => number;
  direction?: "ltr" | "rtl";
  /** Ctrl or Cmd was held: Home/End reach the ends of the whole grid. */
  modifier?: boolean;
}

/** Where `key` moves focus from `current`, or null when it stays. */
export function nextIndex(items: readonly NavigationItem[], current: number, key: SlotGridKey, options: NavigationOptions): number | null {
  const item = items[current];
  if (!item || items.length === 0) return null;
  const rtl = options.direction === "rtl";
  // Logical keys: in a right-to-left page, "forward" is ArrowLeft.
  const logical: SlotGridKey = rtl && key === "ArrowLeft" ? "ArrowRight" : rtl && key === "ArrowRight" ? "ArrowLeft" : key;

  const groups = groupIndices(items);
  const groupPosition = groups.findIndex((g) => g.group === item.group);
  const members = groups[groupPosition]?.members ?? [current];
  const inGroup = members.indexOf(current);

  const firstOfGroup = (offset: number): number | null => groups[groupPosition + offset]?.members[0] ?? null;

  if (logical === "PageDown") return firstOfGroup(1);
  if (logical === "PageUp") return firstOfGroup(-1);

  if (options.orientation === "horizontal") {
    switch (logical) {
      case "ArrowRight":
        return current + 1 < items.length ? current + 1 : options.loop ? 0 : null;
      case "ArrowLeft":
        return current > 0 ? current - 1 : options.loop ? items.length - 1 : null;
      case "Home":
        return 0;
      case "End":
        return items.length - 1;
      case "ArrowDown": {
        const cols = Math.max(1, options.columnsAt(current));
        const below = inGroup + cols;
        if (below < members.length) return members[below] ?? null;
        // A shorter last row: there is a row below, just not this column. Land on its last cell.
        const row = Math.floor(inGroup / cols);
        const lastRow = Math.floor((members.length - 1) / cols);
        if (row < lastRow) return members[members.length - 1] ?? null;
        const next = groups[groupPosition + 1]?.members;
        if (!next) return null;
        return next[Math.min(inGroup % cols, next.length - 1)] ?? null;
      }
      case "ArrowUp": {
        const cols = Math.max(1, options.columnsAt(current));
        const above = inGroup - cols;
        if (above >= 0) return members[above] ?? null;
        const prev = groups[groupPosition - 1]?.members;
        const firstPrev = prev?.[0];
        if (!prev || firstPrev === undefined) return null;
        const prevCols = Math.max(1, options.columnsAt(firstPrev));
        const lastRowStart = Math.floor((prev.length - 1) / prevCols) * prevCols;
        return prev[Math.min(lastRowStart + (inGroup % cols), prev.length - 1)] ?? null;
      }
    }
  }

  // Vertical: a group is a column.
  switch (logical) {
    case "ArrowDown":
      return members[inGroup + 1] ?? null;
    case "ArrowUp":
      return inGroup > 0 ? (members[inGroup - 1] ?? null) : null;
    case "Home":
      return options.modifier ? 0 : (members[0] ?? null);
    case "End":
      return options.modifier ? items.length - 1 : (members[members.length - 1] ?? null);
    case "ArrowRight":
    case "ArrowLeft": {
      const target = groups[groupPosition + (logical === "ArrowRight" ? 1 : -1)]?.members;
      if (!target) return null;
      return sameTimeIn(items, target, item, inGroup);
    }
  }
  return null;
}

/** The cell in `members` that covers the moment `item` starts; else the nearest start; else the same position. */
function sameTimeIn(items: readonly NavigationItem[], members: readonly number[], item: NavigationItem, inGroup: number): number | null {
  const at = item.start;
  if (at !== undefined) {
    const covering = members.find((i) => {
      const c = items[i];
      return c?.start !== undefined && c.end !== undefined && c.start <= at && at < c.end;
    });
    if (covering !== undefined) return covering;
    let best: number | null = null;
    let distance = Number.POSITIVE_INFINITY;
    for (const i of members) {
      const s = items[i]?.start;
      if (s === undefined) continue;
      const d = Math.abs(s - at);
      if (d < distance) {
        best = i;
        distance = d;
      }
    }
    if (best !== null) return best;
  }
  return members[Math.min(inGroup, members.length - 1)] ?? null;
}

function groupIndices(items: readonly NavigationItem[]): { group: number; members: number[] }[] {
  const out: { group: number; members: number[] }[] = [];
  items.forEach((item, index) => {
    const last = out.at(-1);
    if (last?.group === item.group) last.members.push(index);
    else out.push({ group: item.group, members: [index] });
  });
  return out;
}
