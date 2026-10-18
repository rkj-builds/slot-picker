import { screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DEMO_STATES } from "@/app/demo-states";
import { axeViolations, renderApp } from "@/app/test-utils";

/** Open #/primitives and press a state in its States index. */
async function programmesCard(): Promise<HTMLElement> {
  const heading = await screen.findByRole("heading", { level: 3, name: /^Programmes\s*\d+$/ });
  const card = heading.closest<HTMLElement>("[data-slot=card]");
  if (!card) throw new Error("no Programmes card");
  return card;
}

async function jump(user: UserEvent, label: string): Promise<void> {
  renderApp("#/primitives");
  const index = await programmesCard();
  await user.click(within(index).getByRole("button", { name: new RegExp(`^${label}`) }));
}

describe("Programmes demo states", () => {
  it("are listed under their own group in the States index", async () => {
    renderApp("#/primitives");
    const index = await programmesCard();
    expect(within(index).getAllByRole("button")).toHaveLength(DEMO_STATES.filter((s) => s.group === "Programmes").length);
  });

  it("renew with credit opens the renew dialog with the credit applied", async () => {
    const user = userEvent.setup();
    await jump(user, "Renew with credit");
    const dialog = await screen.findByRole("dialog", { name: "Renew" });
    expect(await within(dialog).findByText("Credit applied")).toBeInTheDocument();
  });

  it("a coach's view signs in as the coach", async () => {
    const user = userEvent.setup();
    await jump(user, "A coach's view");
    expect(await screen.findByRole("button", { name: "Add a child" })).toHaveAttribute("aria-disabled", "true");
  });

  it("enrolments fail to load, then the retry works (jumped to from the desk, as a reviewer would)", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/programmes");
    await screen.findByRole("list", { name: "Programmes" });
    await user.click(screen.getByRole("button", { name: "Demo scenarios" }));
    await user.click(await screen.findByRole("tab", { name: "Jump to state" }));
    const group = await screen.findByRole("region", { name: "Programmes" });
    await user.click(within(group).getByRole("button", { name: /^Enrolments fail to load/ }));
    expect(await screen.findByText("Couldn't load enrolments")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("table", { name: "Enrolments: Everyone" })).toBeInTheDocument();
  });

  it("no programme matches: the empty state offers to clear the search", async () => {
    const user = userEvent.setup();
    await jump(user, "No programme matches");
    expect(await screen.findByText('No programme matches "Tennis"')).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear search" })).toBeInTheDocument();
  });
});
