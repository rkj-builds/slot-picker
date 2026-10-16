"use client";

import { FlaskConicalIcon } from "lucide-react";
import type * as React from "react";
import { type Scenarios, useStore } from "@/app/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverDescription, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toastManager } from "@/components/ui/toast";

const ITEMS: { key: keyof Scenarios; label: string; line: string }[] = [
  { key: "weekend", label: "Weekend date", line: "Step 2 opens on Saturday, where a 50% deposit applies." },
  { key: "flagged", label: "Flagged customer", line: "Step 3 is filled with a customer the venue asks to pay first." },
  { key: "paymentFails", label: "Payment fails", line: "The first payment is declined, then a retry works." },
  { key: "slotRace", label: "Slot race", line: "Someone else books the court while you pay." },
  { key: "shortHold", label: "Short hold", line: "Holds last 30 seconds instead of 15 minutes." },
];

/**
 * A demo control, not part of the product: forces each state of the flow so
 * a reviewer can see it in seconds instead of waiting fifteen minutes. It sits
 * in the booking page's header, beside the venue, labelled as a demo.
 */
export function ScenariosPopover(): React.ReactElement {
  const { scenarios, setScenario, reset } = useStore();
  const active = Object.values(scenarios).filter(Boolean).length;
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Demo scenarios${active > 0 ? `, ${active} on` : ""}`}
        render={<Button className="shrink-0" size="sm" variant="outline" />}
      >
        <FlaskConicalIcon aria-hidden="true" />
        Demo
        {active > 0 && (
          <Badge aria-hidden="true" className="-me-1">
            {active}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverPopup align="end" className="w-80" side="bottom">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <PopoverTitle>Demo scenarios</PopoverTitle>
            <Badge variant="warning">Demo control</Badge>
          </div>
          <PopoverDescription>Force a state to see how the flow handles it. Not part of the product.</PopoverDescription>
        </div>
        <ul className="mt-3 flex flex-col gap-3">
          {ITEMS.map((item) => (
            <li className="flex items-start justify-between gap-3" key={item.key}>
              <div className="flex flex-col">
                <Label htmlFor={`scenario-${item.key}`}>{item.label}</Label>
                <span className="text-muted-foreground text-xs" id={`scenario-${item.key}-line`}>
                  {item.line}
                </span>
              </div>
              <Switch
                aria-describedby={`scenario-${item.key}-line`}
                checked={scenarios[item.key]}
                className="mt-0.5"
                id={`scenario-${item.key}`}
                onCheckedChange={(checked) => setScenario(item.key, checked)}
              />
            </li>
          ))}
        </ul>
        <Separator className="my-3" />
        <Button
          className="w-full"
          onClick={() => {
            reset();
            toastManager.add({ title: "Demo data reset", description: "Bookings and settings are back to the seed.", type: "info" });
          }}
          size="sm"
          variant="ghost"
        >
          Reset demo data
        </Button>
      </PopoverPopup>
    </Popover>
  );
}
