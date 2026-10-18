"use client";

import { ClipboardListIcon, ListFilterIcon, SearchIcon, SearchXIcon, UserPlusIcon, XIcon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import type { ScreenProps } from "@/app/desk/sections";
import { sectionById } from "@/app/desk/sections";
import { hrefFor, navigate } from "@/app/router";
import { useEnrolmentActions } from "@/app/screens/programmes/enrolment-actions";
import { EnrolmentActionsProvider } from "@/app/screens/programmes/enrolment-dialogs";
import { EnrolmentTable } from "@/app/screens/programmes/enrolment-table";
import { cantSay, useViewer } from "@/app/screens/programmes/hooks";
import { Gated, LinkTabs } from "@/app/screens/programmes/kit";
import { ENROLMENT_TABS, type EnrolmentTab, enrolleeName, inTab } from "@/app/screens/programmes/programme-model";
import { ListSkeleton, LoadFailed, PageHeader, Screen } from "@/app/screens/screen-kit";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Group } from "@/components/ui/group";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Menu, MenuGroup, MenuGroupLabel, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "@/components/ui/menu";
import { useRead } from "@/data/provider";
import type { Customer, Enrolment, Programme } from "@/data/types";
import type { PlainDate } from "@/lib/plain-date";

const CHASE = { id: "chase", label: "To chase", empty: ENROLMENT_TABS[0]?.empty ?? "" } as const;

/**
 * Enrolments: who is signed up to what, by state. Tabs are URLs
 * (`#/desk/enrolments` is To chase, then `/running`, `/paused`, `/stopped`,
 * `/waitlist`, `/everyone`); the search and the programme chip are in the
 * query (`?q=`, `?programme=`), and so is a dialog a link can open
 * (`?renew=<id>`, `?add=1`).
 */
export function EnrolmentsScreen({ route, sub, today }: ScreenProps): React.ReactElement {
  const section = sectionById("enrolments");
  const viewer = useViewer();
  const list = useRead(["enrolments", "all"], (c) => c.enrolments.list({}));
  const tab = ENROLMENT_TABS.find((t) => t.id === sub[0]) ?? CHASE;
  const q = route.query.get("q") ?? "";
  const programmeId = route.query.get("programme");
  const renewId = route.query.get("renew");
  const adding = route.query.get("add") === "1";
  const keep = (patch: Record<string, string | null>, path = route.path): void => navigate(path, { q: q || null, programme: programmeId, ...patch }, { replace: true });

  const add = (
    <Gated allowed={viewer?.can.writeBookings ?? false} reason={cantSay(viewer, "change enrolments")}>
      <AddButton />
    </Gated>
  );

  if (list.isPending) {
    return (
      <Screen>
        <PageHeader description={section.line} title={section.label} />
        <ListSkeleton label="Loading enrolments" />
      </Screen>
    );
  }
  if (list.isError) {
    return (
      <Screen>
        <PageHeader description={section.line} title={section.label} />
        <LoadFailed error={list.error} onRetry={() => void list.refetch()} what="enrolments" />
      </Screen>
    );
  }

  const { enrolments, customers, programmes } = list.data;
  return (
    <EnrolmentActionsProvider
      customers={customers}
      enrolments={enrolments}
      initial={renewId ? { dialog: "renew", id: renewId } : null}
      onInitialClosed={() => keep({ renew: null })}
      programmes={programmes}
      today={today}
    >
      <AddFromUrl adding={adding} onOpened={() => keep({ add: null })} />
      <Screen>
        <PageHeader actions={add} description={viewer?.role === "coach" ? "The children in the programmes you coach." : section.line} title={section.label} />
        <Body customers={customers} enrolments={enrolments} programmeId={programmeId} programmes={programmes} q={q} setQuery={(value) => keep({ q: value || null })} tab={tab.id} today={today} />
      </Screen>
    </EnrolmentActionsProvider>
  );
}

function AddButton(props: React.ComponentProps<"button">): React.ReactElement {
  const actions = useEnrolmentActions();
  return (
    <Button {...props} onClick={(event) => (props.onClick ? props.onClick(event) : actions.add())}>
      <UserPlusIcon aria-hidden="true" />
      Add a child
    </Button>
  );
}

/** `?add=1` opens Add a child once, then leaves the URL. */
function AddFromUrl({ adding, onOpened }: { adding: boolean; onOpened: () => void }): null {
  const actions = useEnrolmentActions();
  const viewer = useViewer();
  const allowed = viewer?.can.writeBookings ?? false;
  React.useEffect(() => {
    if (!adding || !viewer) return;
    if (allowed) actions.add();
    onOpened();
  }, [adding, viewer, allowed, actions, onOpened]);
  return null;
}

