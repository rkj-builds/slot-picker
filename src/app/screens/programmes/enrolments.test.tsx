import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axeViolations, renderApp } from "@/app/test-utils";
import { TEAM_IDS } from "@/data/mock/seed";

function rowOf(table: HTMLElement, name: string): HTMLElement {
  const row = within(table).getByText(name).closest("tr");
  if (!row) throw new Error(`no row for ${name}`);
  return row;
}

describe("enrolments", () => {
  it("opens on To chase: who owes, and whose period runs out within 3 days", async () => {
    renderApp("#/desk/enrolments");
    const table = await screen.findByRole("table", { name: "Enrolments: To chase" });
    const names = within(table).getAllByRole("row").slice(1).map((r) => r.querySelector("td .font-medium")?.textContent);
    expect(names).toEqual(["Aanya Sharma", "Pari Reddy", "Kiara Singh", "Vivaan Nair", "Advik Iyer", "Nisha Hembram"]);
    expect(within(rowOf(table, "Advik Iyer")).getByText("Father said he'll pay on Saturday")).toBeInTheDocument();
    expect(within(rowOf(table, "Advik Iyer")).getByRole("button", { name: "Take payment for Advik Iyer" })).toBeInTheDocument();
    expect(within(rowOf(table, "Aanya Sharma")).getByText("Ends today")).toBeInTheDocument();
    expect(within(rowOf(table, "Aanya Sharma")).getByRole("button", { name: "Renew for Aanya Sharma" })).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("tabs are URLs; search finds a child by their parent; the programme chip filters and clears", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/enrolments/paused");
    expect(await screen.findByRole("table", { name: "Enrolments: Paused" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: /^Everyone/ }));
    const everyone = await screen.findByRole("table", { name: "Enrolments: Everyone" });
    expect(within(everyone).getAllByRole("row")).toHaveLength(22);

    await user.type(screen.getByRole("searchbox", { name: "Search by child or parent" }), "aarav");
    await waitFor(() => expect(within(screen.getByRole("table", { name: "Enrolments: Everyone" })).getAllByRole("row")).toHaveLength(3));

    await user.clear(screen.getByRole("searchbox", { name: "Search by child or parent" }));
    await user.click(screen.getByRole("button", { name: "Programme" }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Adult beginners" }));
    await waitFor(() => expect(window.location.hash).toContain("programme=prg_beginners"));
    expect(within(screen.getByRole("table", { name: "Enrolments: Everyone" })).getAllByRole("row")).toHaveLength(6);
    await user.click(screen.getByRole("button", { name: "Clear the programme filter (Adult beginners)" }));
    await waitFor(() => expect(within(screen.getByRole("table", { name: "Enrolments: Everyone" })).getAllByRole("row")).toHaveLength(22));
  });

  it("renew previews the new paid-until with credit applied, then takes the rest", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/enrolments");
    await user.click(await screen.findByRole("button", { name: "Renew for Aanya Sharma" }));
    const dialog = await screen.findByRole("dialog", { name: "Renew" });
    const preview = within(dialog).getByRole("region", { name: "What renewing does" });
    expect(await within(preview).findByText("Credit applied")).toBeInTheDocument();
    expect(within(preview).getByText("−₹700")).toBeInTheDocument();
    expect(within(preview).getByText("₹1,800")).toBeInTheDocument();
    expect(within(preview).getByText("Sunday, 15 November 2026")).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: "Amount received" })).toHaveValue("₹1,800");
    expect(await axeViolations()).toEqual([]);
    await user.click(within(dialog).getByRole("button", { name: "Renew until Sun, 15 Nov" }));
    expect(await screen.findByText("Aanya Sharma renewed until Sun, 15 Nov")).toBeInTheDocument();
    expect(screen.getByText("₹1,800 cash taken · ₹700 credit used")).toBeInTheDocument();
  });

  it("renew opens from a link, and warns when the child still owes", async () => {
    renderApp("#/desk/enrolments/running?renew=enr_j4");
    const dialog = await screen.findByRole("dialog", { name: "Renew" });
    expect(within(dialog).getByText("Advik still owes ₹2,500 for this period. Take that before renewing.")).toBeInTheDocument();
  });

  it("stop needs a reason, then offers undo", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/enrolments/running");
    const table = await screen.findByRole("table", { name: "Enrolments: Running" });
    await user.click(within(rowOf(table, "Myra Verma")).getByRole("button", { name: "More for Myra Verma" }));
    await user.click(await screen.findByRole("menuitem", { name: "Stop" }));
    const dialog = await screen.findByRole("dialog", { name: "Stop Myra's enrolment?" });
    await user.click(within(dialog).getByRole("button", { name: "Stop Myra" }));
    expect(await within(dialog).findByText("Required")).toBeInTheDocument();
    expect(within(dialog).getByText("Say why they're stopping, so the team doesn't chase them.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Moved away" }));
    await user.click(within(dialog).getByRole("button", { name: "Stop Myra" }));
    expect(await screen.findByText("Myra Verma stopped from Thu, 15 Oct")).toBeInTheDocument();
    await waitFor(() => expect(within(screen.getByRole("table", { name: "Enrolments: Running" })).queryByText("Myra Verma")).toBeNull());
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(await within(screen.getByRole("table", { name: "Enrolments: Running" })).findByText("Myra Verma")).toBeInTheDocument();
  });

  it("pause previews the new paid-until", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/enrolments/running");
    const table = await screen.findByRole("table", { name: "Enrolments: Running" });
    await user.click(within(rowOf(table, "Krish Hembram")).getByRole("button", { name: "More for Krish Hembram" }));
    await user.click(await screen.findByRole("menuitem", { name: "Pause" }));
    const dialog = await screen.findByRole("dialog", { name: "Pause" });
    expect(await within(dialog).findByText(/Paid until moves from Sun, 8 Nov to/)).toHaveTextContent("Paid until moves from Sun, 8 Nov to Sunday, 22 November 2026.");
    await user.click(within(dialog).getByRole("button", { name: "Pause Krish" }));
    expect(await screen.findByText("Krish Hembram paused until Wed, 28 Oct")).toBeInTheDocument();
  });

  it("give money back: previews the unused share, keeps it as credit", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/enrolments/running");
    const table = await screen.findByRole("table", { name: "Enrolments: Running" });
    await user.click(within(rowOf(table, "Krish Hembram")).getByRole("button", { name: "More for Krish Hembram" }));
    await user.click(await screen.findByRole("menuitem", { name: "Give money back" }));
    const dialog = await screen.findByRole("dialog", { name: "Give money back" });
    await waitFor(() => expect(dialog).toHaveTextContent("Unused share: ₹2,083 (25 of 30 days unused)."));
    expect(await axeViolations()).toEqual([]);
    await user.click(within(dialog).getByRole("button", { name: "Keep ₹2,083 as credit" }));
    expect(await screen.findByText("₹2,083 kept as credit for Krish Hembram")).toBeInTheDocument();
  });

  it("follow-up note saves and shows on the row", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/enrolments");
    const table = await screen.findByRole("table", { name: "Enrolments: To chase" });
    await user.click(within(rowOf(table, "Pari Reddy")).getByRole("button", { name: "More for Pari Reddy" }));
    await user.click(await screen.findByRole("menuitem", { name: "Follow-up note" }));
    const dialog = await screen.findByRole("dialog", { name: "Follow-up for Pari" });
    await user.type(within(dialog).getByRole("textbox", { name: "Note" }), "Called, mother pays Friday");
    await user.click(within(dialog).getByRole("button", { name: "Save note" }));
    expect(await screen.findByText("Follow-up saved for Pari Reddy")).toBeInTheDocument();
    expect(await within(screen.getByRole("table", { name: "Enrolments: To chase" })).findByText("Called, mother pays Friday")).toBeInTheDocument();
  });

  it("add a child: an age outside the range is refused on the field", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/enrolments?add=1");
    const dialog = await screen.findByRole("dialog", { name: "Add a child" });
    await user.type(within(dialog).getByRole("textbox", { name: "Child's name" }), "Tia Roy");
    await user.type(within(dialog).getByRole("textbox", { name: "Age" }), "17");
    await user.click(within(dialog).getByRole("combobox", { name: "Parent" }));
    await user.click(await screen.findByRole("option", { name: /Ishaan Verma/ }));
    await user.click(within(dialog).getByRole("button", { name: "Add child" }));
    expect(await within(dialog).findByText("This programme is for ages 8 to 14")).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: "Age" })).toHaveAttribute("aria-invalid", "true");
    expect(await axeViolations()).toEqual([]);
  });

  it("a coach sees their programmes' children, and money buttons say why they're off", async () => {
    renderApp("#/desk/enrolments", { memberId: TEAM_IDS.coach });
    const table = await screen.findByRole("table", { name: "Enrolments: To chase" });
    const pay = within(rowOf(table, "Advik Iyer")).getByRole("button", { name: "Take payment for Advik Iyer" });
    expect(pay).toHaveAttribute("aria-disabled", "true");
    expect(pay).toHaveAccessibleDescription("Coach can't take or record money. Ask an admin.");
    expect(screen.getByRole("button", { name: "Add a child" })).toHaveAttribute("aria-disabled", "true");
  });
});
