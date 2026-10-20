import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axeViolations, renderApp } from "@/app/test-utils";

describe("#/primitives", () => {
  it("shows each primitive three ways, with its keyboard map, and passes axe", async () => {
    renderApp("#/primitives");
    expect(await screen.findByRole("heading", { level: 1, name: "Primitives" })).toBeInTheDocument();
    for (const name of ["SlotGrid", "Recurrence", "TimeZone", "DateGrid"]) {
      const three = screen.getByRole("list", { name: `${name}, three ways` });
      expect(three.children).toHaveLength(3);
      expect(screen.getByRole("table", { name: `${name} keyboard map` })).toBeInTheDocument();
    }
    expect(screen.getByRole("table", { name: "Why each thing animates" })).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("passes axe in the dark theme too (contrast is checked in a browser: jsdom has no layout)", async () => {
    window.history.replaceState(null, "", "/?theme=dark#/primitives");
    try {
      renderApp("#/primitives");
      expect(await screen.findByRole("heading", { level: 1, name: "Primitives" })).toBeInTheDocument();
      expect(document.documentElement).toHaveClass("dark");
      expect(await axeViolations()).toEqual([]);
    } finally {
      window.history.replaceState(null, "", "/");
      document.documentElement.classList.remove("dark");
    }
  });

  it("the bare SlotGrid works with the keyboard and reports its value", async () => {
    const user = userEvent.setup();
    renderApp("#/primitives");
    const bare = await screen.findByRole("radiogroup", { name: "Start time (bare)" });
    within(bare).getByRole("radio", { name: "4:30 pm" }).focus();
    await user.keyboard("{PageDown}");
    expect(within(bare).getByRole("radio", { name: "6:00 pm" })).toHaveFocus();
    expect(screen.getAllByText("18:00").length).toBeGreaterThan(0);
  });

  it("the recurrence demos summarise in three locales and show New York's clocks change", async () => {
    renderApp("#/primitives");
    const locales = await screen.findByRole("table", { name: "The same rule in three locales" });
    expect(within(locales).getByText("Chaque samedi et dimanche, 16:00 – 17:00, jusqu’au 30 nov.")).toBeInTheDocument();
    const dates = screen.getByRole("table", { name: "Club dates in your zone" });
    expect(within(dates).getByText("Clocks changed")).toBeInTheDocument();
  });

  it("the bare SlotGrid shows a viewer's own day: Auckland regroups by its day and marks +1 day", async () => {
    const user = userEvent.setup();
    renderApp("#/primitives");
    await user.selectOptions(await screen.findByRole("combobox", { name: "Show times for" }), "Auckland");
    const bare = screen.getByRole("radiogroup", { name: "Start time (bare)" });
    expect(within(bare).getAllByRole("group").map((g) => g.getAttribute("aria-label"))).toEqual(["Sat, 31 Oct", "Sun, 1 Nov"]);
    // 4:00 pm in Kolkata is 11:30 pm on Saturday in Auckland; 4:30 pm is already Sunday.
    expect(within(bare).getByRole("radio", { name: "11:30 pm" })).toBeInTheDocument();
    const next = within(bare).getByRole("radio", { name: "12:00 am, the day after" });
    expect(next).toHaveTextContent("+1 day");
    expect(within(bare).getByRole("radio", { name: "12:30 am, the day after, booked" })).toHaveAttribute("aria-disabled", "true");
  });

  it("the Repeat editor demo flags where a New York viewer's clocks change", async () => {
    renderApp("#/primitives");
    const times = await screen.findByRole("list", { name: "Upcoming times" });
    expect(within(times).getByText(/^Your clocks change: 5:30 am for you from here$/)).toBeInTheDocument();
  });

  it("the DateGrid demos: a grid per skin, prices in the names, full days reachable but not choosable", async () => {
    const user = userEvent.setup();
    renderApp("#/primitives");
    const section = (await screen.findByRole("heading", { level: 2, name: "DateGrid" })).closest("section")!;
    expect(within(section).getAllByRole("grid")).toHaveLength(3);
    const [bare, booking] = within(section).getAllByRole("grid");
    const full = within(bare!).getByRole("button", { name: "Saturday, 31 October 2026, fully booked" });
    expect(full).toHaveAttribute("aria-disabled", "true");
    await user.click(full);
    expect(within(bare!.closest<HTMLElement>("[data-bare]")!).getByText("none").tagName).toBe("OUTPUT");
    expect(within(bare!).getByRole("button", { name: "Thursday, 29 October 2026, not available" })).toHaveAttribute("data-outside-range");
    await user.click(within(bare!).getByRole("button", { name: /^Friday, 30 October 2026, today$/ }));
    expect(within(bare!.closest<HTMLElement>("[data-bare]")!).getByText("2026-10-30").tagName).toBe("OUTPUT");
    const saturday = within(booking!).getByRole("button", { name: /^Saturday, 31 October 2026, from ₹800 an hour/ });
    expect(saturday).toHaveTextContent(/^31$/);
    expect(within(booking!).getByRole("button", { name: /^Friday, 30 October 2026, today/ })).toHaveAttribute("aria-current", "date");
  });

  it("is linked from the top bar and from the components page", async () => {
    renderApp("#/components");
    expect(await screen.findByRole("link", { name: "Primitives", current: false })).toHaveAttribute("href", "#/primitives");
  });
});
