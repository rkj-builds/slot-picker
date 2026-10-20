import { screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DEMO_STATES } from "@/app/demo-states";
import { renderApp } from "@/app/test-utils";

/** Open #/primitives and press a state in its States index. */
async function jump(user: UserEvent, label: string): Promise<void> {
  renderApp("#/primitives");
  await user.click(await screen.findByRole("button", { name: new RegExp(`^${label}`) }));
  // Wait, cheaply, for the primitives page to give way while the desk chunk loads: a findBy* that fails
  // on that long page prints the whole DOM into its error on every retry, which under a parallel run
  // can outlast the timeout.
  await waitFor(() => expect(document.querySelector('[data-slot="primitive-section"]')).toBeNull());
}

describe("demo states: inbox and team", () => {
  it("every state in the group opens one of the group's screens", () => {
    const ours = DEMO_STATES.filter((s) => s.group === "Inbox and team");
    expect(ours.length).toBeGreaterThanOrEqual(7);
    for (const s of ours) expect(s.hash).toMatch(/^#\/desk\/(inbox|team|settings)/);
  });

  it("the inbox fails to load, then Try again brings it back", async () => {
    const user = userEvent.setup();
    await jump(user, "Inbox fails to load");
    expect(await screen.findByText("Couldn't load conversations")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await within(await screen.findByRole("list", { name: "Leads" })).findByRole("link", { name: /^Harsh Vardhan/ })).toBeInTheDocument();
  });

  it("signed in as a coach, Team says it isn't part of the role", async () => {
    const user = userEvent.setup();
    await jump(user, "Team, signed in as a coach");
    expect(await screen.findByText("Team isn't part of your role")).toBeInTheDocument();
    expect(screen.getByText(/You're signed in as Neha Rawat \(Coach\)/)).toBeInTheDocument();
  });

  it("the locked composer says why", async () => {
    const user = userEvent.setup();
    await jump(user, "Composer locked for the bot");
    expect(await screen.findByText("The bot is answering Pooja. Turn on Reply by hand to write.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Reply to Pooja Rathi" })).toBeDisabled();
  });
});
