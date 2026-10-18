/**
 * Tests only. A phone-sized window (390px): the test setup's matchMedia only
 * reads min-width, so max-width queries (useMediaQuery("max-md")) are
 * answered here too. Returns the undo.
 */
export function asPhone(): () => void {
  const original = Object.getOwnPropertyDescriptor(window, "matchMedia");
  const matchMedia = (query: string): MediaQueryList => {
    const min = /min-width:\s*(\d+)px/.exec(query)?.[1];
    const max = /max-width:\s*(\d+)px/.exec(query)?.[1];
    const matches = (min !== undefined || max !== undefined) && (min === undefined || Number(min) <= 390) && (max === undefined || 390 <= Number(max));
    return {
      matches,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    } as MediaQueryList;
  };
  Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: matchMedia });
  return () => {
    if (original) Object.defineProperty(window, "matchMedia", original);
  };
}
