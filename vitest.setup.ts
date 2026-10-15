import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

beforeEach(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* jsdom always has storage; this is belt and braces */
  }
});

afterEach(() => cleanup());

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
URL.createObjectURL ??= () => "blob:test";
URL.revokeObjectURL ??= () => undefined;
