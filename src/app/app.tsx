"use client";

import { MapPinOffIcon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import { DemoBar, useFocusHeadingOnNavigate } from "@/app/app-shell";
import { BookPage } from "@/app/book/book-page";
import { ClockProvider, pinnedNowFromUrl } from "@/app/clock";
import { HomePage } from "@/app/home-page";
import { useRoute } from "@/app/router";
import { StoreProvider } from "@/app/store";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";

// The desk and the gallery load on demand: a customer on #/book never downloads them.
const DeskPage = React.lazy(() => import("@/app/desk/desk-page").then((m) => ({ default: m.DeskPage })));
const GalleryPage = React.lazy(() => import("@/app/gallery/gallery-page").then((m) => ({ default: m.GalleryPage })));

export function App(): React.ReactElement {
  const [start] = React.useState(pinnedNowFromUrl);
  const [failFirstLoad] = React.useState(() => new URLSearchParams(window.location.search).has("offline"));
  return (
    <ClockProvider start={start}>
      <StoreProvider failFirstLoad={failFirstLoad}>
        <TooltipProvider delay={300}>
          <ToastProvider>
            <Routes />
          </ToastProvider>
        </TooltipProvider>
      </StoreProvider>
    </ClockProvider>
  );
}

export function Routes(): React.ReactElement {
  const route = useRoute();
  const section = route.segments[0] ?? "";
  useFocusHeadingOnNavigate(route.path);
  let page: React.ReactElement;
  switch (section) {
    case "":
      page = <HomePage />;
      break;
    case "book":
      page = <BookPage route={route} />;
      break;
    case "desk":
      page = <DeskPage route={route} />;
      break;
    case "components":
      page = <GalleryPage />;
      break;
    default:
      page = <NotFound />;
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <Button
        className="fixed start-3 top-3 z-50 -translate-y-24 focus:translate-y-0"
        onClick={(event: React.MouseEvent) => {
          event.preventDefault();
          document.querySelector<HTMLElement>("main h1")?.focus();
        }}
        render={<Anchor href="#main" />}
        variant="outline"
      >
        Skip to content
      </Button>
      <DemoBar route={route} />
      <div className="flex flex-1 flex-col" id="main">
        <React.Suspense fallback={<PageFallback />}>{page}</React.Suspense>
      </div>
    </div>
  );
}

/** The desk and the gallery arrive as their own chunk: a short, indeterminate wait, so a coss Spinner with a label. */
function PageFallback(): React.ReactElement {
  return (
    <div aria-busy="true" className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center gap-2 px-4 py-16" role="status">
      <Spinner aria-hidden="true" />
      <span className="text-muted-foreground text-sm">Loading…</span>
    </div>
  );
}

function NotFound(): React.ReactElement {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
      <Empty className="rounded-2xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MapPinOffIcon aria-hidden="true" />
          </EmptyMedia>
          <h1 className="font-medium text-sm">Nothing lives here</h1>
          <EmptyDescription>That link does not go anywhere in this demo.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Anchor href="#/" />} variant="outline">
            Go home
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}


