// Reads a component's props from its own TypeScript source, so the API table
// is the type, not a copy of it that can drift.

export interface Prop { name: string; type: string; optional: boolean; defaultValue: string | null; doc: string }
export interface ComponentDoc { name: string; summary: string; props: Prop[] }

export function parseComponent(source: string, name: string): ComponentDoc {
  // The comment directly above this component's own function (a file may export several parts), and it may not contain "*/".
  const summary = new RegExp(`\\/\\*\\*((?:(?!\\*\\/)[\\s\\S])*)\\*\\/\\s*export function ${name}\\(`).exec(source)?.[1] ?? "";
  // `export type XProps = {…};` or `export interface XProps {…}`: both end at the first line that is just a brace.
  const typeBlock = new RegExp(`export (?:type ${name}Props\\s*=\\s*|interface ${name}Props\\s*)\\{([\\s\\S]*?)\\n\\};?`).exec(source)?.[1] ?? "";
  const defaults = new Map<string, string>();
  const sig = new RegExp(`export function ${name}\\(\\{([\\s\\S]*?)\\}\\s*:`).exec(source)?.[1] ?? "";
  for (const m of sig.matchAll(/(\w+)\s*=\s*([^,]+)/g)) defaults.set(m[1] ?? "", (m[2] ?? "").trim());
  // Object types inside a prop ({ src: string; alt: string }) are set aside first, so their fields aren't read as props.
  const nested: string[] = [];
  const flat = typeBlock.replace(/\{[^{}]*\}/g, (obj) => `__obj${nested.push(obj) - 1}__`);
  const restore = (t: string) => t.replace(/__obj(\d+)__/g, (_, i: string) => nested[Number(i)] ?? "");
  const props: Prop[] = [];
  for (const m of flat.matchAll(/(?:\/\*\*([\s\S]*?)\*\/\s*)?(\w+)(\?)?:\s*([^;]+);/g)) {
    const propName = m[2] ?? "";
    props.push({
      name: propName,
      type: restore((m[4] ?? "").trim()),
      optional: m[3] === "?",
      defaultValue: defaults.get(propName) ?? null,
      doc: clean(m[1] ?? ""),
    });
  }
  return { name, summary: clean(summary), props };
}

function clean(doc: string): string {
  return doc.split("\n").map((l) => l.replace(/^\s*\*\s?/, "").trim()).join(" ").replace(/\s+/g, " ").trim();
}

/** Where a component is used: every <Name in the given sources, counted per file. */
export function usageOf(name: string, sources: Record<string, string>): { file: string; count: number }[] {
  const tag = new RegExp(`<${name}[\\s>/]`, "g");
  return Object.entries(sources)
    .map(([file, src]) => ({ file, count: (src.match(tag) ?? []).length }))
    .filter((u) => u.count > 0);
}
