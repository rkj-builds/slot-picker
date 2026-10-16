import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "@/app/test-utils";

/** The desk's sticky header: breadcrumb and search, then the view's own controls. */
function toolbar(): HTMLElement {
  const header = document.querySelector<HTMLElement>("[data-desk-toolbar]");
  if (!header) throw new Error("no desk toolbar");
  return header;
}

describe("the desk's anchored controls", () => {
  it("Day: the date and the day's actions live in the sticky header", async () => {
    renderApp("#/desk");
    await screen.findByRole("heading", { level: 1, name: "Day" });
    expect(toolbar().className).toContain("sticky");
    expect(within(toolbar()).getByRole("button", { name: /Search and jump/ })).toBeInTheDocument();
    expect(await within(toolbar()).findByRole("button", { name: "New booking" })).toBeInTheDocument();
    expect(within(toolbar()).getByRole("button", { name: /Show cancelled/ })).toBeInTheDocument();
    expect(within(toolbar()).getByRole("button", { name: /^Choose a date/ })).toBeInTheDocument();
  });

  it("Bookings: the filters sit in the sticky header, above the table", async () => {
    renderApp("#/desk/bookings");
    await screen.findByRole("heading", { level: 1, name: "Bookings" });
    const filters = await within(toolbar()).findByRole("toolbar", { name: "Filters and export" });
    expect(within(filters).getByRole("button", { name: "Export CSV" })).toBeInTheDocument();
    expect(within(toolbar()).getByRole("combobox", { name: "Search" })).toBeInTheDocument();
    expect(toolbar()).not.toContainElement(screen.getByRole("table", { name: "Bookings" }));
  });

  it("Settings: the save bar is anchored to the bottom of the desk and says whether anything is unsaved", async () => {
    renderApp("#/desk/settings");
    await screen.findByRole("heading", { level: 1, name: "Settings" });
    const bar = await screen.findByRole("region", { name: "Save settings" });
    expect(bar.closest("[data-desk-footer-slot]")?.className).toContain("sticky bottom-0");
    expect(within(bar).getByText("All changes saved")).toBeInTheDocument();
    expect(within(bar).getByRole("button", { name: "Save settings" })).toBeDisabled();
  });
});
