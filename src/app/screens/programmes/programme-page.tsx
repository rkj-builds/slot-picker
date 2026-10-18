"use client";

import { BanknoteIcon, CalendarCheck2Icon, CalendarX2Icon, ClipboardCheckIcon, Clock3Icon, HourglassIcon, PlusIcon, RotateCcwIcon, ShapesIcon, UserPlusIcon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import { dayOf, timeRangeOf } from "@/app/format";
import { hrefFor, type Route } from "@/app/router";
import { useEnrolmentActions } from "@/app/screens/programmes/enrolment-actions";
import { EnrolmentActionsProvider } from "@/app/screens/programmes/enrolment-dialogs";
import { EnrolmentTable } from "@/app/screens/programmes/enrolment-table";
import { cantSay, refusalOf, useLeaveGuard, useViewer } from "@/app/screens/programmes/hooks";
import { FormRefusal, Gated, LeaveDialog, LinkTabs, SaveBar } from "@/app/screens/programmes/kit";
import { PlanFields, ProgrammeFields } from "@/app/screens/programmes/programme-form";
import {
  agesLine,
  datesLine,
  draftOf,
  newPlan,
  type ProgrammeDraft,
  endingThisWeek,
  enrolleeName,
  planLine,
  registerSession,
  scheduleLine,
  STATUS_META,
} from "@/app/screens/programmes/programme-model";
import { ListSkeleton, LoadFailed, PageHeader, Screen } from "@/app/screens/screen-kit";
import { RadioCard } from "@/components/compositions/radio-card";
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
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Form } from "@/components/ui/form";
import { Frame } from "@/components/ui/frame";
import { Meter, MeterIndicator, MeterTrack } from "@/components/ui/meter";
import { RadioGroup } from "@/components/ui/radio-group";
import { toastManager } from "@/components/ui/toast";
import { errorMessage, isDataError } from "@/data/errors";
import { collected, enrolmentDue } from "@/data/money";
import { useRead, useWrite } from "@/data/provider";
import type { Enrolment, Programme, ProgrammePlan, ProgrammeSession, ProgrammeStatus, Viewer } from "@/data/types";
import { formatInr } from "@/lib/money";
import { compareDates, type PlainDate } from "@/lib/plain-date";
import { cn } from "@/lib/utils";

export type ProgrammeTab = "overview" | "sessions" | "enrolled" | "settings";

/**
 * One programme, in Cal.com's editor shape: a header with its status and the
 * one daily action (Take register), then tabs that are URLs. Overview says
 * what needs doing; Sessions lists them; Enrolled is the same table as
 * Enrolments; Settings edits it.
 */
