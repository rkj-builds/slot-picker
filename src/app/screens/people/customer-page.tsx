"use client";

import { MessageCircleIcon, PhoneIcon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import { STATE_META, stateLabel } from "@/app/desk/booking-visuals";
import { dayOf, timeRangeOf } from "@/app/format";
import { hrefFor } from "@/app/router";
import { CustomerTags } from "@/app/screens/people/people-parts";
import { cantSay, type Refusal, refusalOf, useViewer } from "@/app/screens/programmes/hooks";
import { FormRefusal } from "@/app/screens/programmes/kit";
import { enrolleeName, paidUntilLine } from "@/app/screens/programmes/programme-model";
import { ListSkeleton, LoadFailed, PageHeader, Screen } from "@/app/screens/screen-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Frame } from "@/components/ui/frame";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { errorMessage } from "@/data/errors";
import { enrolmentDue, membershipDue } from "@/data/money";
import { useRead, useWrite } from "@/data/provider";
import type { Booking, CustomerSummary, Enrolment, Membership } from "@/data/types";
import { deskState, duePaise } from "@/lib/booking";
import { formatInr } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { todayIn } from "@/lib/plain-date";
import { courtName, VENUE } from "@/lib/venue";

const FIRST_BOOKINGS = 8;

/** One customer: what they've spent and missed, how the desk treats them, and everything they have with the venue. */
export function CustomerPage({ id, now }: { id: string; now: number }): React.ReactElement {
  const viewer = useViewer();
  const read = useRead(["customer", id], (c) => c.customers.get(id));
  const canProgrammes = viewer?.features.includes("programmes") ?? false;
  const canMembers = viewer?.features.includes("members") ?? false;
  const programmes = useRead(["programmes"], (c) => c.programmes.list(), { enabled: canProgrammes });
  const memberships = useRead(["memberships"], (c) => c.memberships.list(), { enabled: canMembers });
  const back = { href: hrefFor("/desk/customers"), label: "Customers" };

  const summary = read.data?.summary;
  const c = summary?.customer;

  // One tree whatever the state, so the heading isn't replaced (and focus kept) when the customer arrives.
  return (
    <Screen>
      <PageHeader
        actions={
          c && (
            <>
              <Button render={<Anchor href={`tel:${c.phone}`} />} variant="outline">
                <PhoneIcon aria-hidden="true" />
                Call
              </Button>
              <Button render={<Anchor href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} rel="noreferrer" target="_blank" />} variant="outline">
                <MessageCircleIcon aria-hidden="true" />
                WhatsApp
              </Button>
            </>
          )
        }
        back={back}
        description={summary && c ? `${formatPhone(c.phone)}${summary.firstVisit ? ` · first visit ${dayOf(summary.firstVisit)}` : " · hasn't visited yet"}` : undefined}
        meta={summary && <CustomerTags summary={summary} />}
        title={c?.name ?? "Customer"}
      />
      {read.isError ? (
        <LoadFailed error={read.error} onRetry={() => void read.refetch()} what="this customer" />
      ) : !read.data ? (
        <ListSkeleton label="Loading the customer" rows={5} />
      ) : (
        <CustomerBody canMembers={canMembers} canProgrammes={canProgrammes} data={read.data} now={now} planName={(pid) => memberships.data?.plans.find((p) => p.id === pid)?.name ?? "Court hours"} programmeName={(pid) => programmes.data?.programmes.find((p) => p.id === pid)?.name ?? "Programme"} />
      )}
    </Screen>
  );
}

