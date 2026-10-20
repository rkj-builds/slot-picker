import { render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { RepeatEditor } from "@/components/compositions/repeat-editor";
import { clockChanges, nextOccurrences, type RecurrenceRule } from "@/primitives/recurrence";

/** The Off-Screen Club Juniors hold: Sat and Sun, 4 – 5 pm in Kolkata, which has no DST. */
const OSC: RecurrenceRule = {
  interval: 1,
  weekdays: ["sat", "sun"],
  startDate: "2026-10-17",
  startMinute: 16 * 60,
  endMinute: 17 * 60,
  timeZone: "Asia/Kolkata",
  end: { type: "never" },
  exceptions: [],
};

/** A venue that does have DST: Mondays at 9 am in New York, across 1 Nov 2026. */
const NEW_YORK_MONDAYS: RecurrenceRule = { ...OSC, weekdays: ["mon"], startDate: "2026-10-19", startMinute: 9 * 60, endMinute: 10 * 60, timeZone: "America/New_York" };

function Editor(props: Partial<React.ComponentProps<typeof RepeatEditor>> & { rule?: RecurrenceRule }): React.ReactElement {
  const [rule, setRule] = React.useState<RecurrenceRule>(props.rule ?? OSC);
  return <RepeatEditor locale="en-IN" onValueChange={setRule} value={rule} {...props} />;
}

describe("clockChanges (pure)", () => {
  it("flags the venue's change: same wall time, a different instant", () => {
    const list = nextOccurrences(NEW_YORK_MONDAYS, "2026-10-19", 3);
    expect(clockChanges(list, "America/New_York").map((c) => c.venue)).toEqual([false, false, true]);
  });

  it("flags the viewer's change against a venue that never moves", () => {
    const list = nextOccurrences(OSC, "2026-10-24", 4); // 24, 25, 31 Oct, 1 Nov
    expect(clockChanges(list, "Asia/Kolkata", "America/New_York")).toEqual([
      { venue: false, viewer: false },
      { venue: false, viewer: false },
      { venue: false, viewer: false },
      { venue: false, viewer: true },
    ]);
    expect(clockChanges(list, "Asia/Kolkata").every((c) => !c.viewer)).toBe(true);
  });
});

describe("RepeatEditor clock-change preview", () => {
  it("is off by default, as in the desk's Repeat dialogs", () => {
    render(<Editor preview={6} />);
    expect(screen.queryByRole("list", { name: "Upcoming times" })).toBeNull();
    expect(screen.queryByText(/clocks change/i)).toBeNull();
  });

  it("shows a viewer in New York where their clocks change, while Kolkata's stay put", async () => {
    render(<Editor clockChanges preview={6} viewerTimeZone="America/New_York" />);
    const list = screen.getByRole("list", { name: "Upcoming times" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(6);
    expect(rows[4]).toHaveTextContent(/^Sat, 31 Oct4:00 pm6:30 am in New York$/);
    expect(rows[5]).toHaveTextContent("Your clocks change: 5:30 am for you from here");
    expect(rows[5]).toHaveAttribute("data-clock-change", "viewer");
    expect(rows.filter((r) => r.hasAttribute("data-clock-change"))).toHaveLength(1);
    const run = async (): Promise<unknown[]> => (await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } })).violations;
    expect(await run()).toEqual([]);
  });

  it("calls out a venue's own change as the same time on the wall", () => {
    render(<Editor clockChanges preview={3} rule={NEW_YORK_MONDAYS} />);
    const rows = within(screen.getByRole("list", { name: "Upcoming times" })).getAllByRole("listitem");
    expect(rows.map((r) => r.getAttribute("data-clock-change"))).toEqual([null, null, "venue"]);
    expect(rows[2]).toHaveTextContent("Clocks change: same time on the wall");
    expect(rows[2]).toHaveTextContent("9:00 am");
  });

  it("names the viewer's day when it is not the venue's", () => {
    // 6:00 am on Sat in Kolkata is Friday evening in New York.
    render(<Editor clockChanges preview={1} rule={{ ...OSC, startMinute: 6 * 60, endMinute: 7 * 60 }} viewerTimeZone="America/New_York" />);
    expect(within(screen.getByRole("list", { name: "Upcoming times" })).getByRole("listitem")).toHaveTextContent("Fri 8:30 pm in New York");
  });
});
