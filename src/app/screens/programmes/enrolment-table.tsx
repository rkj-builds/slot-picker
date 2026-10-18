"use client";

import { EllipsisIcon, MessageSquareTextIcon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import { hrefFor } from "@/app/router";
import { type RowAction, rowActions, useEnrolmentActions } from "@/app/screens/programmes/enrolment-actions";
import { cantSay, useViewer } from "@/app/screens/programmes/hooks";
import { Gated } from "@/app/screens/programmes/kit";
import { enrolleeName, nextStep, paidUntilLine, planOf } from "@/app/screens/programmes/programme-model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Frame } from "@/components/ui/frame";
import { Menu, MenuItem, MenuLinkItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { enrolmentDue } from "@/data/money";
import type { Enrolment, Viewer } from "@/data/types";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatInr } from "@/lib/money";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Partial<Record<Enrolment["status"], { label: string; variant: "secondary" | "outline" | "info" }>> = {
  paused: { label: "Paused", variant: "info" },
  stopped: { label: "Stopped", variant: "secondary" },
  waitlist: { label: "Waitlist", variant: "outline" },
};

/**
 * The register's people as a table: who (and their parent), what they're on,
 * how far it's paid, what they owe, and the one next step. A framed table on
 * a laptop, stacked rows on a phone. Row actions come from `rowActions`, so
 * the Enrolments screen and a programme's Enrolled tab offer the same ones.
 */
export function EnrolmentTable({ enrolments, showProgramme = true, label }: { enrolments: readonly Enrolment[]; showProgramme?: boolean; label: string }): React.ReactElement {
  const phone = useMediaQuery("max-md");
  if (phone) {
    return (
      <Frame>
        <ul aria-label={label} className="flex flex-col divide-y rounded-xl border bg-card">
          {enrolments.map((e) => (
            <PhoneRow enrolment={e} key={e.id} showProgramme={showProgramme} />
          ))}
        </ul>
      </Frame>
    );
  }
  return (
    <Frame>
      <Table aria-label={label} variant="card">
        <TableHeader>
          <TableRow>
            <TableHead>Who</TableHead>
            <TableHead>{showProgramme ? "Programme and plan" : "Plan"}</TableHead>
            <TableHead>Paid until</TableHead>
            <TableHead className="text-end">Owes</TableHead>
            <TableHead className="text-end">Next step</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrolments.map((e) => (
            <DeskRow enrolment={e} key={e.id} showProgramme={showProgramme} />
          ))}
        </TableBody>
      </Table>
    </Frame>
  );
}

function useRow(e: Enrolment) {
  const actions = useEnrolmentActions();
  const viewer = useViewer();
  const programme = actions.programmes.find((p) => p.id === e.programmeId);
  const parent = actions.customers.find((c) => c.id === e.customerId);
  const name = enrolleeName(e, actions.customers);
  return { actions, viewer, programme, parent, name, plan: planOf(programme, e.planId), due: enrolmentDue(e), until: paidUntilLine(e, actions.today), groups: rowActions(e, actions, viewer) };
}

function WhoCell({ e, name, parentName }: { e: Enrolment; name: string; parentName: string | undefined }): React.ReactElement {
  const status = STATUS_BADGE[e.status];
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium">{name}</span>
        {e.participantAge !== null && <span className="text-muted-foreground text-xs">{e.participantAge} yrs</span>}
        {status && <Badge variant={status.variant}>{status.label}</Badge>}
      </span>
      {e.participantName && parentName && <span className="text-muted-foreground text-xs">Parent: {parentName}</span>}
      {e.followUp && (
        <span className="flex items-start gap-1 text-muted-foreground text-xs">
          <MessageSquareTextIcon aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          <span className="whitespace-normal">
            <span className="sr-only">Follow-up: </span>
            {e.followUp}
          </span>
        </span>
      )}
    </span>
  );
}

