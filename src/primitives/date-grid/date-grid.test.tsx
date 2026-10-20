import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { AvailabilityCalendar } from "@/components/compositions/availability-calendar";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import type { PlainDate } from "@/lib/plain-date";
import { canPage, DateGrid, type DayInfo, monthWeeks, moveDate, spokenDay } from "@/primitives/date-grid";

const TODAY: PlainDate = "2026-10-21";

/** Weekends cost more; the 24th is full, the 25th limited, the 28th closed. */
function info(date: PlainDate): DayInfo {
  if (date === "2026-10-24") return { status: "full", label: "₹800" };
  if (date === "2026-10-25") return { status: "limited", label: "₹800", badge: "Best" };
  if (date === "2026-10-28") return { status: "unavailable" };
  return { label: "₹700", description: "from ₹700 an hour" };
}

function Bare(props: Partial<React.ComponentProps<typeof DateGrid.Root>>): React.ReactElement {
  return (
    <DateGrid.Root locale="en-GB" today={TODAY} {...props}>
      <DateGrid.Title />
      <DateGrid.PreviousMonth />
      <DateGrid.NextMonth />
      <DateGrid.Grid>
        <DateGrid.Head />
        <DateGrid.Body />
      </DateGrid.Grid>
    </DateGrid.Root>
  );
}

const day = (name: RegExp | string): HTMLElement => screen.getByRole("button", { name });

describe("DateGrid model (pure)", () => {
  it("always shows six weeks, from the week's first day", () => {
    const weeks = monthWeeks("2026-10-15", "mon");
    expect(weeks).toHaveLength(6);
    expect(weeks[0]![0]).toBe("2026-09-28"); // 1 Oct 2026 is a Thursday
    expect(monthWeeks("2026-10-15", "sun")[0]![0]).toBe("2026-09-27");
    expect(monthWeeks("2026-02-01", "sun")[0]![0]).toBe("2026-02-01"); // Feb 2026 starts on a Sunday and still gets six rows
  });

  it("moves by day, week, week edge, month and year, and stops at min and max", () => {
    const opts = { weekStartsOn: "mon" as const };
    expect(moveDate("2026-10-21", "ArrowRight", opts)).toBe("2026-10-22");
    expect(moveDate("2026-10-21", "ArrowUp", opts)).toBe("2026-10-14");
    expect(moveDate("2026-10-21", "Home", opts)).toBe("2026-10-19");
    expect(moveDate("2026-10-21", "End", opts)).toBe("2026-10-25");
    expect(moveDate("2026-10-21", "End", { weekStartsOn: "sun" })).toBe("2026-10-24");
    expect(moveDate("2026-01-31", "PageDown", opts)).toBe("2026-02-28");
    expect(moveDate("2026-10-21", "PageUp", { ...opts, shiftKey: true })).toBe("2025-10-21");
    expect(moveDate("2026-10-21", "ArrowLeft", { ...opts, direction: "rtl" })).toBe("2026-10-22");
    expect(moveDate("2026-10-21", "PageUp", { ...opts, min: "2026-10-05" })).toBe("2026-10-05");
    expect(moveDate("2026-12-28", "ArrowDown", { ...opts, max: "2026-12-31" })).toBe("2026-12-31");
  });

  it("pages only while the next month has a date in range", () => {
    expect(canPage("2026-10-01", -1, "2026-09-30")).toBe(true);
    expect(canPage("2026-10-01", -1, "2026-10-01")).toBe(false);
    expect(canPage("2026-10-01", 1, null, "2026-11-01")).toBe(true);
    expect(canPage("2026-10-01", 1, null, "2026-10-31")).toBe(false);
  });

  it("says the date, today, the description or label, the badge and the status", () => {
    expect(spokenDay("2026-10-25", { locale: "en-GB", isToday: false, info: info("2026-10-25"), inside: true })).toBe("Sunday, 25 October 2026, ₹800, Best, few times left");
    expect(spokenDay("2026-10-21", { locale: "en-GB", isToday: true, info: info("2026-10-21"), inside: true })).toBe("Wednesday, 21 October 2026, today, from ₹700 an hour");
    expect(spokenDay("2026-10-02", { locale: "en-GB", isToday: false, inside: false })).toBe("Friday, 2 October 2026, not available");
    expect(spokenDay("2026-10-21", { locale: "fr", isToday: true, inside: true })).toBe("mercredi 21 octobre 2026, aujourd’hui");
  });
});

