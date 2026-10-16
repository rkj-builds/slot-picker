import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp, enterDemoCode } from "@/app/test-utils";
import { seedState } from "@/lib/seed";
import { STATE_VERSION } from "@/lib/store";
import { instantAt } from "@/lib/time-zone";
import { DEFAULT_SETTINGS } from "@/lib/venue";
import { seedCustomers } from "@/lib/seed";

// Thursday 15 Oct 2026, 10:00 AM. An empty venue, so every time is free.
const NOW = instantAt("2026-10-15", 10 * 60, "Asia/Kolkata");
const empty = { version: STATE_VERSION, seededOn: "2026-10-15" as const, settings: DEFAULT_SETTINGS, customers: seedCustomers(0), bookings: [] };

async function toDetails(user: ReturnType<typeof userEvent.setup>, time = "7:00 pm"): Promise<void> {
  await user.click(await screen.findByRole("button", { name: "Continue" }));
  await user.click(await screen.findByRole("radio", { name: time }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("heading", { level: 1, name: "Your details" });
}

async function fillDetails(user: ReturnType<typeof userEvent.setup>, name: string, phone: string): Promise<void> {
  await user.type(screen.getByRole("textbox", { name: "Name" }), name);
  await user.type(screen.getByRole("textbox", { name: "Mobile number" }), phone);
}

describe("booking flow", () => {
  it("weekday: hold, choose pay at the venue, confirm", async () => {
    const user = userEvent.setup();
    renderApp("#/book", { state: empty, now: NOW });
    await toDetails(user);
    await fillDetails(user, "Kavya Menon", "98000 00001");
    await user.click(screen.getByRole("button", { name: "Hold this court" }));
    await enterDemoCode(user);

    expect(await screen.findByRole("heading", { level: 1, name: "Hold and pay" })).toBeInTheDocument();
    expect(window.location.hash).toBe("#/book/pay");
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", "15 minutes left");
    await user.click(screen.getByRole("radio", { name: /Pay at the venue/ }));
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));

    expect(await screen.findByRole("heading", { level: 1, name: "You are booked" })).toBeInTheDocument();
    const breakdown = document.querySelector("[data-slot=paid-breakdown]");
    expect(breakdown?.textContent).toContain("Due at the venue₹800");
  });

  it("weekend: a 50% deposit through checkout, then the balance shows as due", async () => {
    const user = userEvent.setup();
    renderApp("#/book", { state: empty, now: NOW, scenarios: { weekend: true } });
    await toDetails(user);
    expect(within(screen.getByRole("region", { name: "Your booking" })).getByText("Sat, 17 Oct")).toBeInTheDocument();
    await fillDetails(user, "Kavya Menon", "9800000001");
    await user.click(screen.getByRole("button", { name: "Hold this court" }));
    await enterDemoCode(user);
    await screen.findByRole("heading", { level: 1, name: "Hold and pay" });

    // Weekend: no pay-at-venue option, deposit preselected.
    expect(screen.queryByRole("radio", { name: /Pay at the venue/ })).toBeNull();
    expect(screen.getByRole("radio", { name: /Pay a deposit/ })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Pay ₹400" }));
    const dialog = await screen.findByRole("dialog", { name: "Checkout" });
    expect(within(dialog).getByText("Demo · no real money")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Pay ₹400" }));

    expect(await screen.findByRole("heading", { level: 1, name: "You are booked" })).toBeInTheDocument();
    expect(document.querySelector("[data-slot=paid-breakdown]")?.textContent).toContain("Paid₹400Due at the venue₹400");
  });

  it("a declined payment keeps the checkout open with a retry that works", async () => {
    const user = userEvent.setup();
    renderApp("#/book", { state: empty, now: NOW, scenarios: { paymentFails: true } });
    await toDetails(user);
    await fillDetails(user, "Kavya Menon", "9800000001");
    await user.click(screen.getByRole("button", { name: "Hold this court" }));
    await enterDemoCode(user);
    await screen.findByRole("heading", { level: 1, name: "Hold and pay" });
    await user.click(screen.getByRole("radio", { name: /Pay in full/ }));
    await user.click(screen.getByRole("button", { name: "Pay ₹800" }));
    const dialog = await screen.findByRole("dialog", { name: "Checkout" });
    await user.click(within(dialog).getByRole("button", { name: "Pay ₹800" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("The payment did not go through");
    await user.click(within(dialog).getByRole("button", { name: "Try again ₹800" }));
    expect(await screen.findByRole("heading", { level: 1, name: "You are booked" })).toBeInTheDocument();
  });

  it("slot race: someone else takes the court mid-payment and the next free times are offered", async () => {
    const user = userEvent.setup();
    renderApp("#/book", { state: empty, now: NOW, scenarios: { slotRace: true } });
    await user.click(await screen.findByRole("radio", { name: /Court 2/ }));
    await toDetails(user);
    await fillDetails(user, "Kavya Menon", "9800000001");
    await user.click(screen.getByRole("button", { name: "Hold this court" }));
    await enterDemoCode(user);
    await screen.findByRole("heading", { level: 1, name: "Hold and pay" });
    await user.click(screen.getByRole("radio", { name: /Pay in full/ }));
    await user.click(screen.getByRole("button", { name: "Pay ₹800" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Checkout" })).getByRole("button", { name: "Pay ₹800" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Someone else got that court" })).toBeInTheDocument();
    const offers = within(screen.getByRole("list", { name: "Free times nearby" })).getAllByRole("button");
    // Court 1 is still free at the same time, so that is offered first among the nearest starts.
    expect(offers.map((b) => b.textContent)).toEqual(["6:30 pm · Court 1", "7:00 pm · Court 1", "7:30 pm · Court 1"]);
    await user.click(offers[1]!);
    expect(await screen.findByRole("heading", { level: 1, name: "Hold and pay" })).toBeInTheDocument();
  });

  it("a flagged customer is asked to pay in full, calmly", async () => {
    const user = userEvent.setup();
    renderApp("#/book", { state: empty, now: NOW, scenarios: { flagged: true } });
    await toDetails(user);
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Rohan Mehta");
    expect(await screen.findByText("This booking needs payment up front")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hold this court" }));
    await enterDemoCode(user);
    await screen.findByRole("heading", { level: 1, name: "Hold and pay" });
    expect(within(screen.getByRole("main")).queryAllByRole("radio")).toHaveLength(0);
    expect(screen.getByText("Pay in full")).toBeInTheDocument();
  });

  it("validates the phone number with a reason", async () => {
    const user = userEvent.setup();
    renderApp("#/book", { state: empty, now: NOW });
    await toDetails(user);
    await fillDetails(user, "Kavya", "12345");
    await user.click(screen.getByRole("button", { name: "Hold this court" }));
    expect(screen.getByText("That is too short. A mobile number has 10 digits.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Mobile number" })).toHaveFocus();
    expect(window.location.hash).toBe("#/book/you");
  });

  it("a deep link to a later step lands on the furthest reachable one", async () => {
    renderApp("#/book/pay", { state: seedState(NOW), now: NOW });
    await waitFor(() => expect(window.location.hash).toBe("#/book/when"));
    expect(screen.getByRole("heading", { level: 1, name: "Pick a time" })).toBeInTheDocument();
  });
});