export function ProgrammePage({ id, tab, today }: { id: string; tab: ProgrammeTab; route: Route; today: PlainDate }): React.ReactElement {
  const viewer = useViewer();
  const detail = useRead(["programme", id], (c) => c.programmes.get(id));
  const people = useRead(["enrolments", id], (c) => c.enrolments.list({ programmeId: id }));

  if (detail.isPending || people.isPending) {
    return (
      <Screen>
        <PageHeader back={{ href: hrefFor("/desk/programmes"), label: "Programmes" }} title="Programme" />
        <ListSkeleton label="Loading the programme" rows={5} />
      </Screen>
    );
  }
  if (detail.isError || people.isError) {
    const error = detail.error ?? people.error;
    const missing = isDataError(error) && error.code === "not-found";
    return (
      <Screen>
        <PageHeader back={{ href: hrefFor("/desk/programmes"), label: "Programmes" }} title={missing ? "Programme not found" : "Programme"} />
        <LoadFailed error={error} onRetry={() => void (detail.isError ? detail.refetch() : people.refetch())} what="this programme" />
      </Screen>
    );
  }

  const { programme, sessions } = detail.data;
  const enrolments = people.data.enrolments;
  const base = `/desk/programmes/${programme.id}`;
  const upcoming = sessions.filter((s) => s.status === "scheduled" && compareDates(s.date, today) > 0).length;
  const enrolled = enrolments.filter((e) => e.status === "running" || e.status === "paused").length;
  const take = registerSession(sessions, today);
  const meta = STATUS_META[programme.status];

  return (
    <EnrolmentActionsProvider customers={people.data.customers} enrolments={enrolments} programmes={people.data.programmes} today={today}>
      <Screen>
        <PageHeader
          actions={
            take && (
              <Button render={<Anchor href={hrefFor(`${base}/sessions/${take.id}`)} />}>
                <ClipboardCheckIcon aria-hidden="true" />
                {take.date === today ? "Take today's register" : "Take register"}
              </Button>
            )
          }
          back={{ href: hrefFor("/desk/programmes"), label: "Programmes" }}
          description={scheduleLine(programme)}
          meta={<Badge variant={meta.badge}>{meta.label}</Badge>}
          title={programme.name}
        />
        <LinkTabs
          label={`${programme.name} sections`}
          tabs={[
            { href: hrefFor(base), label: "Overview", current: tab === "overview" },
            { href: hrefFor(`${base}/sessions`), label: "Sessions", current: tab === "sessions", count: upcoming },
            { href: hrefFor(`${base}/enrolled`), label: "Enrolled", current: tab === "enrolled", count: enrolled },
            { href: hrefFor(`${base}/settings`), label: "Settings", current: tab === "settings" },
          ]}
        />
        {tab === "overview" && <Overview enrolments={enrolments} programme={programme} sessions={sessions} today={today} />}
        {tab === "sessions" && <Sessions programme={programme} sessions={sessions} today={today} viewer={viewer} />}
        {tab === "enrolled" && <Enrolled enrolments={enrolments} programme={programme} viewer={viewer} />}
        {tab === "settings" && <SettingsTab key={programme.id} programme={programme} today={today} viewer={viewer} />}
      </Screen>
    </EnrolmentActionsProvider>
  );
}

/* ── Overview ───────────────────────────────────────────────────────── */

