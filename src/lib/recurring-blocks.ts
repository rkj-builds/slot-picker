/**
 * Repeating blocks: a court held on a schedule (the Off-Screen Club Juniors
 * hold courts 1 and 2 every Saturday and Sunday, 4 – 5 pm, until it is
 * ended). Stored as one rule, never as rows per date: a rule with no end
 * cannot be written out, and ending it must free every later date at once.
 *
 * Everything that asks "is this court free?" sees the rule's occurrences as
 * ordinary blocked bookings with ids that start "rb:", made on demand for the
 * dates it is looking at.
 */
import type { Booking } from "@/lib/booking";
import { addDays, type PlainDate } from "@/lib/plain-date";
import type { CourtId } from "@/lib/venue";
import { expandRecurrence, type RecurrenceRule } from "@/primitives/recurrence";

export interface RecurringBlock {
  id: string;
  title: string;
  courtIds: CourtId[];
  rule: RecurrenceRule;
  createdAt: number;
}

const PREFIX = "rb:";

export function isRecurringId(id: string): boolean {
  return id.startsWith(PREFIX);
}

/** "rb:<block>:<date>:<court>" → the block id and the date. */
export function parseRecurringId(id: string): { blockId: string; date: PlainDate } | null {
  if (!isRecurringId(id)) return null;
  const [, blockId = "", date = ""] = id.split(":");
  return { blockId, date: date as PlainDate };
}

/** The blocks' occurrences between two venue dates, as blocked bookings, one per court. */
export function recurringBookings(blocks: readonly RecurringBlock[], from: PlainDate, to: PlainDate): Booking[] {
  return blocks.flatMap((block) =>
    expandRecurrence(block.rule, { from, to }).flatMap((occurrence) =>
      block.courtIds.map(
        (courtId): Booking => ({
          id: `${PREFIX}${block.id}:${occurrence.date}:${courtId}`,
          courtId,
          date: occurrence.date,
          startMinute: block.rule.startMinute,
          durationMinutes: block.rule.endMinute - block.rule.startMinute,
          customerId: null,
          kind: "blocked",
          title: block.title,
          players: 0,
          notes: "",
          source: "desk",
          status: "confirmed",
          payMode: "venue",
          pricePaise: 0,
          holdExpiresAt: null,
          createdAt: block.createdAt,
          cancelledAt: null,
          ledger: [],
        }),
      ),
    ),
  );
}

/** The stored bookings plus the blocks' occurrences on the dates in [from, to]. */
export function bookingsWithBlocks(state: { bookings: readonly Booking[]; recurringBlocks: readonly RecurringBlock[] }, from: PlainDate, to: PlainDate = from): Booking[] {
  return [...state.bookings, ...recurringBookings(state.recurringBlocks, from, to)];
}

/** The real hold this demo copies: Off-Screen Club Juniors, both courts, Sat and Sun 4 – 5 pm, no end date. */
export function offScreenClubJuniors(startDate: PlainDate, createdAt: number): RecurringBlock {
  return {
    id: "osc-juniors",
    title: "Off-Screen Club Juniors",
    courtIds: ["court-1", "court-2"],
    createdAt,
    rule: {
      interval: 1,
      weekdays: ["sat", "sun"],
      startDate,
      startMinute: 16 * 60,
      endMinute: 17 * 60,
      timeZone: "Asia/Kolkata",
      end: { type: "never" },
      exceptions: [],
    },
  };
}

/** End a block so that `date` and every date after it are free again. */
export function endBlockFrom(block: RecurringBlock, date: PlainDate): RecurringBlock {
  return { ...block, rule: { ...block.rule, end: { type: "until", date: addDays(date, -1) } } };
}
