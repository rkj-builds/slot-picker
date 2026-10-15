import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axeViolations, renderApp } from "@/app/test-utils";

describe("home, demo bar and not found", () => {
  it("home links each surface from a card and passes axe", async () => {
    renderApp("#/");
    await screen.findByRole("heading", { level: 1, name: /Court booking that asks for money/ });
    expect(screen.getByRole("link", { name: /Book a court/ })).toHaveAttribute("href", "#/book");
    expect(screen.getByRole("link", { name: /Venue desk/ })).toHaveAttribute("href", "#/desk");
    const nav = screen.getByRole("navigation", { name: "Demo sections" });
    expect(within(nav).getAllByRole("link").map((a) => a.textContent)).toEqual(["Book", "Desk", "Components"]);
    expect(await axeViolations()).toEqual([]);
  });

  it("the demo bar marks the current section", async () => {
    renderApp("#/book");
    const nav = await screen.findByRole("navigation", { name: "Demo sections" });
    expect(within(nav).getByRole("link", { name: "Book" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Desk" })).not.toHaveAttribute("aria-current");
  });

  it("an unknown route says so and passes axe", async () => {
    renderApp("#/nowhere");
    expect(await screen.findByRole("heading", { level: 1, name: "Nothing lives here" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "#/");
    expect(await axeViolations()).toEqual([]);
  });
});
