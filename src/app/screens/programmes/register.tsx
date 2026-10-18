"use client";

import { CheckCheckIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, UserPlusIcon, UsersIcon, XIcon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import { dayOf, longDayOf, startTimeOf, timeRangeOf } from "@/app/format";
import { hrefFor } from "@/app/router";
import { useEnrolmentActions } from "@/app/screens/programmes/enrolment-actions";
import { EnrolmentActionsProvider } from "@/app/screens/programmes/enrolment-dialogs";
import { cantSay, useLeaveGuard, useViewer } from "@/app/screens/programmes/hooks";
import { FormRefusal, Gated, LeaveDialog, SaveBar } from "@/app/screens/programmes/kit";
import { ageFits, agesLine, enrolleeName, nextSession, registerSession } from "@/app/screens/programmes/programme-model";
import { ListSkeleton, LoadFailed, PageHeader, Screen } from "@/app/screens/screen-kit";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Frame } from "@/components/ui/frame";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toastManager } from "@/components/ui/toast";
import { DataError, errorMessage } from "@/data/errors";
import { enrolmentDue } from "@/data/money";
import { useRead, useWrite } from "@/data/provider";
import type { AttendanceMark, Customer, Enrolment, Programme, ProgrammeSession } from "@/data/types";
import { formatInr } from "@/lib/money";
import { compareDates, type PlainDate } from "@/lib/plain-date";
import { cn } from "@/lib/utils";

type Marks = Record<string, AttendanceMark>;

function readDraft(key: string): Marks | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, AttendanceMark] => entry[1] === "present" || entry[1] === "absent"));
  } catch {
    return null;
  }
}

function writeDraft(key: string, json: string | null): void {
  try {
    if (json === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, json);
  } catch {
    /* private window or blocked storage: the draft lives only on screen */
  }
}

/** Sessions by id, or by what they mean today: `latest` (the one to take now) and `next`. */
function resolveSession(sessions: readonly ProgrammeSession[], ref: string, today: PlainDate): ProgrammeSession | undefined {
  if (ref === "latest") return registerSession(sessions, today);
  if (ref === "next") return nextSession(sessions, today);
  return sessions.find((s) => s.id === ref);
}

/**
 * The register for one session: one row per child expected that day, Present
 * or Absent (tap the same again to clear). Marks are a draft until saved, so
 * a coach can fill it in on court and save once; leaving with marks unsaved
 * asks first. Who owes money and who is outside the age range is flagged on
 * the row, so the coach can say a word on the day.
 */
export function RegisterPage({ programmeId, sessionRef, today }: { programmeId: string; sessionRef: string; today: PlainDate }): React.ReactElement {
  const detail = useRead(["programme", programmeId], (c) => c.programmes.get(programmeId));
  const people = useRead(["enrolments", programmeId], (c) => c.enrolments.list({ programmeId }));
  const session = detail.data ? resolveSession(detail.data.sessions, sessionRef, today) : undefined;
  const sessionId = session?.id ?? "";
  const attendance = useRead(["attendance", sessionId], (c) => c.programmes.attendance(sessionId), { enabled: Boolean(sessionId) });
  const back = { href: hrefFor(`/desk/programmes/${programmeId}`), label: detail.data?.programme.name ?? "Programme" };

  const failed = detail.error ?? people.error ?? attendance.error;
  if (failed) {
    return (
      <Screen>
        <PageHeader back={back} title="Register" />
        <LoadFailed error={failed} onRetry={() => void Promise.all([detail.refetch(), people.refetch(), sessionId ? attendance.refetch() : null])} what="the register" />
      </Screen>
    );
  }
  if (detail.data && !session) {
    return (
      <Screen>
        <PageHeader back={back} title="Register" />
        <LoadFailed error={new DataError("not-found", sessionRef === "next" ? "No sessions are coming up." : "This session doesn't exist. It may be from before the programme changed its days.")} onRetry={() => void detail.refetch()} what="the register" />
      </Screen>
    );
  }
  if (!detail.data || !people.data || !attendance.data || !session) {
    return (
      <Screen>
        <PageHeader back={back} title="Register" />
        <ListSkeleton label="Loading the register" rows={8} />
      </Screen>
    );
  }

  return (
    <EnrolmentActionsProvider customers={people.data.customers} enrolments={people.data.enrolments} programmes={people.data.programmes} today={today}>
      <Register
        expected={attendance.data.expected}
        programme={detail.data.programme}
        saved={attendance.data.attendance}
        session={session}
        sessions={detail.data.sessions}
        today={today}
      />
    </EnrolmentActionsProvider>
  );
}

