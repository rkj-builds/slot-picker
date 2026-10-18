"use client";

import { BanIcon, EllipsisIcon, MailIcon, ShieldIcon, UserCheckIcon, UserMinusIcon, UsersIcon } from "lucide-react";
import * as React from "react";
import { initialsOf } from "@/app/format";
import { ListSkeleton, LoadFailed } from "@/app/screens/screen-kit";
import { InviteDialog } from "@/app/screens/team/invite-dialog";
import { type MemberAction, MemberDialogs } from "@/app/screens/team/member-dialogs";
import { ROLE_BADGE, ROLE_LABELS, ROLES, STATUS_WORDS } from "@/app/screens/team/team-words";
import { agoOf } from "@/app/screens/team/time-words";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Frame } from "@/components/ui/frame";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toastManager } from "@/components/ui/toast";
import { errorMessage } from "@/data/errors";
import { useRead, useWrite } from "@/data/provider";
import type { TeamMember } from "@/data/types";
import { useMediaQuery } from "@/hooks/use-media-query";

const STATUS_ORDER: Record<TeamMember["status"], number> = { active: 0, invited: 1, disabled: 2 };

/** Active people first, by role (admins at the top), then invites, then disabled. */
function byStanding(a: TeamMember, b: TeamMember): number {
  return STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.name.localeCompare(b.name);
}

/**
 * Everyone on the team: a framed table on a laptop, stacked rows on a phone.
 * Each row's menu: change role, disable or enable, send the invite again,
 * remove. Only an admin sees the menu enabled.
 */
export function MembersTab({
  admin,
  invite,
  now,
  viewerId,
  onInviteChange,
}: {
  admin: boolean;
  /** The ?invite= in the URL: "1" opens the dialog, "check" opens it with mistakes already checked. */
  invite: string | null;
  now: number;
  viewerId: string | null;
  onInviteChange: (open: boolean) => void;
}): React.ReactElement {
  const members = useRead(["team", "members"], (c) => c.team.members());
  const phone = useMediaQuery("max-md");
  const [action, setAction] = React.useState<MemberAction | null>(null);
  const resend = useWrite((c, id: string) => c.team.resendInvite(id));
  const enable = useWrite((c, id: string) => c.team.update(id, { status: "active" }));

  const run = async (title: string, work: () => Promise<TeamMember>, failure: string): Promise<void> => {
    try {
      const member = await work();
      toastManager.add({ title: title.replace("{name}", member.name), type: "success" });
    } catch (error) {
      toastManager.add({ title: failure, description: errorMessage(error), type: "error" });
    }
  };
  const menuFor = (m: TeamMember): React.ReactElement => (
    <MemberMenu
      admin={admin}
      member={m}
      onAction={(kind) => setAction({ kind, member: m })}
      onEnable={() => void run("Enabled {name}'s access", () => enable.mutateAsync(m.id), "Couldn't enable access")}
      onResend={() => void run("Invite sent again to {name}", () => resend.mutateAsync(m.id), "Couldn't send the invite")}
    />
  );

  const rows = members.data ? [...members.data].sort(byStanding) : undefined;
  return (
    <>
      {members.isError ? (
        <LoadFailed error={members.error} onRetry={() => void members.refetch()} what="the team" />
      ) : !rows ? (
        <ListSkeleton label="Loading the team" rows={5} />
      ) : rows.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Nobody on the team yet</EmptyTitle>
            <EmptyDescription>Invite the people who run the desk and coach, so each signs in as themselves.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : phone ? (
        <ul aria-label="Team members" className="flex flex-col divide-y rounded-2xl border bg-card">
          {rows.map((m) => (
            <li className="flex items-start gap-3 p-3" key={m.id}>
              <Avatar className="size-9 shrink-0">
                <AvatarFallback>{initialsOf(m.name)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Who member={m} you={m.id === viewerId} />
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={ROLE_BADGE[m.role]}>{ROLE_LABELS[m.role]}</Badge>
                  <Badge variant={STATUS_WORDS[m.status].badge}>{STATUS_WORDS[m.status].label}</Badge>
                  <span className="text-muted-foreground text-xs">{seenOf(m, now)}</span>
                </div>
              </div>
              {menuFor(m)}
            </li>
          ))}
        </ul>
      ) : (
        <Frame>
          <Table aria-label="Team members" variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <Avatar className="size-8 shrink-0">
                        <AvatarFallback>{initialsOf(m.name)}</AvatarFallback>
                      </Avatar>
                      <Who member={m} you={m.id === viewerId} />
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-col items-start gap-0.5">
                      <Badge variant={ROLE_BADGE[m.role]}>{ROLE_LABELS[m.role]}</Badge>
                      {m.role === "coach" && (
                        <span className="text-muted-foreground text-xs">
                          {m.programmeIds.length} {m.programmeIds.length === 1 ? "programme" : "programmes"}
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_WORDS[m.status].badge}>{STATUS_WORDS[m.status].label}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{seenOf(m, now)}</TableCell>
                  <TableCell className="w-10 text-end">{menuFor(m)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Frame>
      )}
      <InviteDialog onOpenChange={onInviteChange} open={invite !== null && admin} withMistakes={invite === "check"} />
      <MemberDialogs action={action} onClose={() => setAction(null)} />
    </>
  );
}

function Who({ member: m, you }: { member: TeamMember; you: boolean }): React.ReactElement {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate font-medium">
        {m.name}
        {you && <span className="font-normal text-muted-foreground"> (you)</span>}
      </span>
      <span className="truncate text-muted-foreground text-xs">{m.email}</span>
    </span>
  );
}

function seenOf(m: TeamMember, now: number): string {
  if (m.status === "invited") return `Invited ${agoOf(m.invitedAt, now).toLowerCase()}`;
  return m.lastSeenAt === null ? "Never signed in" : agoOf(m.lastSeenAt, now);
}

function MemberMenu({
  member: m,
  admin,
  onAction,
  onEnable,
  onResend,
}: {
  member: TeamMember;
  admin: boolean;
  onAction: (kind: MemberAction["kind"]) => void;
  onEnable: () => void;
  onResend: () => void;
}): React.ReactElement {
  return (
    <Menu>
      <MenuTrigger render={<Button aria-label={`Actions for ${m.name}`} disabled={!admin} size="icon-sm" variant="ghost" />}>
        <EllipsisIcon aria-hidden="true" />
      </MenuTrigger>
      <MenuPopup align="end">
        <MenuGroup>
          <MenuGroupLabel>{m.name}</MenuGroupLabel>
          <MenuItem onClick={() => onAction("role")}>
            <ShieldIcon aria-hidden="true" />
            Change role…
          </MenuItem>
          {m.status === "invited" && (
            <MenuItem onClick={onResend}>
              <MailIcon aria-hidden="true" />
              Send invite again
            </MenuItem>
          )}
          {m.status === "disabled" ? (
            <MenuItem onClick={onEnable}>
              <UserCheckIcon aria-hidden="true" />
              Enable access
            </MenuItem>
          ) : m.status === "active" ? (
            <MenuItem onClick={() => onAction("disable")}>
              <BanIcon aria-hidden="true" />
              Disable access…
            </MenuItem>
          ) : null}
        </MenuGroup>
        <MenuSeparator />
        <MenuItem onClick={() => onAction("remove")} variant="destructive">
          <UserMinusIcon aria-hidden="true" />
          {m.status === "invited" ? "Cancel invite…" : "Remove from team…"}
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}
