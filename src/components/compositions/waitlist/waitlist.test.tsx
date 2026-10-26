import { DirectionProvider } from "@base-ui/react/direction-provider";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { axeViolations } from "@/app/test-utils";
import { Waitlist, type WaitlistPlace } from "@/components/compositions/waitlist";
import { ToastProvider } from "@/components/ui/toast";

const FRONT: WaitlistPlace = { position: 1, ahead: [] };

/** A join that the test resolves or rejects by hand, so the pending state can be looked at. */
function deferred(): { onJoin: () => Promise<WaitlistPlace>; resolve: (p: WaitlistPlace) => void; reject: (e: unknown) => void } {
  let resolve!: (p: WaitlistPlace) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<WaitlistPlace>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { onJoin: () => promise, resolve, reject };
}

function Demo(props: Partial<React.ComponentProps<typeof Waitlist>>): React.ReactElement {
  // Inside a landmark, as it would be on a page; axe's "region" rule expects one.
  return (
    <ToastProvider>
      <main>
        <Waitlist item="Senior Product Design Engineer at Cal.com" meta="Your time: GMT−4 · New York" onJoin={() => Promise.resolve(FRONT)} slots={["9:00 AM", "11:00 AM", "1:00 PM"]} status="Full" {...props} />
      </main>
    </ToastProvider>
  );
}

describe("Waitlist", () => {
  it("joins: busy while pending, then the place in line takes focus and the live region says so", async () => {
    const user = userEvent.setup();
    const join = deferred();
    render(<Demo onJoin={join.onJoin} />);
    const card = screen.getByText("Full").closest("[data-slot=waitlist]")!;
    expect(card).toHaveAttribute("data-state", "idle");
    expect(screen.getByRole("status")).toHaveTextContent("");

    await user.click(screen.getByRole("button", { name: "Join the waitlist" }));
    expect(card).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: /Checking for cancellations/ })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Checking for cancellations…");

    await act(async () => {
      join.resolve(FRONT);
      await Promise.resolve();
    });
    expect(card).toHaveAttribute("data-state", "joined");
    expect(card).not.toHaveAttribute("aria-busy");
    const position = screen.getByRole("group", { name: "Position 1, nobody ahead of you" });
    expect(document.activeElement).toBe(position);
    expect(screen.getByRole("status")).toHaveTextContent("You're on the list. Position 1, nobody ahead of you.");
    expect(screen.queryByRole("button", { name: "Join the waitlist" })).toBeNull();
    expect(screen.getByRole("button", { name: "Leave the list" })).toBeInTheDocument();
  });

  it("keeps the button's labels stacked in one cell, so the width never changes", async () => {
    const user = userEvent.setup();
    const join = deferred();
    render(<Demo onJoin={join.onJoin} />);
    const button = screen.getByRole("button", { name: "Join the waitlist" });
    const cells = within(button).getAllByText(/Join the waitlist|Checking for cancellations|Try again/);
    expect(cells).toHaveLength(3);
    const visible = (): string[] => cells.filter((el) => !el.classList.contains("invisible")).map((el) => el.textContent ?? "");
    expect(visible()).toEqual(["Join the waitlist"]);
    expect(cells.filter((el) => el.getAttribute("aria-hidden") === "true")).toHaveLength(2);
    await user.click(button);
    expect(visible()).toEqual(["Checking for cancellations…"]);
  });

  it("shows the rejection in place of the footer line, and offers the same button as the retry", async () => {
    const user = userEvent.setup();
    const onJoin = vi.fn<() => Promise<WaitlistPlace>>().mockRejectedValueOnce(new Error("The list did not answer. Nothing was lost.")).mockResolvedValueOnce(FRONT);
    render(<Demo onJoin={onJoin} />);
    const line = screen.getByRole("alert");
    expect(line).toHaveTextContent("");
    // Same grid cell as the time-zone line, so the swap never changes the card's height.
    expect(line).toHaveClass("[grid-area:1/1]");
    expect(screen.getByText("Your time: GMT−4 · New York")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Join the waitlist" }));
    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(line).toHaveTextContent("The list did not answer. Nothing was lost.");
    expect(screen.getByText("Your time: GMT−4 · New York").closest("[aria-hidden=true]")).not.toBeNull();
    expect(screen.getByRole("status")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("group", { name: /Position 1/ })).toBeInTheDocument();
    expect(onJoin).toHaveBeenCalledTimes(2);
  });

  it("asks before leaving; Escape closes and focus returns; a refused cancel keeps the place", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn(() => false);
    render(<Demo onCancel={onCancel} place={FRONT} state="joined" />);
    const leave = screen.getByRole("button", { name: "Leave the list" });
    await user.click(leave);
    const dialog = await screen.findByRole("alertdialog", { name: "Are you sure?" });
    expect(within(dialog).getByText(/nobody behind you either/)).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(document.activeElement).toBe(leave);

    await user.click(leave);
    await user.click(await screen.findByRole("button", { name: "Leave" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByRole("group", { name: /Position 1/ })).toBeInTheDocument();
  });

  it("shows the taken slots as a named list, each read as taken, and swaps them for the place once joined", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const list = screen.getByRole("list", { name: "Full: every slot taken" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).getAllByRole("listitem")[0]).toHaveTextContent("9:00 AM taken");
    expect(screen.getByText("Full")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Join the waitlist" }));
    expect(await screen.findByRole("group", { name: /Position 1/ })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /every slot taken/ })).toBeNull();
    expect(screen.getByText("On the list")).toBeInTheDocument();
  });

  it("does not steal focus when it mounts already joined", () => {
    render(<Demo place={FRONT} state="joined" />);
    expect(document.activeElement).toBe(document.body);
  });

  it("mirrors in right-to-left with no physical-side classes anywhere in the card", () => {
    render(
      <DirectionProvider direction="rtl">
        <div dir="rtl">
          <Demo place={FRONT} state="joined" />
        </div>
      </DirectionProvider>,
    );
    const card = screen.getByText("On the list").closest("[data-slot=waitlist]")!;
    const classes = [card, ...card.querySelectorAll("*")].flatMap((el) => [...el.classList]);
    // Logical properties only (ms-, ps-, start-, text-start): a left/right class would not flip.
    expect(classes.filter((c) => /^(-?m[lr]|p[lr]|left|right|text-(left|right)|rounded-[lr])(-|$)/.test(c))).toEqual([]);
  });

  it("has no axe violations idle, joined, or with the question open", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Demo />);
    expect(await axeViolations()).toEqual([]);
    unmount();
    render(<Demo place={FRONT} state="joined" />);
    expect(await axeViolations()).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Leave the list" }));
    await screen.findByRole("alertdialog");
    expect(await axeViolations({ popupOpen: true })).toEqual([]);
  });
});
