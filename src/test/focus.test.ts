import { describe, expect, it } from "vitest";
import { isChatLocked, remainingSeconds, summarize } from "@/lib/focus";

const now = new Date("2026-10-16T12:00:00").getTime();

describe("focus timer", () => {
  it("locks chat while running with time left", () => {
    expect(isChatLocked({ status: "running", remaining_seconds: 900, ends_at: new Date(now + 60000).toISOString() }, now)).toBe(true);
  });
  it("unlocks chat automatically when the time ends", () => {
    expect(isChatLocked({ status: "running", remaining_seconds: 900, ends_at: new Date(now - 1000).toISOString() }, now)).toBe(false);
  });
  it("keeps chat locked while paused", () => {
    expect(isChatLocked({ status: "paused", remaining_seconds: 300, ends_at: null }, now)).toBe(true);
  });
  it("paused keeps its remaining time", () => {
    expect(remainingSeconds({ status: "paused", remaining_seconds: 300, ends_at: null }, now)).toBe(300);
  });
});

describe("progress summary", () => {
  it("counts a streak of consecutive study days", () => {
    const day = (d: number) => new Date(2026, 9, d, 10).toISOString();
    const r = summarize(
      [
        { subject: "رياضيات", studied_seconds: 1500, started_at: day(16) },
        { subject: "رياضيات", studied_seconds: 1500, started_at: day(15) },
        { subject: "فيزياء", studied_seconds: 3000, started_at: day(14) },
        { subject: "فيزياء", studied_seconds: 3000, started_at: day(12) },
      ],
      new Date(2026, 9, 16, 12),
    );
    expect(r.streak).toBe(3);
    expect(r.total).toBe(9000);
    expect(r.subjects[0]).toEqual({ subject: "فيزياء", seconds: 6000 });
  });
});
