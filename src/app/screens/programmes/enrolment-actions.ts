/**
 * What a row (or any screen) can do to an enrolment, and the context the
 * dialogs host provides (src/app/screens/programmes/enrolment-dialogs.tsx).
 * `rowActions` decides, in one place, which actions a row's menu offers and
 * which the viewer's role is refused, the way Cal.com keeps booking actions in
 * one rules module.
 */
import { BanknoteIcon, CirclePauseIcon, CirclePlayIcon, CircleStopIcon, HandCoinsIcon, MessageSquareTextIcon, RefreshCwIcon, Undo2Icon, UserIcon } from "lucide-react";
import * as React from "react";
import { hrefFor } from "@/app/router";
import { cantSay } from "@/app/screens/programmes/hooks";
import { enrolmentDue, ledgerPaid } from "@/data/money";
import type { Customer, Enrolment, Programme, Viewer } from "@/data/types";
import type { PlainDate } from "@/lib/plain-date";

export type EnrolmentDialog = "pay" | "renew" | "pause" | "stop" | "give-back" | "follow-up";

export interface AddPrefill {
  programmeId?: string;
  startsOn?: PlainDate;
}

export interface EnrolmentActions {
  open: (dialog: EnrolmentDialog, enrolment: Enrolment) => void;
  add: (prefill?: AddPrefill) => void;
  resume: (enrolment: Enrolment) => void;
  undoStop: (enrolment: Enrolment) => void;
  customers: readonly Customer[];
  programmes: readonly Programme[];
  today: PlainDate;
}

export const ActionsContext = React.createContext<EnrolmentActions | null>(null);

export function useEnrolmentActions(): EnrolmentActions {
  const value = React.useContext(ActionsContext);
  if (!value) throw new Error("useEnrolmentActions must be used inside <EnrolmentActionsProvider>");
  return value;
}

/* ── Row actions ────────────────────────────────────────────────────── */

export interface RowAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ "aria-hidden"?: boolean | "true"; className?: string }>;
  run: () => void;
  /** Why the viewer can't, when they can't. */
  blocked: string | null;
  destructive?: boolean;
  href?: string;
}

const NEEDS = {
  money: "take or record money",
  change: "change enrolments",
  refund: "refund or give credit",
} as const;

/** What a row's menu offers, in Cal.com's order: the money, then the period, then the destructive. Unavailable ones stay, saying why. */
export function rowActions(e: Enrolment, actions: EnrolmentActions, viewer: Viewer | undefined): RowAction[][] {
  const can = viewer?.can;
  const cant = (what: string): string => cantSay(viewer, what);
  const money = can?.handleMoney ? null : cant(NEEDS.money);
  const change = can?.writeBookings ? null : cant(NEEDS.change);
  const refund = can?.refund ? null : cant(NEEDS.refund);
  const due = enrolmentDue(e);
  const live = e.status === "running" || e.status === "paused";
  const first: RowAction[] = [];
  if (due > 0) first.push({ id: "pay", label: "Take payment", icon: BanknoteIcon, run: () => actions.open("pay", e), blocked: money });
  if (e.status !== "waitlist") first.push({ id: "renew", label: "Renew", icon: RefreshCwIcon, run: () => actions.open("renew", e), blocked: money });
  const second: RowAction[] = [];
  if (e.status === "running") second.push({ id: "pause", label: "Pause", icon: CirclePauseIcon, run: () => actions.open("pause", e), blocked: change });
  if (e.status === "paused") second.push({ id: "resume", label: "End pause", icon: CirclePlayIcon, run: () => actions.resume(e), blocked: change });
  second.push({ id: "follow-up", label: e.followUp ? "Edit follow-up" : "Follow-up note", icon: MessageSquareTextIcon, run: () => actions.open("follow-up", e), blocked: null });
  second.push({ id: "parent", label: "Open parent", icon: UserIcon, run: () => undefined, blocked: null, href: hrefFor(`/desk/customers/${e.customerId}`) });
  const third: RowAction[] = [];
  if (ledgerPaid(e.ledger) > 0) third.push({ id: "give-back", label: "Give money back", icon: HandCoinsIcon, run: () => actions.open("give-back", e), blocked: refund });
  if (live) third.push({ id: "stop", label: "Stop", icon: CircleStopIcon, run: () => actions.open("stop", e), blocked: change, destructive: true });
  if (e.status === "stopped") third.push({ id: "undo-stop", label: "Undo stop", icon: Undo2Icon, run: () => actions.undoStop(e), blocked: change });
  return [first, second, third].filter((group) => group.length > 0);
}
