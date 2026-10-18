"use client";

/**
 * When courts can be booked: weekly opening hours, closures, and courts held
 * on a schedule, on one page in Cal.com's availability shape. Hours are a
 * draft with an unsaved bar; closures and blocks save as they are made, each
 * with an Undo. A role without settings access sees all of it, read-only,
 * and is told why.
 */
import { EyeIcon, GlobeIcon } from "lucide-react";
import * as React from "react";
import { JUMP_EVENT, takeUnsavedSettings } from "@/app/demo-jump";
import { sectionById, type ScreenProps } from "@/app/desk/sections";
import { navigate } from "@/app/router";
import { BlocksCard } from "@/app/screens/availability/blocks";
import { ClosuresCard } from "@/app/screens/availability/closures";
import { type HoursEdits, HoursSaveBar, HoursSkeleton, WeeklyHoursCard } from "@/app/screens/availability/weekly-hours";
import { LoadFailed, PageHeader, Screen } from "@/app/screens/screen-kit";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ROLE_LABELS } from "@/data/mock/db";
import { useRead } from "@/data/provider";
import { isPlainDate } from "@/lib/plain-date";

export function AvailabilityScreen(props: ScreenProps): React.ReactElement {
  // A demo jump starts the page over, so it picks up the jump's unsaved hours even when already open.
  const [jumps, setJumps] = React.useState(0);
  React.useEffect(() => {
    const bump = (): void => setJumps((n) => n + 1);
    window.addEventListener(JUMP_EVENT, bump);
    return () => window.removeEventListener(JUMP_EVENT, bump);
  }, []);
  return <Availability key={jumps} {...props} />;
}

function Availability({ route, today, now }: ScreenProps): React.ReactElement {
  const section = sectionById("availability");
  const settings = useRead(["availability", "settings"], (c) => c.availability.settings());
  const viewer = useRead(["viewer"], (c) => c.team.viewer());
  // Hours being edited, by day, over what is saved; a demo jump may hand some over.
  const [edits, setEdits] = React.useState<HoursEdits>(() => takeUnsavedSettings()?.hours ?? {});
  const readOnly = !viewer.data?.can.editSettings;
  const readOnlyReason = viewer.data ? `${ROLE_LABELS[viewer.data.role]} can't change availability. Ask an admin.` : "Checking what your role can do.";
  const closureParam = route.query.get("closure") === "new";
  const dateParam = route.query.get("date") ?? "";

  return (
    <Screen>
      <PageHeader
        description={
          <span className="inline-flex flex-wrap items-center gap-x-1.5">
            {section.line}.
            <span className="inline-flex items-center gap-1">
              <GlobeIcon aria-hidden="true" className="size-3.5" />
              Times are India time (IST).
            </span>
          </span>
        }
        title={section.label}
      />
      {viewer.data && readOnly && (
        <Alert variant="info">
          <EyeIcon aria-hidden="true" />
          <AlertTitle>You can see availability but not change it</AlertTitle>
          <AlertDescription>
            Signed in as {viewer.data.name} ({ROLE_LABELS[viewer.data.role]}). Changing hours, closures and blocks needs access to settings; an admin can add it in Team.
          </AlertDescription>
        </Alert>
      )}

      {settings.status === "pending" ? (
        <HoursSkeleton />
      ) : settings.status === "error" ? (
        <LoadFailed error={settings.error} onRetry={() => void settings.refetch()} what="opening hours" />
      ) : (
        <>
          <WeeklyHoursCard edits={edits} onEdits={setEdits} readOnly={readOnly} settings={settings.data} />
          {!readOnly && <HoursSaveBar edits={edits} onDiscard={() => setEdits({})} onSaved={() => setEdits({})} settings={settings.data} />}
        </>
      )}

      <ClosuresCard
        initialDate={isPlainDate(dateParam) ? dateParam : null}
        initialOpen={closureParam}
        now={now}
        onDialogClosed={() => {
          if (closureParam) navigate("/desk/availability", {}, { replace: true });
        }}
        readOnly={readOnly}
        readOnlyReason={readOnlyReason}
        today={today}
      />
      {settings.data && <BlocksCard now={now} readOnly={readOnly} readOnlyReason={readOnlyReason} settings={settings.data} today={today} />}
    </Screen>
  );
}
