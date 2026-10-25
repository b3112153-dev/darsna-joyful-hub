import { describe, expect, it } from "vitest";
import { DHIKR_ITEMS, FARD_IDS, dhikrStreak, fardComplete, storyIndex, storyUnlocked } from "@/lib/dhikr";

const fard = FARD_IDS;

describe("dhikr", () => {
  it("has 12 daily items and 5 obligatory prayers", () => {
    expect(DHIKR_ITEMS).toHaveLength(12);
    expect(fard).toHaveLength(5);
  });
  it("fard is complete only when all five prayers are checked", () => {
    expect(fardComplete(fard.slice(0, 4))).toBe(false);
    expect(fardComplete(fard)).toBe(true);
  });
  it("story unlocks after fard or after 8pm", () => {
    expect(storyUnlocked([], 10)).toBe(false);
    expect(storyUnlocked(fard, 10)).toBe(true);
    expect(storyUnlocked([], 20)).toBe(true);
    expect(storyUnlocked([], 19)).toBe(false);
  });
  it("story rotates by day-of-year", () => {
    expect(storyIndex(7, 14)).toBe(0);
    expect(storyIndex(7, 15)).toBe(1);
    expect(storyIndex(0, 15)).toBe(-1);
  });
  it("streak counts consecutive fard-complete days", () => {
    const days = [
      { day: "2026-10-25", items: fard },
      { day: "2026-10-24", items: fard },
      { day: "2026-10-23", items: fard.slice(0, 3) },
    ];
    expect(dhikrStreak(days, "2026-10-25")).toBe(2);
  });
  it("today may be incomplete without breaking the streak", () => {
    const days = [{ day: "2026-10-24", items: fard }];
    expect(dhikrStreak(days, "2026-10-25")).toBe(1);
  });
});
