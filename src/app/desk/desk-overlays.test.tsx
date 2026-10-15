import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axeViolations, renderApp } from "@/app/test-utils";
import type { Booking } from "@/lib/booking";
import { seedCustomers } from "@/lib/seed";
import { type AppState, STATE_VERSION } from "@/lib/store";
import { DEFAULT_SETTINGS } from "@/lib/venue";

const customers = seedCustomers(0);
const diya = customers.find((c) => c.name === "Diya Patel")!;

function booking(overrides: Partial<Booking> = {}): Booking {
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

describe("desk command palette", () => {
  it("opens with Ctrl+K, finds a customer and opens their bookings", async () => {
    const user = userEvent.setup();
    renderApp("#/desk", { state: stateWith([booking()]) });
    await screen.findByRole("group", { name: "Courts by half hour" });
    await user.keyboard("{Control>}k{/Control}");
    const palette = await screen.findByRole("dialog", { name: "Search and jump" });
    expect(await axeViolations()).toEqual([]);
    await user.type(within(palette).getByRole("combobox", { name: "Search the desk" }), "diya");
    await user.click(await within(palette).findByRole("option", { name: /^Diya Patel\s*\+91/ }));
    await waitFor(() => expect(window.location.hash).toBe("#/desk/bookings?q=Diya+Patel"));
    expect(await screen.findByRole("combobox", { name: "Search" })).toHaveValue("Diya Patel");
    expect(screen.queryByRole("dialog", { name: "Search and jump" })).toBeNull();
  });

  it("jumps to a date with the keyboard and opens a booking from search", async () => {
    const user = userEvent.setup();
    renderApp("#/desk", { state: stateWith([booking()]) });
    // The header and the sidebar footer both open it.
    await user.click((await screen.findAllByRole("button", { name: "Search and jump" }))[0]!);
    const palette = await screen.findByRole("dialog", { name: "Search and jump" });
    await user.keyboard("tomorrow{Enter}");
    await waitFor(() => expect(window.location.hash).toBe("#/desk?date=2026-10-16"));

    await user.keyboard("{Control>}k{/Control}");
    await screen.findByRole("dialog", { name: "Search and jump" });
    await user.keyboard("Court 2");
    await user.click(await screen.findByRole("option", { name: /Diya Patel · Thu, 15 Oct, 7:00 – 8:00 pm/ }));
    expect(await screen.findByRole("dialog", { name: "Diya Patel" })).toBeInTheDocument();
    expect(palette).not.toBeInTheDocument();
  });
});

describe("desk date picker", () => {
  it("picks a day from the calendar in the date group", async () => {
    const user = userEvent.setup();
    renderApp("#/desk", { state: stateWith([booking()]) });
    const day = await screen.findByRole("group", { name: "Day" });
    expect(within(day).getByRole("button", { name: "Today" })).toBeDisabled();
    await user.click(within(day).getByRole("button", { name: /^Choose a date, Thursday, 15 October 2026/ }));
    const calendar = await screen.findByRole("dialog");
    expect(await axeViolations()).toEqual([]);
    await user.click(within(calendar).getByRole("button", { name: /20 October 2026/ }));
    await waitFor(() => expect(window.location.hash).toBe("#/desk?date=2026-10-20"));
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(within(screen.getByRole("group", { name: "Day" })).getByRole("button", { name: "Today" }));
    await waitFor(() => expect(window.location.hash).toBe("#/desk"));
  });
});

describe("booking context menu", () => {
  it("right-click a booking for the panel's actions", async () => {
    const user = userEvent.setup();
    renderApp("#/desk", { state: stateWith([booking()]) });
    const block = await screen.findByRole("button", { name: /Diya Patel, Part-paid/ });
    fireEvent.contextMenu(block);
    const menu = await screen.findByRole("menu");
    expect(within(menu).getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["Open", "Record cash", "Copy payment link", "Mark no-show", "Cancel booking"]);
    expect(within(menu).getByRole("menuitemcheckbox", { name: "Pay first" })).not.toBeChecked();
    expect(await axeViolations({ popupOpen: true })).toEqual([]);
    await user.click(within(menu).getByRole("menuitem", { name: "Mark no-show" }));
    expect(await screen.findByText("Marked as a no-show")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Diya Patel, No-show/ })).toBeInTheDocument();
  });

  it("flags the customer pay-first from the menu, and opens record cash", async () => {
    const user = userEvent.setup();
    renderApp("#/desk", { state: stateWith([booking()]) });
    fireEvent.contextMenu(await screen.findByRole("button", { name: /Diya Patel, Part-paid/ }));
    await user.click(within(await screen.findByRole("menu")).getByRole("menuitemcheckbox", { name: "Pay first" }));
    expect(await screen.findByText("Diya Patel pays first from now on")).toBeInTheDocument();
    // A switch item keeps the menu open; Escape closes it.
    await user.keyboard("{Escape}");

    fireEvent.contextMenu(screen.getByRole("button", { name: /Diya Patel, Part-paid/ }));
    await user.click(within(await screen.findByRole("menu")).getByRole("menuitem", { name: "Record cash" }));
    expect(await screen.findByRole("dialog", { name: "Record cash" })).toBeInTheDocument();
  });
});

