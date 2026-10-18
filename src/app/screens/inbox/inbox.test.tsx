import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { axeViolations, goToHash, renderApp } from "@/app/test-utils";
import { asPhone } from "@/app/screens/team/as-phone";
import { TEAM_IDS } from "@/data/mock/seed";

async function list(name = "Leads"): Promise<HTMLElement> {
  return screen.findByRole("list", { name });
}

function rows(ul: HTMLElement): HTMLElement[] {
  return within(ul).getAllByRole("link");
}

function tabLink(name: RegExp): HTMLElement {
  return within(screen.getByRole("navigation", { name: "Conversation types" })).getByRole("link", { name });
}

describe("#/desk/inbox", () => {
  let restore: (() => void) | null = null;
  afterEach(() => {
    restore?.();
    restore = null;
  });

  it("lists leads, longest wait first, with waits that warm up and counts on the tabs", async () => {
    renderApp("#/desk/inbox");
    expect(await screen.findByRole("heading", { level: 1, name: "Inbox" })).toBeInTheDocument();
    const leads = await list();
    const [first, second, third] = rows(leads);
    expect(first).toHaveAccessibleName(/^Harsh Vardhan/);
    expect(second).toHaveAccessibleName(/^Pooja Rathi/);
    expect(third).toHaveAccessibleName(/^Sameer Joshi/);
    // Red after four hours, amber after one, calm under that.
    expect(within(leads).getByText("Waiting 5 hrs").closest("[data-slot=badge]")).toHaveClass("text-destructive-foreground");
    expect(within(leads).getByText("Waiting 1 hr").closest("[data-slot=badge]")).toHaveClass("text-warning-foreground");
    const tabs = screen.getByRole("navigation", { name: "Conversation types" });
    expect(within(tabs).getByRole("link", { name: "Leads, 3 waiting on a reply" })).toHaveAttribute("aria-current", "page");
    expect(within(tabs).getByRole("link", { name: "Customers, 2 waiting on a reply" })).toBeInTheDocument();
    expect(screen.getByText("Pick a conversation")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("switches tab by URL and searches by name or number", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/inbox");
    await list();
    await user.click(tabLink(/^Customers/));
    const customers = await list("Customers");
    const names = ["Ishaan Verma", "Diya Patel", "Ananya Iyer", "Kabir Singh"];
    rows(customers).forEach((row, i) => expect(row).toHaveAccessibleName(new RegExp(`^${names[i]}`)));
    expect(window.location.hash).toBe("#/desk/inbox?tab=customers");

    const search = screen.getByRole("searchbox", { name: "Search conversations" });
    await user.type(search, "00102");
    await waitFor(() => expect(rows(screen.getByRole("list", { name: "Customers" }))).toHaveLength(1));
    expect(rows(screen.getByRole("list", { name: "Customers" }))[0]).toHaveAccessibleName(/^Ishaan Verma/);
    await user.clear(search);
    await user.type(search, "nobody");
    expect(await screen.findByText("No one matches “nobody”")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    await waitFor(() => expect(rows(screen.getByRole("list", { name: "Customers" }))).toHaveLength(4));
  });

  it("opens a chat: marks it read, keeps the composer locked until Reply by hand, then Enter sends", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/inbox");
    await user.click(within(await list()).getByRole("link", { name: /^Pooja Rathi/ }));
    expect(await screen.findByRole("heading", { level: 2, name: "Pooja Rathi" })).toBeInTheDocument();
    expect(window.location.hash).toBe("#/desk/inbox/cnv_2");
    // Opening it read it: the row's unread count goes.
    await waitFor(() => expect(within(screen.getByRole("list", { name: "Leads" })).getByRole("link", { name: /^Pooja Rathi/ })).not.toHaveTextContent(/unread/));

    const box = screen.getByRole("textbox", { name: "Reply to Pooja Rathi" });
    expect(box).toBeDisabled();
    expect(screen.getByText("The bot is answering Pooja. Turn on Reply by hand to write.")).toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "Reply by hand" }));
    expect(await screen.findByText("Replying to Pooja by hand")).toBeInTheDocument();
    await waitFor(() => expect(box).toBeEnabled());
    await user.type(box, "Yes, both courts are free{Shift>}{Enter}{/Shift}from 10 AM.");
    expect(box).toHaveValue("Yes, both courts are free\nfrom 10 AM.");
    await user.keyboard("{Enter}");
    const log = screen.getByRole("log", { name: "Messages with Pooja Rathi" });
    expect(await within(log).findByText(/Yes, both courts are free/)).toBeInTheDocument();
    await waitFor(() => expect(box).toHaveValue(""));
    expect(within(log).getAllByText(/, Sent$/).length).toBeGreaterThan(0);
    expect(await axeViolations()).toEqual([]);
  });

  it("takes a lead, logs what was done (closing it), and reopens it", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/inbox/cnv_1");
    await screen.findByRole("heading", { level: 2, name: "Harsh Vardhan" });
    expect(screen.getByText("Nobody has taken this yet.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Take this" }));
    expect(await screen.findByText("Took the chat with Harsh Vardhan")).toBeInTheDocument();
    expect(await screen.findByText("You have this one.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Log what you did" }));
    const dialog = await screen.findByRole("dialog", { name: "Log what you did" });
    await user.click(within(dialog).getByRole("radio", { name: /Called/ }));
    await user.type(within(dialog).getByRole("textbox", { name: "Note" }), "Wants evenings");
    expect(await axeViolations()).toEqual([]);
    await user.click(within(dialog).getByRole("button", { name: "Log and mark done" }));
    expect(await screen.findByText("Logged “Called” for Harsh Vardhan")).toBeInTheDocument();
    const bar = document.querySelector<HTMLElement>("[data-slot=triage-bar]")!;
    await waitFor(() => expect(within(bar).getByText("Done")).toBeInTheDocument());
    expect(within(screen.getByRole("list", { name: "Leads" })).getByRole("link", { name: /^Harsh Vardhan/ })).not.toHaveTextContent("Waiting");

    await user.click(within(bar).getByRole("button", { name: "Reopen" }));
    expect(await screen.findByText("Reopened the chat with Harsh Vardhan")).toBeInTheDocument();
    expect(await within(bar).findByRole("button", { name: "Log what you did" })).toBeInTheDocument();
  });

  it("won't take a chat someone else has, and says who has it", async () => {
    renderApp("#/desk/inbox/cnv_3");
    await screen.findByRole("heading", { level: 2, name: "Sameer Joshi" });
    expect(screen.getByText("Sunil has this one.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take this" })).toBeDisabled();
  });

  it("shows a failed delivery with its reason, and sends it again", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/inbox/cnv_5?tab=customers");
    const log = await screen.findByRole("log", { name: "Messages with Ishaan Verma" });
    expect(within(log).getByText(/WhatsApp couldn't deliver this/)).toBeInTheDocument();
    expect(within(log).getByText(/Not delivered/)).toBeInTheDocument();
    expect(within(log).getAllByText("Here's the updated receipt.", { exact: false })).toHaveLength(1);
    await user.click(within(log).getByRole("button", { name: "Send again" }));
    await waitFor(() => expect(within(log).getAllByText("Here's the updated receipt.", { exact: false })).toHaveLength(2));
  });

  it("loads older messages above the latest page", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/inbox/cnv_4?tab=customers");
    const log = await screen.findByRole("log", { name: "Messages with Diya Patel" });
    await waitFor(() => expect(within(log).getAllByRole("listitem")).toHaveLength(30));
    await user.click(screen.getByRole("button", { name: "Load older messages" }));
    await waitFor(() => expect(within(log).getAllByRole("listitem")).toHaveLength(38));
    expect(screen.queryByRole("button", { name: "Load older messages" })).toBeNull();
  });

  it("is one pane on a phone: the list, then the chat with a way back", async () => {
    restore = asPhone();
    const user = userEvent.setup();
    renderApp("#/desk/inbox");
    await user.click(within(await list()).getByRole("link", { name: /^Harsh Vardhan/ }));
    await screen.findByRole("heading", { level: 2, name: "Harsh Vardhan" });
    expect(screen.queryByRole("list", { name: "Leads" })).toBeNull();
    await user.click(screen.getByRole("link", { name: "All conversations" }));
    expect(await list()).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Harsh Vardhan" })).toBeNull();
  });

  it("isn't part of a coach's role", async () => {
    renderApp("#/desk/inbox", { memberId: TEAM_IDS.coach });
    expect(await screen.findByText("Inbox isn't part of your role")).toBeInTheDocument();
  });

  it("says when a conversation is gone", async () => {
    renderApp("#/desk/inbox/cnv_missing");
    expect(await screen.findByText("Couldn't load this conversation")).toBeInTheDocument();
    expect(screen.getByText("This conversation no longer exists.")).toBeInTheDocument();
    await goToHash("#/desk/inbox");
    expect(await screen.findByText("Pick a conversation")).toBeInTheDocument();
  });
});