function DeskRow({ enrolment: e, showProgramme }: { enrolment: Enrolment; showProgramme: boolean }): React.ReactElement {
  const row = useRow(e);
  return (
    <TableRow>
      <TableCell className="whitespace-normal">
        <WhoCell e={e} name={row.name} parentName={row.parent?.name} />
      </TableCell>
      <TableCell className="whitespace-normal">
        <span className="flex flex-col">
          {showProgramme && <span>{row.programme?.name ?? "—"}</span>}
          <span className={cn(showProgramme && "text-muted-foreground text-xs")}>{row.plan?.name ?? "—"}</span>
        </span>
      </TableCell>
      <TableCell>
        <UntilText e={e} until={row.until} />
      </TableCell>
      <TableCell className="text-end tabular-nums">{row.due > 0 ? <span className="font-medium text-warning-foreground">{formatInr(row.due)}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
      <TableCell className="text-end">
        <span className="inline-flex items-center gap-1">
          <NextStepButton e={e} name={row.name} viewer={row.viewer} />
          <RowMenu groups={row.groups} name={row.name} />
        </span>
      </TableCell>
    </TableRow>
  );
}

function PhoneRow({ enrolment: e, showProgramme }: { enrolment: Enrolment; showProgramme: boolean }): React.ReactElement {
  const row = useRow(e);
  return (
    <li className="flex flex-col gap-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <WhoCell e={e} name={row.name} parentName={row.parent?.name} />
        <RowMenu groups={row.groups} name={row.name} />
      </div>
      <p className="text-muted-foreground text-sm">
        {showProgramme && row.programme ? `${row.programme.name} · ` : ""}
        {row.plan?.name}
      </p>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex flex-col">
          <UntilText e={e} until={row.until} />
          {row.due > 0 && <span className="font-medium text-warning-foreground tabular-nums">Owes {formatInr(row.due)}</span>}
        </span>
        <NextStepButton e={e} name={row.name} viewer={row.viewer} />
      </div>
    </li>
  );
}

function UntilText({ e, until }: { e: Enrolment; until: { text: string; tone: "warning" | "error" | null } }): React.ReactElement {
  if (e.status === "stopped") return <span className="text-muted-foreground text-sm">Stopped{e.stopReason ? ` · ${e.stopReason}` : ""}</span>;
  if (e.status === "waitlist") return <span className="text-muted-foreground text-sm">Waiting for a place</span>;
  return <span className={cn("text-sm", until.tone === "error" && "text-destructive-foreground", until.tone === "warning" && "text-warning-foreground")}>{until.text}</span>;
}

/** The one button a row shows: Take payment, Renew, End pause, or Open (their parent's page). */
function NextStepButton({ e, name, viewer }: { e: Enrolment; name: string; viewer: Viewer | undefined }): React.ReactElement {
  const actions = useEnrolmentActions();
  const step = nextStep(e, actions.today);
  if (step === "open") {
    return (
      <Button aria-label={`Open ${name}'s parent`} render={<Anchor href={hrefFor(`/desk/customers/${e.customerId}`)} />} size="sm" variant="ghost">
        Open
      </Button>
    );
  }
  const spec =
    step === "pay"
      ? { label: "Take payment", allowed: viewer?.can.handleMoney ?? false, what: "take or record money", run: () => actions.open("pay", e) }
      : step === "renew"
        ? { label: "Renew", allowed: viewer?.can.handleMoney ?? false, what: "take or record money", run: () => actions.open("renew", e) }
        : { label: "End pause", allowed: viewer?.can.writeBookings ?? false, what: "change enrolments", run: () => actions.resume(e) };
  return (
    <Gated allowed={spec.allowed} reason={cantSay(viewer, spec.what)}>
      <Button aria-label={`${spec.label} for ${name}`} onClick={spec.run} size="sm" variant={step === "pay" ? "default" : "outline"}>
        {spec.label}
      </Button>
    </Gated>
  );
}

function RowMenu({ groups, name }: { groups: RowAction[][]; name: string }): React.ReactElement {
  return (
    <Menu>
      <MenuTrigger render={<Button aria-label={`More for ${name}`} size="icon-sm" variant="ghost" />}>
        <EllipsisIcon aria-hidden="true" />
      </MenuTrigger>
      <MenuPopup align="end" className="max-w-72">
        {groups.map((group, i) => (
          <React.Fragment key={group[0]?.id ?? i}>
            {i > 0 && <MenuSeparator />}
            {group.map((a) =>
              a.href ? (
                <MenuLinkItem href={a.href} key={a.id}>
                  <a.icon aria-hidden="true" />
                  {a.label}
                </MenuLinkItem>
              ) : (
                <MenuItem disabled={a.blocked !== null} key={a.id} onClick={a.run} variant={a.destructive ? "destructive" : "default"}>
                  <a.icon aria-hidden="true" />
                  <span className="flex flex-col">
                    {a.label}
                    {a.blocked && <span className="text-muted-foreground text-xs">{a.blocked}</span>}
                  </span>
                </MenuItem>
              ),
            )}
          </React.Fragment>
        ))}
      </MenuPopup>
    </Menu>
  );
}
