import { screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axeViolations, goToHash, renderApp } from "@/app/test-utils";
import { TEAM_IDS } from "@/data/mock/seed";
import type { Booking } from "@/lib/booking";
import { seedCustomers } from "@/lib/seed";
import { type AppState, STATE_VERSION } from "@/lib/store";
import { DEFAULT_SETTINGS } from "@/lib/venue";

const customers = seedCustomers(0);
const BADGE = "[data-slot=badge]";

/** Diya Patel, Court 2, Thu 15 Oct 7 – 8 pm, ₹800 with ₹400 paid. TEST_NOW is 10 am that day. */
function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "bk_diya",
    courtId: "court-2",
    date: "2026-10-15",
    startMinute: 19 * 60,
    durationMinutes: 60,
    customerId: "cus_02",
    kind: "booking",
    title: "",
    players: 4,
    notes: "Bringing her own paddles",
    source: "self-serve",
    status: "confirmed",
    payMode: "part",
    pricePaise: 80_000,
    holdExpiresAt: null,
    createdAt: 0,
    cancelledAt: null,
    ledger: [{ id: "le1", at: 0, kind: "online", amountPaise: 40_000, note: "Deposit by UPI" }],
    ...overrides,
  };
}

function stateWith(bookings: Booking[]): AppState {
  return { version: STATE_VERSION, seededOn: "2026-10-15", settings: DEFAULT_SETTINGS, customers: customers.map((c) => ({ ...c })), bookings, recurringBlocks: [] };
}

async function openPage(state: AppState = stateWith([booking()]), memberId?: string): Promise<void> {
  renderApp("#/desk/bookings/bk_diya", { state, memberId });
  await screen.findByRole("heading", { level: 1, name: "Diya Patel" });
  // The actions wait for the viewer.
  await screen.findByRole("button", { name: "More actions" });
}

async function more(user: UserEvent): Promise<HTMLElement> {
  await user.click(screen.getByRole("button", { name: "More actions" }));
  return screen.findByRole("menu");
}

