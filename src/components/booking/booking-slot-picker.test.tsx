import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { BookingSlotPicker } from "@/components/booking/booking-slot-picker";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { VenueSchedule } from "@/lib/availability";
import { instantAt } from "@/lib/time-zone";

const TZ = "Asia/Kolkata";
const schedule: VenueSchedule = {
  timeZone: TZ,
  slotStepMinutes: 30,
  durationsMinutes: [60, 90, 120],
  weeklyHours: {
    sun: [[6 * 60, 23 * 60]], mon: [[6 * 60, 23 * 60]], tue: [[6 * 60, 23 * 60]], wed: [[6 * 60, 23 * 60]],
    thu: [[6 * 60, 23 * 60]], fri: [[6 * 60, 23 * 60]], sat: [[6 * 60, 23 * 60]],
  },
};
const spaces = [
  { id: "c1", name: "Court 1" },
  { id: "c2", name: "Court 2" },
];
// Saturday 17 Oct 2026, 9:00 AM in Kolkata.
const NOW = instantAt("2026-10-17", 9 * 60, TZ);

function renderPicker(onConfirm = vi.fn()): ReturnType<typeof render> {
  return render(
    <TooltipProvider>
      <BookingSlotPicker locale="en-US" now={NOW} onConfirm={onConfirm} reservations={[]} schedule={schedule} spaces={spaces} viewerTimeZone="America/New_York" />
    </TooltipProvider>,
  );
}

describe("BookingSlotPicker", () => {
  it("reads the whole booking back in one line", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderPicker(onConfirm);

    await user.click(screen.getByRole("radio", { name: "Court 2" }));
    await user.click(screen.getByRole("radio", { name: "1 hour 30 minutes" }));
    await user.click(screen.getByRole("button", { name: "Next day, Sunday, October 18, 2026" }));
    await user.click(screen.getByRole("radio", { name: "7:00 PM" }));

    expect(screen.getByText("Court 2", { selector: "[data-slot=booking-summary-line] span" })).toBeInTheDocument();
    const line = document.querySelector("[data-slot=booking-summary-line]");
    expect(line?.textContent?.replaceAll(/\s+/g, " ")).toBe("Court 2 · Sun, Oct 18 · 7:00 PM – 8:30 PM · 1 hour 30 minutes");

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: "c2", date: "2026-10-18", durationMinutes: 90, slot: expect.objectContaining({ id: "2026-10-18T19:00" }) }),
    );
  });

  it("tells a New York viewer when the slot is for them", async () => {
    const user = userEvent.setup();
    renderPicker();
    await user.click(screen.getByRole("radio", { name: "7:00 PM" }));
    const hint = document.querySelector("[data-slot=time-zone-hint]");
    expect(hint?.textContent).toContain("9:30 – 10:30 AM in New York");
  });

  it("cannot step before today", () => {
    renderPicker();
    expect(screen.getByRole("button", { name: /Previous day/ })).toBeDisabled();
  });

  it("clears the chosen slot when the duration changes", async () => {
    const user = userEvent.setup();
    renderPicker();
    await user.click(screen.getByRole("radio", { name: "10:00 AM" }));
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "2 hours" }));
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
  });

  it("passes axe", async () => {
    const { container } = renderPicker();
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
