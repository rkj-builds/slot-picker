import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axeViolations, renderApp } from "@/app/test-utils";

describe("#/components", () => {
  it("renders every section in a light and a dark panel", async () => {
    renderApp("#/components");
    // The gallery is lazy-loaded; under a full parallel run it can take over a second.
    await screen.findByRole("heading", { level: 1, name: "Components" }, { timeout: 5000 });
    const light = document.querySelectorAll('[data-theme-scope="light"]');
    const dark = document.querySelectorAll('[data-theme-scope="dark"]');
    expect(light.length).toBeGreaterThan(20);
    expect(dark.length).toBe(light.length);
  });

  // axe walks every component twice (light and dark): about 4 s alone, more under a full parallel run.
  it("passes axe", { timeout: 20_000 }, async () => {
    renderApp("#/components");
    await screen.findByRole("heading", { level: 1, name: "Components" }, { timeout: 5000 });
    expect(await axeViolations()).toEqual([]);
  });
});
