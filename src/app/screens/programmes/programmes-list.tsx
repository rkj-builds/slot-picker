"use client";

import { ClipboardCheckIcon, EllipsisIcon, PlusIcon, SearchIcon, SearchXIcon, SettingsIcon, ShapesIcon, UsersIcon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import { sectionById } from "@/app/desk/sections";
import { hrefFor, navigate, type Route } from "@/app/router";
import { cantSay, refusalOf, useViewer } from "@/app/screens/programmes/hooks";
import { FormRefusal, Gated, LinkTabs } from "@/app/screens/programmes/kit";
import { PlanList, ProgrammeFields } from "@/app/screens/programmes/programme-form";
import { emptyDraft, newPlan, type ProgrammeDraft } from "@/app/screens/programmes/programme-model";
import { agesLine, scheduleLine, STATUS_META } from "@/app/screens/programmes/programme-model";
import { ListSkeleton, LoadFailed, PageHeader, Screen } from "@/app/screens/screen-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Frame } from "@/components/ui/frame";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Menu, MenuLinkItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { Meter, MeterIndicator, MeterLabel, MeterTrack, MeterValue } from "@/components/ui/meter";
import { Switch } from "@/components/ui/switch";
import { toastManager } from "@/components/ui/toast";
import { useRead, useWrite } from "@/data/provider";
import type { Programme, ProgrammePlan, ProgrammeStatus } from "@/data/types";
import { formatInr } from "@/lib/money";
import type { PlainDate } from "@/lib/plain-date";

type Show = "all" | "open" | "drafts" | "finished";

const SHOWS: { id: Show; label: string; statuses: ProgrammeStatus[] | null }[] = [
  { id: "all", label: "All", statuses: null },
  { id: "open", label: "Open", statuses: ["open"] },
  { id: "drafts", label: "Drafts", statuses: ["draft"] },
  { id: "finished", label: "Finished", statuses: ["finished"] },
];

const ALL = { id: "all", label: "All", statuses: null } as const;

type Stats = Record<string, { enrolled: number; owedPaise: number; collectedPaise: number }>;

/**
 * Programmes as Cal.com lists event types: one framed list, each row the
 * name and its status, the schedule in a line, who it is for, and how full
 * it is. Filters are URLs; New programme is a dialog at `?new=1`.
 */
export function ProgrammesList({ route, today }: { route: Route; today: PlainDate }): React.ReactElement {
  const section = sectionById("programmes");
  const viewer = useViewer();
  const list = useRead(["programmes"], (c) => c.programmes.list());
  const show = SHOWS.find((s) => s.id === route.query.get("show")) ?? ALL;
  const q = route.query.get("q") ?? "";
  const creating = route.query.get("new") === "1";
  const canCreate = viewer?.can.editProgrammes ?? false;

  const link = (patch: Record<string, string | null>): string => hrefFor("/desk/programmes", { show: show.id === "all" ? null : show.id, q: q || null, ...patch });
  const setQuery = (value: string): void => navigate("/desk/programmes", { show: show.id === "all" ? null : show.id, q: value || null }, { replace: true });

  const programmes = list.data?.programmes ?? [];
  const query = q.trim().toLowerCase();
  const matches = (p: Programme): boolean => !query || p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query);
  const shown = programmes.filter((p) => (show.statuses ? show.statuses.includes(p.status) : true) && matches(p));
  const newButton = (
    <Gated allowed={canCreate} reason={cantSay(viewer, "create programmes")}>
      <Button onClick={() => navigate("/desk/programmes", { show: show.id === "all" ? null : show.id, q: q || null, new: "1" })}>
        <PlusIcon aria-hidden="true" />
        New programme
      </Button>
    </Gated>
  );

  return (
    <Screen>
      <PageHeader
        actions={programmes.length > 0 ? newButton : undefined}
        description={viewer?.role === "coach" ? "The programmes you coach, and who is in them." : section.line}
        title={section.label}
      />
      {list.isPending ? (
        <ListSkeleton label="Loading programmes" rows={4} />
      ) : list.isError ? (
        <LoadFailed error={list.error} onRetry={() => void list.refetch()} what="programmes" />
      ) : programmes.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShapesIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No programmes yet</EmptyTitle>
            <EmptyDescription>Coaching, camps and leagues show up here once you create one.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{newButton}</EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <LinkTabs
              label="Show programmes"
              tabs={SHOWS.map((s) => ({
                href: hrefFor("/desk/programmes", { show: s.id === "all" ? null : s.id, q: q || null }),
                label: s.label,
                current: s.id === show.id,
                count: programmes.filter((p) => (s.statuses ? s.statuses.includes(p.status) : true)).length,
              }))}
            />
            <InputGroup className="w-full sm:w-64">
              <InputGroupAddon>
                <SearchIcon aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput aria-label="Search programmes" onChange={(e) => setQuery(e.target.value)} placeholder="Search programmes" type="search" value={q} />
            </InputGroup>
          </div>
          {shown.length === 0 ? (
            <Empty className="rounded-2xl border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchXIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>{q ? `No programme matches "${q}"` : `No ${show.label.toLowerCase()} programmes`}</EmptyTitle>
                <EmptyDescription>{q ? "Try another word, or clear the search." : "Programmes move here when their status changes."}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button render={<Anchor href={q ? link({ q: null }) : hrefFor("/desk/programmes")} />} variant="outline">
                  {q ? "Clear search" : "Show all programmes"}
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <Frame>
              <ul aria-label="Programmes" className="flex flex-col divide-y rounded-xl border bg-card">
                {shown.map((p) => (
                  <ProgrammeRow key={p.id} programme={p} stats={list.data.stats} />
                ))}
              </ul>
            </Frame>
          )}
        </>
      )}
      <NewProgrammeDialog onClose={() => navigate("/desk/programmes", { show: show.id === "all" ? null : show.id, q: q || null }, { replace: true })} open={creating && canCreate} today={today} />
    </Screen>
  );
}

