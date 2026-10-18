import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axeViolations, goToHash, renderApp } from "@/app/test-utils";
import { TEAM_IDS } from "@/data/mock/seed";

/** Thursday 15 Oct 2026: the last juniors session was Sunday 11 Oct (not taken in the seed), the next is Saturday 17 Oct. */
const LATEST = "#/desk/programmes/prg_juniors/sessions/latest";

function openRegister(hash = LATEST): Promise<HTMLElement> {
  renderApp(hash);
  return screen.findByRole("list", { name: /^Register for/ });
}

function counts(): string {
  return document.querySelector("[data-slot=register-counts]")?.textContent ?? "";
}

describe("register", () => {
  it("lists who is expected, with owing and age badges, and passes axe", async () => {
    const list = await openRegister();
    expect(screen.getByText(/Sunday, 11 October/)).toBeInTheDocument();
    expect(within(list).getAllByRole("group", { name: /^Attendance for / })).toHaveLength(13);
    // Paused, stopped and waitlisted children aren't expected.
    expect(within(list).queryByText("Navya Kulkarni")).toBeNull();
    expect(within(list).queryByText("Sara Malhotra")).toBeNull();
    expect(within(list).queryByText("Ira Rao")).toBeNull();
    const advik = within(list).getByText("Advik Iyer").closest("li")!;
    expect(within(advik).getByText("Owes ₹2,500")).toBeInTheDocument();
    expect(counts()).toBe("Present0Absent0Not marked13");
    expect(await axeViolations()).toEqual([]);
  });

  it("marks, clears on a second tap, marks everyone, and saves after a confirm that counts the unmarked", async () => {
    const user = userEvent.setup();
    const list = await openRegister();
    const aanya = within(list).getByRole("group", { name: "Attendance for Aanya Sharma" });
    await user.click(within(aanya).getByRole("button", { name: "Present" }));
    expect(within(aanya).getByRole("button", { name: "Present" })).toHaveAttribute("aria-pressed", "true");
    expect(counts()).toBe("Present1Absent0Not marked12");
    expect(screen.getByText("1 unsaved mark")).toBeInTheDocument();

    await user.click(within(aanya).getByRole("button", { name: "Present" }));
    expect(within(aanya).getByRole("button", { name: "Present" })).toHaveAttribute("aria-pressed", "false");
    expect(counts()).toBe("Present0Absent0Not marked13");

    await user.click(within(within(list).getByRole("group", { name: "Attendance for Advik Iyer" })).getByRole("button", { name: "Absent" }));
    await user.click(within(within(list).getByRole("group", { name: "Attendance for Kian Sharma" })).getByRole("button", { name: "Present" }));
    await user.click(screen.getByRole("button", { name: "Save register" }));
    const confirm = await screen.findByRole("alertdialog", { name: "Save with 11 not marked?" });
    expect(within(confirm).getByText(/1 present and 1 absent/)).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
    await user.click(within(confirm).getByRole("button", { name: "Save register" }));
    expect(await screen.findByText("Register saved for Sun, 11 Oct")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Save register" })).toBeDisabled());
  });

  it("marks everyone present and saves without asking", async () => {
    const user = userEvent.setup();
    await openRegister();
    await user.click(screen.getByRole("button", { name: "Mark everyone present" }));
    expect(counts()).toBe("Present13Absent0Not marked0");
    await user.click(screen.getByRole("button", { name: "Save register" }));
    expect(await screen.findByText("Register saved for Sun, 11 Oct")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("asks before leaving with unsaved marks, and stays when asked to", async () => {
    const user = userEvent.setup();
    const list = await openRegister();
    await user.click(within(within(list).getByRole("group", { name: "Attendance for Aanya Sharma" })).getByRole("button", { name: "Present" }));
    await user.click(screen.getByRole("link", { name: "Off-Screen Club Juniors" }));
    const ask = await screen.findByRole("alertdialog", { name: "Leave without saving the register?" });
    expect(within(ask).getByText("1 mark isn't saved. If you leave, it's lost.")).toBeInTheDocument();
    await user.click(within(ask).getByRole("button", { name: "Stay" }));
    expect(screen.getByRole("heading", { level: 1, name: "Register" })).toBeInTheDocument();
    expect(counts()).toBe("Present1Absent0Not marked12");

    // Back or a typed address is put back too.
    await goToHash("#/desk/enrolments");
    expect(await screen.findByRole("alertdialog", { name: "Leave without saving the register?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Discard marks" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Enrolments" })).toBeInTheDocument();
  });

  it("refuses to save a session that hasn't happened, with the backend's reason", async () => {
    const user = userEvent.setup();
    await openRegister("#/desk/programmes/prg_juniors/sessions/next");
    expect(screen.getByText(/This session is on Saturday, 17 October/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mark everyone present" }));
    await user.click(screen.getByRole("button", { name: "Save register" }));
    expect(await screen.findByText("This session hasn't happened yet. Take the register on the day.")).toBeInTheDocument();
  });

  it("goes to the previous and next session", async () => {
    const user = userEvent.setup();
    await openRegister();
    await user.click(screen.getByRole("link", { name: "Next session, Sat, 17 Oct" }));
    expect(await screen.findByText(/^Saturday, 17 October 2026 · /)).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Previous session, Sun, 11 Oct" }));
    expect(await screen.findByText(/^Sunday, 11 October 2026 · /)).toBeInTheDocument();
  });

  it("adds a walk-in, who joins the register", async () => {
    const user = userEvent.setup();
    const list = await openRegister();
    await user.click(screen.getByRole("button", { name: "Add someone" }));
    const dialog = await screen.findByRole("dialog", { name: "Add a child" });
    await user.type(within(dialog).getByRole("textbox", { name: "Child's name" }), "Tia Roy");
    await user.click(within(dialog).getByRole("button", { name: "New parent" }));
    await user.type(within(dialog).getByRole("textbox", { name: "Parent's name" }), "Mitali Roy");
    await user.type(within(dialog).getByRole("textbox", { name: "WhatsApp number" }), "9000000299");
    await user.click(within(dialog).getByRole("radio", { name: /One session/ }));
    expect(await axeViolations()).toEqual([]);
    await user.click(within(dialog).getByRole("button", { name: "Add child" }));
    expect(await screen.findByText("Tia Roy enrolled in Off-Screen Club Juniors")).toBeInTheDocument();
    expect(await within(list).findByRole("group", { name: "Attendance for Tia Roy" })).toBeInTheDocument();
  });

  it("lets a coach take the register, and says why they can't add a walk-in", async () => {
    const user = userEvent.setup();
    renderApp(LATEST, { memberId: TEAM_IDS.coach });
    const list = await screen.findByRole("list", { name: /^Register for/ });
    const add = screen.getByRole("button", { name: "Add someone" });
    expect(add).toHaveAttribute("aria-disabled", "true");
    expect(add).toHaveAccessibleDescription("Coach can't change enrolments. Ask an admin.");
    await user.click(within(within(list).getByRole("group", { name: "Attendance for Aanya Sharma" })).getByRole("button", { name: "Present" }));
    await user.click(screen.getByRole("button", { name: "Save register" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Save register" }));
    expect(await screen.findByText("Register saved for Sun, 11 Oct")).toBeInTheDocument();
  });
});
