import { ArrowUpRightIcon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import { Button } from "@/components/ui/button";
import { initCalNamespace, loadCalEmbed } from "@/lib/cal-embed";

const NAMESPACE = "waitlist";

/**
 * A link to a Cal.com booking page that becomes Cal.com's own booking pop-up once their script has
 * loaded. Hover or focus starts the load; a click before it has loaded (or with it blocked) simply
 * follows the link to the booking page in a new tab.
 */
export function BookCallButton({ calLink, children }: { calLink: string; children: React.ReactNode }): React.ReactElement {
  const url = `https://cal.com/${calLink}`;
  const [ready, setReady] = React.useState(false);

  const warm = React.useCallback((): void => {
    void loadCalEmbed().then(
      () => {
        initCalNamespace(NAMESPACE, { layout: "month_view", hideEventTypeDetails: false });
        setReady(true);
      },
      () => setReady(false),
    );
  }, []);

  const onClick = (event: React.MouseEvent): void => {
    const api = window.Cal?.ns?.[NAMESPACE];
    if (!ready || !api) return; // not loaded, or blocked: the link opens the booking page instead
    event.preventDefault();
    const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    api("modal", { calLink, config: { layout: "month_view", theme } });
  };

  return (
    <Button
      data-cal-ready={ready || undefined}
      render={<Anchor href={url} onClick={onClick} onFocus={warm} onPointerEnter={warm} rel="noreferrer" target="_blank" />}
    >
      {children}
      <ArrowUpRightIcon aria-hidden="true" className="rtl:-scale-x-100" />
    </Button>
  );
}
