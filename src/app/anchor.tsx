import type * as React from "react";

/**
 * A plain `<a>` for coss parts that render as a link (`render={<Anchor href="…" />}`,
 * as coss's sidebar and button docs show with `<a>`). The coss part supplies the
 * children and the styling; this only names the element.
 */
export function Anchor({ children, ...props }: React.ComponentProps<"a">): React.ReactElement {
  return <a {...props}>{children}</a>;
}
