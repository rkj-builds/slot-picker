import { DirectionProvider } from "@base-ui/react/direction-provider";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { nextIndex, SlotGrid } from "@/primitives/slot-grid";

/** Morning: 6:00…7:30 (four cells), Evening: 18:00…19:00 (three cells, 18:30 booked). */
function Times({ onValueChange, defaultValue = null, columns = 2 }: { onValueChange?: (v: string) => void; defaultValue?: string | null; columns?: number }): React.ReactElement {
  return (
    <SlotGrid.Root aria-label="Start time" columns={columns} defaultValue={defaultValue} onValueChange={onValueChange}>
      <SlotGrid.Group aria-label="Morning">
        <SlotGrid.Row>
          {["06:00", "06:30", "07:00", "07:30"].map((t) => (
            <SlotGrid.Cell className={(s) => (s.selected ? "is-selected" : "is-free")} key={t} value={t}>
              {t}
            </SlotGrid.Cell>
          ))}
        </SlotGrid.Row>
      </SlotGrid.Group>
      <SlotGrid.Group aria-label="Evening">
        <SlotGrid.Row>
          <SlotGrid.Cell value="18:00">18:00</SlotGrid.Cell>
          <SlotGrid.Cell disabled reason="booked" value="18:30">
            18:30
          </SlotGrid.Cell>
          <SlotGrid.Cell value="19:00">19:00</SlotGrid.Cell>
        </SlotGrid.Row>
      </SlotGrid.Group>
    </SlotGrid.Root>
  );
}

describe("SlotGrid navigation model (pure)", () => {
  const horizontal = [0, 0, 0, 0, 1, 1, 1].map((group) => ({ group }));
  const opts = { orientation: "horizontal" as const, loop: true, columnsAt: () => 2 };

  it("wraps left and right across the whole grid", () => {
    expect(nextIndex(horizontal, 6, "ArrowRight", opts)).toBe(0);
    expect(nextIndex(horizontal, 0, "ArrowLeft", opts)).toBe(6);
    expect(nextIndex(horizontal, 0, "ArrowLeft", { ...opts, loop: false })).toBeNull();
  });

  it("moves a row at a time, into the next group at the same column", () => {
    expect(nextIndex(horizontal, 1, "ArrowDown", opts)).toBe(3);
    expect(nextIndex(horizontal, 3, "ArrowDown", opts)).toBe(5);
    expect(nextIndex(horizontal, 5, "ArrowUp", opts)).toBe(3);
  });

  it("lands on the last cell of a shorter last row", () => {
    const five = [0, 0, 0, 0, 0].map((group) => ({ group }));
    expect(nextIndex(five, 2, "ArrowDown", { ...opts, columnsAt: () => 3 })).toBe(4);
  });

  it("page keys jump to the first cell of the neighbouring group", () => {
    expect(nextIndex(horizontal, 2, "PageDown", opts)).toBe(4);
    expect(nextIndex(horizontal, 6, "PageUp", opts)).toBe(0);
    expect(nextIndex(horizontal, 6, "PageDown", opts)).toBeNull();
  });

  it("swaps left and right in a right-to-left page", () => {
    expect(nextIndex(horizontal, 1, "ArrowLeft", { ...opts, direction: "rtl" })).toBe(2);
  });

  it("vertical: columns are groups, left and right find the same time", () => {
    // Court 1: 18:00, 18:30, 19:00 (half hours). Court 2: one booking 18:00–19:00, then 19:00.
    const items = [
      { group: 0, start: 1080, end: 1110 },
      { group: 0, start: 1110, end: 1140 },
      { group: 0, start: 1140, end: 1170 },
      { group: 1, start: 1080, end: 1140 },
      { group: 1, start: 1140, end: 1170 },
    ];
    const v = { orientation: "vertical" as const, loop: false, columnsAt: () => 1 };
    expect(nextIndex(items, 1, "ArrowRight", v)).toBe(3); // 18:30 is inside the booking
    expect(nextIndex(items, 3, "ArrowLeft", v)).toBe(0);
    expect(nextIndex(items, 3, "ArrowDown", v)).toBe(4);
    expect(nextIndex(items, 4, "ArrowDown", v)).toBeNull();
    expect(nextIndex(items, 2, "Home", v)).toBe(0);
    expect(nextIndex(items, 0, "End", { ...v, modifier: true })).toBe(4);
  });
});

