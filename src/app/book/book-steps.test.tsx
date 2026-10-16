import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axeViolations, enterDemoCode, renderApp } from "@/app/test-utils";
import { seedCustomers } from "@/lib/seed";
import { STATE_VERSION } from "@/lib/store";
import { instantAt } from "@/lib/time-zone";
import { DEFAULT_SETTINGS } from "@/lib/venue";

// Thursday 15 Oct 2026, 10:00 AM. An empty venue, so every time is free.
const NOW = instantAt("2026-10-15", 10 * 60, "Asia/Kolkata");
const empty = { version: STATE_VERSION, seededOn: "2026-10-15" as const, settings: DEFAULT_SETTINGS, customers: seedCustomers(0), bookings: [], recurringBlocks: [] };

async function toDetails(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(await screen.findByRole("button", { name: "Continue" }));
  await user.click(await screen.findByRole("radio", { name: "7:00 pm" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("heading", { level: 1, name: "Your details" });
  await user.type(screen.getByRole("textbox", { name: "Name" }), "Kavya Menon");
  await user.type(screen.getByRole("textbox", { name: "Mobile number" }), "9800000001");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the WhatsApp code on the details step", () => {
  it("sends a demo code, refuses a wrong one, accepts the right one, and asks only once", async () => {
    const user = userEvent.setup();
    renderApp("#/book", { state: empty, now: NOW });
    await toDetails(user);
    await user.click(screen.getByRole("button", { name: "Hold this court" }));

    expect(await screen.findByText("Demo code: 123456")).toBeInTheDocument();
    const first = await screen.findByRole("textbox", { name: "Code sent to +91 98000 00001" });
    await waitFor(() => expect(first).toHaveFocus());
    expect(screen.getAllByRole("textbox", { name: /^Character \d of 6$/ })).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Verify and hold" })).toBeInTheDocument();

    await enterDemoCode(user, "654321");
    expect(await screen.findByText("That code is not right. Check the latest message and try again.")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/book/you");

    await enterDemoCode(user);
    expect(await screen.findByRole("heading", { level: 1, name: "Hold and pay" })).toBeInTheDocument();

    // Back to the details: the number is verified for this visit, no second code.
    await user.click(screen.getByRole("button", { name: "Back" }));
    await screen.findByRole("heading", { level: 1, name: "Your details" });
    expect(screen.getByText("Verified")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hold this court" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Hold and pay" })).toBeInTheDocument();
  });

  it("a short code is not sent: the form asks for all six digits", async () => {
    const user = userEvent.setup();
    renderApp("#/book", { state: empty, now: NOW });
    await toDetails(user);
    await user.click(screen.getByRole("button", { name: "Hold this court" }));
    await enterDemoCode(user, "123");
    await user.click(screen.getByRole("button", { name: "Verify and hold" }));
    expect(await screen.findByText("Enter the 6-digit code.")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });
});

describe("the date picker on the When step", () => {
  it("opens a calendar bounded by the booking window and moves the slots to the picked day", async () => {
    const user = userEvent.setup();
    renderApp("#/book/when", { state: empty, now: NOW });
    await screen.findByRole("heading", { level: 1, name: "Pick a time" });
    expect(screen.getByRole("button", { name: /Previous day/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /^Choose a date, Thursday, 15 October 2026, Today/ }));
    const calendar = await screen.findByRole("dialog", { name: "Choose a date" });
    // The calendar loads on first open. The window is today plus 13 days: 28 October is the last bookable day.
    expect(await within(calendar).findByRole("button", { name: /28 October 2026/ }, { timeout: 5000 })).toBeEnabled();
    expect(within(calendar).getByRole("button", { name: /29 October 2026/ })).toBeDisabled();
    expect(within(calendar).getByRole("button", { name: /14 October 2026/ })).toBeDisabled();
    await user.click(within(calendar).getByRole("button", { name: /17 October 2026/ }));
    expect(await screen.findByRole("button", { name: /^Choose a date, Saturday, 17 October 2026/ })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "7:00 pm" }));
    const summary = screen.getByRole("region", { name: "Your booking" });
    expect(within(summary).getByText("Sat, 17 Oct")).toBeInTheDocument();
    expect(within(summary).getByText("7:00 – 8:00 pm")).toBeInTheDocument();
  });
});

describe("on a phone", () => {
  function phoneScreen(): void {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes('max-width'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }));
  }

  it("the order summary is a total that opens in a drawer", async () => {
    phoneScreen();
    const user = userEvent.setup();
    renderApp("#/book", { state: empty, now: NOW });
    await toDetails(user);
    await user.click(screen.getByRole("button", { name: "Hold this court" }));
    await enterDemoCode(user);
    await screen.findByRole("heading", { level: 1, name: "Hold and pay" });
    expect(screen.queryByText("At the venue")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Summary" }));
    const drawer = await screen.findByRole("dialog", { name: "Summary" });
    expect(within(drawer).getByText("At the venue")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("the desk's booking panel is a drawer", async () => {
    phoneScreen();
    const user = userEvent.setup();
    renderApp("#/desk/bookings", {
      state: {
        ...empty,
        bookings: [
          {
            id: "bk_phone",
            courtId: "court-1",
            date: "2026-10-15",
            startMinute: 18 * 60,
            durationMinutes: 60,
            customerId: empty.customers[0]!.id,
            kind: "booking",
            title: "",
            players: 4,
            notes: "",
            source: "desk",
            status: "confirmed",
            payMode: "venue",
            pricePaise: 80_000,
            holdExpiresAt: null,
            createdAt: 0,
            cancelledAt: null,
            ledger: [],
          },
        ],
      },
      now: NOW,
    });
    await user.click(await screen.findByRole("button", { name: empty.customers[0]!.name }));
    const panel = await screen.findByRole("dialog", { name: empty.customers[0]!.name });
    expect(panel).toHaveAttribute("data-slot", "drawer-popup");
    expect(document.querySelector("[data-slot=sheet-popup]")).toBeNull();
    expect(within(panel).getByRole("button", { name: "Record cash" })).toBeInTheDocument();
  });
});