describe("customer preview and message", () => {
  it("hovering a customer's name shows their history", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/bookings", {
      state: stateWith([
        booking(),
        booking({ id: "bk_old", date: "2026-10-10", status: "no-show", ledger: [] }),
        booking({ id: "bk_next", date: "2026-10-18", ledger: [] }),
      ]),
    });
    const names = await screen.findAllByRole("button", { name: "Diya Patel" });
    await user.hover(names[0]!);
    const card = await screen.findByText("Paid ahead online");
    const popup = card.closest("[data-slot=customer-preview]")!;
    expect(within(popup).getByText("+91 90000 00101")).toBeInTheDocument();
    expect(popup.textContent).toContain("Bookings3");
    expect(popup.textContent).toContain("No-shows1");
    expect(popup.textContent).toContain("Last played Sat, 10 Oct, next booked Thu, 15 Oct.");
    expect(await axeViolations({ popupOpen: true })).toEqual([]);
  });

  it("queues a WhatsApp message from the booking panel (demo)", async () => {
    const user = userEvent.setup();
    renderApp("#/desk", { state: stateWith([booking()]) });
    await user.click(await screen.findByRole("button", { name: /Diya Patel, Part-paid/ }));
    const sheet = await screen.findByRole("dialog", { name: "Diya Patel" });
    const send = within(sheet).getByRole("button", { name: "Send on WhatsApp" });
    expect(send).toBeDisabled();
    await user.click(within(sheet).getByRole("button", { name: "Payment link" }));
    expect(within(sheet).getByRole("textbox", { name: "Message to Diya Patel" })).toHaveValue(
      "Hi Diya, ₹400 is due for Court 2, Thu, 15 Oct · 7:00 – 8:00 pm. Pay here: https://pay.example.com/bk_test",
    );
    await user.click(send);
    expect(await screen.findByText("Message queued (demo)")).toBeInTheDocument();
    expect(within(sheet).getByRole("textbox", { name: "Message to Diya Patel" })).toHaveValue("");
    expect(await axeViolations()).toEqual([]);
  });
});

describe("desk sidebar", () => {
  it("marks the current view and keeps the date when switching views", async () => {
    const user = userEvent.setup();
    renderApp("#/desk?date=2026-10-17", { state: stateWith([booking()]) });
    const nav = await screen.findByRole("navigation", { name: "Desk" });
    expect(within(nav).getByRole("link", { name: "Day" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Bookings" })).toHaveAttribute("href", "#/desk/bookings?date=2026-10-17");
    await user.click(within(nav).getByRole("link", { name: "Insights" }));
    await waitFor(() => expect(within(screen.getByRole("navigation", { name: "Desk" })).getByRole("link", { name: "Insights" })).toHaveAttribute("aria-current", "page"));
    expect(await axeViolations()).toEqual([]);
  });
});
