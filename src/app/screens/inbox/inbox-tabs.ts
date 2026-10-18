import { hrefFor } from "@/app/router";
import type { Conversation, ConversationTab } from "@/data/types";

export const INBOX_TABS: readonly { id: ConversationTab; label: string; empty: { title: string; line: string } }[] = [
  { id: "leads", label: "Leads", empty: { title: "No leads", line: "When someone new asks something the bot can't answer, they land here, longest wait first." } },
  { id: "customers", label: "Customers", empty: { title: "No customer chats", line: "Chats with people who have booked or enrolled show here." } },
  { id: "team", label: "Team", empty: { title: "No team chats", line: "Messages from coaches and staff on the venue's number show here." } },
];

export function tabOf(value: string | null): ConversationTab {
  return INBOX_TABS.find((t) => t.id === value)?.id ?? "leads";
}

/** The list keeps its tab in the URL; "leads" is the default and stays out of it. */
export function inboxHref(tab: ConversationTab, conversationId?: string): string {
  return hrefFor(conversationId ? `/desk/inbox/${conversationId}` : "/desk/inbox", { tab: tab === "leads" ? null : tab });
}

/** Someone is waiting on the venue: a reply is owed, or there's something unread. */
export function needsReply(c: Conversation): boolean {
  return c.status === "open" && (c.waitingSince !== null || c.unread > 0);
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
