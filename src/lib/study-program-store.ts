import type { ProgramBlock } from "@/lib/study-program";

export type ProgramState = {
  blocks: ProgramBlock[];
  index: number;
  subject: string;
  roomId: string | null;
  /** set during a break phase: epoch ms when the break ends */
  breakEndsAt: number | null;
} | null;

let state: ProgramState = null;
const listeners = new Set<() => void>();

export function getProgram() { return state; }
export function setProgram(next: ProgramState) {
  state = next;
  listeners.forEach((listener) => listener());
}
export function subscribeProgram(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
