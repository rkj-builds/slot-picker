"use client";

/**
 * Every area of the venue dashboard, in one list: its URL, its place in the
 * sidebar, the feature a role needs to see it, and the screen that draws it.
 * The sidebar, the command palette and the router all read from here, so a
 * new area is one entry.
 *
 * Day and Insights are drawn by the desk itself (src/app/desk); the rest
 * (Bookings and Settings among them) are screens, loaded on demand.
 */
import {
  BanknoteIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  ChartColumnIcon,
  ClipboardListIcon,
  ContactIcon,
  IdCardIcon,
  ListIcon,
  MessagesSquareIcon,
  SettingsIcon,
  ShapesIcon,
  UsersIcon,
} from "lucide-react";
import * as React from "react";
import type { Route } from "@/app/router";
import type { Feature } from "@/data/types";
import type { PlainDate } from "@/lib/plain-date";

export type DeskSection =
  | "day"
  | "bookings"
  | "inbox"
  | "programmes"
  | "enrolments"
  | "customers"
  | "members"
  | "money"
  | "availability"
  | "insights"
  | "team"
  | "settings";

export type SectionGroup = "Desk" | "Programmes" | "People" | "Money" | "Venue";

/** What a screen gets: the route, the path after its section (`#/desk/programmes/prg_1` → ["prg_1"]), and the venue's clock. */
export interface ScreenProps {
  route: Route;
  sub: string[];
  today: PlainDate;
  now: number;
}

export interface SectionDef {
  id: DeskSection;
  label: string;
  /** One line under the title. */
  line: string;
  path: string;
  group: SectionGroup;
  icon: React.ComponentType<{ "aria-hidden"?: boolean | "true"; className?: string }>;
  /** The feature a role needs; null = everyone on the team. */
  feature: Feature | null;
  /** Words the command palette also matches. */
  keywords: string[];
  /** Screens under src/app/screens draw their own header; the desk's own sections don't. */
  screen?: React.LazyExoticComponent<(props: ScreenProps) => React.ReactElement>;
}

const lazyScreen = (load: () => Promise<{ default: (props: ScreenProps) => React.ReactElement }>): React.LazyExoticComponent<(props: ScreenProps) => React.ReactElement> => React.lazy(load);

export const SECTIONS: readonly SectionDef[] = [
  { id: "day", label: "Day", line: "Two courts, by the half hour", path: "/desk", group: "Desk", icon: CalendarDaysIcon, feature: "bookings", keywords: ["grid", "today", "courts"] },
  {
    id: "bookings",
    label: "Bookings",
    line: "Every booking, its status and what is still due",
    path: "/desk/bookings",
    group: "Desk",
    icon: ListIcon,
    feature: "bookings",
    keywords: ["list", "search", "export", "payment due", "remind"],
    screen: lazyScreen(() => import("@/app/desk/bookings-screen").then((m) => ({ default: m.BookingsScreen }))),
  },
  {
    id: "inbox",
    label: "Inbox",
    line: "WhatsApp conversations the bot hands to the team",
    path: "/desk/inbox",
    group: "Desk",
    icon: MessagesSquareIcon,
    feature: "inbox",
    keywords: ["whatsapp", "messages", "leads", "chat"],
    screen: lazyScreen(() => import("@/app/screens/inbox/inbox-screen").then((m) => ({ default: m.InboxScreen }))),
  },
  {
    id: "programmes",
    label: "Programmes",
    line: "Coaching, camps and leagues, and who is in them",
    path: "/desk/programmes",
    group: "Programmes",
    icon: ShapesIcon,
    feature: "programmes",
    keywords: ["coaching", "classes", "juniors", "camp", "register", "attendance"],
    screen: lazyScreen(() => import("@/app/screens/programmes/programmes-screen").then((m) => ({ default: m.ProgrammesScreen }))),
  },
  {
    id: "enrolments",
    label: "Enrolments",
    line: "Who is signed up, who to chase, who is paused or stopped",
    path: "/desk/enrolments",
    group: "Programmes",
    icon: ClipboardListIcon,
    feature: "programmes",
    keywords: ["renew", "chase", "children", "parents", "monthly"],
    screen: lazyScreen(() => import("@/app/screens/programmes/enrolments-screen").then((m) => ({ default: m.EnrolmentsScreen }))),
  },
  {
    id: "customers",
    label: "Customers",
    line: "Everyone who has booked, enrolled or messaged",
    path: "/desk/customers",
    group: "People",
    icon: ContactIcon,
    feature: "customers",
    keywords: ["people", "contacts", "leads", "pay first"],
    screen: lazyScreen(() => import("@/app/screens/people/customers-screen").then((m) => ({ default: m.CustomersScreen }))),
  },
  {
    id: "members",
    label: "Members",
    line: "Court-hour packs: hours left, expiry, renewals",
    path: "/desk/members",
    group: "People",
    icon: IdCardIcon,
    feature: "members",
    keywords: ["membership", "hours", "plans", "packs"],
    screen: lazyScreen(() => import("@/app/screens/people/members-screen").then((m) => ({ default: m.MembersScreen }))),
  },
  {
    id: "money",
    label: "Payments",
    line: "Money in, money owed, and credit held for customers",
    path: "/desk/money",
    group: "Money",
    icon: BanknoteIcon,
    feature: "payments",
    keywords: ["payments", "dues", "credit", "refund", "cash", "approve"],
    screen: lazyScreen(() => import("@/app/screens/money/money-screen").then((m) => ({ default: m.MoneyScreen }))),
  },
  {
    id: "availability",
    label: "Availability",
    line: "Opening hours, closures and courts held on a schedule",
    path: "/desk/availability",
    group: "Venue",
    icon: CalendarClockIcon,
    feature: "availability",
    keywords: ["hours", "closed", "holiday", "blocks", "repeat"],
    screen: lazyScreen(() => import("@/app/screens/availability/availability-screen").then((m) => ({ default: m.AvailabilityScreen }))),
  },
  { id: "insights", label: "Insights", line: "What happened once courts needed money up front", path: "/desk/insights", group: "Venue", icon: ChartColumnIcon, feature: "bookings", keywords: ["charts", "cancellations"] },
  {
    id: "team",
    label: "Team",
    line: "Who works here, what each role can see and do",
    path: "/desk/team",
    group: "Venue",
    icon: UsersIcon,
    feature: "team",
    keywords: ["staff", "roles", "invite", "access", "permissions"],
    screen: lazyScreen(() => import("@/app/screens/team/team-screen").then((m) => ({ default: m.TeamScreen }))),
  },
  {
    id: "settings",
    label: "Settings",
    line: "Booking rules, the venue's details, alerts and activity",
    path: "/desk/settings",
    group: "Venue",
    icon: SettingsIcon,
    feature: "settings",
    keywords: ["deposit", "prices", "pay first", "notifications", "venue", "time zone", "activity", "log"],
    screen: lazyScreen(() => import("@/app/screens/settings/settings-screen").then((m) => ({ default: m.SettingsScreen }))),
  },
];

export const SECTION_GROUPS: readonly SectionGroup[] = ["Desk", "Programmes", "People", "Money", "Venue"];

export function sectionById(id: DeskSection): SectionDef {
  const found = SECTIONS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown section ${id}`);
  return found;
}

/** `#/desk/<section>/…` → the section; anything unknown is the day. */
export function sectionOf(route: Route): DeskSection {
  const id = route.segments[1];
  return SECTIONS.find((s) => s.id === id)?.id ?? "day";
}