describe("SlotGrid semantics", () => {
  it("single mode is a radiogroup of radios with labelled groups", () => {
    render(<Times />);
    const group = screen.getByRole("radiogroup", { name: "Start time" });
    expect(within(group).getAllByRole("radio")).toHaveLength(7);
    expect(within(group).getByRole("group", { name: "Evening" })).toBeInTheDocument();
  });

  it("a disabled cell stays focusable and says why, in its name and a data attribute", () => {
    render(<Times />);
    const booked = screen.getByRole("radio", { name: "18:30, booked" });
    expect(booked).toHaveAttribute("aria-disabled", "true");
    expect(booked).not.toBeDisabled();
    expect(booked).toHaveAttribute("data-unavailable-reason", "booked");
    expect(booked).toHaveAttribute("data-disabled");
  });

  it("has exactly one tab stop", () => {
    render(<Times />);
    expect(screen.getAllByRole("radio").filter((r) => r.tabIndex === 0)).toHaveLength(1);
  });

  it("label replaces the visible text as the name, with the reason appended", () => {
    render(
      <SlotGrid.Root aria-label="Times">
        <SlotGrid.Cell disabled label="7:30 pm" reason="being booked by someone else" value="a">
          7:30 <small>9:00 am in New York</small>
        </SlotGrid.Cell>
      </SlotGrid.Root>,
    );
    expect(screen.getByRole("radio")).toHaveAccessibleName("7:30 pm, being booked by someone else");
  });

  it("none mode is a group of buttons; clicking does not select", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <SlotGrid.Root aria-label="Courts" selectionMode="none">
        <SlotGrid.Cell onClick={onClick} value="a">
          A
        </SlotGrid.Cell>
      </SlotGrid.Root>,
    );
    expect(screen.getByRole("group", { name: "Courts" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "A" }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "A" })).not.toHaveAttribute("data-selected");
  });

  it("passes axe in both modes", async () => {
    const { container } = render(
      <>
        <Times />
        <SlotGrid.Root aria-label="Courts" selectionMode="none">
          <SlotGrid.Group aria-label="Court 1">
            <SlotGrid.Cell value="x">Empty</SlotGrid.Cell>
            <SlotGrid.Cell disabled reason="blocked" value="y">
              Blocked
            </SlotGrid.Cell>
          </SlotGrid.Group>
        </SlotGrid.Root>
      </>,
    );
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});

