"use client";

import { ArrowRightIcon } from "lucide-react";
import * as React from "react";
import { useJumpToState } from "@/app/demo-jump";
import { DEMO_STATES, type DemoState, type StateGroup } from "@/app/demo-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";

/** Every group that has states, in the order they are listed, with System last. */
const GROUPS: StateGroup[] = [...new Set(DEMO_STATES.map((s) => s.group))].sort((a, b) => Number(a === "System") - Number(b === "System"));

/** Every state, grouped, each a button that goes straight there. */
export function StatesIndex({ compact = false, onJump }: { compact?: boolean; onJump?: () => void }): React.ReactElement {
  const jump = useJumpToState();
  const [busy, setBusy] = React.useState<string | null>(null);
  const go = async (state: DemoState): Promise<void> => {
    setBusy(state.id);
    await jump(state);
    setBusy(null);
    onJump?.();
  };
  if (compact) {
    return (
      <div className="flex flex-col gap-3" data-slot="states-index">
        {GROUPS.map((group) => (
          <section aria-label={group} className="flex flex-col gap-1" key={group}>
            <h3 className="px-2 font-medium text-muted-foreground text-xs">{group}</h3>
            <ul className="flex flex-col">
              {DEMO_STATES.filter((s) => s.group === group).map((s) => (
                <li key={s.id}>
                  <Button className="w-full justify-between font-normal" loading={busy === s.id} onClick={() => void go(s)} size="sm" variant="ghost">
                    <span className="truncate">{s.label}</span>
                    <ArrowRightIcon aria-hidden="true" className="opacity-56" />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-slot="states-index">
      {GROUPS.map((group) => (
        <Card key={group}>
          <CardHeader>
            <h3>
              <CardTitle className="flex items-center gap-2 text-base" render={<span />}>
                {group}
                <Badge variant="outline">{DEMO_STATES.filter((s) => s.group === group).length}</Badge>
              </CardTitle>
            </h3>
          </CardHeader>
          <CardPanel className="pt-0">
            <ul className="-mx-2 flex flex-col">
              {DEMO_STATES.filter((s) => s.group === group).map((s) => (
                <li key={s.id}>
                  <Button className="h-auto w-full justify-between gap-3 py-2 text-start font-normal sm:h-auto" loading={busy === s.id} onClick={() => void go(s)} variant="ghost">
                    <span className="flex min-w-0 flex-col whitespace-normal">
                      <span className="font-medium">{s.label}</span>
                      <span className="whitespace-normal text-muted-foreground text-xs">{s.shows}</span>
                    </span>
                    <ArrowRightIcon aria-hidden="true" className="shrink-0 opacity-56" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardPanel>
        </Card>
      ))}
    </div>
  );
}
