import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BookCallButton } from "@/app/components/book-call-button";
import { CAL_EMBED_SRC, resetCalEmbedForTests } from "@/lib/cal-embed";

afterEach(() => {
  resetCalEmbedForTests();
  document.documentElement.classList.remove("dark");
});

function setup(): HTMLAnchorElement {
  render(<BookCallButton calLink="rahul/30min">Book a time</BookCallButton>);
  return screen.getByRole("link", { name: /Book a time/ });
}

function embedScript(): HTMLScriptElement {
  const s = document.querySelector<HTMLScriptElement>(`script[src="${CAL_EMBED_SRC}"]`);
  if (!s) throw new Error("embed.js was not requested");
  return s;
}

/** A click as the browser sees it; the return value says whether the link would still be followed. */
function click(link: HTMLElement): boolean {
  return fireEvent.click(link);
}

describe("BookCallButton", () => {
  it("is a plain link to the booking page, and loads nothing until someone shows intent", () => {
    const link = setup();
    expect(link).toHaveAttribute("href", "https://cal.com/rahul/30min");
    expect(link).toHaveAttribute("target", "_blank");
    expect(document.querySelector("script[data-cal-embed]")).toBeNull();
    expect(click(link)).toBe(true); // not loaded yet: the link opens normally
  });

  it("opens Cal.com's pop-up once embed.js has loaded, in the page's theme", async () => {
    const link = setup();
    fireEvent.pointerEnter(link);
    await act(async () => {
      embedScript().dispatchEvent(new Event("load"));
      await Promise.resolve();
    });
    expect(link).toHaveAttribute("data-cal-ready");
    const ns = window.Cal?.ns?.waitlist;
    expect(ns).toBeDefined();
    const spy = vi.fn();
    if (window.Cal?.ns) window.Cal.ns.waitlist = Object.assign(spy, { q: [] });
    document.documentElement.classList.add("dark");
    expect(click(link)).toBe(false); // the pop-up opens instead of a new tab
    expect(spy).toHaveBeenCalledWith("modal", { calLink: "rahul/30min", config: { layout: "month_view", theme: "dark" } });
  });

  it("queues init and its UI options in the namespace, the way the dashboard snippet does", async () => {
    const link = setup();
    fireEvent.focus(link);
    await act(async () => {
      embedScript().dispatchEvent(new Event("load"));
      await Promise.resolve();
    });
    expect(window.Cal?.q).toContainEqual(["initNamespace", "waitlist"]);
    expect(window.Cal?.ns?.waitlist?.q).toContainEqual(["init", "waitlist", { origin: "https://cal.com" }]);
    expect(window.Cal?.ns?.waitlist?.q).toContainEqual(["ui", { layout: "month_view", hideEventTypeDetails: false }]);
  });

  it("stays a link when the script is blocked, and a later hover tries again", async () => {
    const link = setup();
    fireEvent.pointerEnter(link);
    await act(async () => {
      embedScript().dispatchEvent(new Event("error"));
      await Promise.resolve();
    });
    expect(link).not.toHaveAttribute("data-cal-ready");
    expect(click(link)).toBe(true);
    expect(document.querySelector("script[data-cal-embed]")).toBeNull();
    fireEvent.pointerEnter(link);
    expect(embedScript()).toBeInTheDocument();
  });
});
