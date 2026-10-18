"use client";

import { ConstructionIcon } from "lucide-react";
import type * as React from "react";
import { sectionById } from "@/app/desk/sections";
import { PageHeader, Screen } from "@/app/screens/screen-kit";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

/** Placeholder until this screen is built. */
export function TeamScreen(): React.ReactElement {
  const section = sectionById("team");
  return (
    <Screen>
      <PageHeader description={section.line} title={section.label} />
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ConstructionIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Being built</EmptyTitle>
          <EmptyDescription>{section.label} lands on this branch next.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Screen>
  );
}
