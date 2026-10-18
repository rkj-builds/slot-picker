import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axeViolations, renderApp } from "@/app/test-utils";
import { TEAM_IDS } from "@/data/mock/seed";
import { seedCustomers } from "@/lib/seed";
import { STATE_VERSION } from "@/lib/store";
import { DEFAULT_SETTINGS } from "@/lib/venue";

const nameOf = (state: { customers: { id: string; name: string }[] }, id: string): string => {
  const found = state.customers.find((c) => c.id === id);
  if (!found) throw new Error(`no ${id} in the seed`);
  return found.name;
};

async function payments(): Promise<HTMLElement> {
  return screen.findByRole("table", { name: "Payments" });
}

describe("#/desk/money: payments", () => {
  it("opens on the summary and the last 7 days, grouped by day, and passes axe", async () => {
    renderApp("#/desk/money");
    expect(await screen.findByRole("heading", { level: 1, name: "Payments" })).toBeInTheDocument();
    const summary = screen.getByRole("region", { name: "Summary" });
    expect(await within(summary).findByRole("link", { name: /^Collected, last 7 days ₹/ })).toHaveAttribute("href", "#/desk/money");
    expect(within(summary).getByRole("link", { name: /^Still owed ₹/ })).toHaveAttribute("href", "#/desk/money/dues");
    expect(within(summary).getByRole("link", { name: /^Credit held for customers ₹/ })).toHaveAttribute("href", "#/desk/money/credits");
    expect(within(summary).getByRole("link", { name: /^Waiting for approval \d+/ }).getAttribute("href")).toMatch(/approval=waiting/);
    expect(within(screen.getByRole("navigation", { name: "Money views" })).getByRole("link", { name: "Payments", current: "page" })).toBeInTheDocument();
    const table = await payments();
    expect(within(table).getByText("Thu, 15 Oct")).toBeInTheDocument();
    expect(within(table).getAllByRole("link").some((a) => a.getAttribute("href")?.startsWith("#/desk/bookings/"))).toBe(true);
    expect(await axeViolations()).toEqual([]);
  });

  it("filters from the URL as removable chips, and a chip's × takes it off", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/money?method=cash");
    const table = await payments();
    const methods = within(table).getAllByText(/^(Cash|Online|Refund|To credit|From credit)$/);
    expect(methods.every((m) => m.textContent === "Cash")).toBe(true);
    await user.click(screen.getByRole("button", { name: "Remove filter: Method is Cash" }));
    await waitFor(() => expect(window.location.hash).toBe("#/desk/money"));
    expect(within(await payments()).getAllByText("Online").length).toBeGreaterThan(0);
  });

  it("filters from the Filters popover and searches by customer", async () => {
    const user = userEvent.setup();
    const { state } = renderApp("#/desk/money");
    await payments();
    await user.click(screen.getByRole("button", { name: "Filters" }));
    await user.click(await screen.findByRole("checkbox", { name: "Online" }));
    await waitFor(() => expect(window.location.hash).toBe("#/desk/money?method=online"));
    expect(screen.getByRole("button", { name: /^Filters.*1 on$/ })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    const someone = nameOf(state, "cus_05");
    await user.type(screen.getByRole("searchbox", { name: "Search by customer" }), someone);
    await waitFor(async () => {
      const lines = within(await payments()).getAllByRole("row").slice(1).filter((r) => r.getAttribute("data-slot") !== "day-row");
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.every((r) => r.textContent?.includes(someone))).toBe(true);
    });
  });

  it("approves the desk's cash in bulk, and the queue empties", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/money?approval=waiting");
    const table = await payments();
    expect(screen.getByText(/waiting for approval\. Tick them once the cash is in the drawer/)).toBeInTheDocument();
    await user.click(within(table).getByRole("checkbox", { name: "Select every waiting payment shown" }));
    const bar = screen.getByRole("region", { name: "Selected payments" });
    const approve = within(bar).getByRole("button", { name: /^Approve \d+ payments?$/ });
    const count = Number(/\d+/.exec(approve.textContent ?? "")?.[0]);
    expect(count).toBeGreaterThan(0);
    expect(await axeViolations()).toEqual([]);
    await user.click(approve);
    expect(await screen.findByText(`${count} ${count === 1 ? "payment" : "payments"} approved`)).toBeInTheDocument();
    expect(await screen.findByText("Nothing matches")).toBeInTheDocument();
    expect(await within(screen.getByRole("region", { name: "Summary" })).findByRole("link", { name: /^Waiting for approval 0 All cash checked/ })).toBeInTheDocument();
  });

  it("lets the front desk tick lines but not approve them, and says who can", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/money?approval=waiting", { memberId: TEAM_IDS.desk });
    const table = await payments();
    expect(await screen.findByText(/Only an admin or a manager can approve payments\./)).toBeInTheDocument();
    const [first] = within(table).getAllByRole("checkbox", { name: /^Select ₹/ });
    if (!first) throw new Error("no waiting line");
    await user.click(first);
    const bar = screen.getByRole("region", { name: "Selected payments" });
    expect(within(bar).getByRole("button", { name: "Approve 1 payment" })).toBeDisabled();
    expect(within(bar).getByText("Only an admin or a manager can approve payments.")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("says so when a range has no payments, and offers this month", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/money?from=2026-01-01&to=2026-01-02");
    expect(await screen.findByText("No payments in these dates")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show this month" }));
    await waitFor(() => expect(window.location.hash).toBe("#/desk/money?from=2026-10-01&to=2026-10-15"));
    expect(await payments()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Export CSV" }));
  });

  it("shows a failed read with Try again, which works", async () => {
    const user = userEvent.setup();
    renderApp("#/primitives");
    await user.click(await screen.findByRole("button", { name: /^A money read fails/ }));
    expect(await screen.findByText("Couldn't load payments")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
    await user.click(screen.getAllByRole("button", { name: "Try again" })[0]!);
    expect(await payments()).toBeInTheDocument();
  });
});

async function openDues(hash: string): Promise<{ name: string; list: HTMLElement }> {
  const { state } = renderApp(hash);
  const name = nameOf(state, "cus_12");
  const list = await screen.findByRole("list", { name: `What ${name} owes` });
  return { name, list };
}

describe("#/desk/money/dues", () => {
  it("opens one customer who owes for bookings and a programme, and passes axe", async () => {
    const { list } = await openDues("#/desk/money/dues?open=mixed");
    expect(within(list).getAllByText("Booking").length).toBe(2);
    expect(within(list).getByText("Programme")).toBeInTheDocument();
    expect(within(list).getByRole("link", { name: "Adult beginners" })).toHaveAttribute("href", "#/desk/programmes/prg_beginners");
    expect(await axeViolations()).toEqual([]);
  });

  it("takes part of a programme's balance, refusing more than is due on the field", async () => {
    const user = userEvent.setup();
    const { name, list } = await openDues("#/desk/money/dues?open=cus_12");
    await user.click(within(list).getByRole("button", { name: "Take payment for Adult beginners" }));
    const dialog = await screen.findByRole("dialog", { name: "Take payment" });
    const amount = within(dialog).getByRole("textbox", { name: "Amount" });
    expect(amount).toHaveValue("₹3,600");
    expect(await axeViolations()).toEqual([]);
    await user.clear(amount);
    await user.type(amount, "5000");
    await user.click(within(dialog).getByRole("button", { name: "Record ₹5,000" }));
    expect(await within(dialog).findByText("That's more than the ₹3,600 still due.")).toBeInTheDocument();
    expect(amount).toHaveAttribute("aria-invalid", "true");
    await user.clear(amount);
    await user.type(amount, "1000");
    await user.click(within(dialog).getByRole("radio", { name: "Online" }));
    await user.click(within(dialog).getByRole("button", { name: "Record ₹1,000" }));
    expect(await screen.findByText(`₹1,000 recorded for ${name}`)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Take payment" })).toBeNull());
    expect(await within(screen.getByRole("list", { name: `What ${name} owes` })).findByText("₹2,600")).toBeInTheDocument();
  });

  it("sends a booking reminder once an hour, and says when the next can go", async () => {
    const user = userEvent.setup();
    const { name, list } = await openDues("#/desk/money/dues?open=cus_12");
    const [remind] = within(list).getAllByRole("button", { name: "Send reminder" });
    if (!remind) throw new Error("no booking due");
    await user.click(remind);
    expect(await screen.findByText(`Reminder sent to ${name}`)).toBeInTheDocument();
    await user.click(remind);
    expect(await screen.findByText("Reminder not sent")).toBeInTheDocument();
    expect(screen.getByText(/A reminder went less than an hour ago\. You can send another at 11:00 am\./)).toBeInTheDocument();
  });

  it("sorts by age from the URL", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/money/dues");
    await user.click(await screen.findByRole("radio", { name: "Oldest first" }));
    await waitFor(() => expect(window.location.hash).toBe("#/desk/money/dues?sort=age"));
    const ages = screen.getAllByText(/^(Owed since .*|Due today)$/).map((el) => el.textContent ?? "");
    const days = ages.map((t) => Number(/· (\d+) days?/.exec(t)?.[1] ?? 0));
    expect(days).toEqual([...days].sort((a, b) => b - a));
  });
});

describe("#/desk/money/credits", () => {
  it("adds goodwill credit with a reason, and refuses a payout above the balance as you type", async () => {
    const user = userEvent.setup();
    const { state } = renderApp("#/desk/money/credits");
    const name = nameOf(state, "cus_14");
    await user.click(await screen.findByRole("button", { name: new RegExp(`^${name}`) }));
    expect(await screen.findByRole("list", { name: `Where ${name}'s credit came from` })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Adjust credit" }));
    const dialog = await screen.findByRole("dialog", { name: "Adjust credit" });
    await user.click(within(dialog).getByRole("radio", { name: /Pay out as cash/ }));
    await user.type(within(dialog).getByRole("textbox", { name: "Amount" }), "99999");
    expect(await within(dialog).findByText(`${name} only has ₹1,800 of credit.`)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Pay out ₹99,999" })).toBeDisabled();
    expect(await axeViolations()).toEqual([]);

    await user.click(within(dialog).getByRole("radio", { name: /Add credit as goodwill/ }));
    await user.clear(within(dialog).getByRole("textbox", { name: "Amount" }));
    await user.type(within(dialog).getByRole("textbox", { name: "Amount" }), "500");
    await user.click(within(dialog).getByRole("button", { name: "Add ₹500 credit" }));
    expect(await within(dialog).findByText("Say why, for the accounts.")).toBeInTheDocument();
    await user.type(within(dialog).getByRole("textbox", { name: "Reason" }), "Floodlights failed mid-game");
    await user.click(within(dialog).getByRole("button", { name: "Add ₹500 credit" }));
    expect(await screen.findByText(`₹500 credit added for ${name}`)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: new RegExp(`^${name}.*₹2,300$`) })).toBeInTheDocument();
  });

  it("opens the payout check straight from its demo link", async () => {
    renderApp("#/desk/money/credits?adjust=largest&payout=50000");
    const dialog = await screen.findByRole("dialog", { name: "Adjust credit" });
    expect(within(dialog).getByText(/only has ₹[\d,]+ of credit\./)).toBeInTheDocument();
  });

  it("keeps adjusting for managers: the front desk sees why", async () => {
    renderApp("#/desk/money/credits", { memberId: TEAM_IDS.desk });
    expect(await screen.findByText("Only an admin or a manager can add or pay out credit.")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("says so when nobody holds credit", async () => {
    const empty = { version: STATE_VERSION, seededOn: "2026-10-15" as const, settings: DEFAULT_SETTINGS, customers: seedCustomers(0), bookings: [], recurringBlocks: [] };
    renderApp("#/desk/money/credits", { state: empty });
    expect(await screen.findByText("No one holds credit")).toBeInTheDocument();
  });

  it("is not part of a coach's role", async () => {
    renderApp("#/desk/money/credits", { memberId: TEAM_IDS.coach });
    expect(await screen.findByText("Payments isn't part of your role")).toBeInTheDocument();
  });
});

describe("#/desk/money on a phone", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("stacks each line under its day and puts the filters in a drawer with a count", async () => {
    const user = userEvent.setup();
    // Match max-width queries as a 390px screen would.
    const phone = (query: string): MediaQueryList =>
      ({ matches: query.includes('max-width'), media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false }) as MediaQueryList;
    vi.stubGlobal("matchMedia", phone);
    renderApp("#/desk/money?kind=in");
    expect(await screen.findByRole("heading", { level: 3, name: "Thu, 15 Oct" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Payments" })).toBeNull();
    expect(screen.queryByRole("list", { name: "Filters on" })).toBeNull();
    await user.click(screen.getByRole("button", { name: /^Filters.*1 on$/ }));
    const drawer = await screen.findByRole("dialog", { name: "Filters" });
    expect(within(drawer).getByRole("checkbox", { name: "Money in" })).toBeChecked();
    expect(await axeViolations()).toEqual([]);
    await user.click(within(drawer).getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(window.location.hash).toBe("#/desk/money"));
  });
});
