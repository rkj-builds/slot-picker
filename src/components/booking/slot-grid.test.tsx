import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { SlotGrid } from "@/components/booking/slot-grid";
import { computeDaySlots, type Reservation, type VenueSchedule } from "@/lib/availability";
import { instantAt } from "@/lib/time-zone";

const TZ = "Asia/Kolkata";
const DATE = "2026-10-20" as const; // Tuesday: 6–12 and 16–23

const schedule: VenueSchedule = {
  timeZone: TZ,
  slotStepMinutes: 30,
  durationsMinutes: [60, 90],
  weeklyHours: {
    sun: [], mon: [], wed: [], thu: [], fri: [], sat: [],
    tue: [[6 * 60, 12 * 60], [16 * 60, 23 * 60]],
  },
};

const reservations: Reservation[] = [
  { spaceId: "c1", start: instantAt(DATE, 19 * 60 + 30, TZ), end: instantAt(DATE, 20 * 60 + 30, TZ), status: "booked" },
  { spaceId: "c1", start: instantAt(DATE, 7 * 60 + 30, TZ), end: instantAt(DATE, 8 * 60, TZ), status: "held" },
];

const slots = computeDaySlots({ schedule, date: DATE, spaceId: "c1", durationMinutes: 60, reservations, now: instantAt(DATE, 0, TZ) });

function Harness({ onChange = vi.fn() }: { onChange?: (id: string) => void }): React.ReactElement {
  const [value, setValue] = React.useState<string | null>(null);
  return (
    <SlotGrid
      aria-label="Start time"
      columns={4}
      locale="en-US"
      onValueChange={(id) => {
        setValue(id);
        onChange(id);
      }}
      slots={slots}
      timeZone={TZ}
      value={value}
      viewerTimeZone="America/New_York"
    />
  );
}

describe("SlotGrid semantics", () => {
  it("is a labelled radio group with one radio per start time", () => {
    render(<Harness />);
    const group = screen.getByRole("radiogroup", { name: "Start time" });
    expect(within(group).getAllByRole("radio")).toHaveLength(slots.length);
  });

  it("names unavailable slots with the reason", () => {
    render(<Harness />);
    expect(screen.getByRole("radio", { name: "7:30 PM, booked" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("radio", { name: "7:30 AM, being booked by someone else" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "7:00 PM, only 30 minutes free" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "7:00 AM, only 30 minutes free" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "10:30 PM, ends after closing" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "6:00 AM" })).not.toHaveAttribute("aria-disabled");
  });

  it("shows the viewer's time under each slot when the zones differ", () => {
    render(<Harness />);
    expect(screen.getByRole("radio", { name: "6:00 AM" })).toHaveTextContent("8:30 PM");
  });

  it("has exactly one tab stop, on the first available slot", () => {
    render(<Harness />);
    const stops = screen.getAllByRole("radio").filter((r) => r.tabIndex === 0);
    expect(stops).toHaveLength(1);
    expect(stops[0]).toHaveAccessibleName("6:00 AM");
  });

  it("passes axe", async () => {
    const { container } = render(<Harness />);
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});

describe("SlotGrid keyboard model", () => {
  it("arrow right moves and selects; selecting follows focus only onto available slots", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.tab();
    expect(screen.getByRole("radio", { name: "6:00 AM" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "6:30 AM" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "6:30 AM" })).toBeChecked();
    expect(onChange).toHaveBeenLastCalledWith("2026-10-20T06:30");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "7:00 AM, only 30 minutes free" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "6:30 AM" })).toBeChecked();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("space and enter do nothing on an unavailable slot", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    screen.getByRole("radio", { name: "7:30 PM, booked" }).focus();
    await user.keyboard(" {Enter}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("arrow left wraps from the first slot to the last", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "10:30 PM, ends after closing" })).toHaveFocus();
  });

  it("home and end go to the ends of the day", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.keyboard("{End}");
    expect(screen.getByRole("radio", { name: "10:30 PM, ends after closing" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("radio", { name: "6:00 AM" })).toHaveFocus();
  });

  it("arrow down moves one row using the column count", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "8:00 AM" })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("radio", { name: "6:00 AM" })).toHaveFocus();
  });

  it("page down and page up jump between periods", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.keyboard("{PageDown}");
    expect(screen.getByRole("radio", { name: "4:00 PM" })).toHaveFocus();
    await user.keyboard("{PageDown}");
    expect(screen.getByRole("radio", { name: "5:00 PM" })).toHaveFocus();
    await user.keyboard("{PageDown}");
    expect(screen.getByRole("radio", { name: "5:00 PM" })).toHaveFocus();
    await user.keyboard("{PageUp}{PageUp}");
    expect(screen.getByRole("radio", { name: "6:00 AM" })).toHaveFocus();
  });
});

describe("SlotGrid states", () => {
  it("renders a busy status while loading", () => {
    render(<SlotGrid aria-label="Start time" onValueChange={vi.fn()} slots={[]} status="loading" timeZone={TZ} value={null} />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("renders an alert with a retry on error", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<SlotGrid aria-label="Start time" onRetry={onRetry} onValueChange={vi.fn()} slots={[]} status="error" timeZone={TZ} value={null} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load times");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("offers the next free day when nothing is left", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    const gone = slots.map((s) => ({ ...s, status: "past" as const }));
    render(
      <SlotGrid aria-label="Start time" nextAvailableLabel="Wed 21 Oct" onNextAvailable={onNext} onValueChange={vi.fn()} slots={gone} timeZone={TZ} value={null} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("No slots left today");
    await user.click(screen.getByRole("button", { name: "Go to Wed 21 Oct" }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("says closed when there are no cells at all", () => {
    render(<SlotGrid aria-label="Start time" onValueChange={vi.fn()} slots={[]} timeZone={TZ} value={null} />);
    expect(screen.getByRole("status")).toHaveTextContent("Closed today");
  });
});
