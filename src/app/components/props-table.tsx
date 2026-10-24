import type * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ComponentDoc, Prop } from "@/lib/props";

function defaultOf(prop: Prop): string {
  return prop.defaultValue ?? (prop.optional ? "–" : "required");
}

/**
 * The API table, from the type: a row per prop, read off the source at build time.
 * On a phone, four columns would scroll sideways, so each prop becomes its own block instead.
 */
export function PropsTable({ doc }: { doc: ComponentDoc }): React.ReactElement {
  return (
    <>
      <dl className="flex flex-col divide-y divide-border rounded-xl border border-border sm:hidden">
        {doc.props.map((prop) => (
          <div className="flex flex-col gap-1.5 p-4" key={prop.name}>
            <dt className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <code className="font-medium text-sm">
                {prop.name}
                {prop.optional ? "?" : ""}
              </code>
              <code className="text-muted-foreground text-xs">{defaultOf(prop)}</code>
            </dt>
            <dd className="flex flex-col gap-1.5">
              <code className="whitespace-pre-wrap break-words text-muted-foreground text-xs">{prop.type}</code>
              <span className="text-sm leading-normal">{prop.doc}</span>
            </dd>
          </div>
        ))}
      </dl>
      <div className="max-sm:hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prop</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doc.props.map((prop) => (
              <TableRow key={prop.name}>
                <TableCell className="whitespace-nowrap align-top">
                  <code className="text-sm">
                    {prop.name}
                    {prop.optional ? "?" : ""}
                  </code>
                </TableCell>
                <TableCell className="align-top">
                  <code className="whitespace-pre-wrap text-muted-foreground text-xs">{prop.type}</code>
                </TableCell>
                <TableCell className="align-top">
                  <code className="text-muted-foreground text-xs">{defaultOf(prop)}</code>
                </TableCell>
                <TableCell className="whitespace-normal align-top leading-normal">{prop.doc}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
