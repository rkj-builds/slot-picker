"use client";

import type * as React from "react";
import { dayOf } from "@/app/format";
import { useStore } from "@/app/store";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { computeInsights, formatPercent, mondayOf, PAYMENT_GROUP_LABEL } from "@/lib/insights";
import { formatInr } from "@/lib/money";
import { addDays, compareDates, type PlainDate } from "@/lib/plain-date";
import { cn } from "@/lib/utils";

/**
 * The numbers behind the policy, from the store. Every chart is inline SVG
 * with a title, a one-line takeaway, a native tooltip per mark and a table
 * for screen readers, so no number lives in colour or position alone.
 */
export function InsightsView({ today }: { today: PlainDate }): React.ReactElement {
  const { state } = useStore();
  const insights = computeInsights(state.bookings, today);
  const policyWeek = mondayOf(addDays(today, -28));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
        <Badge variant="warning">Demo data</Badge>
        <span>Shaped like Project 831's real numbers. Finished days only, {insights.finishedBookings} bookings.</span>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <Hero label="Unpaid self-serve bookings cancelled" sub={`${insights.unpaid.cancelled} of ${insights.unpaid.total}`} value={formatPercent(insights.unpaid.cancelRate)} />
        <Hero label="Paid or part-paid, cancelled" sub={`${insights.paid.cancelled} of ${insights.paid.total}`} value={formatPercent(insights.paid.cancelRate)} />
        <Hero label="No-shows: unpaid vs paid" sub="Money up front, nobody ghosts" value={`${insights.unpaid.noShows} vs ${insights.paid.noShows}`} />
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard description="Self-serve bookings, by what was paid before the day." title="Cancellation rate by payment">
          <HBars
            format={formatPercent}
            label="Cancellation rate by payment"
            max={1}
            rows={insights.groups.map((g) => ({
              label: PAYMENT_GROUP_LABEL[g.group],
              value: g.cancelRate,
              note: `${g.cancelled} of ${g.total}`,
              tone: g.group === "none" ? "warning" : "info",
            }))}
          />
        </ChartCard>

        <ChartCard description="Booked and never came. Every one was unpaid." title="No-shows">
          <HBars
            format={(v) => String(v)}
            label="No-shows by payment"
            rows={insights.groups.map((g) => ({ label: PAYMENT_GROUP_LABEL[g.group], value: g.noShows, note: `of ${g.total}`, tone: g.group === "none" ? "warning" : "info" }))}
          />
        </ChartCard>

        <ChartCard description="Courts left empty by unpaid cancellations and no-shows, against money kept from prepaid ones." title="Revenue lost vs recovered">
          <HBars
            format={formatInr}
            label="Revenue lost versus recovered by deposits"
            rows={[
              { label: "Lost (nothing paid)", value: insights.lostPaise, tone: "warning" },
              { label: "Kept by deposits", value: insights.recoveredPaise, tone: "info" },
            ]}
          />
        </ChartCard>

        <ChartCard description="Bookings per week by channel. Pay-first went live four weeks ago." title="Self-serve share">
          <WeekColumns policyWeek={policyWeek} weeks={insights.weeks} />
          <p className="mt-2 text-muted-foreground text-xs">{formatPercent(insights.selfServeShare)} of all bookings were made online.</p>
        </ChartCard>
      </div>
    </div>
  );
}

function Hero({ label, value, sub }: { label: string; value: string; sub: string }): React.ReactElement {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border bg-card px-5 py-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="font-semibold text-3xl tabular-nums tracking-tight">{value}</dd>
      <dd className="text-muted-foreground text-xs">{sub}</dd>
    </div>
  );
}

function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <h2>
          <CardTitle>{title}</CardTitle>
        </h2>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardPanel>{children}</CardPanel>
    </Card>
  );
}

type Tone = "info" | "warning" | "muted";
const FILL: Record<Tone, string> = { info: "fill-info", warning: "fill-warning", muted: "fill-muted-foreground/40" };

interface BarRow {
  label: string;
  value: number;
  note?: string;
  tone: Tone;
}

