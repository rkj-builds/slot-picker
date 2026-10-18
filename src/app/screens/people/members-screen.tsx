"use client";

import { IdCardIcon, PencilIcon, PlusIcon, SearchIcon, SearchXIcon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import type { ScreenProps } from "@/app/desk/sections";
import { sectionById } from "@/app/desk/sections";
import { hrefFor, navigate, type Route } from "@/app/router";
import { DialogShell, PlanForm, SellForm } from "@/app/screens/people/member-dialogs";
import { MemberSheet } from "@/app/screens/people/member-sheet";
import { HoursMeter } from "@/app/screens/people/people-parts";
import { effectiveStatus, expiryLine, inSegment, type Segment, SEGMENTS } from "@/app/screens/people/members-model";
import { cantSay, useViewer } from "@/app/screens/programmes/hooks";
import { Gated, LinkTabs } from "@/app/screens/programmes/kit";
import { ListSkeleton, LoadFailed, PageHeader, Screen } from "@/app/screens/screen-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Frame } from "@/components/ui/frame";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toastManager } from "@/components/ui/toast";
import { errorMessage } from "@/data/errors";
import { membershipDue } from "@/data/money";
import { useRead, useWrite } from "@/data/provider";
import type { Customer, Membership, MembershipPlan, Viewer } from "@/data/types";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatInr } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import type { PlainDate } from "@/lib/plain-date";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<Membership["status"], { label: string; variant: "success" | "info" | "secondary" }> = {
  active: { label: "Active", variant: "success" },
  paused: { label: "Paused", variant: "info" },
  expired: { label: "Expired", variant: "secondary" },
};
const ACTIVE = { id: "active" as const, label: "Active", empty: "" };

/**
 * Members: court-hour memberships. `#/desk/members` the active ones, then a
 * URL per segment (`/low-hours`, `/expiring`, `/owes`, `/paused`, `/expired`),
 * and `/plans` for what's on sale. `?open=<id>` opens a member's panel,
 * `?sell=1` the Sell membership dialog.
 */
export function MembersScreen({ route, sub, today }: ScreenProps): React.ReactElement {
  const section = sectionById("members");
  const viewer = useViewer();
  const list = useRead(["memberships"], (c) => c.memberships.list());
  const plansView = sub[0] === "plans";
  const segment = SEGMENTS.find((s) => s.id === sub[0]) ?? ACTIVE;
  const openId = route.query.get("open");
  const selling = route.query.get("sell") === "1";
  const setQuery = (patch: Record<string, string | null>): void => navigate(route.path, { ...Object.fromEntries(route.query), ...patch }, { replace: true });
  const canSell = viewer?.can.handleMoney ?? false;

  return (
    <Screen>
      <PageHeader
        actions={
          <Gated allowed={canSell} reason={cantSay(viewer, "take or record money")}>
            <Button onClick={() => setQuery({ sell: "1" })}>
              <PlusIcon aria-hidden="true" />
              Sell membership
            </Button>
          </Gated>
        }
        description={section.line}
        title={section.label}
      />
      <LinkTabs
        label="Members or plans"
        tabs={[
          { href: hrefFor("/desk/members"), label: "Members", current: !plansView },
          { href: hrefFor("/desk/members/plans"), label: "Plans", current: plansView },
        ]}
      />
      {list.isPending ? (
        <ListSkeleton label="Loading members" />
      ) : list.isError ? (
        <LoadFailed error={list.error} onRetry={() => void list.refetch()} what="members" />
      ) : plansView ? (
        <PlansView plans={list.data.plans} memberships={list.data.memberships} viewer={viewer} />
      ) : (
        <MembersView customers={list.data.customers} memberships={list.data.memberships} plans={list.data.plans} route={route} segment={segment.id} today={today} />
      )}
      <MemberSheet id={openId} onClose={() => setQuery({ open: null })} today={today} />
      <DialogShell onClose={() => setQuery({ sell: null })} open={selling && canSell && Boolean(list.data)}>
        {list.data && <SellForm customers={list.data.customers} onClose={() => setQuery({ sell: null })} plans={list.data.plans} today={today} />}
      </DialogShell>
    </Screen>
  );
}

