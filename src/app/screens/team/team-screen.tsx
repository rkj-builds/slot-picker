"use client";

import { InfoIcon, UserPlusIcon } from "lucide-react";
import type * as React from "react";
import { sectionById, type ScreenProps } from "@/app/desk/sections";
import { hrefFor, navigate } from "@/app/router";
import { PageHeader, Screen } from "@/app/screens/screen-kit";
import { DevicesTab } from "@/app/screens/team/devices-tab";
import { LinkTabs } from "@/app/screens/team/link-tabs";
import { MembersTab } from "@/app/screens/team/members-tab";
import { RolesTab } from "@/app/screens/team/roles-tab";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRead } from "@/data/provider";

type TeamTab = "members" | "roles" | "devices";

const TABS: readonly { id: TeamTab; label: string; path: string }[] = [
  { id: "members", label: "Members", path: "/desk/team" },
  { id: "roles", label: "Roles & access", path: "/desk/team/roles" },
  { id: "devices", label: "Devices", path: "/desk/team/devices" },
];

/**
 * Who works at the venue and what each role may do. #/desk/team is the
 * people, #/desk/team/roles the access matrix, #/desk/team/devices where
 * they're signed in. Everyone with Team can look; only an admin changes
 * anything, and the page says so instead of hiding the controls.
 */
export function TeamScreen({ route, sub, now }: ScreenProps): React.ReactElement {
  const section = sectionById("team");
  const tab: TeamTab = sub[0] === "roles" ? "roles" : sub[0] === "devices" ? "devices" : "members";
  const viewer = useRead(["viewer"], (c) => c.team.viewer());
  const admin = viewer.data?.can.manageTeam ?? false;
  const inviteParam = route.query.get("invite");
  const setInvite = (open: boolean): void => navigate("/desk/team", { invite: open ? "1" : null }, { replace: !open });

  return (
    <Screen>
      <PageHeader
        actions={
          tab === "members" ? (
            <Button disabled={!admin} onClick={() => setInvite(true)}>
              <UserPlusIcon aria-hidden="true" />
              Invite someone
            </Button>
          ) : undefined
        }
        description={section.line}
        title={section.label}
      />
      <LinkTabs label="Team pages" tabs={TABS.map((t) => ({ href: hrefFor(t.path), label: t.label, current: t.id === tab }))} />
      {viewer.data && !admin && (
        <Alert variant="info">
          <InfoIcon aria-hidden="true" />
          <AlertDescription>You can see the team. Only an admin can invite people, change roles or access, or sign devices out.</AlertDescription>
        </Alert>
      )}
      {tab === "members" ? (
        <MembersTab admin={admin} invite={inviteParam} now={now} onInviteChange={setInvite} viewerId={viewer.data?.memberId ?? null} />
      ) : tab === "roles" ? (
        <RolesTab admin={admin} demoUnsaved={route.query.get("demo") === "unsaved"} />
      ) : (
        <DevicesTab now={now} />
      )}
    </Screen>
  );
}
