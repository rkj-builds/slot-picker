"use client";

import { HourglassIcon, ReceiptIcon } from "lucide-react";
import * as React from "react";
import { StepHeading } from "@/app/book/book-page";
import { CheckoutDialog } from "@/app/book/checkout-dialog";
import { useFlow } from "@/app/book/flow";
import { SlotTakenNotice } from "@/app/book/slot-taken-notice";
import { StepActions, StepCard, StepLayout, type SummaryRow } from "@/app/book/step-actions";
import { dayOf, durationOf, timeRangeOf, whenOf } from "@/app/format";
import { useNow } from "@/app/clock";
import { useStore } from "@/app/store";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Drawer, DrawerClose, DrawerDescription, DrawerFooter, DrawerHeader, DrawerPanel, DrawerPopup, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Meter, MeterIndicator, MeterLabel, MeterTrack } from "@/components/ui/meter";
import { RadioGroup } from "@/components/ui/radio-group";
import { RadioCard } from "@/components/compositions/radio-card";
import { Separator } from "@/components/ui/separator";
import { toastManager } from "@/components/ui/toast";
import type { Booking, PayMode } from "@/lib/booking";
import { type Alternative, type PayResult, policyCustomerFor } from "@/lib/checkout";
import { describeCountdown, formatCountdown, holdRemainingMs } from "@/lib/holds";
import { formatInr } from "@/lib/money";
import { checkIndianPhone } from "@/lib/phone";
import { decidePayment, describeDecision, type PaymentDecision } from "@/lib/policy";
import { courtName } from "@/lib/venue";

