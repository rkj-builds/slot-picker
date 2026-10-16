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