function Register({
  programme,
  session,
  sessions,
  expected,
  saved,
  today,
}: {
  programme: Programme;
  session: ProgrammeSession;
  sessions: readonly ProgrammeSession[];
  expected: readonly Enrolment[];
  saved: { marks: Marks; savedAt: number | null; savedBy: string | null };
  today: PlainDate;
}): React.ReactElement {
  const viewer = useViewer();
  const actions = useEnrolmentActions();
  const storeKey = `project-831:register-draft:${session.id}`;
  // Unsaved marks survive Back, a reload or a dropped connection on this device until saved or discarded.
  const [draft, setDraft] = React.useState<Marks>(() => readDraft(storeKey) ?? saved.marks);
  const [confirming, setConfirming] = React.useState(false);
  const [refusal, setRefusal] = React.useState<string | null>(null);
  const save = useWrite((c, marks: Marks) => c.programmes.saveAttendance(session.id, marks));
  const rows = [...expected].sort((a, b) => enrolleeName(a, actions.customers).localeCompare(enrolleeName(b, actions.customers)));
  const ids = new Set(rows.map((e) => e.id));
  const marked = Object.fromEntries(Object.entries(draft).filter(([id]) => ids.has(id)));
  const present = Object.values(marked).filter((m) => m === "present").length;
  const absent = Object.values(marked).filter((m) => m === "absent").length;
  const unmarked = rows.length - present - absent;
  const changed = rows.filter((e) => marked[e.id] !== saved.marks[e.id]).length;
  const dirty = changed > 0;
  const cancelled = session.status === "cancelled";
  const future = compareDates(session.date, today) > 0;
  const base = `/desk/programmes/${programme.id}`;
  const live = sessions.filter((s) => s.status === "scheduled" || s.id === session.id);
  const at = live.findIndex((s) => s.id === session.id);
  const prev = at > 0 ? live[at - 1] : undefined;
  const next = at >= 0 ? live[at + 1] : undefined;
  const guard = useLeaveGuard(dirty, { onLeave: () => writeDraft(storeKey, null) });
  const draftJson = JSON.stringify(marked);
  React.useEffect(() => {
    writeDraft(storeKey, dirty ? draftJson : null);
  }, [storeKey, dirty, draftJson]);

  const mark = (id: string, value: AttendanceMark | undefined): void => {
    setRefusal(null);
    setDraft((d) => {
      const rest = Object.fromEntries(Object.entries(d).filter(([key]) => key !== id));
      return value ? { ...rest, [id]: value } : rest;
    });
  };

  const commit = async (): Promise<void> => {
    setConfirming(false);
    setRefusal(null);
    try {
      await save.mutateAsync(marked);
      toastManager.add({ title: `Register saved for ${dayOf(session.date)}`, description: `${present} present, ${absent} absent${unmarked > 0 ? `, ${unmarked} not marked` : ""}`, type: "success" });
    } catch (error) {
      setRefusal(errorMessage(error));
    }
  };

  const savedLine = saved.savedAt
    ? `Saved ${new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(saved.savedAt)}${saved.savedBy === viewer?.memberId ? " by you" : ""}`
    : "Not taken yet";

  return (
    <Screen>
      <PageHeader
        actions={
          <div className="flex items-center gap-1">
            <Button aria-label={prev ? `Previous session, ${dayOf(prev.date)}` : "No earlier session"} disabled={!prev} render={prev ? <Anchor href={hrefFor(`${base}/sessions/${prev.id}`)} /> : undefined} size="sm" variant="outline">
              <ChevronLeftIcon aria-hidden="true" />
              <span className="max-sm:sr-only">{prev ? dayOf(prev.date) : "Previous"}</span>
            </Button>
            <Button aria-label={next ? `Next session, ${dayOf(next.date)}` : "No later session"} disabled={!next} render={next ? <Anchor href={hrefFor(`${base}/sessions/${next.id}`)} /> : undefined} size="sm" variant="outline">
              <span className="max-sm:sr-only">{next ? dayOf(next.date) : "Next"}</span>
              <ChevronRightIcon aria-hidden="true" />
            </Button>
          </div>
        }
        back={{ href: hrefFor(base), label: programme.name }}
        description={`${longDayOf(session.date)} · ${timeRangeOf({ date: session.date, startMinute: session.startMinute, durationMinutes: session.endMinute - session.startMinute })}`}
        meta={
          <>
            {session.date === today && <Badge variant="info">Today</Badge>}
            {cancelled && <Badge variant="error">Cancelled</Badge>}
          </>
        }
        title="Register"
      />

      {cancelled && (
        <Alert variant="warning">
          <AlertDescription>This session was cancelled, so nobody is marked. Restore it from the programme's Sessions tab to take a register.</AlertDescription>
        </Alert>
      )}
      {future && !cancelled && (
        <Alert variant="info">
          <AlertDescription>This session is on {longDayOf(session.date)}, starting {startTimeOf({ date: session.date, startMinute: session.startMinute })}. You can mark it now; saving waits until the day.</AlertDescription>
        </Alert>
      )}
      <FormRefusal message={refusal} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <dl aria-label="Register so far" className="flex flex-wrap gap-2 text-sm" data-slot="register-counts">
          <Count label="Present" tone="success" value={present} />
          <Count label="Absent" tone="error" value={absent} />
          <Count label="Not marked" tone={unmarked > 0 ? "warning" : undefined} value={unmarked} />
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button disabled={cancelled || rows.length === 0 || present === rows.length} onClick={() => setDraft(Object.fromEntries(rows.map((e) => [e.id, "present" as const])))} variant="outline">
            <CheckCheckIcon aria-hidden="true" />
            Mark everyone present
          </Button>
          <Gated allowed={viewer?.can.writeBookings ?? false} reason={cantSay(viewer, "change enrolments")}>
            <Button disabled={cancelled} onClick={() => actions.add({ programmeId: programme.id, startsOn: session.date })} variant="outline">
              <UserPlusIcon aria-hidden="true" />
              Add someone
            </Button>
          </Gated>
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Nobody expected</EmptyTitle>
            <EmptyDescription>Nobody was enrolled for {dayOf(session.date)}. Add a walk-in to mark them.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Gated allowed={viewer?.can.writeBookings ?? false} reason={cantSay(viewer, "change enrolments")}>
              <Button onClick={() => actions.add({ programmeId: programme.id, startsOn: session.date })} variant="outline">
                Add someone
              </Button>
            </Gated>
          </EmptyContent>
        </Empty>
      ) : (
        <Frame>
          <ul aria-label={`Register for ${dayOf(session.date)}`} className="flex flex-col divide-y rounded-xl border bg-card">
            {rows.map((e) => (
              <RegisterRow customers={actions.customers} disabled={cancelled} enrolment={e} key={e.id} mark={marked[e.id]} onMark={(value) => mark(e.id, value)} programme={programme} saved={saved.marks[e.id]} />
            ))}
          </ul>
        </Frame>
      )}

      <SaveBar
        dirty={dirty}
        label="Save register"
        onDiscard={() => {
          setDraft(saved.marks);
          setRefusal(null);
        }}
        onSave={() => (unmarked > 0 ? setConfirming(true) : void commit())}
        saveLabel="Save register"
        saving={save.isPending}
        status={dirty ? `${changed} unsaved ${changed === 1 ? "mark" : "marks"}` : savedLine}
      />

      <AlertDialog onOpenChange={setConfirming} open={confirming}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Save with {unmarked} not marked?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {present} present and {absent} absent. {unmarked === 1 ? "The one" : `The ${unmarked}`} not marked {unmarked === 1 ? "is" : "are"} saved as not recorded; you can mark {unmarked === 1 ? "them" : "them"} later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Keep marking</AlertDialogClose>
            <Button onClick={() => void commit()}>Save register</Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
      <LeaveDialog
        description={`${changed} ${changed === 1 ? "mark isn't" : "marks aren't"} saved. If you leave, ${changed === 1 ? "it's" : "they're"} lost.`}
        guard={guard}
        leaveLabel="Discard marks"
        title="Leave without saving the register?"
      />
    </Screen>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone?: "success" | "error" | "warning" }): React.ReactElement {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-semibold tabular-nums", tone === "success" && "text-success-foreground", tone === "error" && "text-destructive-foreground", tone === "warning" && "text-warning-foreground")}>{value}</dd>
    </div>
  );
}

