import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axeViolations, goToHash, renderApp, enterDemoCode } from "@/app/test-utils";
import { seedCustomers } from "@/lib/seed";
import { STATE_VERSION } from "@/lib/store";
import { DEFAULT_SETTINGS } from "@/lib/venue";

const empty = { version: STATE_VERSION, seededOn: "2026-10-15" as const, settings: DEFAULT_SETTINGS, customers: seedCustomers(0), bookings: [], recurringBlocks: [] };

describe("#/desk/settings", () => {
  it("passes axe", async () => {
    renderApp("#/desk/settings", { state: empty });
    await screen.findByRole("heading", { level: 1, name: "Settings" });
    expect(await axeViolations()).toEqual([]);
  });

  it("a 30% deposit saved on the desk is what the next customer is asked for", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/settings", { state: empty, scenarios: { weekend: true } });
    const deposit = await screen.findByRole("textbox", { name: "Deposit" });
    await user.clear(deposit);
    await user.type(deposit, "30%");
    await user.tab();
    expect(screen.getByText("A ₹800 hour: ₹240 now, ₹560 at the venue.")).toBeInTheDocument();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save settings" }));
    expect(await screen.findByText("Settings saved")).toBeInTheDocument();

    await goToHash("#/book");
    await user.click(await screen.findByRole("button", { name: "Continue" }));
    await user.click(await screen.findByRole("radio", { name: "7:00 pm" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(await screen.findByRole("textbox", { name: "Name" }), "Kavya Menon");
    await user.type(screen.getByRole("textbox", { name: "Mobile number" }), "9800000001");
    await user.click(screen.getByRole("button", { name: "Hold this court" }));
    await enterDemoCode(user);
    await screen.findByRole("heading", { level: 1, name: "Hold and pay" });
    expect(screen.getByRole("radio", { name: /Pay a deposit/ }).closest("label")).toHaveTextContent("₹240 now, ₹560 at the venue.");
    expect(screen.getByText(/held with a 30% deposit/)).toBeInTheDocument();
  });

  it("flags a customer pay-first from the list and removes them again", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/settings", { state: empty });
    const table = await screen.findByRole("table", { name: "Pay-first customers" });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    await user.click(within(table).getByRole("button", { name: "Remove Rohan Mehta" }));
    expect(await screen.findByText("Rohan Mehta can pay at the venue again")).toBeInTheDocument();
    expect(within(screen.getByRole("table", { name: "Pay-first customers" })).getAllByRole("row")).toHaveLength(2);
  });
});
