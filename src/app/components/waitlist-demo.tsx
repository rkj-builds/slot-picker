import * as React from "react";
import { useClock } from "@/app/clock";
import {
  Waitlist,
  WaitlistActions,
  WaitlistBody,
  WaitlistFooter,
  WaitlistHeader,
  type WaitlistPlace,
  WaitlistPosition,
  WaitlistSlots,
  type WaitlistState,
  WaitlistStatus,
  WaitlistTitle,
} from "@/components/compositions/waitlist";
import { toastManager } from "@/components/ui/toast";
import { describeZone } from "@/primitives/time-zone";

/** The front of the list. There is nobody else on it. */
const FRONT: WaitlistPlace = { position: 1, ahead: [] };

/** Six interview slots on a New York day, 9 am to 7 pm, shown in the viewer's own time. */
function takenSlots(now: number): string[] {
  const day = new Date(now);
  const fmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  // New York is UTC−4 until 1 November 2026, then UTC−5.
  const offset = now < Date.UTC(2026, 10, 1, 6) ? 4 : 5;
  return [9, 11, 13, 15, 17, 19].map((h) => fmt.format(new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h + offset))));
}

/**
 * The instance this page was built for: a role that is fully booked. Joining checks for
 * cancellations (there never are any), leaving asks first and then changes its mind.
 */
export function WaitlistDemo({ state, onStateChange, fail = false, cancelOpen = false }: { state?: WaitlistState; onStateChange?: (s: WaitlistState) => void; fail?: boolean; cancelOpen?: boolean }): React.ReactElement {
  const { now } = useClock();
  const at = now();
  const zone = React.useMemo(() => describeZone(Intl.DateTimeFormat().resolvedOptions().timeZone, at), [at]);
  const slots = React.useMemo(() => takenSlots(at), [at]);

  const onJoin = React.useCallback(
    () =>
      new Promise<WaitlistPlace>((resolve, reject) => {
        window.setTimeout(() => (fail ? reject(new Error("The list did not answer. Nothing was lost.")) : resolve(FRONT)), 1100);
      }),
    [fail],
  );
  const onCancel = React.useCallback((): boolean => {
    toastManager.add({ title: "Cancelled.", description: "Just kidding, you're still on it.", type: "info" });
    return false;
  }, []);

  return (
    <Waitlist
      item="Senior Product Design Engineer at Cal.com"
      // A true minus in the offset (GMT−4), as Cal Sans's guide asks: the hyphen only joins words.
      meta={`Your time: ${zone.offsetLabel.replace("-", "−")} · ${zone.city}`}
      onCancel={onCancel}
      onJoin={onJoin}
      onStateChange={onStateChange}
      place={FRONT}
      slots={slots}
      state={state}
      status="Full"
    >
      {/* The default layout, spelled out, so the docs page can open the leave question on load. */}
      <WaitlistHeader>
        <WaitlistStatus />
        <WaitlistTitle />
      </WaitlistHeader>
      <WaitlistBody>
        <WaitlistSlots />
        <WaitlistPosition />
        <WaitlistActions cancelOpen={cancelOpen} />
      </WaitlistBody>
      <WaitlistFooter />
    </Waitlist>
  );
}
