import { screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DEMO_STATES, PRESET_GROUPS } from "@/app/demo-states";
import { NO_SCENARIOS } from "@/app/store";
import { axeViolations, enterDemoCode, renderApp } from "@/app/test-utils";

/** Open #/primitives and press a state in its States index. */
async function jump(user: UserEvent, label: string): Promise<void> {
  renderApp("#/primitives");
  const index = await screen.findByRole("region", { name: "States" }).catch(() => screen.findByRole("heading", { name: "States", level: 2 }));
  expect(index).toBeInTheDocument();
  await user.click(await screen.findByRole("button", { name: new RegExp(`^${label}`) }));
}

describe("demo presets are off by default", () => {
  it("every preset starts off and the Demo control says so", async () => {
    expect(Object.values(NO_SCENARIOS).every((v) => !v)).toBe(true);
    renderApp("#/book");
    expect(await screen.findByRole("button", { name: "Demo scenarios" })).toBeInTheDocument();
    expect(screen.queryByText(/Demo: the code is/)).toBeNull();
  });

  it("every switch in the Demo control is a preset, grouped, and every state has a screen", () => {
    expect(PRESET_GROUPS.map((g) => g.group)).toEqual(["Booking", "Payment", "Desk", "System"]);
    const keys = PRESET_GROUPS.flatMap((g) => g.items.map((i) => i.key)).sort();
    expect(keys).toEqual(Object.keys(NO_SCENARIOS).sort());
    for (const s of DEMO_STATES) expect(s.hash).toMatch(/^#\//);
  });

  it("switching a preset on and off from the popover, and Turn all off", async () => {
    const user = userEvent.setup();
    renderApp("#/book/when");
    await screen.findByRole("heading", { level: 1, name: "Pick a time" });
    await user.click(await screen.findByRole("button", { name: "Demo scenarios" }));
    const popup = await screen.findByRole("dialog", { name: "Demo scenarios" });
    await user.click(within(popup).getByRole("switch", { name: "Closed today" }));
    expect(await within(document.querySelector("main")!).findByText("Closed today")).toBeInTheDocument();
    expect(await axeViolations({ popupOpen: true })).toEqual([]);
    await user.click(within(popup).getByRole("button", { name: "Turn all off" }));
    await waitFor(() => expect(within(document.querySelector("main")!).queryByText("Closed today")).toBeNull());
  });
});

describe("each preset shows its state", () => {
  it("weekend: step 2 opens on Saturday", async () => {
    renderApp("#/book/when", { scenarios: { weekend: true } });
    expect(await screen.findByRole("button", { name: /Choose a date, Saturday/ })).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("fully booked: no slots left today, with the next free day", async () => {
    renderApp("#/book/when", { scenarios: { fullyBooked: true } });
    expect(await screen.findByText("No slots left today")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Go to / })).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("closed today: the slot grid says so", async () => {
    renderApp("#/book/when", { scenarios: { closedToday: true } });
    expect(await screen.findByText("Closed today")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("pay-first customer: step 3 explains payment up front", async () => {
    const user = userEvent.setup();
    await jump(user, "Pay-first customer");
    expect(await screen.findByText("This booking needs payment up front")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("trusted regular: step 3 welcomes them back", async () => {
    const user = userEvent.setup();
    await jump(user, "Trusted regular");
    expect(await screen.findByText(/Welcome back, Aarav/)).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("code expires once: the right code is refused, then accepted", async () => {
    const user = userEvent.setup();
    await jump(user, "Code expired on the first try");
    await user.click(await screen.findByRole("button", { name: "Hold this court" }));
    expect(await screen.findByText(/Demo: the code is/)).toBeInTheDocument();
    await enterDemoCode(user);
    expect(await screen.findByText(/That code has expired/)).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
    await enterDemoCode(user);
    expect(await screen.findByRole("heading", { level: 1, name: "Hold and pay" })).toBeInTheDocument();
  });

  // Declined and slot-taken open on their outcome instead; see "payment outcomes open directly".
  it.each([
    ["Hold runs out", 1],
    ["Weekend: 50% or full", 0],
  ])("%s: the pay step with the court held", async (label, presets) => {
    const user = userEvent.setup();
    await jump(user, label);
    expect(await screen.findByRole("heading", { level: 1, name: "Hold and pay" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: presets ? `Demo scenarios, ${presets} on` : "Demo scenarios" })).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("booked and paid, then cancelled with credit", async () => {
    const user = userEvent.setup();
    await jump(user, "Cancelled, kept as credit");
    expect(await screen.findByRole("heading", { level: 1, name: "Booking cancelled" })).toBeInTheDocument();
    expect(screen.getByText(/is now credit on your number/)).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("back-to-back half hours fill the evening on both courts", async () => {
    renderApp("#/desk", { scenarios: { backToBack: true } });
    await screen.findByRole("group", { name: "Courts by half hour" });
    // No empty half hour is left between 5 and 9 pm on either court.
    for (const court of ["Court 1", "Court 2"]) {
      for (const time of ["5:00", "6:30", "8:30"]) expect(screen.queryByRole("button", { name: new RegExp(`^${court}, ${time} pm, empty`) })).toBeNull();
    }
    expect(screen.getAllByRole("button", { name: /, \d+:\d\d – \d+:\d\d pm, /u }).length).toBeGreaterThan(10);
    expect(await axeViolations()).toEqual([]);
  });

  it("long names reach the bookings table", async () => {
    renderApp("#/desk/bookings", { scenarios: { longNames: true } });
    expect((await screen.findAllByText(/Venkataraghavan-Subramaniam Chakraborty|Lakshminarayanan|Ramakrishnan/)).length).toBeGreaterThan(0);
    expect(await axeViolations()).toEqual([]);
  });

  it("empty venue: the day, the bookings list and insights each say so", async () => {
    renderApp("#/desk", { scenarios: { emptyVenue: true } });
    expect(await screen.findByText(/Nothing booked yet/)).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("empty venue: insights before any finished day", async () => {
    renderApp("#/desk/insights", { scenarios: { emptyVenue: true } });
    expect(await screen.findByText("No finished days yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to the day" })).toHaveAttribute("href", "#/desk");
    expect(await axeViolations()).toEqual([]);
  });

  it("slow network: the skeletons stay up", async () => {
    const user = userEvent.setup();
    renderApp("#/book/when");
    await screen.findByRole("heading", { level: 1, name: "Pick a time" });
    await user.click(screen.getByRole("button", { name: "Demo scenarios" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Demo scenarios" })).getByRole("switch", { name: "Slow network" }));
    expect(await screen.findByText("Loading courts and times")).toBeInTheDocument();
  });

  it("a failed load shows the error, and Try again recovers", async () => {
    const user = userEvent.setup();
    renderApp("#/desk");
    await screen.findByRole("heading", { level: 1, name: "Day" });
    await user.click(screen.getByRole("button", { name: "Demo scenarios" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Demo scenarios" })).getByRole("button", { name: "Fail the next load" }));
    expect(await screen.findByText("Could not reach the venue")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("group", { name: "Courts by half hour" })).toBeInTheDocument();
  });
});

describe("the repeating block on the desk", () => {
  it("shows the club hold on Saturday; skipping that date frees both courts", async () => {
    const user = userEvent.setup();
    renderApp("#/desk?date=2026-10-17");
    const blocks = await screen.findAllByRole("button", { name: /Off-Screen Club Juniors, Blocked, repeats Every Sat and Sun, 4 – 5 pm/ });
    expect(blocks).toHaveLength(2);
    expect(await axeViolations()).toEqual([]);
    await user.click(blocks[0]!);
    const dialog = await screen.findByRole("dialog", { name: "Off-Screen Club Juniors" });
    await user.click(within(dialog).getByRole("button", { name: /^Skip Sat, 17 Oct only/ }));
    await waitFor(() => expect(screen.queryAllByRole("button", { name: /Off-Screen Club Juniors/ })).toHaveLength(0));
    expect(await screen.findByText("Sat, 17 Oct skipped")).toBeInTheDocument();
  });

  it("customers cannot book a court the club holds", async () => {
    renderApp("#/book/when", { scenarios: { weekend: true } });
    expect(await screen.findByRole("radio", { name: "4:00 pm, booked" })).toHaveAttribute("aria-disabled", "true");
  });

  it("Block courts adds a repeating block from the Repeat editor", async () => {
    const user = userEvent.setup();
    renderApp("#/desk?date=2026-10-19&block=1");
    const dialog = await screen.findByRole("dialog", { name: "Block courts" });
    await user.type(within(dialog).getByRole("textbox", { name: "What for" }), "Juniors batch B");
    await user.click(within(dialog).getByRole("button", { name: "Wednesday" }));
    expect(within(dialog).getByText("Every Mon and Wed, 4 – 5 pm")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
    await user.click(within(dialog).getByRole("button", { name: "Add repeating block" }));
    expect(await screen.findByText("Repeating block added")).toBeInTheDocument();
    // Where a booking already holds a court at 4 pm it stays (the dialog warned); the other court shows the block.
    expect((await screen.findAllByRole("button", { name: /Juniors batch B, Blocked, repeats Every Mon and Wed/ })).length).toBeGreaterThan(0);
  });
});

describe("payment outcomes open directly", () => {
  it("Payment declined: checkout opens on the declined attempt, and a retry books the court", async () => {
    const user = userEvent.setup();
    await jump(user, "Payment declined, then retry");
    const checkout = await screen.findByRole("dialog", { name: /Checkout/ }, { timeout: 8000 });
    expect(await within(checkout).findByText("The payment did not go through")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
    await user.click(within(checkout).getByRole("button", { name: /Try again/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "You are booked" }, { timeout: 8000 })).toBeInTheDocument();
  });

  it("Slot taken mid-payment: the pay step opens on the lost slot with free alternatives", async () => {
    const user = userEvent.setup();
    await jump(user, "Slot taken mid-payment");
    expect(await screen.findByRole("heading", { level: 1, name: "Someone else got that court" }, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByText("That slot is gone")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose another time" })).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });
});

describe("form states open directly", () => {
  it("Details with errors: step 3 shows each field's own error, with focus on the first", async () => {
    const user = userEvent.setup();
    await jump(user, "Details with errors");
    expect(await screen.findByRole("heading", { level: 1, name: "Your details" })).toBeInTheDocument();
    const name = await screen.findByRole("textbox", { name: "Name" });
    const phone = screen.getByRole("textbox", { name: "Mobile number" });
    expect(await screen.findByText("Tell us who is booking.")).toBeInTheDocument();
    expect(screen.getByText("That is too short. A mobile number has 10 digits.")).toBeInTheDocument();
    expect(phone).toHaveValue("98765");
    await waitFor(() => expect(name).toHaveAttribute("aria-invalid", "true"));
    expect(phone).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(name).toHaveFocus());
    expect(screen.getByRole("button", { name: "Hold this court" })).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
    // Fixing the name clears its error; the form still stops on the short number.
    await user.type(name, "Asha Rao");
    await waitFor(() => expect(screen.queryByText("Tell us who is booking.")).toBeNull());
    await user.click(screen.getByRole("button", { name: "Hold this court" }));
    expect(await screen.findByText("That is too short. A mobile number has 10 digits.")).toBeInTheDocument();
    await waitFor(() => expect(phone).toHaveFocus());
  });

  it("Settings with unsaved changes: the save bar says so, and Discard restores 50%", async () => {
    const user = userEvent.setup();
    await jump(user, "Settings with unsaved changes");
    const bar = await screen.findByRole("region", { name: "Save settings" });
    expect(await within(bar).findByText("Unsaved changes")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Deposit" })).toHaveValue("30%");
    expect(await axeViolations()).toEqual([]);
    await user.click(within(bar).getByRole("button", { name: "Discard" }));
    expect(await within(bar).findByText("All changes saved")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Deposit" })).toHaveValue("50%");
  });

  it("Settings with unsaved changes: Save keeps 30%, and Reset demo data puts the seed back", async () => {
    const user = userEvent.setup();
    await jump(user, "Settings with unsaved changes");
    const bar = await screen.findByRole("region", { name: "Save settings" });
    await user.click(within(bar).getByRole("button", { name: "Save settings" }));
    expect(await screen.findByText("Settings saved")).toBeInTheDocument();
    expect(await within(screen.getByRole("region", { name: "Save settings" })).findByText("All changes saved")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Deposit" })).toHaveValue("30%");
    await user.click(screen.getByRole("button", { name: "Demo scenarios" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Demo scenarios" })).getByRole("button", { name: "Reset demo data" }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Deposit" })).toHaveValue("50%"));
  });

  it("a jump onto the screen already open still lands on its state", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/settings");
    const bar = await screen.findByRole("region", { name: "Save settings" });
    expect(within(bar).getByText("All changes saved")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Demo scenarios" }));
    const popup = await screen.findByRole("dialog", { name: "Demo scenarios" });
    await user.click(within(popup).getByRole("tab", { name: "Jump to state" }));
    await user.click(await within(popup).findByRole("button", { name: /^Settings with unsaved changes/ }));
    expect(await within(screen.getByRole("region", { name: "Save settings" })).findByText("Unsaved changes")).toBeInTheDocument();
  });
});
