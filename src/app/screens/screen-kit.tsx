"use client";

/**
 * The pieces every dashboard screen is built from, so each one opens the
 * same way: a header (title, one line, actions), then the content; and so
 * loading, failure and "not for your role" look the same everywhere.
 */
import { ArrowLeftIcon, LockIcon, RotateCcwIcon, WifiOffIcon } from "lucide-react";
import type * as React from "react";
import { Anchor } from "@/app/anchor";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage, isDataError } from "@/data/errors";
import { ROLE_LABELS } from "@/data/mock/db";
import type { Viewer } from "@/data/types";
import { cn } from "@/lib/utils";

/**
 * The one header every page opens with, as Cal.com's pages do: the title and
 * its one line on the left, the page's controls on the right, in a single
 * row. There is no app header above it on a laptop (the sidebar says where
 * you are), so this is the only place a page names itself. The controls end
 * at the right edge even when they wrap under the title, and every one of
 * them is the same height (h-8 on a laptop: coss's default Button).
 */
export function PageHeader({
  title,
  description,
  actions,
  back,
  meta,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Controls on the right, the primary action last; they wrap under the title where the row is too narrow. */
  actions?: React.ReactNode;
  /** A link back up, for detail pages: { href, label }. */
  back?: { href: string; label: string };
  /** Badges or a status line beside the title. */
  meta?: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-3" data-slot="page-header">
      {back && (
        <Button className="-ms-2 self-start text-muted-foreground" render={<Anchor href={back.href} />} size="sm" variant="ghost">
          <ArrowLeftIcon aria-hidden="true" />
          {back.label}
        </Button>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-semibold text-xl tracking-tight outline-none">{title}</h1>
            {meta}
          </div>
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </div>
        {actions && (
          <div className="ms-auto flex flex-wrap items-center justify-end gap-2" data-slot="page-actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/** A screen's frame: header, then sections spaced evenly. */
export function Screen({ children, className }: { children: React.ReactNode; className?: string }): React.ReactElement {
  return <div className={cn("flex flex-col gap-6", className)}>{children}</div>;
}

export function NoAccess({ viewer, area }: { viewer: Viewer; area: string }): React.ReactElement {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LockIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{area} isn't part of your role</EmptyTitle>
        <EmptyDescription>
          You're signed in as {viewer.name} ({ROLE_LABELS[viewer.role]}). An admin can add {area.toLowerCase()} to your role in Team.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/** A read that failed: what happened, and Retry. A refusal for the role reads as such, not as a network error. */
export function LoadFailed({ error, onRetry, what }: { error: unknown; onRetry: () => void; what: string }): React.ReactElement {
  const forbidden = isDataError(error) && error.code === "forbidden";
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">{forbidden ? <LockIcon aria-hidden="true" /> : <WifiOffIcon aria-hidden="true" />}</EmptyMedia>
        <EmptyTitle>{forbidden ? `You can't see ${what}` : `Couldn't load ${what}`}</EmptyTitle>
        <EmptyDescription>{errorMessage(error)}</EmptyDescription>
      </EmptyHeader>
      {!forbidden && (
        <EmptyContent>
          <Button onClick={onRetry} variant="outline">
            <RotateCcwIcon aria-hidden="true" />
            Try again
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

/** Rows shaped like the real list, so nothing jumps when it arrives. */
export function ListSkeleton({ rows = 6, label }: { rows?: number; label: string }): React.ReactElement {
  return (
    <div aria-busy="true" className="flex flex-col gap-2" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton className="h-12 rounded-lg" key={i} />
      ))}
    </div>
  );
}
