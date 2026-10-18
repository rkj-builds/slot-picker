import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { asPhone } from "@/app/screens/team/as-phone";
import { axeViolations, renderApp } from "@/app/test-utils";
import { TEAM_IDS } from "@/data/mock/seed";

async function table(name = "Team members"): Promise<HTMLElement> {
  return screen.findByRole("table", { name });
}

function rowOf(container: HTMLElement, name: string): HTMLElement {
  const row = within(container)
    .getAllByRole("row")
    .find((r) => r.textContent?.includes(name));
  if (!row) throw new Error(`no row for ${name}`);
  return row;
}

describe("#/desk/team", () => {
  let restore: (() => void) | null = null;
  afterEach(() => {
    restore?.();
    restore = null;
  });

  it("lists the team with role, status and last seen, admins first", async () => {
    renderApp("#/desk/team");
    const members = await table();
    const rows = within(members).getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getAllByRole("cell")[0]?.textContent)).toEqual([
      "AKAsha Kumar (you)asha@example.com",
      "VDVikram Dasvikram@example.com",
      "STSunil Tudusunil@example.com",
      "NRNeha Rawatneha@example.com",
      "FAFarhan Alifarhan@example.com",
    ]);
    expect(within(rowOf(members, "Farhan Ali")).getByText("Invited")).toBeInTheDocument();
    expect(within(rowOf(members, "Farhan Ali")).getByText("Invited 2 days ago")).toBeInTheDocument();
    expect(within(rowOf(members, "Neha Rawat")).getByText("2 programmes")).toBeInTheDocument();
    expect(within(rowOf(members, "Sunil Tudu")).getByText("Front desk")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it("invites someone: the backend's errors land on the fields, then the invite goes", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/team");
    await table();
    await user.click(screen.getByRole("button", { name: "Invite someone" }));
    const dialog = await screen.findByRole("dialog", { name: "Invite someone" });
    expect(window.location.hash).toBe("#/desk/team?invite=1");
    await user.type(within(dialog).getByRole("textbox", { name: "Email" }), "sunil@example.com");
    await user.click(within(dialog).getByRole("radio", { name: /^Coach/ }));
    await user.click(within(dialog).getByRole("button", { name: "Send invite" }));
    expect(await within(dialog).findByText("Who are you inviting?")).toBeInTheDocument();
    expect(within(dialog).getByText("Someone on the team already uses this email")).toBeInTheDocument();
    expect(within(dialog).getByText("A coach needs at least one programme")).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: "Name" })).toHaveAttribute("aria-invalid", "true");
    expect(await axeViolations()).toEqual([]);

    await user.type(within(dialog).getByRole("textbox", { name: "Name" }), "Meera Nair");
    const email = within(dialog).getByRole("textbox", { name: "Email" });
    await user.clear(email);
    await user.type(email, "meera@example.com");
    await user.click(within(dialog).getByRole("checkbox", { name: "Off-Screen Club Juniors" }));
    await user.click(within(dialog).getByRole("button", { name: "Send invite" }));
    expect(await screen.findByText("Invite sent to Meera Nair")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Invite someone" })).toBeNull());
    expect(window.location.hash).toBe("#/desk/team");
    const row = rowOf(await table(), "Meera Nair");
    expect(within(row).getByText("Coach")).toBeInTheDocument();
    expect(within(row).getByText("1 programme")).toBeInTheDocument();
  });

  it("opens the invite with mistakes already checked (the demo's state)", async () => {
    renderApp("#/desk/team?invite=check");
    const dialog = await screen.findByRole("dialog", { name: "Invite someone" });
    expect(await within(dialog).findByText("Someone on the team already uses this email")).toBeInTheDocument();
  });

  it("changes a role, disables access with a confirm and Undo, and shows the backend's refusal", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/team");
    let members = await table();

    await user.click(within(rowOf(members, "Sunil Tudu")).getByRole("button", { name: "Actions for Sunil Tudu" }));
    await user.click(await screen.findByRole("menuitem", { name: "Change role…" }));
    const roleDialog = await screen.findByRole("dialog", { name: "Change Sunil Tudu's role" });
    await user.click(within(roleDialog).getByRole("radio", { name: /^Manager/ }));
    await user.click(within(roleDialog).getByRole("button", { name: "Change role" }));
    expect(await screen.findByText("Sunil Tudu is now a manager")).toBeInTheDocument();
    members = await table();
    await waitFor(() => expect(within(rowOf(members, "Sunil Tudu")).getByText("Manager")).toBeInTheDocument());

    await user.click(within(rowOf(members, "Vikram Das")).getByRole("button", { name: "Actions for Vikram Das" }));
    await user.click(await screen.findByRole("menuitem", { name: "Disable access…" }));
    const confirm = await screen.findByRole("alertdialog", { name: "Disable Vikram Das's access?" });
    expect(await axeViolations()).toEqual([]);
    await user.click(within(confirm).getByRole("button", { name: "Disable access" }));
    expect(await screen.findByText("Disabled Vikram Das's access")).toBeInTheDocument();
    await waitFor(() => expect(within(rowOf(screen.getByRole("table", { name: "Team members" }), "Vikram Das")).getByText("Disabled")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(await screen.findByText("Enabled Vikram Das's access")).toBeInTheDocument();

    // The only admin can't remove herself: the refusal shows in the dialog.
    await user.click(within(rowOf(screen.getByRole("table", { name: "Team members" }), "Asha Kumar")).getByRole("button", { name: "Actions for Asha Kumar" }));
    await user.click(await screen.findByRole("menuitem", { name: "Remove from team…" }));
    const remove = await screen.findByRole("alertdialog", { name: "Remove Asha Kumar from the team?" });
    await user.click(within(remove).getByRole("button", { name: "Remove from team" }));
    expect(await within(remove).findByText("You can't remove yourself.")).toBeInTheDocument();
  });

  it("sends an invite again and cancels one", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/team");
    const members = await table();
    await user.click(within(rowOf(members, "Farhan Ali")).getByRole("button", { name: "Actions for Farhan Ali" }));
    await user.click(await screen.findByRole("menuitem", { name: "Send invite again" }));
    expect(await screen.findByText("Invite sent again to Farhan Ali")).toBeInTheDocument();
    await user.click(within(rowOf(members, "Farhan Ali")).getByRole("button", { name: "Actions for Farhan Ali" }));
    await user.click(await screen.findByRole("menuitem", { name: "Cancel invite…" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Cancel Farhan Ali's invite?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel invite" }));
    expect(await screen.findByText("Cancelled Farhan Ali's invite")).toBeInTheDocument();
    await waitFor(() => expect(within(screen.getByRole("table", { name: "Team members" })).queryByText("Farhan Ali")).toBeNull());
  });

  it("a manager can look, not change, and is told why", async () => {
    renderApp("#/desk/team", { memberId: TEAM_IDS.manager });
    const members = await table();
    expect(screen.getByText(/Only an admin can invite people, change roles or access/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invite someone" })).toBeDisabled();
    expect(within(rowOf(members, "Sunil Tudu")).getByRole("button", { name: "Actions for Sunil Tudu" })).toBeDisabled();
    expect(await axeViolations()).toEqual([]);
  });

  it("isn't part of a coach's role", async () => {
    renderApp("#/desk/team", { memberId: TEAM_IDS.coach });
    expect(await screen.findByText("Team isn't part of your role")).toBeInTheDocument();
  });

  it("stacks the members as rows on a phone", async () => {
    restore = asPhone();
    renderApp("#/desk/team");
    const list = await screen.findByRole("list", { name: "Team members" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("#/desk/team/roles", () => {
  it("is a draft until saved: unsaved bar, save, and the toast", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/team/roles");
    const matrix = await table("Roles and access");
    expect(within(matrix).getByRole("checkbox", { name: "Admin: Settings, always" })).toHaveAttribute("aria-disabled", "true");
    const deskPayments = within(matrix).getByRole("checkbox", { name: "Front desk: Payments" });
    expect(deskPayments).not.toBeChecked();
    expect(screen.getByText("All changes saved")).toBeInTheDocument();
    await user.click(deskPayments);
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Save access" }));
    expect(await screen.findByText("Access saved")).toBeInTheDocument();
    expect(await screen.findByText("All changes saved")).toBeInTheDocument();
    expect(within(await table("Roles and access")).getByRole("checkbox", { name: "Front desk: Payments" })).toBeChecked();
  });

  it("opens with an unsaved change for the demo, and Discard drops it", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/team/roles?demo=unsaved");
    const matrix = await table("Roles and access");
    expect(within(matrix).getByRole("checkbox", { name: "Front desk: Payments" })).toBeChecked();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(within(matrix).getByRole("checkbox", { name: "Front desk: Payments" })).not.toBeChecked();
  });

  it("is read-only for a manager", async () => {
    renderApp("#/desk/team/roles", { memberId: TEAM_IDS.manager });
    const matrix = await table("Roles and access");
    expect(within(matrix).getByRole("checkbox", { name: "Coach: Programmes" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("button", { name: "Save access" })).toBeNull();
  });
});

describe("#/desk/team/devices", () => {
  it("signs a device out after a confirm; the one in use can't be", async () => {
    const user = userEvent.setup();
    renderApp("#/desk/team/devices");
    const devices = await table("Signed-in devices");
    const current = rowOf(devices, "Chrome on Mac");
    expect(within(current).getByText("This device")).toBeInTheDocument();
    expect(within(current).queryByRole("button")).toBeNull();
    expect(await axeViolations()).toEqual([]);
    await user.click(within(devices).getByRole("button", { name: "Sign out Chrome on Android, Sunil Tudu" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Sign out Chrome on Android?" });
    await user.click(within(dialog).getByRole("button", { name: "Sign out device" }));
    expect(await screen.findByText("Signed out Chrome on Android")).toBeInTheDocument();
    await waitFor(() => expect(within(screen.getByRole("table", { name: "Signed-in devices" })).queryByText("Chrome on Android")).toBeNull());
  });

  it("a manager is refused the device list, in words", async () => {
    renderApp("#/desk/team/devices", { memberId: TEAM_IDS.manager });
    expect(await screen.findByText("You can't see signed-in devices")).toBeInTheDocument();
    expect(screen.getByText("Manager can't manage the team. Ask an admin.")).toBeInTheDocument();
  });
});