/** Horizontal bars: thin, rounded at the data end, labelled directly in text colour. */
function HBars({ rows, max, format, label }: { rows: BarRow[]; max?: number; format: (v: number) => string; label: string }): React.ReactElement {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  const rowH = 44;
  return (
    <figure>
      <svg aria-hidden="true" className="w-full overflow-visible" viewBox={`0 0 400 ${rows.length * rowH}`}>
        {rows.map((r, i) => {
          const w = Math.max(r.value > 0 ? 4 : 0, (r.value / top) * 300);
          const y = i * rowH;
          return (
            <g key={r.label}>
              <title>{`${r.label}: ${format(r.value)}${r.note ? ` (${r.note})` : ""}`}</title>
              <text className="fill-muted-foreground text-[11px]" x="0" y={y + 12}>
                {r.label}
              </text>
              <rect className="fill-muted" height="10" rx="5" width="300" x="0" y={y + 20} />
              <rect className={FILL[r.tone]} height="10" rx="5" width={w} x="0" y={y + 20} />
              <text className="fill-foreground font-medium text-[12px] tabular-nums" x="308" y={y + 29}>
                {format(r.value)}
                {r.note && <tspan className="fill-muted-foreground font-normal text-[11px]">{`  ${r.note}`}</tspan>}
              </text>
            </g>
          );
        })}
      </svg>
      {/* sr-only on a wrapper: a <table> ignores the 1px width and would widen the page. */}
      <div className="sr-only">
        <table>
          <caption>{label}</caption>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td>
                  {format(r.value)}
                  {r.note ? ` (${r.note})` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

const SERIES = [
  { key: "paid", label: "Online, paid up front", tone: "info" as Tone },
  { key: "unpaid", label: "Online, nothing paid", tone: "warning" as Tone },
  { key: "desk", label: "At the desk", tone: "muted" as Tone },
] as const;

function WeekColumns({ weeks, policyWeek }: { weeks: ReturnType<typeof computeInsights>["weeks"]; policyWeek: PlainDate }): React.ReactElement {
  const height = 160;
  const max = Math.max(1, ...weeks.map((w) => w.selfServe + w.desk));
  const col = 400 / Math.max(1, weeks.length);
  const bar = Math.min(28, col - 10);
  return (
    <figure className="flex flex-col gap-2">
      <ul aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
        {SERIES.map((s) => (
          <li className="flex items-center gap-1.5" key={s.key}>
            <svg className="size-2.5" viewBox="0 0 10 10">
              <rect className={FILL[s.tone]} height="10" rx="2" width="10" />
            </svg>
            {s.label}
          </li>
        ))}
      </ul>
      <svg aria-hidden="true" className="w-full overflow-visible" viewBox={`0 0 400 ${height + 20}`}>
        <line className="stroke-border" x1="0" x2="400" y1={height} y2={height} />
        {weeks.map((w, i) => {
          const parts = [w.selfServe - w.selfServeUnpaid, w.selfServeUnpaid, w.desk];
          let y = height;
          const x = i * col + (col - bar) / 2;
          const after = compareDates(w.weekOf, policyWeek) >= 0;
          return (
            <g key={w.weekOf}>
              <title>{`Week of ${dayOf(w.weekOf)}: ${parts[0]} paid online, ${parts[1]} unpaid online, ${parts[2]} at the desk`}</title>
              {parts.map((n, s) => {
                const h = (n / max) * (height - 8);
                y -= h;
                const tone = SERIES[s]?.tone ?? "muted";
                // A 2px surface gap between stacked segments.
                return n > 0 ? <rect className={cn(FILL[tone], "stroke-card")} height={h} key={s} rx="3" strokeWidth="2" width={bar} x={x} y={y} /> : null;
              })}
              <text className={cn("text-[10px]", after ? "fill-foreground" : "fill-muted-foreground")} textAnchor="middle" x={x + bar / 2} y={height + 14}>
                {dayOf(w.weekOf).replace(/^\w+, /, "")}
              </text>
            </g>
          );
        })}
        {(() => {
          const i = weeks.findIndex((w) => compareDates(w.weekOf, policyWeek) >= 0);
          if (i < 0) return null;
          const x = i * col;
          return (
            <g>
              <line className="stroke-foreground/40" strokeDasharray="3 3" x1={x} x2={x} y1="0" y2={height} />
              <text className="fill-foreground text-[10px]" x={x + 4} y="10">
                Pay-first on
              </text>
            </g>
          );
        })()}
      </svg>
      {/* sr-only on a wrapper: a <table> ignores the 1px width and would widen the page. */}
      <div className="sr-only">
        <table>
          <caption>Bookings per week by channel</caption>
          <thead>
            <tr>
              <th scope="col">Week of</th>
              {SERIES.map((s) => (
                <th key={s.key} scope="col">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.weekOf}>
                <th scope="row">{dayOf(w.weekOf)}</th>
                <td>{w.selfServe - w.selfServeUnpaid}</td>
                <td>{w.selfServeUnpaid}</td>
                <td>{w.desk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
