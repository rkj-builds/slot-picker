"use client";

import type * as React from "react";
import { StepHeading } from "@/app/book/book-page";
import { useFlow } from "@/app/book/flow";
import { StepActions, StepCard, StepLayout } from "@/app/book/step-actions";
import { bookingRows } from "@/app/book/summary-rows";
import { Button } from "@/components/ui/button";
import { NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput } from "@/components/ui/number-field";
import { RadioGroup } from "@/components/ui/radio-group";
import { RadioCard } from "@/components/compositions/radio-card";
import { type CourtId, courtName } from "@/lib/venue";

const OPTIONS: { value: CourtId | "any"; title: string; line: string }[] = [
  { value: "any", title: "Any court", line: "Whichever is free at your time. The most times to choose from." },
  { value: "court-1", title: "Court 1", line: "By the entrance, next to the benches." },
  { value: "court-2", title: "Court 2", line: "At the far end, quieter, with the evening shade." },
];

export function CourtStep(): React.ReactElement {
  const { draft, update, goTo } = useFlow();
  return (
    <StepLayout
      actions={
        <StepActions
          primary={
            <Button onClick={() => goTo("when")} size="lg">
              Continue
            </Button>
          }
          rows={bookingRows({
            court: draft.courtId === "any" ? "Any court" : courtName(draft.courtId),
            players: draft.players,
            day: null,
            time: null,
            duration: null,
            price: null,
          })}
          compactLine={
            <p className="truncate">
              <span className="font-medium">{draft.courtId === "any" ? "Any court" : courtName(draft.courtId)}</span>
              <span aria-hidden="true" className="text-muted-foreground/60">{" · "}</span>
              {draft.players} {draft.players === 1 ? "player" : "players"}
            </p>
          }
          note="Next: pick a day and a time."
        />
      }
    >
      <StepHeading description="Both courts are the same size and surface. Pick one, or let us pick." title="Pick a court" />
      <StepCard description="Any court shows the most free times." title="Court">
        <RadioGroup aria-label="Court" onValueChange={(courtId) => update({ courtId: courtId as CourtId | "any", startMinute: null })} value={draft.courtId}>
          {OPTIONS.map((option) => (
            <RadioCard key={option.value} value={option.value}>
              <span className="font-medium text-sm">{option.title}</span>
              <span className="text-muted-foreground text-sm">{option.line}</span>
            </RadioCard>
          ))}
        </RadioGroup>
      </StepCard>

      <StepCard description="Doubles is four. The price is per court, not per player." title="Players">
        <NumberField id="players" max={8} min={1} onValueChange={(players) => update({ players: players ?? 4 })} value={draft.players}>
          <NumberFieldGroup className="w-36">
            <NumberFieldDecrement aria-label="Fewer players" />
            <NumberFieldInput aria-label="Players" />
            <NumberFieldIncrement aria-label="More players" />
          </NumberFieldGroup>
        </NumberField>
      </StepCard>
    </StepLayout>
  );
}
