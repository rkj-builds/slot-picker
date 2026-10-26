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
    expect(within(table).getAllByRole("row").length).toBe(15); // a header row and 14 props
    expect(within(table).getByText("onJoin")).toBeInTheDocument();
    expect(within(table).getByText('"Checking for cancellations…"')).toBeInTheDocument();
    expect(within(api).queryByText("No description yet.")).toBeNull();
    expect(screen.getByRole("link", { name: /Book a time to argue about the API/ })).toHaveAttribute("href", "https://cal.com/rahul-kumar-jha-ll9vhj/30min");
  });

  it("opens with the four screens in order, ending on the live card", async () => {
    renderApp("#/components/waitlist");
    await screen.findByRole("heading", { level: 1, name: "Waitlist" });
    const story = screen.getByRole("region", { name: "I built this so Cal.com doesn’t miss a good applicant over a closed button." });
    // The steps are the list's own items; the card in the last step holds a list of its own (the taken slots).
    const steps = Array.from(story.querySelector("ol")!.children) as HTMLElement[];
    expect(steps.map((s) => within(s).getByRole("heading", { level: 3 }).textContent)).toEqual([
      "There was a job.",
      "I pressed Apply now.",
      "It said Position Closed.",
      "A full thing gets a waitlist.",
    ]);
    // Three real screens, each described, then the component itself rather than a picture of it.
    expect(within(story).getAllByRole("img").map((i) => i.getAttribute("alt"))).toEqual([expect.stringMatching(/^Cal\.com’s jobs page/), expect.stringMatching(/Apply now button/), expect.stringMatching(/^Position Closed/)]);
    expect(within(steps[3]!).getByRole("button", { name: "Join the waitlist" })).toBeInTheDocument();
    expect(within(steps[3]!).queryByRole("img")).toBeNull();
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