function Overview({ programme, sessions, enrolments, today }: { programme: Programme; sessions: ProgrammeSession[]; enrolments: Enrolment[]; today: PlainDate }): React.ReactElement {
  const actions = useEnrolmentActions();
  const enrolled = enrolments.filter((e) => e.status === "running" || e.status === "paused").length;
  const owed = enrolments.reduce((sum, e) => sum + enrolmentDue(e), 0);
  const taken = enrolments.reduce((sum, e) => sum + collected(e.ledger), 0);
  const owing = enrolments.filter((e) => enrolmentDue(e) > 0);
  const ending = enrolments.filter((e) => enrolmentDue(e) === 0 && endingThisWeek(e, today));
  const waiting = enrolments.filter((e) => e.status === "waitlist");
  const nameOf = (e: Enrolment): string => enrolleeName(e, actions.customers);
  const base = `/desk/programmes/${programme.id}`;
  const take = registerSession(sessions, today);
  const next = sessions.filter((s) => compareDates(s.date, today) > 0).slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid gap-3 sm:grid-cols-3">
        <Stat label="Enrolled" value={`${enrolled} of ${programme.capacity}`}>
          <Meter aria-label="Places taken" max={programme.capacity} value={Math.min(enrolled, programme.capacity)}>
            <MeterTrack className="h-1.5 rounded-full">
              <MeterIndicator />
            </MeterTrack>
          </Meter>
        </Stat>
        <Stat label="Owed" tone={owed > 0 ? "warning" : undefined} value={formatInr(owed)}>
          <span className="text-muted-foreground text-xs">
            {owing.length} {owing.length === 1 ? "person" : "people"}
          </span>
        </Stat>
        <Stat label="Collected" value={formatInr(taken)}>
          <span className="text-muted-foreground text-xs">Cash and online, this period and before</span>
        </Stat>
      </dl>

      <section aria-labelledby="attention" className="flex flex-col gap-3">
        <h2 className="font-semibold text-base" id="attention">
          Needs attention
        </h2>
        {owing.length + ending.length + waiting.length === 0 ? (
          <Empty className="rounded-2xl border border-dashed p-6 md:p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarCheck2Icon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Nothing needs attention</EmptyTitle>
              <EmptyDescription>Nobody owes money, no period ends this week and nobody is waiting.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Frame>
            <ul className="flex flex-col divide-y rounded-xl border bg-card">
              {owing.map((e) => (
                <AttentionRow action={{ label: "Take payment", run: () => actions.open("pay", e), needs: "money" }} icon={BanknoteIcon} key={`owe-${e.id}`} line={`Owes ${formatInr(enrolmentDue(e))}${e.followUp ? ` · ${e.followUp}` : ""}`} name={nameOf(e)} />
              ))}
              {ending.map((e) => (
                <AttentionRow
                  action={{ label: "Renew", run: () => actions.open("renew", e), needs: "money" }}
                  icon={Clock3Icon}
                  key={`end-${e.id}`}
                  line={e.paidUntil === today ? "Paid period ends today" : `Paid period ends ${dayOf(e.paidUntil)}`}
                  name={nameOf(e)}
                />
              ))}
              {waiting.length > 0 && (
                <li className="flex flex-wrap items-center gap-3 p-3">
                  <HourglassIcon aria-hidden="true" className="size-4 text-muted-foreground" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium text-sm">
                      {waiting.length} on the waitlist
                    </span>
                    <span className="text-muted-foreground text-xs">{waiting.map(nameOf).join(", ")}</span>
                  </span>
                  <Button render={<Anchor href={hrefFor("/desk/enrolments/waitlist", { programme: programme.id })} />} size="sm" variant="outline">
                    See waitlist
                  </Button>
                </li>
              )}
            </ul>
          </Frame>
        )}
      </section>

      <section aria-labelledby="coming-up" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-base" id="coming-up">
            Sessions
          </h2>
          <Button render={<Anchor href={hrefFor(`${base}/sessions`)} />} size="sm" variant="ghost">
            All sessions
          </Button>
        </div>
        <Frame>
          <ul className="flex flex-col divide-y rounded-xl border bg-card">
            {take && <SessionLine base={base} highlight session={take} today={today} />}
            {next.filter((s) => s.id !== take?.id).map((s) => (
              <SessionLine base={base} key={s.id} session={s} today={today} />
            ))}
            {!take && next.length === 0 && <li className="p-3 text-muted-foreground text-sm">No sessions scheduled. {programme.endsOn ? `It ended ${dayOf(programme.endsOn)}.` : ""}</li>}
          </ul>
        </Frame>
      </section>

      <section aria-labelledby="about" className="flex flex-col gap-2">
        <h2 className="font-semibold text-base" id="about">
          About
        </h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">For</dt>
          <dd>{agesLine(programme)}</dd>
          <dt className="text-muted-foreground">Runs</dt>
          <dd>{datesLine(programme)}</dd>
          <dt className="text-muted-foreground">Plans</dt>
          <dd className="flex flex-col">
            {programme.plans
              .filter((p) => !p.retired)
              .map((p) => (
                <span key={p.id}>
                  {p.name}: {planLine(p)}
                </span>
              ))}
          </dd>
          {programme.description && (
            <>
              <dt className="text-muted-foreground">Description</dt>
              <dd className="text-pretty">{programme.description}</dd>
            </>
          )}
        </dl>
      </section>
    </div>
  );
}

function Stat({ label, value, tone, children }: { label: string; value: string; tone?: "warning"; children?: React.ReactNode }): React.ReactElement {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="flex flex-col gap-2">
        <span className={cn("font-semibold text-2xl tabular-nums", tone === "warning" && "text-warning-foreground")}>{value}</span>
        {children}
      </dd>
    </Card>
  );
}

function AttentionRow({ name, line, icon: Icon, action }: { name: string; line: string; icon: React.ComponentType<{ "aria-hidden"?: "true"; className?: string }>; action: { label: string; run: () => void; needs: "money" } }): React.ReactElement {
  const viewer = useViewer();
  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium text-sm">{name}</span>
        <span className="text-muted-foreground text-xs">{line}</span>
      </span>
      <Gated allowed={viewer?.can.handleMoney ?? false} reason={cantSay(viewer, "take or record money")}>
        <Button aria-label={`${action.label} for ${name}`} onClick={action.run} size="sm" variant="outline">
          {action.label}
        </Button>
      </Gated>
    </li>
  );
}