function CustomerBody({
  data,
  now,
  canProgrammes,
  canMembers,
  programmeName,
  planName,
}: {
  data: { summary: CustomerSummary; bookings: Booking[]; enrolments: Enrolment[]; memberships: Membership[] };
  now: number;
  canProgrammes: boolean;
  canMembers: boolean;
  programmeName: (id: string) => string;
  planName: (id: string) => string;
}): React.ReactElement {
  const { summary, bookings, enrolments } = data;
  const c = summary.customer;
  const today = todayIn(VENUE.timeZone, now);
  const owed = bookings.reduce((sum, b) => sum + duePaise(b), 0) + enrolments.reduce((sum, e) => sum + enrolmentDue(e), 0) + data.memberships.reduce((sum, m) => sum + membershipDue(m), 0);

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Bookings" line={summary.cancellations > 0 ? `${summary.cancellations} cancelled` : "None cancelled"} value={String(summary.bookings)} />
        <Stat label="Spent" line={owed > 0 ? `${formatInr(owed)} owed now` : "Nothing owed"} tone={owed > 0 ? "warning" : undefined} value={formatInr(summary.spentPaise)} />
        <Stat label="No-shows" line={summary.lastVisit ? `Last visit ${dayOf(summary.lastVisit)}` : "No visits yet"} tone={summary.noShows > 0 ? "warning" : undefined} value={String(summary.noShows)} />
        <Stat label="Credit" line={c.creditPaise > 0 ? "Comes off their next payment" : "None held"} value={formatInr(c.creditPaise)} />
      </dl>

      <FlagsCard summary={summary} />

      <Section count={bookings.length} title="Bookings">
        {bookings.length === 0 ? <None>No court bookings yet.</None> : <BookingsTable bookings={bookings} now={now} />}
      </Section>
      <Section count={enrolments.length} title="Enrolments">
        {enrolments.length === 0 ? (
          <None>Not in any programme.</None>
        ) : (
          <Rows>
            {enrolments.map((e) => (
              <EnrolmentLine canOpen={canProgrammes} e={e} key={e.id} name={enrolleeName(e, [c])} programme={programmeName(e.programmeId)} today={today} />
            ))}
          </Rows>
        )}
      </Section>
      <Section count={data.memberships.length} title="Memberships">
        {data.memberships.length === 0 ? (
          <None>No court-hour membership.</None>
        ) : (
          <Rows>
            {data.memberships.map((m) => (
              <MembershipLine canOpen={canMembers} key={m.id} m={m} plan={planName(m.planId)} />
            ))}
          </Rows>
        )}
      </Section>
    </>
  );
}

function Stat({ label, value, line, tone }: { label: string; value: string; line: string; tone?: "warning" }): React.ReactElement {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="flex flex-col gap-0.5">
        <span className={tone === "warning" ? "font-semibold text-2xl text-warning-foreground tabular-nums" : "font-semibold text-2xl tabular-nums"}>{value}</span>
        <span className="text-muted-foreground text-xs">{line}</span>
      </dd>
    </Card>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }): React.ReactElement {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 font-semibold text-base" id={id}>
        {title}
        <Badge variant="outline">{count}</Badge>
      </h2>
      {children}
    </section>
  );
}

function None({ children }: { children: React.ReactNode }): React.ReactElement {
  return <p className="rounded-xl border border-dashed p-4 text-muted-foreground text-sm">{children}</p>;
}

function Rows({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <Frame>
      <ul className="flex flex-col divide-y rounded-xl border bg-card">{children}</ul>
    </Frame>
  );
}