function RegisterRow({
  enrolment: e,
  programme,
  customers,
  mark,
  saved,
  onMark,
  disabled,
}: {
  enrolment: Enrolment;
  programme: Programme;
  customers: readonly Customer[];
  mark: AttendanceMark | undefined;
  saved: AttendanceMark | undefined;
  onMark: (value: AttendanceMark | undefined) => void;
  disabled: boolean;
}): React.ReactElement {
  const name = enrolleeName(e, customers);
  const parent = customers.find((c) => c.id === e.customerId);
  const due = enrolmentDue(e);
  const fits = ageFits(e.participantAge, programme);
  const changed = mark !== saved;
  return (
    <li className={cn("flex flex-wrap items-center gap-3 p-3", changed && "bg-warning/4")}>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium">{name}</span>
          {e.participantAge !== null && (
            <Badge variant={fits === false ? "warning" : "outline"}>
              {e.participantAge} yrs{fits === false ? ` · outside ${agesLine(programme).replace("Ages ", "")}` : ""}
            </Badge>
          )}
          {due > 0 && <Badge variant="warning">Owes {formatInr(due)}</Badge>}
          {changed && <span className="sr-only">(not saved)</span>}
        </span>
        {e.participantName && parent && <span className="text-muted-foreground text-xs">{parent.name}</span>}
      </span>
      <ToggleGroup
        aria-label={`Attendance for ${name}`}
        disabled={disabled}
        onValueChange={(value) => onMark((value[0] as AttendanceMark | undefined) ?? undefined)}
        value={mark ? [mark] : []}
        variant="outline"
      >
        <ToggleGroupItem className="data-pressed:border-success/40 data-pressed:bg-success/12 data-pressed:text-success-foreground" value="present">
          <CheckIcon aria-hidden="true" />
          Present
        </ToggleGroupItem>
        <ToggleGroupItem className="data-pressed:border-destructive/40 data-pressed:bg-destructive/10 data-pressed:text-destructive-foreground" value="absent">
          <XIcon aria-hidden="true" />
          Absent
        </ToggleGroupItem>
      </ToggleGroup>
    </li>
  );
}
