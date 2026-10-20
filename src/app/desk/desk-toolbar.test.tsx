import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "@/app/test-utils";

/** The page's one header: the title at the left, its controls at the right. */
function pageActions(): HTMLElement {
  const actions = document.querySelector<HTMLElement>("[data-slot=page-actions]");
  if (!actions) throw new Error("no page actions");
  return actions;
}

describe("the desk's page header", () => {
  it("Day: one header row names the page, with the date and the day's actions at the right and New booking last", async () => {
    renderApp("#/desk");
    await screen.findByRole("heading", { level: 1, name: "Day" });
    // No app header above the page on a laptop: the title is not named twice.
    expect(screen.getAllByText("Day").filter((el) => el.closest("[data-sidebar]") === null)).toHaveLength(1);
    expect(document.querySelector("[data-desk-phone-bar]")?.className).toContain("md:hidden");
    const actions = pageActions();
    expect(within(actions).getByRole("button", { name: /^Choose a date/ })).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: /Show cancelled/ })).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: "Block courts" })).toBeInTheDocument();
    const controls = within(actions).getAllByRole("button");
    expect(controls.at(-1)).toHaveAccessibleName("New booking");
  });

  it("Day: the sidebar collapses from its own footer, not from the page", async () => {
    renderApp("#/desk");
    await screen.findByRole("heading", { level: 1, name: "Day" });
    const sidebar = document.querySelector<HTMLElement>("[data-sidebar=sidebar]");
    if (!sidebar) throw new Error("no sidebar");
    expect(within(sidebar).getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
    // The only trigger outside the sidebar is the phone bar's, which a laptop never shows.
    for (const trigger of document.querySelectorAll("[data-sidebar=trigger]")) {
      expect(trigger.closest("[data-desk-phone-bar]")).not.toBeNull();
    }
  });

  it("Bookings: the search and filters sit in the page, in the row right above the table, not in the header", async () => {
    renderApp("#/desk/bookings");
    await screen.findByRole("heading", { level: 1, name: "Bookings" });
    const filters = await screen.findByRole("toolbar", { name: "Filters and export" });
    expect(within(filters).getByRole("button", { name: "Export CSV" })).toBeInTheDocument();
    const search = screen.getByRole("combobox", { name: "Search" });
    const header = document.querySelector("[data-slot=page-header]");
    expect(header).not.toContainElement(filters);
    expect(header).not.toContainElement(search);
    const table = screen.getByRole("table", { name: "Bookings" });
    // The row comes before the table in the document, with nothing but the table's own frame between them.
    expect(search.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("Settings: the page is named once, and the save bar is anchored to the bottom of the desk", async () => {
    renderApp("#/desk/settings");
    await screen.findByRole("heading", { level: 1, name: "Booking rules" });
    expect(screen.queryByRole("heading", { level: 1, name: "Settings" })).toBeNull();
    const bar = await screen.findByRole("region", { name: "Save settings" });
    expect(bar.closest("[data-desk-footer-slot]")?.className).toContain("sticky bottom-0");
    expect(within(bar).getByText("All changes saved")).toBeInTheDocument();
    expect(within(bar).getByRole("button", { name: "Save settings" })).toBeDisabled();
  });
});