function Body({
  enrolments,
  customers,
  programmes,
  tab,
  q,
  setQuery,
  programmeId,
  today,
}: {
  enrolments: readonly Enrolment[];
  customers: readonly Customer[];
  programmes: readonly Programme[];
  tab: EnrolmentTab;
  q: string;
  setQuery: (value: string) => void;
  programmeId: string | null;
  today: PlainDate;
}): React.ReactElement {
  const query = q.trim().toLowerCase();
  const programme = programmes.find((p) => p.id === programmeId);
  const scoped = enrolments.filter((e) => !programme || e.programmeId === programme.id);
  const matches = (e: Enrolment): boolean => {
    if (!query) return true;
    const parent = customers.find((c) => c.id === e.customerId);
    return enrolleeName(e, customers).toLowerCase().includes(query) || Boolean(parent?.name.toLowerCase().includes(query)) || (query.replaceAll(/\D/g, "").length >= 3 && Boolean(parent?.phone.includes(query.replaceAll(/\D/g, ""))));
  };
  const rows = scoped
    .filter((e) => inTab(e, tab, today) && matches(e))
    .sort((a, b) => a.paidUntil.localeCompare(b.paidUntil) || enrolleeName(a, customers).localeCompare(enrolleeName(b, customers)));
  const filtered = Boolean(query) || Boolean(programme);
  const current = ENROLMENT_TABS.find((t) => t.id === tab) ?? CHASE;
  const tabHref = (id: EnrolmentTab): string => hrefFor(id === "chase" ? "/desk/enrolments" : `/desk/enrolments/${id}`, { q: q || null, programme: programme?.id ?? null });
  const route = tab === "chase" ? "/desk/enrolments" : `/desk/enrolments/${tab}`;

  return (
    <>
      <div className="flex flex-col gap-3">
        <LinkTabs
          label="Enrolments by state"
          tabs={ENROLMENT_TABS.map((t) => ({ href: tabHref(t.id), label: t.label, current: t.id === tab, count: scoped.filter((e) => inTab(e, t.id, today) && matches(e)).length }))}
        />
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="w-full sm:w-72">
            <InputGroupAddon>
              <SearchIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput aria-label="Search by child or parent" onChange={(e) => setQuery(e.target.value)} placeholder="Child or parent" type="search" value={q} />
          </InputGroup>
          <ProgrammeChip programme={programme} programmes={programmes} route={route} q={q} />
        </div>
      </div>
      {rows.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">{filtered ? <SearchXIcon aria-hidden="true" /> : <ClipboardListIcon aria-hidden="true" />}</EmptyMedia>
            <EmptyTitle>{filtered ? "Nothing matches" : tab === "chase" ? "Nobody to chase" : `No one ${current.label.toLowerCase() === "everyone" ? "enrolled" : current.label.toLowerCase()}`}</EmptyTitle>
            <EmptyDescription>{filtered ? "Try another name, or clear the filters." : current.empty}</EmptyDescription>
          </EmptyHeader>
          {filtered && (
            <EmptyContent>
              <Button render={<Anchor href={hrefFor(route)} />} variant="outline">
                Clear filters
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <>
          <p aria-live="polite" className="-mb-2 text-muted-foreground text-sm">
            {rows.length} {rows.length === 1 ? "person" : "people"}
            {tab === "chase" ? " owe money or run out within 3 days" : ""}
          </p>
          <EnrolmentTable enrolments={rows} label={`Enrolments: ${current.label}`} />
        </>
      )}
    </>
  );
}

/** The programme filter as a chip (coss particle p-group-23): pick one, or clear it with ×. */
function ProgrammeChip({ programme, programmes, route, q }: { programme: Programme | undefined; programmes: readonly Programme[]; route: string; q: string }): React.ReactElement {
  const pick = (id: string | null): void => navigate(route, { q: q || null, programme: id }, { replace: true });
  const menu = (
    <Menu>
      <MenuTrigger render={<Button variant="outline" />}>
        <ListFilterIcon aria-hidden="true" />
        {programme ? <span className="max-w-48 truncate">{programme.name}</span> : "Programme"}
      </MenuTrigger>
      <MenuPopup align="start">
        <MenuGroup>
          <MenuGroupLabel>Show enrolments in</MenuGroupLabel>
          <MenuRadioGroup onValueChange={(v) => pick(v === "all" ? null : (v as string))} value={programme?.id ?? "all"}>
            <MenuRadioItem value="all">Every programme</MenuRadioItem>
            {programmes.map((p) => (
              <MenuRadioItem key={p.id} value={p.id}>
                {p.name}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
  if (!programme) return menu;
  return (
    <Group aria-label="Programme filter">
      {menu}
      <Button aria-label={`Clear the programme filter (${programme.name})`} onClick={() => pick(null)} size="icon" variant="outline">
        <XIcon aria-hidden="true" />
      </Button>
    </Group>
  );
}
