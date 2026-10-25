import * as React from "react";
import { useClock } from "@/app/clock";
import { Waitlist, WaitlistActions, WaitlistBody, WaitlistHeader, WaitlistMeta, WaitlistPosition, WaitlistStatus, WaitlistTitle, type WaitlistPlace, type WaitlistState } from "@/components/compositions/waitlist";
import { toastManager } from "@/components/ui/toast";
import { describeZone } from "@/primitives/time-zone";

/** The front of the list. There is nobody else on it. */
const FRONT: WaitlistPlace = { position: 1, ahead: [] };

/**
 * The instance this page was built for: a role that is fully booked. Joining checks for
 * cancellations (there never are any), leaving asks first and then changes its mind.
 */
export function WaitlistDemo({ state, onStateChange, fail = false, cancelOpen = false }: { state?: WaitlistState; onStateChange?: (s: WaitlistState) => void; fail?: boolean; cancelOpen?: boolean }): React.ReactElement {
  const { now } = useClock();
  const zone = React.useMemo(() => describeZone(Intl.DateTimeFormat().resolvedOptions().timeZone, now()), [now]);

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
    <Waitlist item="Senior Product Design Engineer at Cal.com" onCancel={onCancel} onJoin={onJoin} onStateChange={onStateChange} place={FRONT} state={state} status="Every slot taken">
      <WaitlistHeader>
        <WaitlistTitle />
        <WaitlistStatus>Every slot taken</WaitlistStatus>
      </WaitlistHeader>
      <WaitlistBody>
        {/* A true minus in the offset (GMT−4), as Cal Sans's guide asks: the hyphen only joins words. */}
        <WaitlistMeta>
          Your time: {zone.offsetLabel.replace("-", "−")} · {zone.city}
        </WaitlistMeta>
        <WaitlistPosition />
        <WaitlistActions cancelOpen={cancelOpen} />
      </WaitlistBody>
    </Waitlist>
  );
}
