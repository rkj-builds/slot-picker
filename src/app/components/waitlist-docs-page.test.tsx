import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { axeViolations, renderApp } from "@/app/test-utils";

afterEach(() => {
  document.documentElement.classList.remove("dark");
});

describe("#/components/waitlist", () => {
  it("renders the proposal with its API table read from the source", async () => {
    renderApp("#/components/waitlist");
    expect(await screen.findByRole("heading", { level: 1, name: "Waitlist" })).toBeInTheDocument();
    expect(screen.getByText("proposal")).toBeInTheDocument();
    expect(screen.getByText(/^A place in line for something that is full\./)).toBeInTheDocument();
    const api = screen.getByRole("heading", { name: "API reference" }).closest("section")!;
    // The table (laptop) and the stacked list (phone) both render; CSS shows one.
    const table = within(api).getByRole("table");
    expect(within(table).getAllByRole("row").length).toBe(13);
    expect(within(table).getByText("onJoin")).toBeInTheDocument();
    expect(within(table).getByText('"Checking for cancellations…"')).toBeInTheDocument();
    expect(within(api).queryByText("No description yet.")).toBeNull();
    expect(screen.getByRole("link", { name: /Book a time to argue about the API/ })).toHaveAttribute("href", "https://cal.com/rahul-kumar-jha-ll9vhj/30min");
  });

  it("holds the demo in a state from the URL", async () => {
    renderApp("#/components/waitlist?state=joined");
    await screen.findByRole("heading", { level: 1, name: "Waitlist" });
    const preview = screen.getByRole("tabpanel");
    expect(within(preview).getByRole("group", { name: "Position 1, nobody ahead of you" })).toBeInTheDocument();
    expect(within(preview).getByRole("button", { name: "Leave the list" })).toBeInTheDocument();
  });

  it("opens the question from the URL", async () => {
    renderApp("#/components/waitlist?state=cancel-confirm");
    expect(await screen.findByRole("alertdialog", { name: "Are you sure?" })).toBeInTheDocument();
  });

  it("runs the preview right-to-left from the URL", async () => {
    renderApp("#/components/waitlist?dir=rtl");
    await screen.findByRole("heading", { level: 1, name: "Waitlist" });
    const frame = screen.getByRole("tabpanel").querySelector("[data-slot=direction-frame]");
    expect(frame).toHaveAttribute("dir", "rtl");
  });

  it.each([["light", "#/components/waitlist?theme=light"], ["dark", "#/components/waitlist?theme=dark"], ["rtl", "#/components/waitlist?dir=rtl&state=joined"]])("has no axe violations (%s)", async (_, hash) => {
    renderApp(hash);
    await screen.findByRole("heading", { level: 1, name: "Waitlist" });
    expect(await axeViolations()).toEqual([]);
  });
});
