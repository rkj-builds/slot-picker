import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axeViolations, renderApp } from "@/app/test-utils";

describe("#/primitives", () => {
  it("shows each primitive three ways, with its keyboard map, and passes axe", async () => {
    renderApp("#/primitives");
    expect(await screen.findByRole("heading", { level: 1, name: "Primitives" })).toBeInTheDocument();
    for (const name of ["SlotGrid", "Recurrence", "TimeZone"]) {
      const three = screen.getByRole("list", { name: `${name}, three ways` });
      expect(three.children).toHaveLength(3);
      expect(screen.getByRole("table", { name: `${name} keyboard map` })).toBeInTheDocument();
    }
    expect(screen.getByRole("table", { name: "Why each thing animates" })).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
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

  it("is linked from the top bar and from the components page", async () => {
    renderApp("#/components");
    expect(await screen.findByRole("link", { name: "Primitives", current: false })).toHaveAttribute("href", "#/primitives");
  });
});