function SessionLine({ session: s, base, today, highlight = false }: { session: ProgrammeSession; base: string; today: PlainDate; highlight?: boolean }): React.ReactElement {
  const past = compareDates(s.date, today) <= 0;
  return (
    <li className={cn("flex flex-wrap items-center gap-3 p-3", highlight && "bg-accent/40")}>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium text-sm">
          {s.date === today ? "Today" : dayOf(s.date)}
          {s.status === "cancelled" && (
            <Badge className="ms-2" variant="error">
              Cancelled
            </Badge>
          )}
        </span>
        <span className="text-muted-foreground text-xs">{timeRangeOf({ date: s.date, startMinute: s.startMinute, durationMinutes: s.endMinute - s.startMinute })}</span>
      </span>
      <Button
        aria-label={`${past ? "Take register" : "Open register"}, ${dayOf(s.date)}`}
        render={<Anchor href={hrefFor(`${base}/sessions/${s.id}`)} />}
        size="sm"
        variant={highlight ? "default" : "outline"}
      >
        {past ? "Take register" : "Open register"}
      </Button>
    </li>
  );
}

/* ── Sessions ───────────────────────────────────────────────────────── */

function Sessions({ programme, sessions, today, viewer }: { programme: Programme; sessions: ProgrammeSession[]; today: PlainDate; viewer: Viewer | undefined }): React.ReactElement {
  const [cancelling, setCancelling] = React.useState<ProgrammeSession | null>(null);
  const [allPast, setAllPast] = React.useState(false);
  const setStatus = useWrite((c, input: { id: string; status: ProgrammeSession["status"] }) => c.programmes.setSessionStatus(input.id, input.status));
  const base = `/desk/programmes/${programme.id}`;
  const upcoming = sessions.filter((s) => compareDates(s.date, today) > 0);
  const past = sessions.filter((s) => compareDates(s.date, today) <= 0).reverse();
  const shownPast = allPast ? past : past.slice(0, 8);
  const can = viewer?.can.editProgrammes ?? false;

  const change = async (s: ProgrammeSession, status: ProgrammeSession["status"]): Promise<void> => {
    try {
      await setStatus.mutateAsync({ id: s.id, status });
      toastManager.add({
        title: status === "cancelled" ? `Session on ${dayOf(s.date)} cancelled` : `Session on ${dayOf(s.date)} restored`,
        type: "success",
        actionProps: { children: "Undo", onClick: () => void setStatus.mutateAsync({ id: s.id, status: status === "cancelled" ? "scheduled" : "cancelled" }) },
      });
    } catch (error) {
      toastManager.add({ title: "Couldn't change the session", description: errorMessage(error), type: "error" });
    }
  };

  const row = (s: ProgrammeSession): React.ReactElement => {
    const isPast = compareDates(s.date, today) <= 0;
    return (
      <li className="flex flex-wrap items-center gap-3 p-3" key={s.id}>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={cn("font-medium text-sm", s.status === "cancelled" && "text-muted-foreground line-through")}>{s.date === today ? `Today, ${dayOf(s.date)}` : dayOf(s.date)}</span>
          <span className="text-muted-foreground text-xs">{timeRangeOf({ date: s.date, startMinute: s.startMinute, durationMinutes: s.endMinute - s.startMinute })}</span>
        </span>
        {s.status === "cancelled" && <Badge variant="error">Cancelled</Badge>}
        {s.status === "scheduled" && (
          <Button aria-label={`${isPast ? "Register" : "Open register"}, ${dayOf(s.date)}`} render={<Anchor href={hrefFor(`${base}/sessions/${s.id}`)} />} size="sm" variant="outline">
            {isPast ? "Register" : "Open register"}
          </Button>
        )}
        <Gated allowed={can} reason={cantSay(viewer, "change programmes")}>
          {s.status === "cancelled" ? (
            <Button aria-label={`Restore the session on ${dayOf(s.date)}`} onClick={() => void change(s, "scheduled")} size="sm" variant="ghost">
              <RotateCcwIcon aria-hidden="true" />
              Restore
            </Button>
          ) : (
            <Button aria-label={`Cancel the session on ${dayOf(s.date)}`} onClick={() => setCancelling(s)} size="sm" variant="ghost">
              <CalendarX2Icon aria-hidden="true" />
              Cancel
            </Button>
          )}
        </Gated>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="upcoming" className="flex flex-col gap-3">
        <h2 className="font-semibold text-base" id="upcoming">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground text-sm">No sessions coming up.</p>
        ) : (
          <Frame>
            <ul className="flex flex-col divide-y rounded-xl border bg-card">{upcoming.map(row)}</ul>
          </Frame>
        )}
      </section>
      <section aria-labelledby="past" className="flex flex-col gap-3">
        <h2 className="font-semibold text-base" id="past">
          Past
        </h2>
        {past.length === 0 ? (
          <p className="text-muted-foreground text-sm">No sessions yet.</p>
        ) : (
          <>
            <Frame>
              <ul className="flex flex-col divide-y rounded-xl border bg-card">{shownPast.map(row)}</ul>
            </Frame>
            {past.length > shownPast.length && (
              <Button className="self-start" onClick={() => setAllPast(true)} size="sm" variant="ghost">
                Show all {past.length} past sessions
              </Button>
            )}
          </>
        )}
      </section>

      <AlertDialog onOpenChange={(open) => !open && !setStatus.isPending && setCancelling(null)} open={cancelling !== null}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel the session on {cancelling ? dayOf(cancelling.date) : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              Nobody is expected that day and it has no register. Paid periods don't change. You can restore it afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Keep it</AlertDialogClose>
            <Button
              loading={setStatus.isPending}
              onClick={() => {
                const s = cancelling;
                if (!s) return;
                void change(s, "cancelled").then(() => setCancelling(null));
              }}
              variant="destructive"
            >
              Cancel session
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}

/* ── Enrolled ───────────────────────────────────────────────────────── */

const STATUS_ORDER: Record<Enrolment["status"], number> = { running: 0, paused: 1, waitlist: 2, stopped: 3 };

function Enrolled({ programme, enrolments, viewer }: { programme: Programme; enrolments: Enrolment[]; viewer: Viewer | undefined }): React.ReactElement {
  const actions = useEnrolmentActions();
  const rows = [...enrolments].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || enrolleeName(a, actions.customers).localeCompare(enrolleeName(b, actions.customers)));
  const forChildren = programme.ageMax !== null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Everyone who has signed up, running first. <Anchor className="underline underline-offset-4" href={hrefFor("/desk/enrolments", { programme: programme.id })}>Open in Enrolments</Anchor> to sort by who to chase.
        </p>
        <Gated allowed={viewer?.can.writeBookings ?? false} reason={cantSay(viewer, "change enrolments")}>
          <Button onClick={() => actions.add({ programmeId: programme.id })} variant="outline">
            <UserPlusIcon aria-hidden="true" />
            {forChildren ? "Add a child" : "Add someone"}
          </Button>
        </Gated>
      </div>
      {rows.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShapesIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Nobody enrolled yet</EmptyTitle>
            <EmptyDescription>Sign-ups from the website and people you add show up here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <EnrolmentTable enrolments={rows} label={`Enrolled in ${programme.name}`} showProgramme={false} />
      )}
    </div>
  );
}