describe("SlotGrid state and composition", () => {
  it("uncontrolled: defaultValue selects, clicks change it, data-selected and className follow state", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Times defaultValue="06:30" onValueChange={onChange} />);
    expect(screen.getByRole("radio", { name: "06:30" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "06:30" })).toHaveClass("is-selected");
    await user.click(screen.getByRole("radio", { name: "07:00" }));
    expect(onChange).toHaveBeenLastCalledWith("07:00", expect.objectContaining({ reason: "pointer" }));
    expect(screen.getByRole("radio", { name: "07:00" })).toHaveAttribute("data-selected");
    expect(screen.getByRole("radio", { name: "06:30" })).toHaveClass("is-free");
    expect(screen.getByRole("group", { name: "Morning" })).toHaveAttribute("data-has-selected");
  });

  it("controlled: the value only changes when the owner says so", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SlotGrid.Root aria-label="T" onValueChange={onChange} value="a">
        <SlotGrid.Cell value="a">A</SlotGrid.Cell>
        <SlotGrid.Cell value="b">B</SlotGrid.Cell>
      </SlotGrid.Root>,
    );
    await user.click(screen.getByRole("radio", { name: "B" }));
    expect(onChange).toHaveBeenCalledWith("b", expect.anything());
    expect(screen.getByRole("radio", { name: "A" })).toBeChecked();
  });

  it("clicking a disabled cell does nothing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Times onValueChange={onChange} />);
    await user.click(screen.getByRole("radio", { name: "18:30, booked" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("render prop: an element or a function of state", () => {
    render(
      <SlotGrid.Root aria-label="T" defaultValue="a" render={<section />}>
        <SlotGrid.Cell render={(props, state) => <div {...props} data-kind={state.selected ? "on" : "off"} />} value="a">
          A
        </SlotGrid.Cell>
      </SlotGrid.Root>,
    );
    expect(screen.getByRole("radiogroup").tagName).toBe("SECTION");
    expect(screen.getByRole("radio", { name: "A" })).toHaveAttribute("data-kind", "on");
  });

  it("data-highlighted marks the focused cell only while focus is inside", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Times />
        <button type="button">After</button>
      </>,
    );
    await user.tab();
    expect(screen.getByRole("radio", { name: "06:00" })).toHaveAttribute("data-highlighted");
    await user.tab();
    expect(screen.getByRole("radio", { name: "06:00" })).not.toHaveAttribute("data-highlighted");
  });
});

describe("SlotGrid keyboard (rendered)", () => {
  it("arrows move and select; an unavailable cell takes focus but not the value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Times onValueChange={onChange} />);
    await user.tab();
    await user.keyboard("{PageDown}");
    expect(screen.getByRole("radio", { name: "18:00" })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith("18:00", expect.objectContaining({ reason: "focus" }));
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "18:30, booked" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "18:00" })).toBeChecked();
    await user.keyboard(" ");
    expect(screen.getByRole("radio", { name: "18:00" })).toBeChecked();
  });

  it("up and down use the column count, crossing groups", async () => {
    const user = userEvent.setup();
    render(<Times />);
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "07:00" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "18:00" })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("radio", { name: "07:00" })).toHaveFocus();
  });

  it("home and end reach the ends; tab leaves the grid in one step", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Times />
        <button type="button">After</button>
      </>,
    );
    await user.tab();
    await user.keyboard("{End}");
    expect(screen.getByRole("radio", { name: "19:00" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("radio", { name: "06:00" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("enter selects with selectOnFocus off", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SlotGrid.Root aria-label="T" onValueChange={onChange} selectOnFocus={false}>
        <SlotGrid.Cell value="a">A</SlotGrid.Cell>
        <SlotGrid.Cell value="b">B</SlotGrid.Cell>
      </SlotGrid.Root>,
    );
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(onChange).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("b", expect.objectContaining({ reason: "keyboard" }));
  });

  it("vertical orientation: columns per group, left/right at the same time, rtl swaps", async () => {
    const user = userEvent.setup();
    const Grid = (): React.ReactElement => (
      <SlotGrid.Root aria-label="Courts" orientation="vertical" selectionMode="none">
        <SlotGrid.Group aria-label="Court 1">
          <SlotGrid.Cell end={1110} start={1080} value="c1-1800">
            C1 6:00
          </SlotGrid.Cell>
          <SlotGrid.Cell end={1140} start={1110} value="c1-1830">
            C1 6:30
          </SlotGrid.Cell>
        </SlotGrid.Group>
        <SlotGrid.Group aria-label="Court 2">
          <SlotGrid.Cell end={1140} start={1080} value="c2-booking">
            C2 booking
          </SlotGrid.Cell>
        </SlotGrid.Group>
      </SlotGrid.Root>
    );
    const { unmount } = render(<Grid />);
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "C1 6:30" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "C2 booking" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: "C1 6:00" })).toHaveFocus();
    unmount();

    render(
      <DirectionProvider direction="rtl">
        <Grid />
      </DirectionProvider>,
    );
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: "C2 booking" })).toHaveFocus();
  });
});
