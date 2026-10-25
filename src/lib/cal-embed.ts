/**
 * Cal.com's booking pop-up, loaded the way the "Embed" snippet in every Cal.com dashboard does it:
 * a small queue on `window.Cal` that collects calls until the hosted embed.js arrives and drains it.
 * Written here rather than pulled from @calcom/embed-react, which is under Cal.com's commercial licence.
 *
 * The script loads only once someone shows intent (hover or focus on the button), and the button stays a
 * plain link to the booking page until it has loaded, so a blocked or slow script never strands anyone.
 */

export const CAL_EMBED_SRC = "https://app.cal.com/embed/embed.js";

type CalArgs = unknown[];
export type CalApi = ((...args: CalArgs) => void) & { q?: CalArgs[]; ns?: Record<string, CalApi>; loaded?: boolean };

declare global {
  interface Window {
    Cal?: CalApi;
  }
}

function queue(fn: CalApi, args: CalArgs): void {
  (fn.q ??= []).push(args);
}

/** The queue, as the snippet sets it up: "init" with a namespace makes that namespace's own queue. */
function installQueue(): CalApi {
  const cal: CalApi = Object.assign(
    (...args: CalArgs): void => {
      if (args[0] === "init" && typeof args[1] === "string") {
        const name = args[1];
        const namespaces = (cal.ns ??= {});
        const api: CalApi = Object.assign((...a: CalArgs): void => queue(api, a), { q: [] as CalArgs[] });
        namespaces[name] ??= api;
        queue(namespaces[name], args);
        queue(cal, ["initNamespace", name]);
        return;
      }
      queue(cal, args);
    },
    { q: [] as CalArgs[], ns: {}, loaded: true },
  );
  return cal;
}

let loading: Promise<void> | null = null;

/** Load embed.js once. Resolves when the script has arrived; rejects if it is blocked or slower than `timeoutMs`. */
export function loadCalEmbed({ timeoutMs = 6000 }: { timeoutMs?: number } = {}): Promise<void> {
  if (loading) return loading;
  window.Cal ??= installQueue();
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const fail = (reason: string): void => {
      window.clearTimeout(timer);
      loading = null; // a later hover can try again
      script.remove();
      reject(new Error(reason));
    };
    const timer = window.setTimeout(() => fail("timeout"), timeoutMs);
    script.src = CAL_EMBED_SRC;
    script.async = true;
    script.dataset.calEmbed = "";
    script.onload = (): void => {
      window.clearTimeout(timer);
      resolve();
    };
    script.onerror = (): void => fail("blocked");
    document.head.appendChild(script);
  });
  return loading;
}

/** Set up a namespace once: its own UI options, so this page's pop-up doesn't leak into any other embed. */
export function initCalNamespace(namespace: string, ui: Record<string, unknown>): CalApi | undefined {
  const cal = window.Cal;
  if (!cal) return undefined;
  if (!cal.ns?.[namespace]) cal("init", namespace, { origin: "https://cal.com" });
  const api = cal.ns?.[namespace];
  api?.("ui", ui);
  return api;
}

/** For tests: forget the loaded script and the queue. */
export function resetCalEmbedForTests(): void {
  loading = null;
  delete window.Cal;
  document.querySelectorAll("script[data-cal-embed]").forEach((s) => s.remove());
}
