import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axeViolations, goToHash, renderApp } from "@/app/test-utils";
import { TEAM_IDS } from "@/data/mock/seed";
import type { Booking } from "@/lib/booking";
import { seedCustomers } from "@/lib/seed";
import { type AppState, STATE_VERSION } from "@/lib/store";
import { DEFAULT_SETTINGS } from "@/lib/venue";

const downloads = vi.hoisted(() => [] as { filename: string; text: string }[]);
vi.mock("@/lib/csv", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/csv")>()),
  downloadText: (filename: string, text: string) => downloads.push({ filename, text }),
}));

const customers = seedCustomers(0);

function booking(id: string, overrides: Partial<Booking> = {}): Booking {
  return {
    id,
    courtId: "court-2",
    date: "2026-10-15",
    startMinute: 19 * 60,
    durationMinutes: 60,
    customerId: "cus_02",
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
    ledger: [{ id: `${id}-le`, at: 0, kind: "online", amountPaise: 40_000, note: "Deposit by UPI" }],
    ...overrides,
  };
}

/** TEST_NOW is Thu 15 Oct, 10 am. Diya tonight (₹400 due), Kabir tomorrow at the desk (₹800 due), Meera yesterday (paid). */
const ROWS = [
  booking("bk_diya"),
  booking("bk_kabir", { date: "2026-10-16", startMinute: 18 * 60, courtId: "court-1", customerId: "cus_05", source: "desk", payMode: "venue", ledger: [] }),
  booking("bk_meera", { date: "2026-10-14", customerId: "cus_06", ledger: [{ id: "m", at: 0, kind: "online", amountPaise: 80_000, note: "Paid in full by UPI" }] }),
];

function stateWith(bookings: Booking[] = ROWS): AppState {
  return { version: STATE_VERSION, seededOn: "2026-10-15", settings: DEFAULT_SETTINGS, customers: customers.map((c) => ({ ...c })), bookings, recurringBlocks: [] };
}

async function table(): Promise<HTMLElement> {
  return screen.findByRole("table", { name: "Bookings" });
}

