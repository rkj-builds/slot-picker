"use client";

import type * as React from "react";
import type { ScreenProps } from "@/app/desk/sections";
import { ProgrammePage, type ProgrammeTab } from "@/app/screens/programmes/programme-page";
import { ProgrammesList } from "@/app/screens/programmes/programmes-list";
import { RegisterPage } from "@/app/screens/programmes/register";

const TABS: readonly ProgrammeTab[] = ["overview", "sessions", "enrolled", "settings"];

/**
 * Programmes, by URL:
 * - `#/desk/programmes` the list (`?show=open|drafts|finished`, `?q=`, `?new=1` opens New programme)
 * - `#/desk/programmes/<id>` a programme's overview; `/sessions`, `/enrolled`, `/settings` its other tabs
 * - `#/desk/programmes/<id>/sessions/<sessionId>` the register for one session
 *   (`latest` is the session to take today, `next` the next one to come)
 */
export function ProgrammesScreen({ route, sub, today }: ScreenProps): React.ReactElement {
  const [id, tab, sessionId] = sub;
  if (!id) return <ProgrammesList route={route} today={today} />;
  if (tab === "sessions" && sessionId) return <RegisterPage key={`${id}/${sessionId}`} programmeId={id} sessionRef={sessionId} today={today} />;
  const current = TABS.find((t) => t === tab) ?? "overview";
  return <ProgrammePage id={id} route={route} tab={current} today={today} />;
}
