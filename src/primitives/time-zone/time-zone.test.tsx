import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { TimeZoneCombobox } from "@/components/compositions/time-zone-combobox";
import { instantAt } from "@/lib/time-zone";
import { describeZone, FALLBACK_ZONES, groupZones, listTimeZones, matchesZone } from "@/primitives/time-zone";

const SAT_31_OCT = instantAt("2026-10-31", 16 * 60, "Asia/Kolkata");
const SUN_1_NOV = instantAt("2026-11-01", 16 * 60, "Asia/Kolkata");

describe("zones as data", () => {
  it("lists every supported zone under current names, with UTC", () => {
    const all = listTimeZones();
    expect(all.length).toBeGreaterThan(300);
    expect(all).toContain("Asia/Kolkata");
    expect(all).not.toContain("Asia/Calcutta");
    expect(all).toContain("UTC");
  });

  it("falls back to a short list, and canonicalises it", () => {
    const list = listTimeZones(["Asia/Calcutta", "Europe/Kiev", "Etc/GMT+5"]);
    expect(list).toEqual(["Asia/Kolkata", "Europe/Kyiv", "UTC"]);
    expect(FALLBACK_ZONES).toContain("America/New_York");
  });

  it("offsets are live: New York is GMT-4 on 31 Oct and GMT-5 on 1 Nov; Kolkata never moves", () => {
    expect(describeZone("America/New_York", SAT_31_OCT, "en-US").offsetLabel).toBe("GMT-4");
    expect(describeZone("America/New_York", SUN_1_NOV, "en-US").offsetLabel).toBe("GMT-5");
    const kolkata = describeZone("Asia/Calcutta", SUN_1_NOV, "en-US");
    expect(kolkata).toMatchObject({ value: "Asia/Kolkata", city: "Kolkata", region: "Asia", offsetMinutes: 330, offsetLabel: "GMT+5:30", label: "Kolkata (GMT+5:30)" });
    expect(describeZone("America/Argentina/Buenos_Aires", SUN_1_NOV).area).toBe("Argentina");
  });

  it("groups by region, west to east inside each", () => {
    const groups = groupZones(["Asia/Tokyo", "Asia/Kolkata", "Europe/London", "UTC", "America/New_York"].map((z) => describeZone(z, SUN_1_NOV, "en-US")));
    expect(groups.map((g) => g.value)).toEqual(["UTC", "Asia", "Europe", "Americas"]);
    expect(groups[1]!.items.map((z) => z.city)).toEqual(["Kolkata", "Tokyo"]);
  });

  it("search matches city, long name, region and offset", () => {
    const kolkata = describeZone("Asia/Kolkata", SUN_1_NOV, "en-US");
    for (const q of ["kolk", "india", "asia", "+5:30", "GMT+5:30", "utc+5:30", "Kolkata"]) expect(matchesZone(kolkata, q)).toBe(true);
    for (const q of ["+6", "tokyo", "gmt+1"]) expect(matchesZone(kolkata, q)).toBe(false);
    expect(matchesZone(describeZone("Europe/Paris", SUN_1_NOV, "en-US"), "+1")).toBe(true);
    expect(matchesZone(describeZone("America/Sao_Paulo", SUN_1_NOV, "en-US"), "sao paulo")).toBe(true);
  });
});

function Harness({ zones }: { zones?: readonly string[] }): React.ReactElement {
  const [zone, setZone] = React.useState("Asia/Kolkata");
  return (
    <>
      <label htmlFor="tz">Show times in</label>
      <TimeZoneCombobox at={SUN_1_NOV} id="tz" locale="en-US" onValueChange={setZone} value={zone} zones={zones} />
      <output>{zone}</output>
    </>
  );
}

describe("TimeZoneCombobox", () => {
  const zones = ["Asia/Kolkata", "Asia/Tokyo", "Europe/London", "America/New_York", "America/Los_Angeles"];

  it("is a labelled combobox showing the chosen zone with its offset", () => {
    render(<Harness zones={zones} />);
    expect(screen.getByRole("combobox", { name: "Show times in" })).toHaveValue("Kolkata (GMT+5:30)");
  });

  it("types to filter, arrows through grouped options, Enter picks", async () => {
    const user = userEvent.setup();
    render(<Harness zones={zones} />);
    const input = screen.getByRole("combobox", { name: "Show times in" });
    await user.clear(input);
    await user.type(input, "new");
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getAllByRole("option").map((o) => o.textContent)).toEqual(["New YorkGMT-5"]);
    expect(within(listbox).getByRole("group", { name: "Americas" })).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(screen.getByText("America/New_York").tagName).toBe("OUTPUT");
    expect(input).toHaveValue("New York (GMT-5)");
  });

  it("finds a zone by offset", async () => {
    const user = userEvent.setup();
    render(<Harness zones={zones} />);
    const input = screen.getByRole("combobox", { name: "Show times in" });
    await user.clear(input);
    await user.type(input, "-8");
    expect(within(await screen.findByRole("listbox")).getAllByRole("option").map((o) => o.textContent)).toEqual(["Los AngelesGMT-8"]);
  });

  it("passes axe, open and closed", async () => {
    const user = userEvent.setup();
    render(<Harness zones={zones} />);
    const run = async (): Promise<unknown[]> => (await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } })).violations;
    expect(await run()).toEqual([]);
    await user.click(screen.getByRole("combobox", { name: "Show times in" }));
    await screen.findByRole("listbox");
    expect(await run()).toEqual([]);
  });
});
