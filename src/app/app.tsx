"use client";

import { MapPinOffIcon } from "lucide-react";
import * as React from "react";
import { DemoBar, useFocusHeadingOnNavigate } from "@/app/app-shell";
import { BookPage } from "@/app/book/book-page";
import { ClockProvider, pinnedNowFromUrl } from "@/app/clock";
import { HomePage } from "@/app/home-page";
import { useRoute } from "@/app/router";
import { StoreProvider } from "@/app/store";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
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
      <a
        className="sr-only z-50 rounded-md bg-background px-3 py-2 font-medium text-sm focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:ring-2 focus:ring-ring"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.querySelector<HTMLElement>("main h1")?.focus();
        }}
      >
        Skip to content
      </a>
      <DemoBar route={route} />
      <div className="flex flex-1 flex-col" id="main">
        <React.Suspense fallback={<PageFallback />}>{page}</React.Suspense>
      </div>
    </div>
  );
}

function PageFallback(): React.ReactElement {
  return (
    <div aria-busy="true" className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6" role="status">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function NotFound(): React.ReactElement {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
      <Empty className="rounded-2xl border border-dashed">
        <EmptyMedia>
          <MapPinOffIcon aria-hidden="true" />
        </EmptyMedia>
        <div className="flex flex-col gap-1">
          <h1 className="font-medium text-sm">Nothing lives here</h1>
          <EmptyDescription>That link does not go anywhere in this demo.</EmptyDescription>
        </div>
        <EmptyContent>
          <a className={buttonVariants({ variant: "outline" })} href="#/">
            Go home
          </a>
        </EmptyContent>
      </Empty>
    </main>
  );
}


