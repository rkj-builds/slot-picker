import { describe, expect, it } from "vitest";
import { attemptJoin, placeLabel, reduce, type WaitlistState } from "@/lib/waitlist";

describe("attemptJoin", () => {
  it("starts from idle and from error", () => {
    expect(attemptJoin("idle")).toEqual({ ok: true, next: "joining" });
    expect(attemptJoin("error")).toEqual({ ok: true, next: "joining" });
  });

  it("refuses with a reason, never silently", () => {
    expect(attemptJoin("joined")).toEqual({ ok: false, reason: "already-joined" });
    expect(attemptJoin("joining")).toEqual({ ok: false, reason: "joining" });
    expect(attemptJoin("idle", { closed: true })).toEqual({ ok: false, reason: "closed" });
  });
});

describe("reduce", () => {
  const place = { position: 1, ahead: [] };

  it("walks idle → joining → joined", () => {
    expect(reduce("idle", { type: "join" })).toBe("joining");
    expect(reduce("joining", { type: "joined", place })).toBe("joined");
  });

  it("walks joining → error → retry → joining", () => {
    expect(reduce("joining", { type: "fail", message: "no answer" })).toBe("error");
    expect(reduce("error", { type: "retry" })).toBe("joining");
  });

  it("leaves only from joined, and ignores a result that arrives late", () => {
    expect(reduce("joined", { type: "leave" })).toBe("idle");
    expect(reduce("idle", { type: "leave" })).toBe("idle");
    expect(reduce("idle", { type: "joined", place })).toBe("idle");
    expect(reduce("joined", { type: "fail", message: "late" })).toBe("joined");
  });

  it("never throws for any state and event", () => {
    const states: WaitlistState[] = ["idle", "joining", "joined", "error"];
    for (const s of states) for (const type of ["join", "retry", "leave"] as const) expect(() => reduce(s, { type })).not.toThrow();
  });
});

describe("placeLabel", () => {
  it("says who is ahead in words", () => {
    expect(placeLabel({ position: 1, ahead: [] })).toBe("1 · nobody ahead of you");
    expect(placeLabel({ position: 2, ahead: ["Peer"] })).toBe("2 · 1 person ahead of you");
    expect(placeLabel({ position: 4, ahead: ["a", "b", "c"] })).toBe("4 · 3 people ahead of you");
  });
});
