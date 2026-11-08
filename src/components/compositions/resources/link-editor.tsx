"use client";

import { CheckIcon, PauseIcon } from "lucide-react";
import * as React from "react";
import { RadioCard } from "@/components/compositions/radio-card";
import { useResources } from "@/components/compositions/resources/context";
import { Pane, ScreenHeader, SettingsNav } from "@/components/compositions/resources/kit";
import { ResourceBooker } from "@/components/compositions/resources/resource-booker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox, ComboboxChip, ComboboxChips, ComboboxChipsInput, ComboboxEmpty, ComboboxItem, ComboboxList, ComboboxPopup, ComboboxValue } from "@/components/ui/combobox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { RadioGroup } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";

type Page = "who";

/** A link's settings on 9 November 2026, with one page added under Setup. */
const GROUPS = [
  { title: "Setup", pages: [{ label: "Basics" }, { label: "Availability" }, { value: "who", label: "Who is booked", isNew: true }] },
  { title: "Booking experience", pages: [{ label: "Booking form" }, { label: "Confirmation" }, { label: "Appearance" }, { label: "Payments & Seats" }, { label: "Recurring" }] },
  { title: "Policies", pages: [{ label: "Limits & buffers" }, { label: "Reschedule & cancel" }, { label: "Privacy & security" }] },
  { title: "AI & Automation", pages: [{ label: "Apps" }, { label: "Workflows" }, { label: "Webhooks" }] },
] as const;

/**
 * The link's editor with its new page: Who is booked. A person, as today, or
 * any free one of some resources. The booking page on the right is live, so
 * the choice shows its effect at once: 7 pm busy, or 7 pm free on Court 2.
 */
export function LinkEditor(): React.ReactElement {
  const { link, resources, changeLink } = useResources("LinkEditor");
  const [page, setPage] = React.useState<Page>("who");
  const [saved, setSaved] = React.useState(false);
  // The list survives a switch to "A person" and back, so nobody rebuilds it by hand.
  const [remembered, setRemembered] = React.useState<readonly string[]>(link.who.kind === "resource" ? link.who.resourceIds : resources.map((r) => r.id));
  const chosen = link.who.kind === "resource" ? link.who.resourceIds : [];
  const nameOf = (id: string): string => resources.find((r) => r.id === id)?.name ?? id;
  const paused = resources.filter((r) => chosen.includes(r.id) && !r.active);

  const setWho = (kind: "person" | "resource"): void => {
    setSaved(false);
    if (kind === "person") {
      if (link.who.kind === "resource") setRemembered(link.who.resourceIds);
      changeLink({ ...link, who: { kind: "person" } });
    } else changeLink({ ...link, who: { kind: "resource", resourceIds: remembered } });
  };

  return (
    <Pane data-screen="link">
      <ScreenHeader
        actions={
          <>
            <span aria-live="polite" className="text-muted-foreground text-xs" role="status">
              {saved ? "Saved" : ""}
            </span>
            <Field className="flex-row items-center gap-2">
              <Switch aria-label="Hidden from your public page" defaultChecked />
              <FieldLabel>Hidden</FieldLabel>
            </Field>
            <Button onClick={() => setSaved(true)}>Save</Button>
          </>
        }
        back={<span className="text-muted-foreground text-xs">Links / {link.title}</span>}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {link.title}
            <Badge variant="outline">/{link.slug}</Badge>
          </span>
        }
      />
      <div className="grid gap-6 @2xl/pane:grid-cols-[11rem_minmax(0,1fr)] @4xl/pane:grid-cols-[11rem_minmax(0,1fr)_minmax(0,21rem)] @4xl/pane:gap-8">
        <SettingsNav<Page> groups={GROUPS} label="Link settings" onValueChange={setPage} value={page} />
        <div className="flex min-w-0 max-w-xl flex-col gap-5" data-page={page}>
          <Fieldset className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <FieldsetLegend className="font-medium text-sm">Who is booked</FieldsetLegend>
              <p className="text-muted-foreground text-xs">What a booking on this link lands on.</p>
            </div>
            <RadioGroup aria-label="Who is booked" onValueChange={(v) => setWho(v as "person" | "resource")} value={link.who.kind}>
              <RadioCard value="person">
                <span className="font-medium text-sm">A person</span>
                <span className="text-muted-foreground text-sm">Your calendar, as today. A booking here makes you busy on every one of your links.</span>
              </RadioCard>
              <RadioCard value="resource">
                <span className="font-medium text-sm">A resource</span>
                <span className="text-muted-foreground text-sm">Any free one from a list. Your calendar stays free, and so do the others.</span>
              </RadioCard>
            </RadioGroup>
          </Fieldset>
          {link.who.kind === "resource" && (
            <>
              <Field>
                <FieldLabel>Any free one of</FieldLabel>
                <Combobox<string, true>
                  itemToStringLabel={nameOf}
                  items={resources.map((r) => r.id)}
                  multiple
                  onValueChange={(ids) => {
                    setSaved(false);
                    setRemembered(ids);
                    changeLink({ ...link, who: { kind: "resource", resourceIds: ids } });
                  }}
                  value={[...chosen]}
                >
                  <ComboboxChips>
                    <ComboboxValue>
                      {(value: string[]) => (
                        <>
                          {value.map((id) => (
                            <ComboboxChip aria-label={nameOf(id)} key={id}>
                              <bdi>{nameOf(id)}</bdi>
                            </ComboboxChip>
                          ))}
                          <ComboboxChipsInput aria-label="Add a resource" placeholder={value.length > 0 ? "" : "Add a resource"} />
                        </>
                      )}
                    </ComboboxValue>
                  </ComboboxChips>
                  <ComboboxPopup>
                    <ComboboxEmpty>No resource by that name.</ComboboxEmpty>
                    <ComboboxList>
                      {(id: string) => {
                        const r = resources.find((x) => x.id === id);
                        return (
                          <ComboboxItem key={id} value={id}>
                            <bdi>{nameOf(id)}</bdi>
                            {r && !r.active ? <span className="text-muted-foreground"> · paused</span> : null}
                          </ComboboxItem>
                        );
                      }}
                    </ComboboxList>
                  </ComboboxPopup>
                </Combobox>
                <FieldDescription>The booking lands on the one that took it. The person booking never has to choose.</FieldDescription>
              </Field>
              {paused.length > 0 && (
                <Alert variant="warning">
                  <PauseIcon aria-hidden="true" />
                  <AlertTitle>
                    {paused.map((r) => r.name).join(" and ")} {paused.length === 1 ? "is" : "are"} paused
                  </AlertTitle>
                  <AlertDescription>Kept on the list, not offered, until switched back on in Resources.</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-3 rounded-xl bg-muted px-4 py-3 text-sm" data-slot="host-stays-free">
                <CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success-foreground" />
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">The host stays free</span>
                  <span className="text-muted-foreground">Booking a court doesn’t block your own calendar, or your other courts. When every one is taken, the time reads as taken.</span>
                </span>
              </div>
            </>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2 @2xl/pane:col-span-2 @4xl/pane:col-span-1" data-slot="link-preview">
          <span className="font-medium text-muted-foreground text-xs">Booking page, live</span>
          <div className="rounded-xl border p-4">
            <ResourceBooker preview />
          </div>
        </div>
      </div>
    </Pane>
  );
}
