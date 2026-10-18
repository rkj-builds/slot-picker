import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axeViolations, goToHash, renderApp, TEST_NOW } from "@/app/test-utils";
import { TEAM_IDS } from "@/data/mock/seed";
import { seedState } from "@/lib/seed";

/** TEST_NOW is Thursday 15 Oct 2026; the seeded closures fall on 19 and 24 Oct, the club holds both courts Sat and Sun 4 – 5 pm. */
async function open(memberId?: string): Promise<void> {
  renderApp("#/desk/availability", { state: seedState(TEST_NOW), memberId });
  await screen.findByRole("heading", { level: 1, name: "Availability" });
  await screen.findByRole("list", { name: "Opening hours by day" });
}

describe("#/desk/availability", () => {
  it("shows weekly hours, closures and the club's repeating block, and passes axe", async () => {
    await open();
    expect(within(screen.getByRole("list", { name: "Opening hours by day" })).getAllByRole("listitem")).toHaveLength(7);
    expect(screen.getByText(/Every day, 6:00 am – 11:00 pm/)).toBeInTheDocument();
    const closures = await screen.findByRole("list", { name: "Upcoming closures" });
    expect(within(closures).getByText("Monday, 19 October 2026")).toBeInTheDocument();
    expect(within(closures).getByText(/Court resurfacing/)).toBeInTheDocument();
    const blocks = await screen.findByRole("list", { name: "Repeating blocks" });
    expect(within(blocks).getByRole("heading", { name: "Off-Screen Club Juniors" })).toBeInTheDocument();
    expect(within(blocks).getByText("Every Sat and Sun, 4 – 5 pm")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("hours are a draft: the unsaved bar saves them, and Settings shows the same hours", async () => {
    const user = userEvent.setup();
    await open();
    await user.click(screen.getByRole("switch", { name: "Open on Sunday" }));
    const bar = await screen.findByRole("region", { name: "Unsaved hours" });
    expect(within(bar).getByText("Sunday")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
    await user.click(within(bar).getByRole("button", { name: "Save hours" }));
    expect(await screen.findByText("Opening hours saved")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("region", { name: "Unsaved hours" })).toBeNull());
    expect(screen.getByRole("switch", { name: "Open on Sunday" })).not.toBeChecked();

    await goToHash("#/desk/settings");
    expect(await screen.findByRole("checkbox", { name: "Open on Sunday" })).not.toBeChecked();
  });

  it("copy times to other days, refuse a day that closes before it opens, and discard", async () => {
    const user = userEvent.setup();
    await open();
    await user.click(screen.getByRole("combobox", { name: "Monday opens" }));
    await user.click(await screen.findByRole("option", { name: "8:00 am" }));
    await user.click(screen.getByRole("button", { name: "Copy Monday's times to other days" }));
    const popup = await screen.findByRole("dialog");
    await user.click(within(popup).getByRole("checkbox", { name: "Tuesday" }));
    await user.click(within(popup).getByRole("checkbox", { name: "Wednesday" }));
    await user.click(within(popup).getByRole("button", { name: "Apply" }));
    expect(screen.getByRole("combobox", { name: "Tuesday opens" })).toHaveTextContent("8:00 am");
    expect(screen.getByRole("combobox", { name: "Wednesday opens" })).toHaveTextContent("8:00 am");
    expect(screen.getByRole("combobox", { name: "Thursday opens" })).toHaveTextContent("6:00 am");
    expect(within(screen.getByRole("region", { name: "Unsaved hours" })).getByText("Monday, Tuesday, Wednesday")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Friday closes" }));
    await user.click(await screen.findByRole("option", { name: "5:00 am" }));
    expect(screen.getByText("Closing time has to be after opening time.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save hours" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Discard" }));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Unsaved hours" })).toBeNull());
    expect(screen.getByRole("combobox", { name: "Monday opens" })).toHaveTextContent("6:00 am");
  });

  it("a closure warns about the bookings inside it, needs a reason, and can be removed", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/availability?closure=new&date=2026-10-17", { state: seedState(TEST_NOW) });
    const dialog = await screen.findByRole("dialog", { name: "Add closure" });
    expect(within(dialog).getByRole("button", { name: /^Date Saturday, 17 October 2026/ })).toBeInTheDocument();
    expect(await within(dialog).findByText(/confirmed bookings? falls? in this closure/)).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);

    await user.click(within(dialog).getByRole("radio", { name: "Time range" }));
    await user.click(within(dialog).getByRole("button", { name: "Add closure" }));
    expect(within(dialog).getByText("Say why the venue is closed; customers see it.")).toBeInTheDocument();
    await user.type(within(dialog).getByRole("textbox", { name: "Reason" }), "Floodlight repair");
    await user.click(within(dialog).getByRole("button", { name: "Add closure" }));
    expect(await screen.findByText("Closure added for Sat, 17 Oct")).toBeInTheDocument();
    await waitFor(() => expect(window.location.hash).toBe("#/desk/availability"));
    const list = await screen.findByRole("list", { name: "Upcoming closures" });
    expect(await within(list).findByText("Saturday, 17 October 2026")).toBeInTheDocument();

    await user.click(within(list).getByRole("button", { name: "Remove the closure on Sat, 17 Oct" }));
    const confirm = await screen.findByRole("alertdialog", { name: "Remove the closure on Sat, 17 Oct?" });
    await user.click(within(confirm).getByRole("button", { name: "Remove closure" }));
    expect(await screen.findByText("Closure on Sat, 17 Oct removed")).toBeInTheDocument();
    await waitFor(() => expect(within(screen.getByRole("list", { name: "Upcoming closures" })).queryByText("Saturday, 17 October 2026")).toBeNull());
  });

  it("free one date of a block, hold it again, then end the block", async () => {
    const user = userEvent.setup();
    await open();
    const blocks = await screen.findByRole("list", { name: "Repeating blocks" });
    await user.click(within(blocks).getByRole("button", { name: "Free a date" }));
    await user.click(await screen.findByRole("menuitem", { name: "Saturday, 17 October 2026" }));
    expect(await screen.findByText("Sat, 17 Oct freed")).toBeInTheDocument();
    const freed = await screen.findByRole("list", { name: "Dates freed from Off-Screen Club Juniors" });
    await user.click(within(freed).getByRole("button", { name: "Hold Sat, 17 Oct again" }));
    expect(await screen.findByText("Sat, 17 Oct held again")).toBeInTheDocument();

    await user.click(within(screen.getByRole("list", { name: "Repeating blocks" })).getByRole("button", { name: "End block" }));
    const confirm = await screen.findByRole("alertdialog", { name: "End Off-Screen Club Juniors?" });
    expect(within(confirm).getByRole("combobox", { name: "First free date" })).toHaveTextContent("Saturday, 17 October 2026");
    expect(await axeViolations()).toEqual([]);
    await user.click(within(confirm).getByRole("button", { name: "End block" }));
    expect(await screen.findByText("Off-Screen Club Juniors ends from Sat, 17 Oct")).toBeInTheDocument();
    expect(await screen.findByText("No courts held on a schedule")).toBeInTheDocument();
    expect(screen.getByText("1 ended block")).toBeInTheDocument();
  });

  it("add a block: it needs a title, and saves as one rule", async () => {
    const user = userEvent.setup();
    await open();
    await user.click(await screen.findByRole("button", { name: "Add block" }));
    const dialog = await screen.findByRole("dialog", { name: "Add a repeating block" });
    await user.click(within(dialog).getByRole("button", { name: "Add block" }));
    expect(within(dialog).getByText("Say what the courts are held for.")).toBeInTheDocument();
    await user.type(within(dialog).getByRole("textbox", { name: "What for" }), "Seniors league");
    await user.click(within(dialog).getByRole("button", { name: "Add block" }));
    expect(await screen.findByText("Repeating block added")).toBeInTheDocument();
    expect(await within(screen.getByRole("list", { name: "Repeating blocks" })).findByRole("heading", { name: "Seniors league" })).toBeInTheDocument();
  });

  it("a manager without settings access sees it all read-only, and why", async () => {
    await open(TEAM_IDS.manager);
    expect(screen.getByText("You can see availability but not change it")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Open on Monday" })).toHaveAttribute("aria-disabled", "true");
    const add = screen.getByRole("button", { name: "Add closure" });
    expect(add).toHaveAttribute("aria-disabled", "true");
    expect(add).toHaveAccessibleDescription("Manager can't change availability. Ask an admin.");
    expect(screen.queryByRole("button", { name: "End block" })).toBeNull();
    expect(await axeViolations()).toEqual([]);
  });

  it("front desk doesn't have availability", async () => {
    renderApp("#/desk/availability", { state: seedState(TEST_NOW), memberId: TEAM_IDS.desk });
    expect(await screen.findByText("Availability isn't part of your role")).toBeInTheDocument();
  });
});
