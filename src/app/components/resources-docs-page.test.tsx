import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { axeViolations, renderApp } from "@/app/test-utils";

afterEach(() => {
  document.documentElement.classList.remove("dark");
});

/** The preview's frame: the first tab panel on the page. */
function preview(): HTMLElement {
  return screen.getAllByRole("tabpanel")[0]!;
}

describe("#/components/resources", () => {
  it("renders the proposal with its API table read from the source", async () => {
    renderApp("#/components/resources");
    expect(await screen.findByRole("heading", { level: 1, name: "Resources" })).toBeInTheDocument();
    expect(screen.getByText("proposal")).toBeInTheDocument();
    expect(screen.getByText(/^A thing with hours, a capacity and its own bookings\./)).toBeInTheDocument();
    const api = screen.getByRole("heading", { name: "API reference" }).closest("section")!;
    const table = within(api).getByRole("table");
    expect(within(table).getAllByRole("row").length).toBe(20); // a header row and 19 props
    expect(within(table).getByText("onSaveResource")).toBeInTheDocument();
    expect(within(table).getByText('"list"')).toBeInTheDocument();
    expect(within(api).queryByText("No description yet.")).toBeNull();
    expect(screen.getByRole("link", { name: /Book a time to argue about the API/ })).toHaveAttribute("href", "https://cal.com/rahul-kumar-jha-ll9vhj/30min");
  });

  it("opens with four screens in order, ending on the live list", async () => {
    renderApp("#/components/resources");
    await screen.findByRole("heading", { level: 1, name: "Resources" });
    const story = screen.getByRole("region", { name: "I built this so Cal.com can book a thing, not only a person." });
    const steps = Array.from(story.querySelector("ol")!.children) as HTMLElement[];
    expect(steps.map((s) => within(s).getByRole("heading", { level: 3 }).textContent)).toEqual(["People asked for it.", "Cal.com said: needs design.", "I hit the wall myself.", "A thing isn’t a person."]);
    expect(within(story).getAllByRole("img").map((i) => i.getAttribute("alt"))).toEqual([expect.stringMatching(/^GitHub issue 13745/), expect.stringMatching(/needs design/), expect.stringMatching(/^Cal\.com’s help centre/)]);
    // The last step is the Resources page itself, without the sidebar: two courts, their hours, no picture.
    const last = steps[3]!;
    expect(within(last).queryByRole("img")).toBeNull();
    expect(within(last).queryByRole("navigation", { name: "Cal.com" })).toBeNull();
    const rows = within(last).getByRole("list", { name: "Resources" });
    expect(within(rows).getAllByRole("listitem")).toHaveLength(2);
    expect(within(rows).getByRole("button", { name: "Court 1" })).toBeInTheDocument();
    expect(within(rows).getAllByText("Mon–Fri")).toHaveLength(2);
    expect(within(rows).getAllByText("6:00 am – 10:00 pm")).toHaveLength(2);
  });

  it("shows the list in Cal.com's shell: the sidebar with Resources beside Availability", async () => {
    renderApp("#/components/resources");
    await screen.findByRole("heading", { level: 1, name: "Resources" });
    const nav = within(preview()).getByRole("navigation", { name: "Cal.com" });
    const labels = within(nav)
      .getAllByRole("button")
      .map((b) => b.textContent?.replace("New", "").trim());
    expect(labels).toEqual(["Home", "Links", "Events", "Bookings", "Availability", "Resources", "Teams", "Apps", "Routing", "Workflows", "Insights"]);
    expect(within(nav).getByRole("button", { name: /^Resources/ })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("button", { name: "Teams" })).toBeDisabled();
    expect(within(preview()).getAllByText("1 booking at a time · up to 4 people")).toHaveLength(2);
  });

  it("opens a court from the list, with its hours in Availability's shape", async () => {
    const user = userEvent.setup();
    renderApp("#/components/resources");
    await screen.findByRole("heading", { level: 1, name: "Resources" });
    await user.click(within(preview()).getByRole("button", { name: "Court 1" }));
    expect(await within(preview()).findByRole("heading", { level: 2, name: "Court 1" })).toBeInTheDocument();
    expect(within(preview()).getByRole("textbox", { name: "Name" })).toHaveValue("Court 1");
    expect(within(preview()).getByRole("textbox", { name: "Bookings at once" })).toHaveValue("1");
    await user.click(within(preview()).getByRole("button", { name: "Hours" }));
    const rows = within(preview()).getByRole("list", { name: "Hours by day" });
    expect(within(rows).getAllByRole("listitem")).toHaveLength(7);
    expect(within(rows).getByRole("switch", { name: "Open on Monday" })).toBeChecked();
    expect(within(rows).getByRole("combobox", { name: "Saturday closes" })).toHaveTextContent("11:00 pm");
    expect(window.location.hash).toBe("#/components/resources?screen=resource");
  });

  it("holds a screen from the URL: the link's new page, with both courts on it", async () => {
    renderApp("#/components/resources?screen=link");
    await screen.findByRole("heading", { level: 1, name: "Resources" });
    const who = within(preview()).getByRole("radiogroup", { name: "Who is booked" });
    expect(within(who).getByRole("radio", { name: /^A resource/ })).toBeChecked();
    expect(within(preview()).getByRole("button", { name: /^Who is booked/ })).toHaveAttribute("aria-current", "page");
    // Base UI names the chips input after the Field's label and gives it the combobox role.
    const chips = within(preview()).getByRole("combobox", { name: "Any free one of" }).closest("[data-slot=combobox-chips]") as HTMLElement;
    expect(within(chips).getByText("Court 1")).toBeInTheDocument();
    expect(within(chips).getByText("Court 2")).toBeInTheDocument();
    expect(within(preview()).getByText("The host stays free")).toBeInTheDocument();
  });

  it("flips the link to a person and 7 pm goes busy in the live preview, then free again", async () => {
    const user = userEvent.setup();
    renderApp("#/components/resources?screen=link");
    await screen.findByRole("heading", { level: 1, name: "Resources" });
    const starts = (): HTMLElement => within(preview()).getByRole("radiogroup", { name: "Start time" });
    // As a resource: Court 1 is taken at 7 pm, Court 2 is free, so 7 pm is offered.
    expect(within(starts()).getByRole("radio", { name: "7:00 pm" })).not.toHaveAttribute("aria-disabled");
    await user.click(within(preview()).getByRole("radio", { name: /^A person/ }));
    expect(within(starts()).getByRole("radio", { name: /^7:00 pm, / })).toHaveAttribute("aria-disabled", "true");
    expect(within(starts()).getByRole("radio", { name: /^6:30 pm, / })).toHaveAttribute("aria-disabled", "true");
    expect(within(starts()).getByRole("radio", { name: "8:00 pm" })).not.toHaveAttribute("aria-disabled");
    await user.click(within(preview()).getByRole("radio", { name: /^A resource/ }));
    expect(within(starts()).getByRole("radio", { name: "7:00 pm" })).not.toHaveAttribute("aria-disabled");
  });

  it("books 7 pm from the booking page and it lands on Court 2", async () => {
    const user = userEvent.setup();
    renderApp("#/components/resources?screen=book");
    await screen.findByRole("heading", { level: 1, name: "Resources" });
    const page = preview();
    await user.click(within(page).getByRole("radio", { name: "7:00 pm" }));
    expect(within(page).getByRole("status")).toHaveTextContent("Any free court: this one lands on Court 2.");
    await user.type(within(page).getByRole("textbox", { name: "Your name" }), "Meera Nair");
    await user.click(within(page).getByRole("button", { name: "Book" }));
    const done = await within(page).findByText("Booked");
    const card = done.closest("[data-slot=booker-done]") as HTMLElement;
    expect(within(card).getByText("Court 2 · Mon, 2 Nov · 7:00 – 8:00 pm")).toBeInTheDocument();
    expect(within(card).getByText("Meera")).toBeInTheDocument();
    // Now both courts are taken at 7 pm: the start reads as taken.
    expect(within(page).getByRole("radio", { name: /^7:00 pm, / })).toHaveAttribute("aria-disabled", "true");
  });

  it("shows the day by resource: one tab stop, the agent's booking as a cell", async () => {
    renderApp("#/components/resources?screen=bookings");
    await screen.findByRole("heading", { level: 1, name: "Resources" });
    const grid = within(preview()).getByRole("group", { name: "Bookings by resource, Mon, 2 Nov" });
    expect(within(grid).getByRole("group", { name: "Court 1" })).toBeInTheDocument();
    expect(within(grid).getByRole("group", { name: "Court 2" })).toBeInTheDocument();
    const cell = within(grid).getByRole("button", { name: "Court 1, 7:00 – 8:00 pm, Rahul · 4 players, from WhatsApp" });
    expect(cell).toHaveAttribute("tabindex", "0");
  });

  it("runs the preview right-to-left from the URL", async () => {
    renderApp("#/components/resources?dir=rtl");
    await screen.findByRole("heading", { level: 1, name: "Resources" });
    const frame = preview().querySelector("[data-slot=direction-frame]");
    expect(frame).toHaveAttribute("dir", "rtl");
  });

  it.each([
    ["light", "#/components/resources?theme=light"],
    ["dark", "#/components/resources?theme=dark&screen=link"],
    ["rtl", "#/components/resources?dir=rtl&screen=bookings"],
    ["book", "#/components/resources?screen=book"],
  ])("has no axe violations (%s)", async (_, hash) => {
    renderApp(hash);
    await screen.findByRole("heading", { level: 1, name: "Resources" });
    expect(await axeViolations()).toEqual([]);
  });
});
