"use client";

import type * as React from "react";
import { hoursLeft } from "@/app/screens/people/members-model";
import { Badge } from "@/components/ui/badge";
import { Meter, MeterIndicator, MeterLabel, MeterTrack } from "@/components/ui/meter";
import type { CustomerSummary, Membership } from "@/data/types";
import { cn } from "@/lib/utils";

const TAG_LABEL: Record<CustomerSummary["tags"][number], string> = { member: "Member", programme: "Programme", lead: "Lead" };

/** A customer's standing in a few words: what they're part of, and how the desk treats them. */
export function CustomerTags({ summary: s }: { summary: CustomerSummary }): React.ReactElement {
  return (
    <>
      {s.tags.map((tag) => (
        <Badge key={tag} variant={tag === "lead" ? "info" : "secondary"}>
          {TAG_LABEL[tag]}
        </Badge>
      ))}
      {s.customer.payFirst && <Badge variant="warning">Pay first</Badge>}
      {s.customer.trusted && <Badge variant="success">Trusted</Badge>}
    </>
  );
}

/** Hours left as a meter, amber when they're nearly gone. */
export function HoursMeter({ m }: { m: Membership }): React.ReactElement {
  const left = hoursLeft(m);
  const low = left <= 3 || left <= m.hoursTotal * 0.2;
  return (
    <Meter className="gap-1" max={m.hoursTotal} value={left}>
      <MeterLabel className={cn("font-normal text-xs", low ? "text-warning-foreground" : "text-muted-foreground")}>
        {left} of {m.hoursTotal} hours left
      </MeterLabel>
      <MeterTrack className="h-1.5 rounded-full">
        <MeterIndicator className={low ? "bg-warning" : undefined} />
      </MeterTrack>
    </Meter>
  );
}