function BookingsTable({ bookings, now }: { bookings: readonly Booking[]; now: number }): React.ReactElement {
  const [all, setAll] = React.useState(false);
  const shown = all ? bookings : bookings.slice(0, FIRST_BOOKINGS);
  return (
    <>
      <Frame>
        <Table aria-label="Their bookings" variant="card">
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Court</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-end">Price</TableHead>
              <TableHead className="text-end">Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((b) => {
              const state = deskState(b, now);
              const Icon = STATE_META[state].icon;
              const due = duePaise(b);
              return (
                <TableRow key={b.id}>
                  <TableCell>
                    <span className="flex flex-col">
                      <span>{dayOf(b.date)}</span>
                      <span className="text-muted-foreground text-xs">{timeRangeOf(b)}</span>
                    </span>
                  </TableCell>
                  <TableCell>{courtName(b.courtId)}</TableCell>
                  <TableCell>
                    <Badge variant={STATE_META[state].badge}>
                      <Icon aria-hidden="true" />
                      {stateLabel(state)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end tabular-nums">{formatInr(b.pricePaise)}</TableCell>
                  <TableCell className="text-end tabular-nums">{due > 0 ? formatInr(due) : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Frame>
      {bookings.length > shown.length && (
        <Button className="self-start" onClick={() => setAll(true)} size="sm" variant="ghost">
          Show all {bookings.length} bookings
        </Button>
      )}
    </>
  );
}

const ENROLMENT_STATUS: Record<Enrolment["status"], string> = { running: "Running", paused: "Paused", stopped: "Stopped", waitlist: "Waitlist" };

function EnrolmentLine({ e, name, programme, today, canOpen }: { e: Enrolment; name: string; programme: string; today: ReturnType<typeof todayIn>; canOpen: boolean }): React.ReactElement {
  const due = enrolmentDue(e);
  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium text-sm">
          {name} · {programme}
        </span>
        <span className="text-muted-foreground text-xs">{e.status === "running" ? paidUntilLine(e, today).text : ENROLMENT_STATUS[e.status]}</span>
      </span>
      {due > 0 && <Badge variant="warning">Owes {formatInr(due)}</Badge>}
      {canOpen && (
        <Button render={<Anchor href={hrefFor(`/desk/programmes/${e.programmeId}/enrolled`)} />} size="sm" variant="ghost">
          Open programme
        </Button>
      )}
    </li>
  );
}

function MembershipLine({ m, plan, canOpen }: { m: Membership; plan: string; canOpen: boolean }): React.ReactElement {
  const left = Math.max(0, m.hoursTotal - m.hoursUsed);
  const due = membershipDue(m);
  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium text-sm">{plan}</span>
        <span className="text-muted-foreground text-xs">
          {left} of {m.hoursTotal} hours left · {m.status === "expired" ? `expired ${dayOf(m.expiresOn)}` : `expires ${dayOf(m.expiresOn)}`}
        </span>
      </span>
      {m.status !== "active" && <Badge variant="secondary">{m.status === "paused" ? "Paused" : "Expired"}</Badge>}
      {due > 0 && <Badge variant="warning">Owes {formatInr(due)}</Badge>}
      {canOpen && (
        <Button render={<Anchor href={hrefFor("/desk/members", { open: m.id })} />} size="sm" variant="ghost">
          Open membership
        </Button>
      )}
    </li>
  );
}

/**
 * How the desk treats them, saved as soon as it changes. Pay first needs a
 * reason, so the next person on the desk knows why; turning a flag off can be
 * undone from the toast.
 */
function FlagsCard({ summary }: { summary: CustomerSummary }): React.ReactElement {
  const viewer = useViewer();
  const c = summary.customer;
  const [asking, setAsking] = React.useState(false);
  const flag = useWrite((client, input: { flag: "payFirst" | "trusted"; value: boolean; reason?: string }) => client.customers.setFlag(c.id, input.flag, input.value, input.reason));
  const can = viewer?.can.writeBookings ?? false;
  const reason = cantSay(viewer, "change customer flags");

  const turnOff = async (which: "payFirst" | "trusted"): Promise<void> => {
    const before = summary.payFirstReason ?? undefined;
    try {
      await flag.mutateAsync({ flag: which, value: false });
      toastManager.add({
        title: which === "payFirst" ? `${c.name} can pay at the venue again` : `${c.name} is no longer marked trusted`,
        type: "success",
        actionProps: { children: "Undo", onClick: () => void flag.mutateAsync({ flag: which, value: true, reason: which === "payFirst" ? before : undefined }) },
      });
    } catch (error) {
      toastManager.add({ title: "Couldn't change the flag", description: errorMessage(error), type: "error" });
    }
  };
  const trust = async (): Promise<void> => {
    try {
      await flag.mutateAsync({ flag: "trusted", value: true });
      toastManager.add({ title: `${c.name} marked trusted`, description: "They may pay at the venue even on days that ask for money up front.", type: "success", actionProps: { children: "Undo", onClick: () => void flag.mutateAsync({ flag: "trusted", value: false }) } });
    } catch (error) {
      toastManager.add({ title: "Couldn't change the flag", description: errorMessage(error), type: "error" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2>
          <CardTitle render={<span className="block" />}>How the desk treats them</CardTitle>
        </h2>
        <CardDescription>Changes save straight away.</CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-col gap-3">
        <FlagRow
          checked={c.payFirst}
          description={c.payFirst && summary.payFirstReason ? `Why: ${summary.payFirstReason}` : "Pays in full before a court is held for them."}
          disabled={!can || flag.isPending}
          label="Pay first"
          locked={can ? null : reason}
          onChange={(on) => (on ? setAsking(true) : void turnOff("payFirst"))}
        />
        <FlagRow
          checked={c.trusted}
          description="A known regular: may pay at the venue even on days that ask for money up front."
          disabled={!can || flag.isPending}
          label="Trusted"
          locked={can ? null : reason}
          onChange={(on) => (on ? void trust() : void turnOff("trusted"))}
        />
      </CardPanel>
      <PayFirstDialog name={c.name} onClose={() => setAsking(false)} onSave={(why) => flag.mutateAsync({ flag: "payFirst", value: true, reason: why })} open={asking} />
    </Card>
  );
}

function FlagRow({ label, description, checked, disabled, locked, onChange }: { label: string; description: string; checked: boolean; disabled: boolean; locked: string | null; onChange: (on: boolean) => void }): React.ReactElement {
  return (
    <Field className="flex-row items-start justify-between gap-4 rounded-xl border p-3" disabled={disabled}>
      <div className="flex flex-col gap-1">
        <FieldLabel>{label}</FieldLabel>
        <FieldDescription>{description}</FieldDescription>
        {locked && <FieldDescription>{locked}</FieldDescription>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </Field>
  );
}

function PayFirstDialog({ name, open, onClose, onSave }: { name: string; open: boolean; onClose: () => void; onSave: (reason: string) => Promise<unknown> }): React.ReactElement {
  return (
    <Dialog onOpenChange={(next) => !next && onClose()} open={open}>
      <DialogPopup>{open && <PayFirstForm name={name} onClose={onClose} onSave={onSave} />}</DialogPopup>
    </Dialog>
  );
}

function PayFirstForm({ name, onClose, onSave }: { name: string; onClose: () => void; onSave: (reason: string) => Promise<unknown> }): React.ReactElement {
  const [reason, setReason] = React.useState("");
  const [refusal, setRefusal] = React.useState<Refusal>(null);
  const [busy, setBusy] = React.useState(false);
  const submit = async (): Promise<void> => {
    setRefusal(null);
    setBusy(true);
    try {
      await onSave(reason);
      toastManager.add({ title: `${name} pays first from now on`, description: "Their next booking asks for full payment before it holds a court.", type: "success" });
      onClose();
    } catch (error) {
      setRefusal(refusalOf(error));
    } finally {
      setBusy(false);
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
        <DialogTitle>Ask {name} to pay first?</DialogTitle>
        <DialogDescription>Online and at the desk, a court is only held for them once it's paid in full.</DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-4">
        <FormRefusal message={refusal?.message ?? null} />
        <Field name="reason">
          <FieldLabel>Why</FieldLabel>
          <Textarea onChange={(event) => setReason(event.target.value)} placeholder="Didn't turn up for two weekend bookings" rows={2} value={reason} />
          <FieldDescription>Shown to whoever is on the desk next.</FieldDescription>
          <FieldError />
        </Field>
      </DialogPanel>
      <DialogFooter>
        <Button disabled={busy} onClick={onClose} variant="ghost">
          Cancel
        </Button>
        <Button loading={busy} type="submit">
          Ask to pay first
        </Button>
      </DialogFooter>
    </Form>
  );
}

