import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axeViolations, renderApp } from "@/app/test-utils";
import { TEAM_IDS } from "@/data/mock/seed";

describe("customers", () => {
  it("lists everyone with tags, bookings, spend and credit; filters and search are URLs", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/customers");
    const table = await screen.findByRole("table", { name: "Customers" });
    expect(within(table).getAllByRole("row")).toHaveLength(25);
    const rohan = within(table).getByRole("link", { name: "Rohan Mehta" }).closest("tr")!;
    expect(within(rohan).getByText("Pay first")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);

    await user.click(screen.getByRole("link", { name: "With credit" }));
    await waitFor(() => expect(within(screen.getByRole("table", { name: "Customers" })).getAllByRole("row")).toHaveLength(7));
    expect(window.location.hash).toBe("#/desk/customers?show=credit");

    await user.type(screen.getByRole("searchbox", { name: "Search customers" }), "nobody");
    expect(await screen.findByText('Nobody matches "nobody"')).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(await screen.findByRole("table", { name: "Customers" })).toBeInTheDocument();
  });

  it("a customer's page: stats, flags with the pay-first reason, and their bookings, enrolments and memberships", async () => {
    renderApp("#/desk/customers/cus_07");
    expect(await screen.findByRole("heading", { level: 1, name: "Rohan Mehta" })).toBeInTheDocument();
    expect(screen.getByText("Why: Didn't turn up for two weekend bookings")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Pay first" })).toBeChecked();
    expect(screen.getByRole("heading", { level: 2, name: /Enrolments/ })).toBeInTheDocument();
    expect(await screen.findByText(/Anika Mehta · Off-Screen Club Juniors/)).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("pay first needs a reason; turning it off offers undo", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/customers/cus_03");
    await user.click(await screen.findByRole("switch", { name: "Pay first" }));
    const dialog = await screen.findByRole("dialog", { name: "Ask Ishaan Verma to pay first?" });
    await user.click(within(dialog).getByRole("button", { name: "Ask to pay first" }));
    expect(await within(dialog).findByText("Say why they pay first, so the next person on the desk knows.")).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: "Why" })).toHaveAttribute("aria-invalid", "true");
    expect(await axeViolations()).toEqual([]);
    await user.type(within(dialog).getByRole("textbox", { name: "Why" }), "Two no-shows in October");
    await user.click(within(dialog).getByRole("button", { name: "Ask to pay first" }));
    expect(await screen.findByText("Ishaan Verma pays first from now on")).toBeInTheDocument();
    expect(await screen.findByText("Why: Two no-shows in October")).toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "Pay first" }));
    expect(await screen.findByText("Ishaan Verma can pay at the venue again")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("switch", { name: "Pay first" })).not.toBeChecked());
  });

  it("an unknown customer says so", async () => {
    renderApp("#/desk/customers/cus_99");
    expect(await screen.findByText("This customer no longer exists.")).toBeInTheDocument();
  });
});

