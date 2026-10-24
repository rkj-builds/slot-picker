import { describe, expect, it } from "vitest";
import waitlistSource from "@/components/compositions/waitlist/waitlist.tsx?raw";
import { parseComponent, usageOf } from "@/lib/props";

describe("parseComponent, on the real Waitlist source", () => {
  const doc = parseComponent(waitlistSource, "Waitlist");

  it("takes the summary from the comment above Waitlist itself, not an earlier part's", () => {
    expect(doc.summary).toMatch(/^A place in line for something that is full\./);
  });

  it("reads each prop from the interface, with its JSDoc and its default from the signature", () => {
    const names = doc.props.map((p) => p.name);
    expect(names).toEqual(["item", "status", "onJoin", "onCancel", "state", "onStateChange", "defaultState", "place", "joiningLabel", "errorLabel", "className", "children"]);
    expect(doc.props.find((p) => p.name === "onJoin")).toMatchObject({ type: "() => Promise<WaitlistPlace>", optional: false, defaultValue: null });
    expect(doc.props.find((p) => p.name === "joiningLabel")).toMatchObject({ optional: true, defaultValue: '"Checking for cancellations…"' });
    expect(doc.props.find((p) => p.name === "onCancel")?.doc).toMatch(/Return false to keep them on the list/);
  });

  it("keeps a union type whole", () => {
    expect(doc.props.find((p) => p.name === "onCancel")?.type).toBe("() => boolean | Promise<boolean>");
  });

  it("handles both `type X = {}` and `interface X {}` declarations", () => {
    const asType = `export type ThingProps = {\n  /** A. */\n  a: string;\n};\n/** Thing. */\nexport function Thing({ a }: ThingProps) {}`;
    const asInterface = `export interface ThingProps {\n  /** A. */\n  a: string;\n}\n/** Thing. */\nexport function Thing({ a }: ThingProps) {}`;
    for (const src of [asType, asInterface]) {
      const d = parseComponent(src, "Thing");
      expect(d.summary).toBe("Thing.");
      expect(d.props).toEqual([{ name: "a", type: "string", optional: false, defaultValue: null, doc: "A." }]);
    }
  });
});

describe("usageOf", () => {
  it("counts tags per file", () => {
    expect(usageOf("Waitlist", { "a.tsx": "<Waitlist item='x' /><WaitlistJoin />", "b.tsx": "none" })).toEqual([{ file: "a.tsx", count: 1 }]);
  });
});
