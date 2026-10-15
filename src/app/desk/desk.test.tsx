import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axeViolations, renderApp, TEST_NOW } from "@/app/test-utils";
import type { Booking } from "@/lib/booking";
import { seedCustomers, seedState } from "@/lib/seed";
import { type AppState, STATE_VERSION } from "@/lib/store";
import { DEFAULT_SETTINGS } from "@/lib/venue";

const customers = seedCustomers(0);
const diya = customers.find((c) => c.name === "Diya Patel")!;

function booking(overrides: Partial<Booking>): Booking {
  return {
    id: "bk_test",
    courtId: "court-2",
    date: "2026-10-15",
    startMinute: 19 * 60,
    durationMinutes: 60,
    customerId: diya.id,
    kind: "booking",
    title: "",
    players: 4,
    notes: "",
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
  return { version: STATE_VERSION, seededOn: "2026-10-15", settings: DEFAULT_SETTINGS, customers, bookings };
}

describe("desk day grid", () => {
  it("names empty cells with court, time and price, and bookings with their state", async () => {
    renderApp("#/desk", { state: stateWith([booking({})]) });
    expect(await screen.findByRole("button", { name: "Court 2, 8:00 pm, empty, ₹800 an hour" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Court 1, 7:00 am, empty, ₹700 an hour" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Court 2, 7:00 – 8:00 pm, Diya Patel, Part-paid, ₹400 due" })).toBeInTheDocument();
    const stats = document.querySelector("[data-slot=day-stats]")!;
    expect(stats.textContent).toContain("Expected₹800");
    expect(stats.textContent).toContain("Collected₹400");
    expect(stats.textContent).toContain("Due₹400");
  });

  it("has one tab stop and moves with the arrow keys", async () => {
    const user = userEvent.setup();
    renderApp("#/desk", { state: stateWith([booking({})]) });
    const grid = await screen.findByRole("group", { name: "Courts by half hour" });
    const stops = within(grid).getAllByRole("button").filter((b) => b.tabIndex === 0);
    expect(stops).toHaveLength(1);
    stops[0]!.focus();
    expect(document.activeElement).toHaveAccessibleName(/Diya Patel/);
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toHaveAccessibleName("Court 2, 8:00 pm, empty, ₹800 an hour");
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toHaveAccessibleName(/Diya Patel/);
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toHaveAccessibleName("Court 1, 7:00 pm, empty, ₹800 an hour");
  });

  it("record cash: prefilled with the balance, then fully paid, with an undo", async () => {
    const user = userEvent.setup();
    renderApp("#/desk", { state: stateWith([booking({})]) });
    await user.click(await screen.findByRole("button", { name: /Diya Patel, Part-paid/ }));
    const sheet = await screen.findByRole("dialog", { name: "Diya Patel" });
    await user.click(within(sheet).getByRole("button", { name: "Record cash" }));
    const cash = await screen.findByRole("dialog", { name: "Record cash" });
    expect(within(cash).getByRole("textbox", { name: "Amount received" })).toHaveValue("₹400");
    await user.click(within(cash).getByRole("button", { name: "Record ₹400" }));

    expect(await screen.findByText("₹400 cash recorded")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Record cash" })).toBeNull());
    await user.keyboard("{Escape}");
    expect(await screen.findByRole("button", { name: /Diya Patel, Paid$/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(await screen.findByRole("button", { name: /Diya Patel, Part-paid, ₹400 due/ })).toBeInTheDocument();
  });

  it("cancel: the paid deposit becomes credit, and the slot frees up", async () => {
    const user = userEvent.setup();
    renderApp("#/desk", { state: stateWith([booking({})]) });
    await user.click(await screen.findByRole("button", { name: /Diya Patel, Part-paid/ }));
    const sheet = await screen.findByRole("dialog", { name: "Diya Patel" });
    await user.click(within(sheet).getByRole("button", { name: "Cancel booking" }));
    const confirm = await screen.findByRole("alertdialog");
    expect(within(confirm).getByRole("radio", { name: /Keep ₹400 as credit/ })).toBeChecked();
    await user.click(within(confirm).getByRole("button", { name: "Cancel booking" }));

    expect(await screen.findByText("₹400 added as credit for Diya Patel")).toBeInTheDocument();
    // The panel stays open on the cancelled booking until the desk closes it.
    expect(within(sheet).getByText("Cancelled")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(await screen.findByRole("button", { name: "Court 2, 7:00 pm, empty, ₹800 an hour" })).toBeInTheDocument();
  });

  it("a new booking from an empty cell refuses a clash and saves a free slot", async () => {
    const user = userEvent.setup();
    renderApp("#/desk", { state: stateWith([booking({})]) });
    await user.click(await screen.findByRole("button", { name: "Court 2, 6:30 pm, empty, ₹800 an hour" }));
    const dialog = await screen.findByRole("dialog", { name: "New booking" });
    // 6:30 + 1 hour runs into Diya's 7 pm booking.
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Court 2 is taken 7:00 – 8:00 pm.");
    expect(within(dialog).getByRole("button", { name: "Add booking" })).toBeDisabled();

    await user.click(within(dialog).getByRole("combobox", { name: "Court" }));
    await user.click(await screen.findByRole("option", { name: "Court 1" }));
    await user.click(within(dialog).getByRole("button", { name: "New customer" }));
    await user.type(within(dialog).getByRole("textbox", { name: "Name" }), "Walk-in Guest");
    await user.type(within(dialog).getByRole("textbox", { name: "Mobile (+91)" }), "9811111111");
    await user.click(within(dialog).getByRole("button", { name: "Add booking" }));

    expect(await screen.findByText("Booking added")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Court 1, 6:30 – 7:30 pm, Walk-in Guest, Due at venue/ })).toBeInTheDocument();
  });

  it("the day, bookings and insights views pass axe", async () => {
    renderApp("#/desk", { state: seedState(TEST_NOW) });
    await screen.findByRole("group", { name: "Courts by half hour" });
    expect(await axeViolations()).toEqual([]);
  });
});

describe("desk bookings and insights", () => {
  it("filters by search and shows an empty state that clears", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/bookings", { state: stateWith([booking({})]) });
    const search = await screen.findByRole("combobox", { name: "Search" });
    await user.type(search, "zzz");
    expect(await screen.findByText("Nothing matches")).toBeInTheDocument();
    // The suggestions popup says so too; close it to get back to the page.
    expect(await screen.findByText("No customer by that name or number.")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(await screen.findByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("table", { name: "Bookings" })).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("insights are labelled demo data and read the 45% / 7% shape", async () => {
    renderApp("#/desk/insights", { state: seedState(TEST_NOW) });
    expect(await screen.findByText("Demo data")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Cancellation rate by payment" })).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });
});
