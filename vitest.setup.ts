import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { installCookieStoreShim } from "@/app/cookie-store-shim";

installCookieStoreShim();

beforeEach(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* jsdom always has storage; this is belt and braces */
  }
});

afterEach(() => cleanup());

// The desk and the gallery are lazy-loaded; on a cold, parallel run the first import can take over a second.
configure({ asyncUtilTimeout: 4000 });

// jsdom has no matchMedia or object URLs; the app only needs them to exist.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      // Enough of a media engine for min-width queries against jsdom's 1024px window.
      matches: Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? Infinity) <= window.innerWidth,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
// coss's Composer sizes its input with a ResizeObserver; jsdom has no layout, so observing is a no-op.
globalThis.ResizeObserver ??= class {
  observe(): void {
    /* nothing to measure in jsdom */
  }
  unobserve(): void {
    /* nothing to measure in jsdom */
  }
  disconnect(): void {
    /* nothing to measure in jsdom */
  }
};
// Base UI's ScrollArea waits for animations, and the Composer re-measures when fonts load; jsdom has neither API.
Element.prototype.getAnimations ??= () => [];
if (!("fonts" in document)) {
  Object.defineProperty(document, "fonts", { value: { addEventListener: () => undefined, removeEventListener: () => undefined, ready: Promise.resolve() } });
}
URL.createObjectURL ??= () => "blob:test";
URL.revokeObjectURL ??= () => undefined;
