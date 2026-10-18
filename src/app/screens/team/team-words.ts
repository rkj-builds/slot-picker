/**
 * How the team screens name roles and areas: one label and one line each,
 * so the invite dialog, the members table and the access matrix agree.
 */
import { ROLE_LABELS } from "@/data/mock/db";
import type { Feature, Role, TeamMember } from "@/data/types";

export { ROLE_LABELS };

export const ROLES: readonly Role[] = ["admin", "manager", "staff", "coach"];

export const ROLE_LINES: Record<Role, string> = {
  admin: "Everything, including the team, roles and settings.",
  manager: "Runs the venue day to day: bookings, programmes, money and refunds.",
  staff: "The desk: bookings, customers and the inbox.",
  coach: "Only the programmes they run, with registers and attendance.",
};

export const ROLE_BADGE: Record<Role, "info" | "secondary" | "outline"> = {
  admin: "info",
  manager: "secondary",
  staff: "outline",
  coach: "outline",
};

export const FEATURE_LABELS: Record<Feature, { label: string; line: string }> = {
  bookings: { label: "Bookings", line: "The day grid, the bookings list, new bookings" },
  availability: { label: "Availability", line: "Opening hours, closures, repeating blocks" },
  programmes: { label: "Programmes", line: "Programmes, registers and enrolments" },
  customers: { label: "Customers", line: "The customer list and profiles" },
  members: { label: "Members", line: "Court-hour packs and plans" },
  payments: { label: "Payments", line: "Payments, dues and credit" },
  inbox: { label: "Inbox", line: "WhatsApp conversations" },
  team: { label: "Team", line: "See who works here (only admins change it)" },
  settings: { label: "Settings", line: "Venue details, booking rules, notifications" },
};

export const STATUS_WORDS: Record<TeamMember["status"], { label: string; badge: "success" | "warning" | "secondary" }> = {
  active: { label: "Active", badge: "success" },
  invited: { label: "Invited", badge: "warning" },
  disabled: { label: "Disabled", badge: "secondary" },
};

/** "a manager", "an admin", "a front desk member". */
export function aRole(role: Role): string {
  return { admin: "an admin", manager: "a manager", staff: "front desk", coach: "a coach" }[role];
}
