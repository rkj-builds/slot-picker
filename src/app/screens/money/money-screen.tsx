"use client";

import { RotateCcwIcon } from "lucide-react";
import type * as React from "react";
import { Anchor } from "@/app/anchor";
import type { ScreenProps } from "@/app/desk/sections";
import { sectionById } from "@/app/desk/sections";
import { dayOf } from "@/app/format";
import { hrefFor } from "@/app/router";
import { CreditsTab } from "@/app/screens/money/credits-tab";
import { DuesTab } from "@/app/screens/money/dues-tab";
import {
  type DateRange,
  type MoneyTab,
  oldestWaiting,
  presetOf,
  RANGE_PRESETS,
  rangeFromQuery,
  rangeQuery,
  tabOf,
  tabPath,
  totalsOf,
} from "@/app/screens/money/money-model";
import { PaymentsTab } from "@/app/screens/money/payments-tab";
import { PageHeader, Screen } from "@/app/screens/screen-kit";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRead } from "@/data/provider";
import { formatInr } from "@/lib/money";
import { addDays, type PlainDate } from "@/lib/plain-date";
import { segmentedControlItemVariants, segmentedControlRootClassName } from "@/lib/segmented-control";
import { cn } from "@/lib/utils";

const TABS: readonly { id: MoneyTab; label: string }[] = [
  { id: "payments", label: "Payments" },
  { id: "dues", label: "Dues" },
  { id: "credits", label: "Credits" },
];

/** How far back "waiting for approval" looks: cash is approved within days, so a year is everything. */
const WAITING_WINDOW_DAYS = 365;

/**
 * Money: what came in (#/desk/money), what is still owed (…/dues) and the
 * credit customers hold (…/credits). The strip on top answers "how are we
 * doing" at a glance and each tile opens the tab that explains it; the date
 * range lives in the URL so it follows you between tabs and into a link.
 */
export function MoneyScreen({ route, sub, today }: ScreenProps): React.ReactElement {
  const section = sectionById("money");
  const tab = tabOf(sub);
  const range = rangeFromQuery(route.query, today);
  const keep = rangeQuery(range, today);
  return (
    <Screen>
      <PageHeader description={section.line} title={section.label} />
      <SummaryStrip keep={keep} range={range} today={today} />
      <nav aria-label="Money views" className={cn(segmentedControlRootClassName, "self-start")}>
        {TABS.map((t) => (
          <Anchor
            aria-current={t.id === tab ? "page" : undefined}
            className={segmentedControlItemVariants({ size: "default", state: "current" })}
            href={hrefFor(tabPath(t.id), keep)}
            key={t.id}
          >
            {t.label}
          </Anchor>
        ))}
      </nav>
      {tab === "payments" ? <PaymentsTab range={range} route={route} today={today} /> : tab === "dues" ? <DuesTab route={route} today={today} /> : <CreditsTab route={route} today={today} />}
    </Screen>
  );
}

function rangeLabel(range: DateRange, today: PlainDate): string {
  const preset = presetOf(range, today);
  if (preset) return RANGE_PRESETS.find((p) => p.id === preset)?.label.toLowerCase() ?? "";
  return range.from === range.to ? dayOf(range.from) : `${dayOf(range.from)} – ${dayOf(range.to)}`;
}

/** Four numbers, each a link to the tab that explains it. A tile whose read fails says so and leaves the tab to offer Retry. */
function SummaryStrip({ range, today, keep }: { range: DateRange; today: PlainDate; keep: Record<string, string | null> }): React.ReactElement {
  const inRange = useRead(["money", "payments", range.from, range.to], (c) => c.money.payments(range));
  const windowFrom = addDays(today, -WAITING_WINDOW_DAYS);
  const recent = useRead(["money", "payments", windowFrom, today], (c) => c.money.payments({ from: windowFrom, to: today }));
  const dues = useRead(["money", "dues"], (c) => c.money.dues());
  const credits = useRead(["money", "credits"], (c) => c.money.credits());

  const totals = inRange.data ? totalsOf(inRange.data.payments) : null;
  const owed = dues.data ? dues.data.dues.reduce((sum, d) => sum + d.duePaise, 0) : null;
  const owing = dues.data ? new Set(dues.data.dues.map((d) => d.customerId ?? "")).size : 0;
  const holding = credits.data ? credits.data.credits.filter((c) => c.creditPaise > 0) : null;
  const waiting = recent.data ? recent.data.payments.filter((p) => !p.approved) : null;
  const waitingFrom = recent.data ? oldestWaiting(recent.data.payments) : null;

  return (
    <section aria-label="Summary">
      <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Tile
          failed={inRange.isError}
          onRetry={() => void inRange.refetch()}
          href={hrefFor(tabPath("payments"), keep)}
          label={`Collected, ${rangeLabel(range, today)}`}
          sub={totals ? `${formatInr(totals.cashPaise)} cash · ${formatInr(totals.onlinePaise)} online` : null}
          value={totals ? formatInr(totals.inPaise) : null}
        />
        <Tile
          failed={dues.isError}
          onRetry={() => void dues.refetch()}
          href={hrefFor(tabPath("dues"), keep)}
          label="Still owed"
          sub={owed === null ? null : owed === 0 ? "Nobody owes anything" : `${owing} ${owing === 1 ? "customer" : "customers"}`}
          value={owed === null ? null : formatInr(owed)}
        />
        <Tile
          failed={credits.isError}
          onRetry={() => void credits.refetch()}
          href={hrefFor(tabPath("credits"), keep)}
          label="Credit held for customers"
          sub={holding ? `${holding.length} ${holding.length === 1 ? "customer" : "customers"}` : null}
          value={holding ? formatInr(holding.reduce((sum, c) => sum + c.creditPaise, 0)) : null}
        />
        <Tile
          failed={recent.isError}
          onRetry={() => void recent.refetch()}
          href={hrefFor(tabPath("payments"), waitingFrom ? { from: waitingFrom, to: today, approval: "waiting" } : { ...keep, approval: "waiting" })}
          label="Waiting for approval"
          sub={waiting ? (waiting.length === 0 ? "All cash checked" : `${formatInr(waiting.reduce((sum, p) => sum + p.amountPaise, 0))} of cash to check`) : null}
          value={waiting ? String(waiting.length) : null}
        />
      </ul>
    </section>
  );
}

function Tile({ label, value, sub, href, failed, onRetry }: { label: string; value: string | null; sub: string | null; href: string; failed: boolean; onRetry: () => void }): React.ReactElement {
  const frame = "flex h-full flex-col gap-1 rounded-xl border bg-card p-3 shadow-xs/5 sm:p-4";
  if (failed) {
    return (
      <li className={cn(frame, "items-start")}>
        <span className="text-muted-foreground text-xs sm:text-sm">{label}</span>
        <span className="text-sm">Couldn't load</span>
        <Button className="-ms-2" onClick={onRetry} size="xs" variant="ghost">
          <RotateCcwIcon aria-hidden="true" />
          Try again
        </Button>
      </li>
    );
  }
  return (
    <li className="min-w-0">
      <a className={cn(frame, "outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring")} href={href}>
        <span className="text-muted-foreground text-xs sm:text-sm">{label}</span>{" "}
        {value === null ? (
          <>
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-32 max-w-full" />
          </>
        ) : (
          <>
            <span className="font-semibold text-xl tabular-nums sm:text-2xl">{value}</span>{" "}
            {sub && <span className="text-pretty text-muted-foreground text-xs">{sub}</span>}
          </>
        )}
      </a>
    </li>
  );
}
