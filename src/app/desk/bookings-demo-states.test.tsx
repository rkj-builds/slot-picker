import { screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axeViolations, renderApp } from "@/app/test-utils";

/** A jump loads the primitives page, then the desk and the screen, each on demand: slow on a cold, parallel run. */
const COLD = { timeout: 8000 };

/** Open #/primitives and press a state in its States index, as a reviewer would. */
async function jump(user: UserEvent, label: string): Promise<void> {
  renderApp("#/primitives");
  await screen.findByRole("heading", { name: "States", level: 2 });
  await user.click(await screen.findByRole("button", { name: new RegExp(`^${label}`) }));
}

describe("bookings and availability demo states", () => {
  it("booking with a balance opens its page", async () => {
    const user = userEvent.setup();
    await jump(user, "Booking with a balance");
    expect(await screen.findByRole("heading", { level: 1, name: "Kabir Singh" }, COLD)).toBeInTheDocument();
    expect(screen.getByText(/^₹300 of ₹\d+ paid$/)).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("reminder on cooldown: Send reminder is refused with when the next can go", async () => {
    const user = userEvent.setup();
    await jump(user, "Reminder on cooldown");
    await screen.findByRole("heading", { level: 1, name: "Kabir Singh" }, COLD);
    await user.click(await screen.findByRole("button", { name: "Send reminder" }));
    expect(await screen.findByText("Reminder not sent")).toBeInTheDocument();
    expect(screen.getByText(/^A reminder went less than an hour ago\. The next can go at /)).toBeInTheDocument();
  });

  it("booking as front desk: payments work, refunds and prices say who can", async () => {
    const user = userEvent.setup();
    await jump(user, "Booking as front desk");
    await screen.findByRole("heading", { level: 1, name: "Kabir Singh" }, COLD);
    expect(await screen.findByRole("button", { name: "Record payment" })).not.toHaveAttribute("aria-disabled");
    expect(screen.getByText(/Some actions need a manager or an admin/)).toBeInTheDocument();
  });

  it("availability with unsaved hours opens with the bar", async () => {
    const user = userEvent.setup();
    await jump(user, "Availability with unsaved hours");
    const bar = await screen.findByRole("region", { name: "Unsaved hours" }, COLD);
    expect(within(bar).getByText("Sunday")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Sunday opens" })).toHaveTextContent("8:00 am");
  });

  it("closure over booked courts opens Add closure with the warning", async () => {
    const user = userEvent.setup();
    await jump(user, "Closure over booked courts");
    const dialog = await screen.findByRole("dialog", { name: "Add closure" }, COLD);
    expect(await within(dialog).findByText(/confirmed bookings? falls? in this closure/)).toBeInTheDocument();
  });

  it("availability as a manager is read-only", async () => {
    const user = userEvent.setup();
    await jump(user, "Availability as a manager");
    expect(await screen.findByText("You can see availability but not change it", undefined, COLD)).toBeInTheDocument();
  });
});
