import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axeViolations, renderApp, enterDemoCode } from "@/app/test-utils";
import { seedCustomers } from "@/lib/seed";
import { STATE_VERSION } from "@/lib/store";
import { instantAt } from "@/lib/time-zone";
import { DEFAULT_SETTINGS } from "@/lib/venue";

const NOW = instantAt("2026-10-15", 10 * 60, "Asia/Kolkata");
const empty = { version: STATE_VERSION, seededOn: "2026-10-15" as const, settings: DEFAULT_SETTINGS, customers: seedCustomers(0), bookings: [], recurringBlocks: [] };

describe("#/book accessibility", () => {
  it("every step, the checkout and the cancel dialog pass axe", async () => {
    const user = userEvent.setup();
    renderApp("#/book", { state: empty, now: NOW, scenarios: { weekend: true } });

    await screen.findByRole("heading", { level: 1, name: "Pick a court" });
    expect(await axeViolations()).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { level: 1, name: "Pick a time" });
    expect(await axeViolations()).toEqual([]);

    await user.click(screen.getByRole("radio", { name: "7:00 pm" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { level: 1, name: "Your details" });
    await user.click(screen.getByRole("button", { name: "Hold this court" }));
    // With errors showing.
    expect(await axeViolations()).toEqual([]);

    await user.type(screen.getByRole("textbox", { name: "Name" }), "Kavya Menon");
    await user.type(screen.getByRole("textbox", { name: "Mobile number" }), "9800000001");
    await user.click(screen.getByRole("button", { name: "Hold this court" }));
    // The WhatsApp code step, before the code is typed.
    await screen.findByRole("textbox", { name: /^Code sent to/ });
    expect(await axeViolations()).toEqual([]);
    await enterDemoCode(user);
    await screen.findByRole("heading", { level: 1, name: "Hold and pay" });
    expect(await axeViolations()).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Pay ₹400" }));
    const dialog = await screen.findByRole("dialog", { name: "Checkout" });
    expect(await axeViolations()).toEqual([]);
    await user.click(within(dialog).getByRole("button", { name: "Pay ₹400" }));

    await screen.findByRole("heading", { level: 1, name: "You are booked" });
    expect(await axeViolations()).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Cancel booking" }));
    const confirm = await screen.findByRole("alertdialog");
    expect(await axeViolations()).toEqual([]);
    // Credit is the default; the refund option says how long it takes.
    expect(within(confirm).getByRole("radio", { name: /Keep ₹400 as credit/ })).toBeChecked();
    await user.click(within(confirm).getByRole("button", { name: "Cancel booking" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Booking cancelled" })).toBeInTheDocument();
    expect(screen.getByText(/₹400 is now credit on your number/)).toBeInTheDocument();
  });

  it("the focus moves to each step's heading", async () => {
    const user = userEvent.setup();
    renderApp("#/book", { state: empty, now: NOW });
    await screen.findByRole("heading", { level: 1, name: "Pick a court" });
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Pick a time" })).toHaveFocus();
  });
});
