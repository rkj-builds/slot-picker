import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { enterDemoCode, renderApp } from "@/app/test-utils";
import { seedCustomers } from "@/lib/seed";
import { STATE_VERSION } from "@/lib/store";
import { instantAt } from "@/lib/time-zone";
import { DEFAULT_SETTINGS } from "@/lib/venue";

// Thursday 15 Oct 2026, 10:00 AM. An empty venue, so every time is free.
const NOW = instantAt("2026-10-15", 10 * 60, "Asia/Kolkata");
const empty = { version: STATE_VERSION, seededOn: "2026-10-15" as const, settings: DEFAULT_SETTINGS, customers: seedCustomers(0), bookings: [], recurringBlocks: [] };

/** The step's summary and actions: a labelled region, the sticky Card beside the step or the bar under it. */
function actions(name = "Your booking"): HTMLElement {
  return screen.getByRole("region", { name });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

async function walk(user: ReturnType<typeof userEvent.setup>, layout: "rail" | "bar"): Promise<void> {
  // Court: the only action is Continue; nothing to go back to.
  await screen.findByRole("heading", { level: 1, name: "Pick a court" });
  expect(actions()).toHaveAttribute("data-book-actions", layout);
  expect(within(actions()).queryByRole("button", { name: "Back" })).toBeNull();
  await user.click(within(actions()).getByRole("button", { name: "Continue" }));

  // When: Continue waits for a start time; the summary fills in as soon as there is one.
  await screen.findByRole("heading", { level: 1, name: "Pick a time" });
  expect(within(actions()).getByRole("button", { name: "Continue" })).toBeDisabled();
  await user.click(screen.getByRole("radio", { name: "7:00 pm" }));
  expect(within(actions()).getByText(/7:00 – 8:00 pm/)).toBeInTheDocument();
  expect(within(actions()).getByRole("button", { name: "Back" })).toBeEnabled();
  await user.click(within(actions()).getByRole("button", { name: "Continue" }));

  // You: the bar's button submits the details form, validation and all.
  await screen.findByRole("heading", { level: 1, name: "Your details" });
  await user.click(within(actions()).getByRole("button", { name: "Hold this court" }));
  expect(await screen.findByText("Tell us who is booking.")).toBeInTheDocument();
  await user.type(screen.getByRole("textbox", { name: "Name" }), "Kavya Menon");
  await user.type(screen.getByRole("textbox", { name: "Mobile number" }), "9800000001");
  await user.click(within(actions()).getByRole("button", { name: "Hold this court" }));
  await enterDemoCode(user);

  // Pay: the countdown and the primary action share the region.
  await screen.findByRole("heading", { level: 1, name: "Hold and pay" });
  expect(within(actions()).getByText("Court held for you")).toBeInTheDocument();
  expect(within(actions()).getByText(/^1[45]:\d{2}$/)).toBeInTheDocument();
  await user.click(screen.getByRole("radio", { name: /Pay at the venue/ }));
  await user.click(within(actions()).getByRole("button", { name: "Confirm booking" }));

  // Done: the next thing to do.
  await screen.findByRole("heading", { level: 1, name: "You are booked" });
  expect(within(actions("What next")).getByRole("button", { name: "Book another court" })).toBeInTheDocument();
}

describe("the booking page's actions", () => {
  it("on a laptop, every step has its summary and primary action in a sticky Card beside it", async () => {
    const user = userEvent.setup();
    renderApp("#/book", { state: empty, now: NOW });
    await walk(user, "rail");
    expect(actions("What next").className).toContain("sticky");
  });

  it("on a phone, the same actions sit in a bar anchored to the bottom", async () => {
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
    renderApp("#/book", { state: empty, now: NOW });
    await walk(user, "bar");
    expect(actions("What next").className).toMatch(/sticky bottom-0/);
  });

  it("the stepper stays at the top, and nothing on the page is fixed in place", async () => {
    renderApp("#/book", { state: empty, now: NOW });
    await screen.findByRole("heading", { level: 1, name: "Pick a court" });
    expect(screen.getByRole("navigation", { name: "Booking steps" }).className).toContain("sticky");
    const main = screen.getByRole("main");
    expect(main.querySelector("[class*='fixed']")).toBeNull();
  });

  it("the demo scenarios are a labelled button in the top bar", async () => {
    const user = userEvent.setup();
    renderApp("#/book", { state: empty, now: NOW });
    const trigger = await screen.findByRole("button", { name: "Demo scenarios" });
    expect(screen.getByRole("banner")).toContainElement(trigger);
    await user.click(trigger);
    const popup = await screen.findByRole("dialog", { name: "Demo scenarios" });
    await user.click(within(popup).getByRole("switch", { name: "Weekend date" }));
    expect(screen.getByRole("button", { name: "Demo scenarios, 1 on" })).toBeInTheDocument();
  });
});
