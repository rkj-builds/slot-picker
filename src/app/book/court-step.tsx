"use client";

import type * as React from "react";
import { StepHeading } from "@/app/book/book-page";
import { useFlow } from "@/app/book/flow";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput } from "@/components/ui/number-field";
import { RadioCard, RadioGroup } from "@/components/ui/radio-group";
import type { CourtId } from "@/lib/venue";

const OPTIONS: { value: CourtId | "any"; title: string; line: string }[] = [
  { value: "any", title: "Any court", line: "Whichever is free at your time. The most times to choose from." },
  { value: "court-1", title: "Court 1", line: "By the entrance, next to the benches." },
  { value: "court-2", title: "Court 2", line: "At the far end, quieter, with the evening shade." },
];

export function CourtStep(): React.ReactElement {
  const { draft, update, goTo } = useFlow();
  return (
    <section>
      <StepHeading description="Both courts are the same size and surface. Pick one, or let us pick." title="Pick a court" />
      <RadioGroup<CourtId | "any"> aria-label="Court" onValueChange={(courtId) => update({ courtId, startMinute: null })} value={draft.courtId}>
        {OPTIONS.map((option) => (
          <RadioCard<CourtId | "any"> key={option.value} value={option.value}>
            <span className="font-medium text-sm">{option.title}</span>
            <span className="text-muted-foreground text-sm">{option.line}</span>
          </RadioCard>
        ))}
      </RadioGroup>

      <NumberField
        className="mt-6"
        id="players"
        max={8}
        min={1}
        onValueChange={(players) => update({ players: players ?? 4 })}
        value={draft.players}
      >
        <Label htmlFor="players">Players</Label>
        <NumberFieldGroup className="w-36">
          <NumberFieldDecrement aria-label="Fewer players" />
          <NumberFieldInput />
          <NumberFieldIncrement aria-label="More players" />
        </NumberFieldGroup>
        <span className="text-muted-foreground text-xs">Doubles is four. The price is per court, not per player.</span>
      </NumberField>

      <div className="mt-8 flex justify-end">
        <Button onClick={() => goTo("when")} size="lg">
          Continue
        </Button>
      </div>
    </section>
  );
}
