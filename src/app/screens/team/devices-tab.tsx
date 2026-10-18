"use client";

import { LaptopIcon, LogOutIcon, MonitorSmartphoneIcon, SmartphoneIcon } from "lucide-react";
import * as React from "react";
import { ListSkeleton, LoadFailed } from "@/app/screens/screen-kit";
import { agoOf } from "@/app/screens/team/time-words";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Frame } from "@/components/ui/frame";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toastManager } from "@/components/ui/toast";
import { errorMessage } from "@/data/errors";
import { useRead, useWrite } from "@/data/provider";
import type { DeviceSession } from "@/data/types";
import { useMediaQuery } from "@/hooks/use-media-query";

function DeviceIcon({ device }: { device: string }): React.ReactElement {
  const Icon = /iphone|android/i.test(device) ? SmartphoneIcon : /mac|windows/i.test(device) ? LaptopIcon : MonitorSmartphoneIcon;
  return <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />;
}

/**
 * Where the team is signed in. Signing a device out ends that session at
 * once; the device in your hand can't be signed out from here (sign out
 * from its own menu), and says so.
 */
export function DevicesTab({ now }: { now: number }): React.ReactElement {
  const sessions = useRead(["team", "sessions"], (c) => c.team.sessions());
  const members = useRead(["team", "members"], (c) => c.team.members());
  const phone = useMediaQuery("max-md");
  const [revoking, setRevoking] = React.useState<DeviceSession | null>(null);
  const nameOf = (s: DeviceSession): string => members.data?.find((m) => m.id === s.memberId)?.name ?? "Someone";

  if (sessions.isError) return <LoadFailed error={sessions.error} onRetry={() => void sessions.refetch()} what="signed-in devices" />;
  if (!sessions.data) return <ListSkeleton label="Loading devices" rows={4} />;
  if (sessions.data.length === 0) {
    return (
      <Empty className="rounded-2xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MonitorSmartphoneIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No devices signed in</EmptyTitle>
          <EmptyDescription>Each phone or computer someone signs in on shows here, with when it was last used.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const action = (s: DeviceSession): React.ReactElement =>
    s.current ? (
      <span className="text-muted-foreground text-xs">You're using this one</span>
    ) : (
      <Button aria-label={`Sign out ${s.device}, ${nameOf(s)}`} onClick={() => setRevoking(s)} size="sm" variant="outline">
        <LogOutIcon aria-hidden="true" />
        Sign out
      </Button>
    );

  return (
    <>
      {phone ? (
        <ul aria-label="Signed-in devices" className="flex flex-col divide-y rounded-2xl border bg-card">
          {sessions.data.map((s) => (
            <li className="flex items-center gap-3 p-3" key={s.id}>
              <DeviceIcon device={s.device} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-1.5 font-medium text-sm">
                  {s.device}
                  {s.current && <Badge variant="info">This device</Badge>}
                </span>
                <span className="text-muted-foreground text-xs">
                  {nameOf(s)} · {s.city} · {agoOf(s.lastSeenAt, now)}
                </span>
              </div>
              {action(s)}
            </li>
          ))}
        </ul>
      ) : (
        <Frame>
          <Table aria-label="Signed-in devices" variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Where</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead className="text-end">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.data.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <span className="flex items-center gap-2 font-medium">
                      <DeviceIcon device={s.device} />
                      {s.device}
                      {s.current && <Badge variant="info">This device</Badge>}
                    </span>
                  </TableCell>
                  <TableCell>{nameOf(s)}</TableCell>
                  <TableCell>{s.city}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{agoOf(s.lastSeenAt, now)}</TableCell>
                  <TableCell className="text-end">{action(s)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Frame>
      )}
      <RevokeDialog nameOf={nameOf} onClose={() => setRevoking(null)} session={revoking} />
    </>
  );
}

function RevokeDialog({ session, nameOf, onClose }: { session: DeviceSession | null; nameOf: (s: DeviceSession) => string; onClose: () => void }): React.ReactElement {
  // Keep the last device on screen while the dialog animates out.
  const [last, setLast] = React.useState(session);
  if (session && session !== last) setLast(session);
  const shown = session ?? last;
  const name = shown ? nameOf(shown) : "";
  const [refusal, setRefusal] = React.useState<string | null>(null);
  const revoke = useWrite((c, id: string) => c.team.revokeSession(id));
  const confirm = async (): Promise<void> => {
    if (!session) return;
    setRefusal(null);
    try {
      await revoke.mutateAsync(session.id);
      toastManager.add({ title: `Signed out ${session.device}`, description: `${name} will need to sign in again on it.`, type: "success" });
      onClose();
    } catch (error) {
      setRefusal(errorMessage(error));
    }
  };
  return (
    <AlertDialog
      onOpenChange={(open) => !open && !revoke.isPending && onClose()}
      onOpenChangeComplete={(open) => {
        if (!open) setRefusal(null);
      }}
      open={session !== null}
    >
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign out {shown?.device}?</AlertDialogTitle>
          <AlertDialogDescription>
            {name} is signed out on it straight away and will need their password to sign in again. Their other devices stay signed in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {refusal && (
          <div className="px-6 pb-2">
            <Alert variant="error">
              <AlertDescription>{refusal}</AlertDescription>
            </Alert>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogClose disabled={revoke.isPending} render={<Button variant="ghost" />}>
            Keep signed in
          </AlertDialogClose>
          <Button loading={revoke.isPending} onClick={() => void confirm()} variant="destructive">
            Sign out device
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
