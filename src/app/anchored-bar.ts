"use client";

import * as React from "react";

/**
 * A bar anchored to the bottom of the viewport (the booking page's action
 * bar, the desk's save bar) publishes its height as --anchored-bar-height,
 * so coss's toasts, which also live at the bottom, sit above it instead of
 * over its buttons. See theme.css.
 */
export function useAnchoredBarHeight<T extends HTMLElement>(): React.RefObject<T | null> {
  const ref = React.useRef<T>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const publish = (): void => root.style.setProperty("--anchored-bar-height", `${Math.ceil(el.getBoundingClientRect().height)}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--anchored-bar-height");
    };
  }, []);
  return ref;
}

/**
 * Publish how tall the visible toast stack is as --toast-clearance (0 when
 * there are none). Where an action bar is anchored to the bottom (a phone),
 * a toast behaves as if the bar grew: the column pads its end by the stack's
 * height (theme.css) and the page scrolls up by the same amount, so what was
 * in view above the bar is still in view above the toast, and keyboard focus
 * scrolls clear of both. Nothing the customer could see or reach is covered.
 */
export function useToastClearance(): void {
  React.useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    let previous = 0;
    const measure = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const toasts = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="toast-viewport"] > *')).filter((el) => !el.hasAttribute("data-ending-style"));
        let top = Number.POSITIVE_INFINITY;
        let bottom = 0;
        for (const el of toasts) {
          const rect = el.getBoundingClientRect();
          if (rect.height === 0) continue;
          top = Math.min(top, rect.top);
          bottom = Math.max(bottom, rect.bottom);
        }
        const height = bottom > top ? Math.ceil(bottom - top) + 12 : 0;
        if (height === previous) return;
        if (height > 0) root.style.setProperty("--toast-clearance", `${height}px`);
        else root.style.removeProperty("--toast-clearance");
        const anchored = root.style.getPropertyValue("--anchored-bar-height") !== "";
        const delta = height - previous;
        previous = height;
        // After the padding has laid out (the step may also have just re-rendered), shift the page by the difference.
        if (anchored) requestAnimationFrame(() => requestAnimationFrame(() => window.scrollBy({ top: delta, behavior: "instant" })));
      });
    };
    const mutations = new MutationObserver(measure);
    mutations.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-ending-style", "data-expanded"] });
    return () => {
      mutations.disconnect();
      cancelAnimationFrame(frame);
      root.style.removeProperty("--toast-clearance");
    };
  }, []);
}