export function PayStep(): React.ReactElement | null {
  const { draft, update, goTo, booking } = useFlow();
  const store = useStore();
  const now = useNow(1000);
  const [chosen, setChosen] = React.useState<PayMode | null>(null);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [race, setRace] = React.useState<Alternative[] | null>(null);
  const [busy, setBusy] = React.useState(false);

  const remaining = booking ? holdRemainingMs(booking, now) : 0;
  const expired = !booking || booking.status === "expired" || remaining <= 0;

  if (!booking) return null;

  const decision = decidePayment(store.state.settings, booking, policyCustomerFor(store.state, booking.customerId, booking.id));
  const mode: PayMode = chosen && decision.modes.includes(chosen) ? chosen : (decision.modes[0] ?? "full");
  const amountNow = mode === "venue" ? 0 : mode === "part" ? decision.depositPaise : booking.pricePaise;

  const rehold = async (slot: Pick<Booking, "date" | "startMinute" | "durationMinutes">, courtId: Booking["courtId"] | null): Promise<void> => {
    const phone = checkIndianPhone(draft.phone).phone;
    if (!phone) return goTo("you");
    setBusy(true);
    const result = await store.holdSlot({ courtId, ...slot, players: draft.players, name: draft.name, phone, notes: draft.notes });
    setBusy(false);
    if (result.ok) {
      setRace(null);
      update({ bookingId: result.booking.id, date: slot.date, startMinute: slot.startMinute, durationMinutes: slot.durationMinutes });
      toastManager.add({ title: "Court held", description: `${courtName(result.booking.courtId)} · ${whenOf(result.booking)}`, type: "success" });
    } else {
      setRace(result.alternatives);
    }
  };

  const settle = (result: PayResult): void => {
    setCheckoutOpen(false);
    if (result.ok) {
      toastManager.add({ title: result.amountPaise > 0 ? `Paid ${formatInr(result.amountPaise)}` : "Booking confirmed", type: "success" });
      goTo("done");
    } else if (result.reason === "slot-taken") {
      setRace(result.alternatives);
    }
    // "hold-expired" needs nothing here: the expired state below takes over.
  };

  const pickAnother = (): void => {
    setRace(null);
    update({ bookingId: null, startMinute: null });
    goTo("when");
  };

  if (race) {
    return (
      <section className="flex flex-col gap-5">
        <StepHeading description="Nothing was charged." title="Someone else got that court" />
        <SlotTakenNotice
          alternatives={race}
          busy={busy}
          description={`${courtName(booking.courtId)} at ${timeRangeOf(booking)} was booked while you were paying.`}
          onChooseAnother={pickAnother}
          onPick={(alt) => void rehold(alt, alt.courtId)}
          title="That slot is gone"
        />
      </section>
    );
  }

  if (expired) {
    return (
      <section className="flex flex-col gap-5">
        <StepHeading title="Your hold ran out" />
        <Empty className="rounded-2xl border border-dashed" role="status">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HourglassIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>The court was released</EmptyTitle>
            <EmptyDescription>
              We held {courtName(booking.courtId)} at {timeRangeOf(booking)} so you could pay, then let it go so others could book. Nothing was charged.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button loading={busy} onClick={() => void rehold(booking, draft.courtId === "any" ? null : booking.courtId)}>
              Hold it again
            </Button>
            <Button onClick={pickAnother} variant="outline">
              Pick another time
            </Button>
          </EmptyContent>
        </Empty>
      </section>
    );
  }

  const confirmAtVenue = async (): Promise<void> => {
    setBusy(true);
    const result = await store.pay(booking.id, "venue", "upi");
    setBusy(false);
    settle(result);
  };

  const rows: SummaryRow[] = [
    { label: "Court", value: courtName(booking.courtId) },
    { label: "Players", value: String(draft.players) },
    { label: "Date", value: dayOf(booking.date) },
    { label: "Time", value: timeRangeOf(booking) },
    { label: "Duration", value: durationOf(booking.durationMinutes) },
    { label: "Price", value: formatInr(booking.pricePaise) },
    { label: "Pay now", value: formatInr(amountNow), emphasis: true },
    { label: "At the venue", value: formatInr(booking.pricePaise - amountNow) },
  ];

  return (
    <StepLayout
      actions={
        <StepActions
          compactLine={
            <p className="truncate tabular-nums">
              <span className="font-semibold">{formatInr(amountNow)} now</span>
              <span aria-hidden="true" className="text-muted-foreground/60">{" · "}</span>
              {courtName(booking.courtId)} · {whenOf(booking)}
            </p>
          }
          extra={<SummaryDrawer amountNow={amountNow} booking={booking} players={draft.players} />}
          note={mode === "venue" ? "Confirmed now, nothing to pay yet." : "Opens a checkout. Nothing is charged yet."}
          onBack={() => goTo("you")}
          primary={
            mode === "venue" ? (
              <Button loading={busy} onClick={() => void confirmAtVenue()} size="lg">
                Confirm booking
              </Button>
            ) : (
              <Button onClick={() => setCheckoutOpen(true)} size="lg">
                Pay {formatInr(amountNow)}
              </Button>
            )
          }
          rows={rows}
          status={<HoldChip remaining={remaining} />}
        />
      }
    >
      <StepHeading description={describeDecision(decision, store.state.settings)} title="Hold and pay" />
      <HoldMeter booking={booking} remaining={remaining} />
      <StepCard description={decision.modes.length > 1 ? "Choose how much to pay now." : "How this booking is paid."} title="Payment option">
        <PayOptions booking={booking} decision={decision} mode={mode} onChange={setChosen} />
      </StepCard>

      <CheckoutDialog
        amountPaise={amountNow}
        onOpenChange={setCheckoutOpen}
        onPay={(method) => store.pay(booking.id, mode, method)}
        onSettled={settle}
        // A hold that runs out mid-checkout closes the checkout; the page explains.
        open={checkoutOpen && !expired}
        summary={`${courtName(booking.courtId)} · ${whenOf(booking)}`}
      />
    </StepLayout>
  );
}

/** The countdown again, beside the pay button, so it is in sight wherever the page is scrolled. The meter above carries it for screen readers. */
function HoldChip({ remaining }: { remaining: number }): React.ReactElement {
  const tone = remaining <= 60_000 ? "text-destructive-foreground" : remaining <= 3 * 60_000 ? "text-warning-foreground" : "text-foreground";
  return (
    <p aria-hidden="true" className="flex items-center justify-between gap-2 text-xs" data-slot="hold-chip">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <HourglassIcon className="size-3.5" />
        Court held for you
      </span>
      <span className={`font-semibold tabular-nums ${tone}`}>{formatCountdown(remaining)}</span>
    </p>
  );
}

/** The hold meter turns amber at three minutes and red at the last one. */
const TONE_CLASS = { default: undefined, warning: "bg-warning", destructive: "bg-destructive" } as const;

const MILESTONES = [5 * 60_000, 60_000, 30_000, 10_000];

