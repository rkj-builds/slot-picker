/**
 * coss's Sidebar remembers collapsed/expanded with the Cookie Store API
 * (`cookieStore.set`). Browsers without it (and jsdom) would reject that
 * promise on every toggle, so give them a no-op: the state still works,
 * it just is not remembered across reloads there.
 */
interface CookieStoreLike {
  set: (options: unknown) => Promise<void>;
}

export function installCookieStoreShim(): void {
  const scope = globalThis as unknown as { cookieStore?: CookieStoreLike };
  scope.cookieStore ??= { set: () => Promise.resolve() };
}