function ProgrammeRow({ programme: p, stats }: { programme: Programme; stats: Stats }): React.ReactElement {
  const s = stats[p.id] ?? { enrolled: 0, owedPaise: 0, collectedPaise: 0 };
  const meta = STATUS_META[p.status];
  const href = hrefFor(`/desk/programmes/${p.id}`);
  const full = s.enrolled >= p.capacity;
  return (
    <li className="relative flex flex-col gap-3 p-4 hover:bg-accent/40 md:flex-row md:items-center md:gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* The name is the row's link; its ::after covers the row so the whole row opens the programme. */}
          <Anchor className="font-medium outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-ring" href={href}>
            {p.name}
          </Anchor>
          <Badge variant={meta.badge}>{meta.label}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">{scheduleLine(p)}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{agesLine(p)}</Badge>
          <Badge variant="outline">
            {p.plans.filter((x) => !x.retired).length} {p.plans.filter((x) => !x.retired).length === 1 ? "plan" : "plans"}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-4 md:w-80">
        <Meter className="min-w-0 flex-1 gap-1.5" max={p.capacity} value={Math.min(s.enrolled, p.capacity)}>
          <div className="flex items-center justify-between gap-2">
            <MeterLabel className="font-normal text-muted-foreground text-xs">{full ? "Full" : "Places taken"}</MeterLabel>
            <MeterValue className="text-xs">{() => `${s.enrolled} of ${p.capacity}`}</MeterValue>
          </div>
          <MeterTrack className="h-1.5 rounded-full">
            <MeterIndicator className={full ? "bg-warning" : undefined} />
          </MeterTrack>
        </Meter>
        <div className="w-24 shrink-0 text-end text-sm">
          {s.owedPaise > 0 ? (
            <span className="flex flex-col">
              <span className="font-medium text-warning-foreground tabular-nums">{formatInr(s.owedPaise)}</span>
              <span className="text-muted-foreground text-xs">owed</span>
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">Nothing owed</span>
          )}
        </div>
        <Menu>
          <MenuTrigger render={<Button aria-label={`More for ${p.name}`} className="relative z-10" size="icon-sm" variant="ghost" />}>
            <EllipsisIcon aria-hidden="true" />
          </MenuTrigger>
          <MenuPopup align="end">
            <MenuLinkItem href={hrefFor(`/desk/programmes/${p.id}/sessions/latest`)}>
              <ClipboardCheckIcon aria-hidden="true" />
              Take register
            </MenuLinkItem>
            <MenuLinkItem href={hrefFor(`/desk/programmes/${p.id}/enrolled`)}>
              <UsersIcon aria-hidden="true" />
              Who's enrolled
            </MenuLinkItem>
            <MenuLinkItem href={hrefFor(`/desk/programmes/${p.id}/settings`)}>
              <SettingsIcon aria-hidden="true" />
              Settings
            </MenuLinkItem>
          </MenuPopup>
        </Menu>
      </div>
    </li>
  );
}