/* ── Settings ───────────────────────────────────────────────────────── */

function SettingsTab({ programme, today, viewer }: { programme: Programme; today: PlainDate; viewer: Viewer | undefined }): React.ReactElement {
  const can = viewer?.can.editProgrammes ?? false;
  const saved = draftOf(programme);
  const [draft, setDraft] = React.useState<ProgrammeDraft>(saved);
  const [refusal, setRefusal] = React.useState<{ message: string; fields: Record<string, string> } | null>(null);
  const update = useWrite((c, patch: Partial<Omit<Programme, "id" | "createdAt">>) => c.programmes.update(programme.id, patch));
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const formId = React.useId();
  const guard = useLeaveGuard(dirty);

  const save = async (): Promise<void> => {
    setRefusal(null);
    try {
      const after = await update.mutateAsync({ ...draft, name: draft.name.trim() });
      setDraft(draftOf(after));
      toastManager.add({ title: `${after.name} saved`, description: "Future sessions follow the new schedule; past ones keep their registers.", type: "success" });
    } catch (error) {
      setRefusal(refusalOf(error));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {!can && (
        <Alert variant="info">
          <AlertDescription>{cantSay(viewer, "change programmes")} You can still see how it's set up.</AlertDescription>
        </Alert>
      )}
      <StatusCard can={can} programme={programme} viewer={viewer} />
      <Card>
        <CardHeader>
          <h2>
            <CardTitle render={<span className="block" />}>Details</CardTitle>
          </h2>
          <CardDescription>Saved with the bar at the bottom of the page.</CardDescription>
        </CardHeader>
        <CardPanel>
          <Form
            errors={refusal?.fields}
            id={formId}
            onSubmit={(event) => {
              event.preventDefault();
              if (dirty && can) void save();
            }}
          >
            <fieldset className="flex min-w-0 flex-col gap-4" disabled={!can}>
              <legend className="sr-only">Programme details</legend>
              <FormRefusal message={refusal?.message ?? null} />
              <ProgrammeFields draft={draft} onChange={setDraft} today={today} />
            </fieldset>
          </Form>
        </CardPanel>
      </Card>
      <PlansCard can={can} programme={programme} viewer={viewer} />
      {can && (
        <SaveBar
          dirty={dirty}
          formId={formId}
          label="Save programme"
          onDiscard={() => {
            setDraft(saved);
            setRefusal(null);
          }}
          saveLabel="Save changes"
          saving={update.isPending}
          status={dirty ? "Unsaved changes" : "All changes saved"}
        />
      )}
      <LeaveDialog description={`Your changes to ${programme.name} haven't been saved. If you leave, they're lost.`} guard={guard} leaveLabel="Discard changes" title="Leave without saving?" />
    </div>
  );
}

const STATUSES: ProgrammeStatus[] = ["open", "closed", "draft", "finished"];

/** Status saves the moment it changes (and says so), with Undo, like Cal.com's switch cards. */
function StatusCard({ programme, can, viewer }: { programme: Programme; can: boolean; viewer: Viewer | undefined }): React.ReactElement {
  const update = useWrite((c, status: ProgrammeStatus) => c.programmes.update(programme.id, { status }));
  const set = async (status: ProgrammeStatus): Promise<void> => {
    const before = programme.status;
    try {
      await update.mutateAsync(status);
      toastManager.add({
        title: `${programme.name} is now ${STATUS_META[status].label.toLowerCase()}`,
        description: STATUS_META[status].line,
        type: "success",
        actionProps: { children: "Undo", onClick: () => void update.mutateAsync(before) },
      });
    } catch (error) {
      toastManager.add({ title: "Couldn't change the status", description: errorMessage(error), type: "error" });
    }
  };
  return (
    <Card>
      <CardHeader>
        <h2>
          <CardTitle render={<span className="block" />}>Status</CardTitle>
        </h2>
        <CardDescription>Saves as soon as you pick one.</CardDescription>
      </CardHeader>
      <CardPanel>
        <RadioGroup aria-label="Status" className="grid gap-2 sm:grid-cols-2" disabled={!can || update.isPending} onValueChange={(v) => void set(v as ProgrammeStatus)} value={programme.status}>
          {STATUSES.map((s) => (
            <RadioCard key={s} value={s}>
              <span className="flex items-center gap-2 font-medium text-sm">
                {STATUS_META[s].label}
              </span>
              <span className="text-muted-foreground text-sm">{STATUS_META[s].line}</span>
            </RadioCard>
          ))}
        </RadioGroup>
        {!can && <p className="mt-2 text-muted-foreground text-xs">{cantSay(viewer, "change programmes")}</p>}
      </CardPanel>
    </Card>
  );
}

/** Plans: add one, retire one (it stays on the people already paying with it), put it back. Each saves at once. */
function PlansCard({ programme, can, viewer }: { programme: Programme; can: boolean; viewer: Viewer | undefined }): React.ReactElement {
  const [adding, setAdding] = React.useState(false);
  const update = useWrite((c, plans: ProgrammePlan[]) => c.programmes.update(programme.id, { plans }));
  const setRetired = async (plan: ProgrammePlan, retired: boolean): Promise<void> => {
    const before = programme.plans;
    try {
      await update.mutateAsync(programme.plans.map((p) => (p.id === plan.id ? { ...p, retired } : p)));
      toastManager.add({
        title: retired ? `${plan.name} retired` : `${plan.name} is on sale again`,
        description: retired ? "New sign-ups can't pick it. People already on it keep it until they renew." : undefined,
        type: "success",
        actionProps: { children: "Undo", onClick: () => void update.mutateAsync(before) },
      });
    } catch (error) {
      toastManager.add({ title: `Couldn't ${retired ? "retire" : "restore"} ${plan.name}`, description: errorMessage(error), type: "error" });
    }
  };
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2>
            <CardTitle render={<span className="block" />}>Plans</CardTitle>
          </h2>
          <CardDescription>How people pay. Changes save at once.</CardDescription>
        </div>
        <Gated allowed={can} reason={cantSay(viewer, "change programmes")}>
          <Button onClick={() => setAdding(true)} size="sm" variant="outline">
            <PlusIcon aria-hidden="true" />
            Add plan
          </Button>
        </Gated>
      </CardHeader>
      <CardPanel>
        <ul className="flex flex-col divide-y rounded-xl border">
          {programme.plans.map((plan) => (
            <li className="flex flex-wrap items-center gap-3 p-3" key={plan.id}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn("font-medium text-sm", plan.retired && "text-muted-foreground")}>{plan.name}</span>
                <span className="text-muted-foreground text-xs">{planLine(plan)}</span>
              </span>
              <Badge variant={plan.retired ? "secondary" : "success"}>{plan.retired ? "Retired" : "On sale"}</Badge>
              <Gated allowed={can} reason={cantSay(viewer, "change programmes")}>
                <Button aria-label={`${plan.retired ? "Put back on sale" : "Retire"} ${plan.name}`} disabled={update.isPending} onClick={() => void setRetired(plan, !plan.retired)} size="sm" variant="ghost">
                  {plan.retired ? "Put back on sale" : "Retire"}
                </Button>
              </Gated>
            </li>
          ))}
        </ul>
      </CardPanel>
      <AddPlanDialog onClose={() => setAdding(false)} open={adding} programme={programme} />
    </Card>
  );
}