describe("DateGrid parts", () => {
  it("is a grid named by its month, weekday columns from the locale, one tab stop", () => {
    render(<Bare />);
    const grid = screen.getByRole("grid", { name: "October 2026" });
    expect(screen.getByText("October 2026")).toHaveAttribute("aria-live", "polite");
    const headers = within(grid).getAllByRole("columnheader");
    expect(headers.map((h) => h.getAttribute("abbr"))).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
    expect(within(grid).getAllByRole("row")).toHaveLength(7);
    expect(within(grid).getAllByRole("button")).toHaveLength(31);
    expect(within(grid).getAllByRole("button").filter((b) => b.tabIndex === 0)).toHaveLength(1);
    expect(day(/^Wednesday, 21 October 2026, today/)).toHaveAttribute("aria-current", "date");
    expect(day(/^Wednesday, 21 October 2026/)).toHaveAttribute("tabindex", "0");
  });

  it("starts the week on the locale's first day", () => {
    render(<Bare locale="en-US" />);
    expect(screen.getAllByRole("columnheader")[0]).toHaveAttribute("abbr", "Sunday");
  });

  it("chooses on click and with Enter; blocked days stay focusable, announce why, and cannot be chosen", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Bare getDayInfo={info} min="2026-10-05" onValueChange={onValueChange} />);
    await user.click(day(/^Thursday, 22 October/));
    expect(onValueChange).toHaveBeenLastCalledWith("2026-10-22", expect.objectContaining({ reason: "pointer" }));
    expect(day(/^Thursday, 22 October/)).toHaveAttribute("data-selected");
    expect(day(/^Thursday, 22 October/).closest("td")).toHaveAttribute("aria-selected", "true");

    const full = day("Saturday, 24 October 2026, ₹800, fully booked");
    expect(full).toHaveAttribute("aria-disabled", "true");
    expect(full).not.toBeDisabled();
    await user.click(full);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(day("Wednesday, 28 October 2026, not available")).toHaveAttribute("data-status", "unavailable");
    expect(day(/^Sunday, 4 October 2026/)).toHaveAttribute("data-outside-range");

    day(/^Friday, 23 October/).focus();
    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith("2026-10-23", expect.objectContaining({ reason: "keyboard" }));
  });

  it("arrows move focus, Page Down turns the month and keeps the day, the title follows", async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    render(<Bare onMonthChange={onMonthChange} />);
    day(/^Wednesday, 21 October/).focus();
    await user.keyboard("{ArrowRight}{ArrowDown}");
    expect(day(/^Thursday, 29 October/)).toHaveFocus();
    await user.keyboard("{Home}");
    expect(day(/^Monday, 26 October/)).toHaveFocus();
    await user.keyboard("{PageDown}");
    expect(day(/^Thursday, 26 November/)).toHaveFocus();
    expect(screen.getByRole("grid", { name: "November 2026" })).toBeInTheDocument();
    expect(onMonthChange).toHaveBeenLastCalledWith("2026-11-01");
    expect(screen.getByRole("grid")).toHaveAttribute("data-direction", "next");
    await user.keyboard("{Shift>}{PageUp}{/Shift}");
    expect(day(/^Wednesday, 26 November 2025/)).toHaveFocus();
  });

  it("keys stop at min and max instead of doing nothing", async () => {
    const user = userEvent.setup();
    render(<Bare max="2026-11-10" min="2026-10-15" />);
    day(/^Monday, 19 October/).focus();
    await user.keyboard("{PageUp}");
    expect(day(/^Thursday, 15 October/)).toHaveFocus();
    await user.keyboard("{PageDown}{PageDown}");
    expect(day(/^Tuesday, 10 November/)).toHaveFocus();
    expect(screen.getByRole("button", { name: "Next month, December 2026" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous month, October 2026" })).toBeEnabled();
  });

  it("swaps ← and → on a right-to-left page", async () => {
    const user = userEvent.setup();
    render(
      <DirectionProvider direction="rtl">
        <Bare />
      </DirectionProvider>,
    );
    day(/^Wednesday, 21 October/).focus();
    await user.keyboard("{ArrowLeft}");
    expect(day(/^Thursday, 22 October/)).toHaveFocus();
  });

  it("is controlled or uncontrolled, for the value and the month", async () => {
    const user = userEvent.setup();
    function Controlled(): React.ReactElement {
      const [value, setValue] = React.useState<PlainDate | null>("2026-12-03");
      const [month, setMonth] = React.useState<PlainDate>("2026-12-01");
      return (
        <>
          <Bare month={month} onMonthChange={setMonth} onValueChange={setValue} value={value} />
          <output>{value}</output>
        </>
      );
    }
    render(<Controlled />);
    expect(screen.getByRole("grid", { name: "December 2026" })).toBeInTheDocument();
    expect(day(/^Thursday, 3 December/)).toHaveAttribute("tabindex", "0");
    await user.click(screen.getByRole("button", { name: "Next month, January 2027" }));
    expect(screen.getByRole("grid", { name: "January 2027" })).toBeInTheDocument();
    await user.click(day(/^Friday, 8 January 2027/));
    expect(screen.getByText("2027-01-08").tagName).toBe("OUTPUT");
  });
});

describe("AvailabilityCalendar", () => {
  it("draws the price outside the button, so the visible text is the number and is in the name", () => {
    render(<AvailabilityCalendar getDayInfo={info} locale="en-GB" today={TODAY} />);
    const button = day(/^Thursday, 22 October 2026, from ₹700 an hour$/);
    expect(button).toHaveTextContent(/^22$/);
    const price = within(button.closest("td")!).getByText("₹700");
    expect(price).toHaveAttribute("aria-hidden", "true");
    expect(button).not.toContainElement(price);
    expect(within(day(/^Sunday, 25 October/).closest("td")!).getByText("Best")).toBeInTheDocument();
  });

  it("pages with coss Buttons and passes axe", async () => {
    const user = userEvent.setup();
    render(<AvailabilityCalendar aria-label="Pick a day" getDayInfo={info} locale="en-GB" min="2026-10-21" today={TODAY} />);
    expect(screen.getByRole("grid", { name: "Pick a day" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous month, September 2026" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Next month, November 2026" }));
    expect(screen.getByText("November 2026")).toBeInTheDocument();
    const run = async (): Promise<unknown[]> => (await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } })).violations;
    expect(await run()).toEqual([]);
  });
});