describe("members", () => {
  it("lists active members with hours left; segments are URLs with counts", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/members");
    const table = await screen.findByRole("table", { name: "Members: Active" });
    expect(within(table).getAllByRole("row")).toHaveLength(5);
    expect(within(table).getByText("14 of 25 hours left")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);

    await user.click(screen.getByRole("link", { name: /^Low on hours/ }));
    const low = await screen.findByRole("table", { name: "Members: Low on hours" });
    expect(within(low).getByRole("link", { name: "Meera Nair" })).toBeInTheDocument();
    expect(window.location.hash).toBe("#/desk/members/low-hours");
    await user.click(screen.getByRole("link", { name: /^Owes/ }));
    expect(within(await screen.findByRole("table", { name: "Members: Owes" })).getByRole("link", { name: "Vihaan Reddy" })).toBeInTheDocument();
  });

  it("the member panel: ledger, then take the payment owed", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/members/owes");
    await user.click(await screen.findByRole("link", { name: "Vihaan Reddy" }));
    const panel = await screen.findByRole("dialog", { name: "Vihaan Reddy" });
    expect(await within(panel).findByText("Half at signing", { exact: false })).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
    await user.click(within(panel).getByRole("button", { name: "Take payment" }));
    const pay = await screen.findByRole("dialog", { name: "Take payment" });
    await user.click(within(pay).getByRole("button", { name: "Record ₹3,000" }));
    expect(await screen.findByText("₹3,000 recorded for Vihaan Reddy")).toBeInTheDocument();
    await waitFor(() => expect(within(panel).queryByRole("button", { name: "Take payment" })).toBeNull());
  });

  it("refund asks for a reason and ends the membership", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/members?open=mem_4");
    const panel = await screen.findByRole("dialog", { name: "Arjun Kulkarni" });
    await user.click(await within(panel).findByRole("button", { name: "Refund" }));
    const dialog = await screen.findByRole("dialog", { name: "Refund Arjun Kulkarni?" });
    await user.click(within(dialog).getByRole("button", { name: /^Refund ₹/ }));
    expect(await within(dialog).findByText("Say why, for the accounts.")).toBeInTheDocument();
    await user.type(within(dialog).getByRole("textbox", { name: "Reason" }), "Moving to Pune");
    await user.click(within(dialog).getByRole("button", { name: /^Refund ₹/ }));
    expect(await screen.findByText(/refunded to Arjun Kulkarni$/)).toBeInTheDocument();
  });

  it("sell: someone with an active membership is refused with the reason", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/members?sell=1");
    const dialog = await screen.findByRole("dialog", { name: "Sell membership" });
    expect(await axeViolations()).toEqual([]);
    await user.click(within(dialog).getByRole("combobox", { name: "Member" }));
    await user.click(await screen.findByRole("option", { name: /Diya Patel/ }));
    await user.click(within(dialog).getByRole("button", { name: "Sell 10 hours" }));
    expect(await within(dialog).findByText("Diya Patel already has an active membership. Renew or add hours instead.")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("combobox", { name: "Member" }));
    await user.click(await screen.findByRole("option", { name: /Ishaan Verma/ }));
    await user.click(within(dialog).getByRole("button", { name: "Sell 10 hours" }));
    expect(await screen.findByText("10 hours sold to Ishaan Verma")).toBeInTheDocument();
  });

  it("plans: add one (refusals on their fields), retire one with undo", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/members/plans");
    await user.click(await screen.findByRole("button", { name: "New plan" }));
    const dialog = await screen.findByRole("dialog", { name: "New plan" });
    await user.click(within(dialog).getByRole("button", { name: "Add plan" }));
    expect(await within(dialog).findByText("Give it a name")).toBeInTheDocument();
    expect(within(dialog).getByText("Above ₹0")).toBeInTheDocument();
    await user.type(within(dialog).getByRole("textbox", { name: "Name" }), "5 hours");
    const price = within(dialog).getByRole("textbox", { name: "Price" });
    await user.type(price, "3200");
    await user.tab();
    await user.click(within(dialog).getByRole("button", { name: "Add plan" }));
    expect(await screen.findByText("5 hours added")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retire 25 hours" }));
    expect(await screen.findByText("25 hours retired")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Put back on sale 25 hours" })).toBeInTheDocument();
  });

  it("a manager without settings can't change plans, and is told why", async () => {
    renderApp("#/desk/members/plans", { memberId: TEAM_IDS.manager });
    const add = await screen.findByRole("button", { name: "New plan" });
    expect(add).toHaveAttribute("aria-disabled", "true");
    expect(add).toHaveAccessibleDescription("Manager can't change settings. Ask an admin.");
  });

  it("a coach doesn't have members in their role", async () => {
    renderApp("#/desk/members", { memberId: TEAM_IDS.coach });
    expect(await screen.findByText("Members isn't part of your role")).toBeInTheDocument();
  });
});
