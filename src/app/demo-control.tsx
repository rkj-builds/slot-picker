"use client";

import { FlaskConicalIcon } from "lucide-react";
import * as React from "react";
import { clearHandoffs, useJumpToState } from "@/app/demo-jump";
import { DEMO_STATES, PRESET_GROUPS } from "@/app/demo-states";
import { StatesIndex } from "@/app/states-index";
import { useDemoSession } from "@/app/mock-data";
import { useStore } from "@/app/store";
import { ROLE_LABELS } from "@/data/mock/db";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverDescription, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { toastManager } from "@/components/ui/toast";

/**
 * The demo control, not part of the product: anchored in the top bar on
 * every page, a coss Popover with two tabs. "Presets" switches states on
 * (grouped Booking, Payment, Desk, System); "Jump to state" puts the app in
 * one state and opens its screen. Everything is off by default, labelled as
 * a demo, and never saved: presets live in memory and lay their changes over
 * the data instead of writing them.
 */
export function DemoControl(): React.ReactElement {
  const { scenarios, setScenario, clearScenarios, failNextLoad, reset } = useStore();
  const session = useDemoSession();
  const [open, setOpen] = React.useState(false);
  useStateFromUrl();
  const active = Object.values(scenarios).filter(Boolean).length;
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        aria-label={`Demo scenarios${active > 0 ? `, ${active} on` : ""}`}
        render={<Button className="shrink-0 max-sm:px-2" size="sm" variant="outline" />}
      >
        <FlaskConicalIcon aria-hidden="true" />
        <span className="max-sm:sr-only">Demo</span>
        {active > 0 && (
          <Badge aria-hidden="true" className="-me-1">
            {active}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverPopup align="end" aria-label="Demo scenarios" className="w-[min(22rem,calc(100vw-2rem))] [&_[data-slot=popover-viewport]]:overflow-hidden [&_[data-slot=popover-viewport]]:py-0 [&_[data-slot=popover-viewport]]:[--viewport-inline-padding:0px]" side="bottom">
        {/* One column sized to the space the popover has: header and footer stay put, only the list scrolls. */}
        <div className="flex max-h-[min(36rem,var(--available-height))] flex-col">
        <div className="flex shrink-0 flex-col gap-1 px-4 pt-4">
          <div className="flex items-center gap-2">
            <PopoverTitle>Demo scenarios</PopoverTitle>
            <Badge variant="warning">Demo control</Badge>
          </div>
          <PopoverDescription>Force a state to see how the product handles it. Off by default; never saved.</PopoverDescription>
          <div className="mt-2 flex items-center justify-between gap-3">
            <Label htmlFor="demo-signed-in-as">Signed in as</Label>
            <Select
              items={session.people.map((p) => ({ label: `${p.name} · ${ROLE_LABELS[p.role]}`, value: p.id }))}
              onValueChange={(id) => {
                if (!id) return;
                session.setMemberId(id);
                const person = session.people.find((p) => p.id === id);
                if (person) toastManager.add({ title: `Signed in as ${person.name}`, description: `${ROLE_LABELS[person.role]}: the sidebar and actions now follow that role.`, type: "info" });
              }}
              value={session.memberId}
            >
              <SelectTrigger className="w-auto min-w-0 max-w-52" id="demo-signed-in-as" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {session.people.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {ROLE_LABELS[p.role]}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
        </div>
        <Tabs className="mt-3 flex min-h-0 flex-1 flex-col gap-0" defaultValue="presets">
          <TabsList className="mx-4 shrink-0">
            <TabsTab value="presets">Presets{active > 0 ? ` (${active})` : ""}</TabsTab>
            <TabsTab value="jump">Jump to state</TabsTab>
          </TabsList>
          <TabsPanel className="flex min-h-0 flex-1 flex-col" value="presets">
            <ScrollArea className="flex min-h-0 flex-1 flex-col [&_[data-slot=scroll-area-viewport]]:min-h-0 [&_[data-slot=scroll-area-viewport]]:flex-1" scrollFade>
              <div className="flex flex-col gap-4 px-4 py-3">
                {PRESET_GROUPS.map(({ group, items }) => (
                  <section aria-label={group} className="flex flex-col gap-2.5" key={group}>
                    <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{group}</h3>
                    <ul className="flex flex-col gap-3">
                      {items.map((item) => (
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
                  </section>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      setOpen(false);
                      failNextLoad();
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Fail the next load
                  </Button>
                  <Button
                    onClick={() => {
                      session.failNextRequest();
                      toastManager.add({ title: "The next request will fail", description: "Load or save anything to see how the screen handles it.", type: "info" });
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Fail the next request
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsPanel>
          <TabsPanel className="flex min-h-0 flex-1 flex-col" value="jump">
            <ScrollArea className="flex min-h-0 flex-1 flex-col [&_[data-slot=scroll-area-viewport]]:min-h-0 [&_[data-slot=scroll-area-viewport]]:flex-1" scrollFade>
              <div className="px-2 py-3">
                <StatesIndex compact onJump={() => setOpen(false)} />
              </div>
            </ScrollArea>
          </TabsPanel>
        </Tabs>
        <Separator className="shrink-0" />
        <div className="flex shrink-0 gap-2 p-2">
          <Button
            className="flex-1"
            disabled={active === 0}
            onClick={() => {
              clearScenarios();
              clearHandoffs();
            }}
            size="sm"
            variant="ghost"
          >
            Turn all off
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              reset();
              clearHandoffs();
              toastManager.add({ title: "Demo data reset", description: "Bookings and settings are back to the seed.", type: "info" });
            }}
            size="sm"
            variant="ghost"
          >
            Reset demo data
          </Button>
        </div>
        </div>
      </PopoverPopup>
    </Popover>
  );
}

/**
 * `?state=<id>` opens the app in that demo state (a link a reviewer can
 * share, and how the screenshots are taken). Runs once, after the first load.
 */
function useStateFromUrl(): void {
  const { status } = useStore();
  const jump = useJumpToState();
  const done = React.useRef(false);
  React.useEffect(() => {
    if (done.current || status !== "ready") return;
    done.current = true;
    const id = new URLSearchParams(window.location.search).get("state");
    const target = DEMO_STATES.find((s) => s.id === id);
    if (target) void jump(target);
  }, [status, jump]);
}
