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
        <Waitlist item="Senior Product Design Engineer at Cal.com" onJoin={() => Promise.resolve(FRONT)} status="Every slot taken" {...props} />
      </main>
    </ToastProvider>
  );
}

describe("Waitlist", () => {
  it("joins: busy while pending, then the place in line takes focus and the live region says so", async () => {
    const user = userEvent.setup();
    const join = deferred();
    render(<Demo onJoin={join.onJoin} />);
    const card = screen.getByText("Every slot taken").closest("[data-slot=waitlist]")!;
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

  it("shows the rejection on the reserved line and offers the same button as the retry", async () => {
    const user = userEvent.setup();
    const onJoin = vi.fn<() => Promise<WaitlistPlace>>().mockRejectedValueOnce(new Error("The list did not answer. Nothing was lost.")).mockResolvedValueOnce(FRONT);
    render(<Demo onJoin={onJoin} />);
    const line = screen.getByRole("alert");
    expect(line).toHaveTextContent("");
    expect(line).toHaveClass("min-h-5");
    await user.click(screen.getByRole("button", { name: "Join the waitlist" }));
    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(line).toHaveTextContent("The list did not answer. Nothing was lost.");
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

  it("does not steal focus when it mounts already joined", () => {
    render(<Demo place={FRONT} state="joined" />);
    expect(document.activeElement).toBe(document.body);
  });

  it("mirrors the position arrow in a right-to-left layout", () => {
    render(
      <DirectionProvider direction="rtl">
        <div dir="rtl">
          <Demo place={FRONT} state="joined" />
        </div>
      </DirectionProvider>,
    );
    const arrow = screen.getByRole("group", { name: /Position 1/ }).querySelector("svg");
    expect(arrow).toHaveClass("rtl:rotate-180");
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
