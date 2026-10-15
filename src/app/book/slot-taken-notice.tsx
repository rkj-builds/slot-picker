"use client";

import { CalendarClockIcon } from "lucide-react";
import type * as React from "react";
import { startTimeOf } from "@/app/format";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Alternative } from "@/lib/checkout";
import { courtName } from "@/lib/venue";

/**
 * Someone else got the slot first. Say so plainly, then make the next step
 * one tap: the nearest free starts for the same duration, ready to hold.
 */
export function SlotTakenNotice({
  title,
  description,
  alternatives,
  onPick,
  onChooseAnother,
  busy,
}: {
  title: string;
  description: string;
  alternatives: Alternative[];
  onPick: (alternative: Alternative) => void;
  onChooseAnother: () => void;
  busy?: boolean;
}): React.ReactElement {
  return (
    <Alert role="alert" variant="warning">
      <CalendarClockIcon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <span>{alternatives.length > 0 ? `${description} These are still free:` : `${description} Nothing else is free that day.`}</span>
        {alternatives.length > 0 && (
          <ul aria-label="Free times nearby" className="flex flex-wrap gap-2">
            {alternatives.map((alt) => (
              <li key={`${alt.courtId}-${alt.startMinute}`}>
                <Button disabled={busy} onClick={() => onPick(alt)} size="sm" variant="outline">
                  {startTimeOf(alt)} · {courtName(alt.courtId)}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <span>
          <Button onClick={onChooseAnother} size="sm" variant="link">
            Choose another time
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  );
}
