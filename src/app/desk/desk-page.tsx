import type * as React from "react";
import type { Route } from "@/app/router";

export function DeskPage({ route }: { route: Route }): React.ReactElement {
  return <main><h1>Desk {route.path}</h1></main>;
}
