import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axeViolations, renderApp } from "@/app/test-utils";

describe("#/components", () => {
  it("renders every section in a light and a dark panel", async () => {
    renderApp("#/components");
    await screen.findByRole("heading", { level: 1, name: "Components" });
    const light = document.querySelectorAll('[data-theme-scope="light"]');
    const dark = document.querySelectorAll('[data-theme-scope="dark"]');
    expect(light.length).toBeGreaterThan(20);
    expect(dark.length).toBe(light.length);
  });

  it("passes axe", async () => {
    renderApp("#/components");
    await screen.findByRole("heading", { level: 1, name: "Components" });
    expect(await axeViolations()).toEqual([]);
  });
});
