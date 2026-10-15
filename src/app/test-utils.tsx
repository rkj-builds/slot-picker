/**
 * Render the whole app at a hash with a pinned clock, no latency and no
 * persistence, so a test drives the real screens deterministically.
 */
import { act, render, type RenderResult } from "@testing-library/react";
import { Routes } from "@/app/app";
import { ClockProvider } from "@/app/clock";
import { type Scenarios, StoreProvider } from "@/app/store";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AppState } from "@/lib/store";
import { seedState } from "@/lib/seed";
import { instantAt } from "@/lib/time-zone";

/** Thursday 15 Oct 2026, 10:00 AM in Kolkata. */
export const TEST_NOW = instantAt("2026-10-15", 10 * 60, "Asia/Kolkata");

export function renderApp(
  hash: string,
  { state, scenarios, now = TEST_NOW }: { state?: AppState; scenarios?: Partial<Scenarios>; now?: number } = {},
): RenderResult & { state: AppState } {
  window.location.hash = hash;
  const initial = state ?? seedState(now);
  const result = render(
    <ClockProvider start={now}>
      <StoreProvider initialScenarios={scenarios} initialState={initial} latency={[0, 0]} persist={false}>
        <TooltipProvider delay={0}>
          <ToastProvider>
            <Routes />
          </ToastProvider>
        </TooltipProvider>
      </StoreProvider>
    </ClockProvider>,
  );
  return { ...result, state: initial };
}

/** Navigate by hash, as the address bar or a link would. */
export async function goToHash(hash: string): Promise<void> {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await Promise.resolve();
  });
}

/** axe on the whole document (dialogs render in portals). Contrast is checked by eye: jsdom has no layout. */
export async function axeViolations(): Promise<string[]> {
  const { default: axe } = await import("axe-core");
  const results = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}
