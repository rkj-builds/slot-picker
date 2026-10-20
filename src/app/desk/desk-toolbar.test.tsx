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

  it("Bookings: the search and filters sit in the page, in the row right above the table, not in the header", async () => {
    renderApp("#/desk/bookings");
    await screen.findByRole("heading", { level: 1, name: "Bookings" });
    const filters = await screen.findByRole("toolbar", { name: "Filters and export" });
    expect(within(filters).getByRole("button", { name: "Export CSV" })).toBeInTheDocument();
    const search = screen.getByRole("combobox", { name: "Search" });
    expect(toolbar()).not.toContainElement(filters);
    expect(toolbar()).not.toContainElement(search);
    const table = screen.getByRole("table", { name: "Bookings" });
    // The row comes before the table in the document, with nothing but the table's own frame between them.
    expect(search.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