function HoldMeter({ booking, remaining }: { booking: Booking; remaining: number }): React.ReactElement {
  const total = Math.max(1, (booking.holdExpiresAt ?? 0) - booking.createdAt);
  const tone: keyof typeof TONE_CLASS = remaining <= 60_000 ? "destructive" : remaining <= 3 * 60_000 ? "warning" : "default";
  // Announce at a few milestones, not every second: a ticking live region is unbearable with a screen reader.
  const passed = MILESTONES.filter((m) => remaining <= m);
  const announcement = passed.length > 0 ? `Hold: ${describeCountdown(Math.min(...passed))}` : "";

  return (
    <Card>
      <CardPanel className="p-4">
      <Meter
        aria-valuetext={describeCountdown(remaining)}
        max={Math.ceil(total / 1000)}
        min={0}
        value={Math.ceil(remaining / 1000)}
      >
        <div className="flex items-baseline justify-between gap-3">
          <MeterLabel>
            {courtName(booking.courtId)} is held for you
          </MeterLabel>
          <span aria-hidden="true" className="font-semibold text-lg tabular-nums" data-slot="hold-countdown">
            {formatCountdown(remaining)}
          </span>
        </div>
        <MeterTrack className="rounded-full">
          <MeterIndicator className={TONE_CLASS[tone]} />
        </MeterTrack>
      </Meter>
      <p className="mt-2 text-muted-foreground text-xs">Nobody else can book it until the timer runs out.</p>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
      </CardPanel>
    </Card>
  );
}

const MODE_COPY: Record<PayMode, { title: string; line: (d: PaymentDecision, price: number) => string }> = {
  venue: { title: "Pay at the venue", line: (_, price) => `${formatInr(price)} when you arrive. Confirmed now.` },
  part: { title: "Pay a deposit", line: (d) => `${formatInr(d.depositPaise)} now, ${formatInr(d.balancePaise)} at the venue.` },
  full: { title: "Pay in full", line: (_, price) => `${formatInr(price)} now. Nothing to pay at the venue.` },
};

function PayOptions({
  booking,
  decision,
  mode,
  onChange,
}: {
  booking: Booking;
  decision: PaymentDecision;
  mode: PayMode;
  onChange: (mode: PayMode) => void;
}): React.ReactElement {
  if (decision.modes.length === 1) {
    const only = decision.modes[0] ?? "full";
    return (
      <div className="flex flex-col gap-1 rounded-lg border p-3" data-slot="pay-option-single">
        <p className="font-medium text-sm">{MODE_COPY[only].title}</p>
        <p className="text-muted-foreground text-sm">{MODE_COPY[only].line(decision, booking.pricePaise)}</p>
      </div>
    );
  }
  return (
    <RadioGroup aria-label="How to pay" onValueChange={(v) => onChange(v as PayMode)} value={mode}>
      {decision.modes.map((m) => (
        <RadioCard key={m} value={m}>
          <span className="flex items-baseline justify-between gap-3">
            <span className="font-medium text-sm">{MODE_COPY[m].title}</span>
            <span className="font-medium text-sm tabular-nums">{formatInr(m === "venue" ? 0 : m === "part" ? decision.depositPaise : booking.pricePaise)} now</span>
          </span>
          <span className="text-muted-foreground text-sm">{MODE_COPY[m].line(decision, booking.pricePaise)}</span>
        </RadioCard>
      ))}
    </RadioGroup>
  );
}

/**
 * Phone and tablet: the full summary, one tap away in a coss Drawer, from the
 * action bar. (On a laptop the summary Card beside the step shows all of it.)
 */
function SummaryDrawer({ booking, players, amountNow }: { booking: Booking; players: number; amountNow: number }): React.ReactElement {
  const rows: [string, string][] = [
    ["Court", courtName(booking.courtId)],
    ["When", whenOf(booking)],
    ["Duration", durationOf(booking.durationMinutes)],
    ["Players", String(players)],
  ];
  return (
    <Drawer>
      <DrawerTrigger render={<Button size="sm" variant="outline" />}>
        <ReceiptIcon aria-hidden="true" />
        Summary
      </DrawerTrigger>
      <DrawerPopup showBar>
        <DrawerHeader>
          <DrawerTitle>Summary</DrawerTitle>
          <DrawerDescription>
            {courtName(booking.courtId)} · {whenOf(booking)}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerPanel>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {rows.map(([term, value]) => (
              <React.Fragment key={term}>
                <dt className="text-muted-foreground">{term}</dt>
                <dd className="text-end tabular-nums">{value}</dd>
              </React.Fragment>
            ))}
          </dl>
          <Separator className="my-3" />
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Price</dt>
            <dd className="text-end tabular-nums">{formatInr(booking.pricePaise)}</dd>
            <dt className="font-medium">Pay now</dt>
            <dd className="text-end font-semibold tabular-nums">{formatInr(amountNow)}</dd>
            <dt className="text-muted-foreground">At the venue</dt>
            <dd className="text-end tabular-nums">{formatInr(booking.pricePaise - amountNow)}</dd>
          </dl>
        </DrawerPanel>
        <DrawerFooter>
          <DrawerClose render={<Button variant="ghost" />}>Close</DrawerClose>
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  );
}