describe("#/desk/bookings", () => {
  it("Upcoming groups rows by day, each name a link to the booking, and passes axe", async () => {
    renderApp("#/desk/bookings", { state: stateWith() });
    const t = await table();
    expect(within(t).getByRole("rowheader", { name: /^Today/ })).toHaveTextContent("Today · Thu, 15 Oct");
    expect(within(t).getByRole("rowheader", { name: /^Tomorrow/ })).toHaveTextContent("Tomorrow · Fri, 16 Oct");
    expect(within(t).getByRole("link", { name: "Diya Patel" })).toHaveAttribute("href", "#/desk/bookings/bk_diya");
    expect(within(t).queryByText("Meera Nair")).toBeNull();
    expect(screen.getByText("2 bookings · ₹1,600 · ₹1,200 still due")).toBeInTheDocument();
    const views = screen.getByRole("navigation", { name: "Booking views" });
    expect(within(views).getByRole("link", { name: "Upcoming" })).toHaveAttribute("aria-current", "page");
    expect(await axeViolations()).toEqual([]);
  });

  it("each status view is a URL", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/bookings", { state: stateWith() });
    await table();
    await user.click(within(screen.getByRole("navigation", { name: "Booking views" })).getByRole("link", { name: "Past" }));
    await waitFor(() => expect(window.location.hash).toBe("#/desk/bookings/past"));
    expect(await within(await table()).findByRole("link", { name: "Meera Nair" })).toBeInTheDocument();
    expect(within(await table()).queryByRole("link", { name: "Diya Patel" })).toBeNull();

    await goToHash("#/desk/bookings/payment-due");
    const due = await table();
    await waitFor(() => expect(within(due).getAllByRole("link").map((a) => a.textContent)).toEqual(["Diya Patel", "Kabir Singh"]));

    await goToHash("#/desk/bookings/cancelled");
    expect(await screen.findByText("No cancelled bookings")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("filters are chips kept in the URL: add one, change it, remove it, clear them", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/bookings", { state: stateWith() });
    await table();
    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.click(await screen.findByRole("menuitem", { name: "Court" }));
    const popup = await screen.findByRole("dialog");
    await user.click(within(popup).getByRole("checkbox", { name: "Court 1" }));
    await waitFor(() => expect(window.location.hash).toBe("#/desk/bookings?court=court-1"));
    expect(within(await table()).getAllByRole("link").map((a) => a.textContent)).toEqual(["Kabir Singh"]);
    await user.keyboard("{Escape}");

    const chip = screen.getByRole("group", { name: "Court filter" });
    expect(within(chip).getByRole("button", { name: "Court: Court 1. Change" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Filter/ })).toHaveTextContent("1");
    expect(await axeViolations()).toEqual([]);

    await user.click(within(chip).getByRole("button", { name: "Remove court filter" }));
    await waitFor(() => expect(window.location.hash).toBe("#/desk/bookings"));
    expect(within(await table()).getAllByRole("link")).toHaveLength(2);

    await goToHash("#/desk/bookings?via=self-serve&status=part-paid");
    expect(await screen.findByRole("group", { name: "Booked via filter" })).toBeInTheDocument();
    expect(within(await table()).getAllByRole("link").map((a) => a.textContent)).toEqual(["Diya Patel"]);
    await user.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() => expect(window.location.hash).toBe("#/desk/bookings"));
    expect(screen.queryByRole("group", { name: "Status filter" })).toBeNull();
  });

  it("the row menu is decided by the rules: unavailable actions stay, with their reason", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/bookings", { state: stateWith() });
    const t = await table();
    await user.click(within(t).getByRole("button", { name: "Actions for Diya Patel, Thu, 15 Oct 7:00 – 8:00 pm" }));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getAllByRole("menuitem").map((i) => i.querySelector("span > span")?.textContent ?? i.textContent)).toEqual([
      "Open booking",
      "Record payment",
      "Send reminder",
      "Move or edit",
      "Mark no-show",
      "Cancel booking",
    ]);
    expect(within(menu).getByRole("menuitem", { name: /^Mark no-show/ })).toHaveAttribute("aria-disabled", "true");
    expect(within(menu).getByText("Available once it starts at 7:00 pm.")).toBeInTheDocument();
    expect(await axeViolations({ popupOpen: true })).toEqual([]);
    await user.click(within(menu).getByRole("menuitem", { name: "Record payment" }));
    const dialog = await screen.findByRole("dialog", { name: "Record payment" });
    expect(within(dialog).getByRole("textbox", { name: "Amount" })).toHaveValue("₹400");
    await user.click(within(dialog).getByRole("button", { name: "Record ₹400" }));
    expect(await screen.findByText("₹400 recorded for Diya Patel")).toBeInTheDocument();
  });

  it("select rows for the bulk bar: record balances as paid in cash, and send reminders", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/bookings", { state: stateWith() });
    const t = await table();
    await user.click(within(t).getByRole("checkbox", { name: "Select all on this page" }));
    const bar = await screen.findByRole("region", { name: "Selected bookings" });
    expect(within(bar).getByText("2 selected")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);

    await user.click(within(bar).getByRole("button", { name: "Send reminders" }));
    expect(await screen.findByText("Reminders sent to 2 customers")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("region", { name: "Selected bookings" })).toBeNull());

    await user.click(within(await table()).getByRole("checkbox", { name: "Select Diya Patel, 7:00 – 8:00 pm" }));
    await user.click(within(await table()).getByRole("checkbox", { name: "Select Kabir Singh, 6:00 – 7:00 pm" }));
    await user.click(within(await screen.findByRole("region", { name: "Selected bookings" })).getByRole("button", { name: "Record as paid" }));
    const dialog = await screen.findByRole("dialog", { name: "Record as paid" });
    expect(within(dialog).getByText("2 bookings, ₹1,200 in all.")).toBeInTheDocument();
    expect(within(dialog).getByRole("radio", { name: /All in cash/ })).toBeChecked();
    await user.click(within(dialog).getByRole("button", { name: "Record ₹1,200" }));
    expect(await screen.findByText("₹1,200 recorded for 2 bookings")).toBeInTheDocument();
    expect(await screen.findByText("2 bookings · ₹1,600 · ₹0 still due")).toBeInTheDocument();
  });

  it("front desk can remind but not take money; the bulk button says why", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/bookings", { state: stateWith(), memberId: TEAM_IDS.desk });
    const t = await table();
    await user.click(within(t).getByRole("checkbox", { name: "Select Diya Patel, 7:00 – 8:00 pm" }));
    const bar = await screen.findByRole("region", { name: "Selected bookings" });
    const pay = within(bar).getByRole("button", { name: "Record as paid" });
    expect(pay).toHaveAttribute("aria-disabled", "true");
    expect(pay).toHaveAccessibleDescription("Your role can't take or record money. Ask an admin.");
    expect(within(bar).getByRole("button", { name: "Send reminders" })).toBeEnabled();
  });

  it("search keeps working, and the CSV has the filtered rows", async () => {
    const user = userEvent.setup();
    downloads.length = 0;
    renderApp("#/desk/bookings?q=kabir", { state: stateWith() });
    expect(within(await table()).getAllByRole("link").map((a) => a.textContent)).toEqual(["Kabir Singh"]);
    await user.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(downloads).toHaveLength(1);
    expect(downloads[0]!.filename).toBe("bookings-upcoming-2026-10-15-to-2026-12-14.csv");
    expect(downloads[0]!.text.split("\r\n")).toHaveLength(2);
    expect(downloads[0]!.text).toContain("Kabir Singh,+919000000104,Desk,Due at venue,800,0,800");
  });

  it("a failed load offers Try again", async () => {
    const user = userEvent.setup();
    renderApp("#/desk", { state: stateWith() });
    await screen.findByRole("heading", { level: 1, name: "Day" });
    await user.click(screen.getByRole("button", { name: "Demo scenarios" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Demo scenarios" })).getByRole("button", { name: "Fail the next request" }));
    await user.keyboard("{Escape}");
    await goToHash("#/desk/bookings/past");
    expect(await screen.findByText("Couldn't load bookings")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await table()).toBeInTheDocument();
  });

  it("on a phone, rows stack under their day and the row menu is a drawer", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }));
    const user = userEvent.setup();
    renderApp("#/desk/bookings", { state: stateWith() });
    expect(await screen.findByRole("heading", { level: 2, name: /^Today/ })).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Actions for Kabir Singh, Fri, 16 Oct 6:00 – 7:00 pm" }));
    const drawer = await screen.findByRole("dialog", { name: "Kabir Singh, Fri, 16 Oct 6:00 – 7:00 pm" });
    expect(within(drawer).getByRole("link", { name: "Open booking" })).toHaveAttribute("href", "#/desk/bookings/bk_kabir");
    expect(await axeViolations()).toEqual([]);
    vi.unstubAllGlobals();
  });
});