describe("#/desk/bookings/<id>", () => {
  it("shows who, when, the money and what happened, and passes axe", async () => {
    await openPage();
    expect(screen.getByText("Thursday, 15 October 2026 · 7:00 – 8:00 pm · Court 2")).toBeInTheDocument();
    expect(screen.getByText("Confirmed", { selector: BADGE })).toBeInTheDocument();
    expect(screen.getByText("₹400 of ₹800 paid")).toBeInTheDocument();
    const payment = screen.getByRole("heading", { name: "Payment" }).closest<HTMLElement>("[data-slot=card]")!;
    expect(payment.textContent).toContain("Balance₹400");
    expect(within(payment).getByRole("list", { name: "Payment lines" })).toHaveTextContent("Paid online");
    expect(within(screen.getByRole("list", { name: "Activity" })).getByText("Booked online")).toBeInTheDocument();
    expect(screen.getByText("Bringing her own paddles")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("record payment: prefilled with the balance, refuses more, then the booking is paid", async () => {
    const user = userEvent.setup();
    await openPage();
    await user.click(screen.getByRole("button", { name: "Record payment" }));
    const dialog = await screen.findByRole("dialog", { name: "Record payment" });
    const amount = within(dialog).getByRole("textbox", { name: "Amount" });
    expect(amount).toHaveValue("₹400");
    expect(await axeViolations()).toEqual([]);

    await user.clear(amount);
    await user.type(amount, "500");
    await user.tab();
    expect(within(dialog).getByText("That's more than the ₹400 due.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Record payment" })).toBeDisabled();

    await user.clear(amount);
    await user.type(amount, "400");
    await user.tab();
    await user.click(within(dialog).getByRole("radio", { name: "Online (UPI)" }));
    await user.click(within(dialog).getByRole("button", { name: "Record ₹400" }));
    expect(await screen.findByText("₹400 recorded for Diya Patel")).toBeInTheDocument();
    expect(await screen.findByText("Paid", { selector: BADGE })).toBeInTheDocument();
    // Nothing left to record: the button stays reachable and says why.
    const again = screen.getByRole("button", { name: "Record payment" });
    expect(again).toHaveAttribute("aria-disabled", "true");
    expect(again).toHaveAccessibleDescription("Nothing is due.");
  });

  it("send reminder: the second within the hour is refused and says when the next can go", async () => {
    const user = userEvent.setup();
    await openPage();
    await user.click(screen.getByRole("button", { name: "Send reminder" }));
    expect(await screen.findByText("Reminder sent to Diya Patel")).toBeInTheDocument();
    expect(await screen.findByText(/^Sent Thu, 15 Oct/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send reminder" }));
    expect(await screen.findByText("Reminder not sent")).toBeInTheDocument();
    expect(screen.getByText("A reminder went less than an hour ago. The next can go at 11:00 am.")).toBeInTheDocument();
  });

  it("move: a clash shows inline and names who has the court; a new price needs a reason", async () => {
    const user = userEvent.setup();
    const kabir = booking({ id: "bk_kabir", courtId: "court-1", customerId: "cus_05", ledger: [] });
    await openPage(stateWith([booking(), kabir]));
    await user.click(screen.getByRole("button", { name: "Move or edit" }));
    const dialog = await screen.findByRole("dialog", { name: "Move or edit" });
    expect(within(dialog).getByRole("button", { name: "Save changes" })).toBeDisabled();
    await user.click(within(dialog).getByRole("combobox", { name: "Court" }));
    await user.click(await screen.findByRole("option", { name: "Court 1" }));
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Court 1 is taken then by Kabir Singh. Pick another court or time.");

    await user.click(within(dialog).getByRole("combobox", { name: "Court" }));
    await user.click(await screen.findByRole("option", { name: "Court 2" }));
    const price = within(dialog).getByRole("textbox", { name: "Price" });
    await user.clear(price);
    await user.type(price, "700");
    await user.tab();
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));
    expect(await within(dialog).findByText("Say why the price changed.")).toBeInTheDocument();
    await user.type(within(dialog).getByRole("textbox", { name: "Why the price changed" }), "Regular's discount");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Booking updated")).toBeInTheDocument();
    expect(await screen.findByText("Price changed to ₹700 · Regular's discount")).toBeInTheDocument();
  });

  it("cancel asks for a reason, keeps the deposit as credit, and Put back undoes it", async () => {
    const user = userEvent.setup();
    await openPage();
    await user.click(within(await more(user)).getByRole("menuitem", { name: "Cancel booking" }));
    const confirm = await screen.findByRole("alertdialog", { name: "Cancel booking?" });
    expect(within(confirm).getByRole("radio", { name: /Keep ₹400 as credit/ })).toBeChecked();
    expect(await axeViolations()).toEqual([]);
    await user.click(within(confirm).getByRole("button", { name: "Cancel booking" }));
    expect(within(confirm).getByText("Pick a reason.")).toBeInTheDocument();
    await user.click(within(confirm).getByRole("radio", { name: "Customer asked" }));
    await user.click(within(confirm).getByRole("button", { name: "Cancel booking" }));
    expect(await screen.findByText("₹400 kept as credit for Diya Patel")).toBeInTheDocument();
    expect(await screen.findByText("Cancelled", { selector: BADGE })).toBeInTheDocument();
    expect(screen.getByText("₹400 kept as credit")).toBeInTheDocument();

    await user.click(within(await more(user)).getByRole("menuitem", { name: "Put back" }));
    expect(await screen.findByText("Booking put back")).toBeInTheDocument();
    expect(await screen.findByText("Confirmed", { selector: BADGE })).toBeInTheDocument();
  });

  it("no-show waits for the start; check-in opens an hour before; both work after", async () => {
    const user = userEvent.setup();
    await openPage();
    const menu = await more(user);
    expect(within(menu).getByRole("menuitem", { name: /^Mark no-show/ })).toHaveAttribute("aria-disabled", "true");
    expect(within(menu).getByText("Available once it starts at 7:00 pm.")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Check in" })).toHaveAccessibleDescription("Check-in opens an hour before 7:00 pm.");
  });

  it("check in, with an undo, then the no-show asks for it to be undone", async () => {
    const user = userEvent.setup();
    // Earlier today: started, so check-in and no-show both apply.
    await openPage(stateWith([booking({ startMinute: 9 * 60 })]));
    await user.click(screen.getByRole("button", { name: "Check in" }));
    expect(await screen.findByText("Diya Patel checked in")).toBeInTheDocument();
    expect(await screen.findByText("Checked in", { selector: BADGE })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo check-in" })).toBeInTheDocument();
    const menu = await more(user);
    expect(within(menu).getByText("They checked in. Undo the check-in first.")).toBeInTheDocument();
  });

  it("front desk: money actions are disabled and say why", async () => {
    await openPage(undefined, TEAM_IDS.desk);
    const pay = screen.getByRole("button", { name: "Record payment" });
    expect(pay).toHaveAttribute("aria-disabled", "true");
    expect(pay).toHaveAccessibleDescription("Front desk can't take or record money. Ask an admin.");
    expect(screen.getByText(/Some actions need a manager or an admin/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move or edit" })).not.toHaveAttribute("aria-disabled");
    expect(await axeViolations()).toEqual([]);
  });

  it("a coach doesn't see bookings at all", async () => {
    renderApp("#/desk/bookings/bk_diya", { state: stateWith([booking()]), memberId: TEAM_IDS.coach });
    expect(await screen.findByText("Bookings isn't part of your role")).toBeInTheDocument();
  });

  it("a booking that isn't there says so, with the way back", async () => {
    renderApp("#/desk/bookings/bk_gone", { state: stateWith([booking()]) });
    expect(await screen.findByText("This booking isn't here")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to bookings" })).toHaveAttribute("href", "#/desk/bookings");
    expect(await axeViolations()).toEqual([]);
  });

  it("opens from the booking sheet on the day", async () => {
    const user = userEvent.setup();
    renderApp("#/desk", { state: stateWith([booking()]) });
    await user.click(await screen.findByRole("button", { name: /Diya Patel, Part-paid/ }));
    const sheet = await screen.findByRole("dialog", { name: "Diya Patel" });
    await user.click(within(sheet).getByRole("link", { name: "Open full page" }));
    await waitFor(() => expect(window.location.hash).toBe("#/desk/bookings/bk_diya"));
    expect(await screen.findByRole("heading", { level: 1, name: "Diya Patel" })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Diya Patel" })).toBeNull());
  });

  it("a failed load offers Try again, which works", async () => {
    const user = userEvent.setup();
    renderApp("#/desk", { state: stateWith([booking()]) });
    await screen.findByRole("heading", { level: 1, name: "Day" });
    await user.click(screen.getByRole("button", { name: "Demo scenarios" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Demo scenarios" })).getByRole("button", { name: "Fail the next request" }));
    await user.keyboard("{Escape}");
    await goToHash("#/desk/bookings/bk_diya");
    expect(await screen.findByText("Couldn't load this booking")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Diya Patel" })).toBeInTheDocument();
  });
});
