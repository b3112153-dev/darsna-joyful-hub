import { describe, expect, it } from "vitest";
import { buildStudyProgram, programStudyTotal } from "@/lib/study-program";

describe("study program", () => {
  it("3 hours split into 50-minute study blocks with 10/20-minute breaks", () => {
    const blocks = buildStudyProgram(3);
    const study = blocks.filter((b) => b.kind === "study");
    expect(study.map((b) => b.minutes)).toEqual([50, 50, 50, 30]);
    // breaks: after 1st and 2nd study -> 10, after 3rd -> 20, none after last
    expect(blocks.filter((b) => b.kind === "break").map((b) => b.minutes)).toEqual([10, 10, 20]);
  });
  it("alternates study then break", () => {
    const kinds = buildStudyProgram(2).map((b) => b.kind);
    expect(kinds).toEqual(["study", "break", "study", "break", "study"]);
  });
  it("never puts a break after the final study block", () => {
    expect(buildStudyProgram(1).at(-1)?.kind).toBe("study");
  });
  it("total study minutes equal the requested hours", () => {
    expect(programStudyTotal(buildStudyProgram(4))).toBe(240);
  });
  it("each study block stays within the 4-hour database limit", () => {
    expect(buildStudyProgram(8).every((b) => b.kind === "break" || b.minutes <= 240)).toBe(true);
  });
  it("rejects invalid hours", () => {
    expect(buildStudyProgram(0)).toEqual([]);
    expect(buildStudyProgram(9)).toEqual([]);
  });
});