function AddPlanDialog({ programme, open, onClose }: { programme: Programme; open: boolean; onClose: () => void }): React.ReactElement {
  return (
    <Dialog onOpenChange={(next) => !next && onClose()} open={open}>
      <DialogPopup>{open && <AddPlanForm onClose={onClose} programme={programme} />}</DialogPopup>
    </Dialog>
  );
}

function AddPlanForm({ programme, onClose }: { programme: Programme; onClose: () => void }): React.ReactElement {
  const [plan, setPlan] = React.useState<ProgrammePlan>(newPlan);
  const [message, setMessage] = React.useState<string | null>(null);
  const update = useWrite((c, plans: ProgrammePlan[]) => c.programmes.update(programme.id, { plans }));
  const submit = async (): Promise<void> => {
    setMessage(null);
    try {
      await update.mutateAsync([...programme.plans, { ...plan, name: plan.name.trim() }]);
      toastManager.add({ title: `${plan.name.trim()} added to ${programme.name}`, description: planLine(plan), type: "success" });
      onClose();
    } catch (error) {
      const { message: sentence, fields } = refusalOf(error);
      setMessage(fields.plans ? `${fields.plans}.` : sentence);
    }
  };
  return (
    <Form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>Add plan</DialogTitle>
        <DialogDescription>A new way to pay for {programme.name}. People pick it when they sign up or renew.</DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-4">
        <FormRefusal message={message} />
        <PlanFields onChange={setPlan} plan={plan} />
      </DialogPanel>
      <DialogFooter>
        <Button disabled={update.isPending} onClick={onClose} variant="ghost">
          Cancel
        </Button>
        <Button loading={update.isPending} type="submit">
          Add plan
        </Button>
      </DialogFooter>
    </Form>
  );
}

