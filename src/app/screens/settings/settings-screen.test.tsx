import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { asPhone } from "@/app/screens/team/as-phone";
import { axeViolations, goToHash, renderApp } from "@/app/test-utils";
import { TEAM_IDS } from "@/data/mock/seed";

describe("#/desk/settings sections", () => {
  let restore: (() => void) | null = null;
  afterEach(() => {
    restore?.();
    restore = null;
  });

  it("opens on Booking rules, with every section a link on the left", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/settings");
    await screen.findByRole("heading", { level: 1, name: "Settings" });
    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    expect(within(nav).getByRole("link", { name: "Booking rules" })).toHaveAttribute("aria-current", "page");
    expect(await screen.findByRole("heading", { level: 2, name: "Booking rules" })).toBeInTheDocument();
    expect(await screen.findByRole("textbox", { name: "Deposit" })).toBeInTheDocument();
    await user.click(within(nav).getByRole("link", { name: "Notifications" }));
    expect(window.location.hash).toBe("#/desk/settings/notifications");
    expect(await screen.findByRole("heading", { level: 2, name: "Notifications" })).toBeInTheDocument();
  });

  it("General: the backend's errors land on the fields, then the details save", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/settings/general");
    const name = await screen.findByRole("textbox", { name: "Venue name" });
    const save = screen.getByRole("button", { name: "Save venue details" });
    expect(save).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Time zone" })).toBeInTheDocument();
    await user.clear(name);
    const email = screen.getByRole("textbox", { name: "Contact email" });
    await user.clear(email);
    await user.type(email, "hello@");
    await user.click(save);
    expect(await screen.findByText("The venue needs a name")).toBeInTheDocument();
    expect(screen.getByText("Enter an email like hello@example.com")).toBeInTheDocument();
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(await axeViolations()).toEqual([]);

    await user.type(name, "Riverside Courts");
    await user.type(email, "example.com");
    await user.click(save);
    expect(await screen.findByText("Venue details saved")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Save venue details" })).toBeDisabled());
    expect(screen.getByRole("textbox", { name: "Venue name" })).toHaveValue("Riverside Courts");
  });

  it("Notifications: a switch saves as it flips", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/settings/notifications");
    const summary = await screen.findByRole("switch", { name: "Daily summary" });
    expect(summary).not.toBeChecked();
    expect(screen.getByRole("switch", { name: "Lead waiting" })).toBeChecked();
    await user.click(summary);
    expect(await screen.findByText("Turned on the daily summary")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("switch", { name: "Daily summary" })).toBeChecked());
    expect(await axeViolations()).toEqual([]);
  });

  it("Activity: newest first, by day, with who did it; a new action shows up", async () => {
    renderApp("#/desk/settings/activity");
    const today = await screen.findByRole("region", { name: "Today" });
    const items = within(today).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Replied to Sameer Joshi on WhatsApp");
    expect(items[0]).toHaveTextContent("Sunil Tudu");
    expect(within(today).getByRole("link", { name: "Took over the chat with Ishaan Verma" })).toHaveAttribute("href", "#/desk/inbox/cnv_5");
    expect(screen.getByRole("region", { name: "Yesterday" })).toHaveTextContent("Saved attendance for Off-Screen Club Juniors");
    expect(await axeViolations()).toEqual([]);

    await goToHash("#/desk/inbox/cnv_2");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Take this" }));
    await screen.findByText("Took the chat with Pooja Rathi");
    await goToHash("#/desk/settings/activity");
    const now = await screen.findByRole("region", { name: "Today" });
    await waitFor(() => expect(within(now).getAllByRole("listitem")[0]).toHaveTextContent("Took the chat with Pooja Rathi"));
    expect(within(now).getAllByRole("listitem")[0]).toHaveTextContent("Asha Kumar");
  });

  it("is a select of sections on a phone", async () => {
    restore = asPhone();
    renderApp("#/desk/settings/activity");
    expect(await screen.findByRole("combobox", { name: "Section" })).toHaveTextContent("Activity");
    expect(screen.queryByRole("navigation", { name: "Settings sections" })).toBeNull();
  });

  it("isn't part of a coach's role", async () => {
    renderApp("#/desk/settings/general", { memberId: TEAM_IDS.coach });
    expect(await screen.findByText("Settings isn't part of your role")).toBeInTheDocument();
  });
});