/**
 * New programme: everything a programme needs to run, in one dialog, then
 * the programme's page. Opens as a draft unless "Open for sign-ups" is on,
 * so a half-made programme never takes a booking.
 */
function NewProgrammeDialog({ open, onClose, today }: { open: boolean; onClose: () => void; today: PlainDate }): React.ReactElement {
  return (
    <Dialog onOpenChange={(next) => !next && onClose()} open={open}>
      <DialogPopup className="sm:max-w-2xl">{open && <NewProgrammeForm onClose={onClose} today={today} />}</DialogPopup>
    </Dialog>
  );
}

function NewProgrammeForm({ onClose, today }: { onClose: () => void; today: PlainDate }): React.ReactElement {
  const [draft, setDraft] = React.useState<ProgrammeDraft>(() => emptyDraft(today));
  const [plans, setPlans] = React.useState<ProgrammePlan[]>(() => [newPlan()]);
  const [openNow, setOpenNow] = React.useState(false);
  const [refusal, setRefusal] = React.useState<{ message: string; fields: Record<string, string> } | null>(null);
  const create = useWrite((c, input: Omit<Programme, "id" | "createdAt">) => c.programmes.create(input));

  const submit = async (): Promise<void> => {
    setRefusal(null);
    try {
      const made = await create.mutateAsync({ ...draft, name: draft.name.trim(), status: openNow ? "open" : "draft", coachId: null, plans });
      toastManager.add({ title: `${made.name} created`, description: openNow ? "It's open for sign-ups." : "It's a draft: open it for sign-ups from its settings.", type: "success" });
      navigate(`/desk/programmes/${made.id}`);
    } catch (error) {
      setRefusal(refusalOf(error));
    }
  };

  return (
    <Form
      className="contents"
      errors={refusal?.fields}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>New programme</DialogTitle>
        <DialogDescription>Coaching, a camp or a league. Sessions are made from the days and times you pick.</DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-6">
        <FormRefusal message={refusal?.message ?? null} />
        <ProgrammeFields draft={draft} onChange={setDraft} today={today} />
        <PlanList onChange={setPlans} plans={plans} />
        <Field className="flex-row items-start gap-3 rounded-xl border p-3">
          <Switch checked={openNow} className="mt-0.5" onCheckedChange={setOpenNow} />
          <div className="flex flex-col gap-1">
            <FieldLabel>Open for sign-ups now</FieldLabel>
            <FieldDescription>Off: it starts as a draft only the team can see.</FieldDescription>
          </div>
        </Field>
      </DialogPanel>
      <DialogFooter>
        <Button disabled={create.isPending} onClick={onClose} variant="ghost">
          Cancel
        </Button>
        <Button loading={create.isPending} type="submit">
          Create programme
        </Button>
      </DialogFooter>
    </Form>
  );
}
