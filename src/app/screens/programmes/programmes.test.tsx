import { screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axeViolations, renderApp } from "@/app/test-utils";
import { TEAM_IDS } from "@/data/mock/seed";

describe("programmes list", () => {
  it("shows each programme with its schedule, how full it is and what's owed", async () => {
    renderApp("#/desk/programmes");
    const list = await screen.findByRole("list", { name: "Programmes" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    const juniors = within(list).getByRole("link", { name: "Off-Screen Club Juniors" }).closest("li")!;
    expect(within(juniors).getByText("Sat, Sun · 4:00 – 5:00 pm · Courts 1 and 2")).toBeInTheDocument();
    expect(within(juniors).getByText("Open")).toBeInTheDocument();
    expect(within(juniors).getByText("14 of 24")).toBeInTheDocument();
    expect(within(juniors).getByText("₹5,350")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("filters by status through the URL, and says so when a search finds nothing", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/programmes");
    const tabs = await screen.findByRole("navigation", { name: "Show programmes" });
    await user.click(within(tabs).getByRole("link", { name: /Drafts/ }));
    await waitFor(() => expect(window.location.hash).toBe("#/desk/programmes?show=drafts"));
    expect(within(screen.getByRole("list", { name: "Programmes" })).getAllByRole("listitem")).toHaveLength(1);
    expect(within(tabs).getByRole("link", { name: /Drafts/ })).toHaveAttribute("aria-current", "page");

    await user.type(screen.getByRole("searchbox", { name: "Search programmes" }), "tennis");
    expect(await screen.findByText('No programme matches "tennis"')).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Clear search" }));
    expect(await screen.findByRole("list", { name: "Programmes" })).toBeInTheDocument();
  });

  it("creates a programme: the backend's refusals land on their fields, then it opens the new programme", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/programmes");
    await user.click(await screen.findByRole("button", { name: "New programme" }));
    const dialog = await screen.findByRole("dialog", { name: "New programme" });
    expect(window.location.hash).toBe("#/desk/programmes?new=1");
    expect(await axeViolations()).toEqual([]);

    await user.click(within(dialog).getByRole("button", { name: "Create programme" }));
    expect(await within(dialog).findByText("Some details need fixing.")).toBeInTheDocument();
    expect(within(dialog).getByText("Give it a name")).toBeInTheDocument();
    expect(within(dialog).getByText("Pick at least one day")).toBeInTheDocument();
    expect(within(dialog).getByText("Every plan needs a name, a price and, for a pack, how many sessions")).toBeInTheDocument();

    await fillProgramme(user, dialog);
    await user.click(within(dialog).getByRole("button", { name: "Create programme" }));
    expect(await screen.findByText("Tuesday evening drills created")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: "Tuesday evening drills" })).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("shows a coach only their programmes, and New programme says why it's off", async () => {
    renderApp("#/desk/programmes", { memberId: TEAM_IDS.coach });
    const list = await screen.findByRole("list", { name: "Programmes" });
    expect(within(list).getAllByRole("listitem").map((li) => within(li).getAllByRole("link")[0]?.textContent)).toEqual(["Off-Screen Club Juniors", "Adult beginners"]);
    const create = screen.getByRole("button", { name: "New programme" });
    expect(create).toHaveAttribute("aria-disabled", "true");
    expect(create).toHaveAccessibleDescription("Coach can't create programmes. Ask an admin.");
    expect(await axeViolations()).toEqual([]);
  });
});

async function fillProgramme(user: UserEvent, dialog: HTMLElement): Promise<void> {
  await user.type(within(dialog).getByRole("textbox", { name: "Name" }), "Tuesday evening drills");
  await user.click(within(dialog).getByRole("checkbox", { name: "Tuesday" }));
  await user.type(within(dialog).getByRole("textbox", { name: "Plan 1, name" }), "Month of Tuesdays");
  const price = within(dialog).getByRole("textbox", { name: "Plan 1, price" });
  await user.clear(price);
  await user.type(price, "1200");
  await user.tab();
}

describe("programme page", () => {
  it("overview: stats, what needs attention, and the register to take", async () => {
    renderApp("#/desk/programmes/prg_juniors");
    expect(await screen.findByRole("heading", { level: 1, name: "Off-Screen Club Juniors" })).toBeInTheDocument();
    const attention = screen.getByRole("region", { name: "Needs attention" });
    expect(within(attention).getByRole("button", { name: "Take payment for Advik Iyer" })).toBeInTheDocument();
    expect(within(attention).getByText("1 on the waitlist")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Take register" })).toHaveAttribute("href", "#/desk/programmes/prg_juniors/sessions/ses_prg_juniors_2026-10-11");
    expect(await axeViolations()).toEqual([]);
  });

  it("takes a payment from the attention list", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/programmes/prg_juniors");
    await user.click(await screen.findByRole("button", { name: "Take payment for Vivaan Nair" }));
    const dialog = await screen.findByRole("dialog", { name: "Take payment" });
    expect(within(dialog).getByRole("textbox", { name: "Amount received" })).toHaveValue("₹1,250");
    await user.click(within(dialog).getByRole("button", { name: "Record ₹1,250" }));
    expect(await screen.findByText("₹1,250 recorded for Vivaan Nair")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Take payment for Vivaan Nair" })).toBeNull());
  });

  it("sessions: cancel one after a confirm, with undo; a coach is told why they can't", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/programmes/prg_juniors/sessions");
    await user.click(await screen.findByRole("button", { name: "Cancel the session on Sat, 17 Oct" }));
    const confirm = await screen.findByRole("alertdialog", { name: "Cancel the session on Sat, 17 Oct?" });
    expect(await axeViolations()).toEqual([]);
    await user.click(within(confirm).getByRole("button", { name: "Cancel session" }));
    expect(await screen.findByText("Session on Sat, 17 Oct cancelled")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Restore the session on Sat, 17 Oct" })).toBeInTheDocument();
  });

  it("sessions are read-only for a coach, with the reason", async () => {
    renderApp("#/desk/programmes/prg_juniors/sessions", { memberId: TEAM_IDS.coach });
    const cancel = await screen.findByRole("button", { name: "Cancel the session on Sat, 17 Oct" });
    expect(cancel).toHaveAttribute("aria-disabled", "true");
    expect(cancel).toHaveAccessibleDescription("Coach can't change programmes. Ask an admin.");
  });

  it("enrolled: the same table and actions as Enrolments", async () => {
    renderApp("#/desk/programmes/prg_juniors/enrolled");
    const table = await screen.findByRole("table", { name: "Enrolled in Off-Screen Club Juniors" });
    expect(within(table).getAllByRole("row")).toHaveLength(17);
    expect(within(table).getByRole("button", { name: "Take payment for Advik Iyer" })).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("settings: edits wait in a save bar, a refusal lands on its field, saving says so", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/programmes/prg_beginners/settings");
    const name = await screen.findByRole("textbox", { name: "Name" });
    const bar = screen.getByRole("region", { name: "Save programme" });
    expect(within(bar).getByRole("button", { name: "Save changes" })).toBeDisabled();
    await user.clear(name);
    expect(within(bar).getByText("Unsaved changes")).toBeInTheDocument();
    await user.click(within(bar).getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Give it a name")).toBeInTheDocument();
    await user.type(name, "Adult beginners, evenings");
    await user.click(within(bar).getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Adult beginners, evenings saved")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: "Adult beginners, evenings" })).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("settings: status saves at once with undo, and a plan can be retired", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/programmes/prg_juniors/settings");
    await user.click(await screen.findByRole("radio", { name: /^Closed/ }));
    expect(await screen.findByText("Off-Screen Club Juniors is now closed")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retire One session" }));
    expect(await screen.findByText("One session retired")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Put back on sale One session" })).toBeInTheDocument();
  });

  it("an unknown programme says so", async () => {
    renderApp("#/desk/programmes/prg_nope");
    expect(await screen.findByText("This programme doesn't exist, or you don't have access to it.")).toBeInTheDocument();
  });
});
