export type ProgramBlock = { kind: "study" | "break"; minutes: number };

export const STUDY_BLOCK_MINUTES = 50;
export const SHORT_BREAK_MINUTES = 10;
export const LONG_BREAK_MINUTES = 20;
export const MAX_PROGRAM_HOURS = 8;

/**
 * Split a goal of N study hours into 50-minute study blocks separated by
 * 10-minute breaks, with a 20-minute break after every 3rd study block.
 * No break after the final study block. Each study block stays well under
 * the 4-hour database limit and is saved as its own focus session.
 */
export function buildStudyProgram(hours: number): ProgramBlock[] {
  const total = Math.round(hours * 60);
  if (!Number.isFinite(total) || total <= 0 || hours > MAX_PROGRAM_HOURS) return [];
  const blocks: ProgramBlock[] = [];
  let remaining = total;
  let studyCount = 0;
  while (remaining > 0) {
    const minutes = Math.min(STUDY_BLOCK_MINUTES, remaining);
    blocks.push({ kind: "study", minutes });
    remaining -= minutes;
    studyCount += 1;
    if (remaining > 0) {
      blocks.push({ kind: "break", minutes: studyCount % 3 === 0 ? LONG_BREAK_MINUTES : SHORT_BREAK_MINUTES });
    }
  }
  return blocks;
}

export function programStudyTotal(blocks: ProgramBlock[]) {
  return blocks.filter((block) => block.kind === "study").reduce((sum, block) => sum + block.minutes, 0);
}