function MembersView({ memberships, customers, plans, segment, route, today }: { memberships: readonly Membership[]; customers: readonly Customer[]; plans: readonly MembershipPlan[]; segment: Segment; route: Route; today: PlainDate }): React.ReactElement {
  const phone = useMediaQuery("max-md");
  const q = route.query.get("q") ?? "";
  const query = q.trim().toLowerCase();
  const who = (m: Membership): Customer | undefined => customers.find((c) => c.id === m.customerId);
  const matches = (m: Membership): boolean => !query || Boolean(who(m)?.name.toLowerCase().includes(query)) || (query.replaceAll(/\D/g, "").length >= 3 && Boolean(who(m)?.phone.includes(query.replaceAll(/\D/g, ""))));
  const rows = memberships.filter((m) => inSegment(m, segment, today) && matches(m)).sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));
  const current = SEGMENTS.find((s) => s.id === segment) ?? ACTIVE;
  const path = (id: Segment): string => (id === "active" ? "/desk/members" : `/desk/members/${id}`);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LinkTabs label="Members by segment" tabs={SEGMENTS.map((s) => ({ href: hrefFor(path(s.id), { q: q || null }), label: s.label, current: s.id === segment, count: memberships.filter((m) => inSegment(m, s.id, today) && matches(m)).length }))} />
        <InputGroup className="w-full sm:w-56">
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput aria-label="Search members" onChange={(e) => navigate(path(segment), { q: e.target.value || null }, { replace: true })} placeholder="Name or phone" type="search" value={q} />
        </InputGroup>
      </div>
      {rows.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">{query ? <SearchXIcon aria-hidden="true" /> : <IdCardIcon aria-hidden="true" />}</EmptyMedia>
            <EmptyTitle>{query ? `No member matches "${q}"` : `Nobody in ${current.label.toLowerCase()}`}</EmptyTitle>
            <EmptyDescription>{query ? "Try another name, or clear the search." : current.empty}</EmptyDescription>
          </EmptyHeader>
          {query && (
            <EmptyContent>
              <Button render={<Anchor href={hrefFor(path(segment))} />} variant="outline">
                Clear search
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : phone ? (
        <Frame>
          <ul aria-label={`Members: ${current.label}`} className="flex flex-col divide-y rounded-xl border bg-card">
            {rows.map((m) => (
              <li className="flex flex-col gap-2 p-3" key={m.id}>
                <MemberName customer={who(m)} id={m.id} route={route} />
                <p className="text-muted-foreground text-xs">
                  {plans.find((p) => p.id === m.planId)?.name} · {expiryLine(m, today).text}
                  {membershipDue(m) > 0 ? ` · owes ${formatInr(membershipDue(m))}` : ""}
                </p>
                <HoursMeter m={m} />
              </li>
            ))}
          </ul>
        </Frame>
      ) : (
        <Frame>
          <Table aria-label={`Members: ${current.label}`} variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="w-48">Hours left</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-end">Owes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => {
                const status = STATUS_BADGE[effectiveStatus(m, today)];
                const expiry = expiryLine(m, today);
                const due = membershipDue(m);
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <MemberName customer={who(m)} id={m.id} route={route} />
                    </TableCell>
                    <TableCell>{plans.find((p) => p.id === m.planId)?.name ?? "—"}</TableCell>
                    <TableCell>
                      <HoursMeter m={m} />
                    </TableCell>
                    <TableCell className={cn(expiry.soon && "text-warning-foreground")}>{expiry.text}</TableCell>
                    <TableCell className="text-end tabular-nums">{due > 0 ? <span className="font-medium text-warning-foreground">{formatInr(due)}</span> : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Frame>
      )}
    </>
  );
}

function MemberName({ customer, id, route }: { customer: Customer | undefined; id: string; route: Route }): React.ReactElement {
  return (
    <span className="flex flex-col">
      <Anchor className="font-medium underline-offset-4 hover:underline" href={hrefFor(route.path, { ...Object.fromEntries(route.query), open: id })}>
        {customer?.name ?? "Member"}
      </Anchor>
      {customer && <span className="text-muted-foreground text-xs tabular-nums">{formatPhone(customer.phone)}</span>}
    </span>
  );
}

/* ── Plans ──────────────────────────────────────────────────────────── */

function PlansView({ plans, memberships, viewer }: { plans: readonly MembershipPlan[]; memberships: readonly Membership[]; viewer: Viewer | undefined }): React.ReactElement {
  const [editing, setEditing] = React.useState<MembershipPlan | "new" | null>(null);
  const save = useWrite((c, plan: MembershipPlan) => c.memberships.savePlan(plan));
  const can = viewer?.can.editSettings ?? false;
  const reason = cantSay(viewer, "change settings");
  const sorted = [...plans].sort((a, b) => Number(a.retired) - Number(b.retired) || a.hours - b.hours);

  const setRetired = async (plan: MembershipPlan, retired: boolean): Promise<void> => {
    try {
      await save.mutateAsync({ ...plan, retired });
      toastManager.add({
        title: retired ? `${plan.name} retired` : `${plan.name} is on sale again`,
        description: retired ? "It can't be sold any more. Members on it keep their hours." : undefined,
        type: "success",
        actionProps: { children: "Undo", onClick: () => void save.mutateAsync({ ...plan, retired: !retired }) },
      });
    } catch (error) {
      toastManager.add({ title: "Couldn't change the plan", description: errorMessage(error), type: "error" });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">What the desk can sell. Retired plans stay on the members who bought them.</p>
        <Gated allowed={can} reason={reason}>
          <Button onClick={() => setEditing("new")} variant="outline">
            <PlusIcon aria-hidden="true" />
            New plan
          </Button>
        </Gated>
      </div>
      <Frame>
        <ul aria-label="Plans" className="flex flex-col divide-y rounded-xl border bg-card">
          {sorted.map((plan) => {
            const using = memberships.filter((m) => m.planId === plan.id && m.status !== "expired").length;
            return (
              <li className="flex flex-wrap items-center gap-3 p-3" key={plan.id}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cn("font-medium text-sm", plan.retired && "text-muted-foreground")}>{plan.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {plan.hours} hours · valid {plan.validDays} days · {formatInr(plan.pricePaise)} · {using} {using === 1 ? "member" : "members"} on it
                  </span>
                </span>
                <Badge variant={plan.retired ? "secondary" : "success"}>{plan.retired ? "Retired" : "On sale"}</Badge>
                <Gated allowed={can} reason={reason}>
                  <Button aria-label={`Edit ${plan.name}`} onClick={() => setEditing(plan)} size="sm" variant="ghost">
                    <PencilIcon aria-hidden="true" />
                    Edit
                  </Button>
                </Gated>
                <Gated allowed={can} reason={reason}>
                  <Button aria-label={`${plan.retired ? "Put back on sale" : "Retire"} ${plan.name}`} disabled={save.isPending} onClick={() => void setRetired(plan, !plan.retired)} size="sm" variant="ghost">
                    {plan.retired ? "Put back on sale" : "Retire"}
                  </Button>
                </Gated>
              </li>
            );
          })}
        </ul>
      </Frame>
      <DialogShell onClose={() => setEditing(null)} open={editing !== null}>
        {editing !== null && <PlanForm onClose={() => setEditing(null)} plan={editing === "new" ? null : editing} />}
      </DialogShell>
    </div>
  );
}
