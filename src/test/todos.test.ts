import { describe, expect, it } from "vitest";
import { completionPatch, ENCOURAGEMENT, nextEncouragement, orderTodos, TODO_LIMIT, validTodoText, type Todo } from "@/lib/todos";

describe("personal task rules", () => {
  it("accepts 1–200 characters only", () => {
    expect(validTodoText("a")).toBe(true);
    expect(validTodoText("a".repeat(200))).toBe(true);
    expect(validTodoText("a".repeat(201))).toBe(false);
    expect(validTodoText("   ")).toBe(false);
  });
  it("loads at most 100 tasks", () => { expect(TODO_LIMIT).toBe(100); });
  it("sets completion time and clears it when unchecked", () => {
    const now = new Date("2026-10-24T22:21:00Z");
    expect(completionPatch(true, now)).toEqual({ done: true, done_at: "2026-10-24T22:21:00.000Z" });
    expect(completionPatch(false, now)).toEqual({ done: false, done_at: null });
  });
  it("has 20 encouragements and never repeats consecutively", () => {
    expect(ENCOURAGEMENT).toHaveLength(20);
    for (let previous = 0; previous < 20; previous++) for (const random of [0, 0.5, 0.999]) expect(nextEncouragement(previous, random)).not.toBe(previous);
  });
  it("orders unfinished tasks first and today's first within each group", () => {
    const row = (id: string, created_at: string, done = false): Todo => ({ id, created_at, done, done_at: null, user_id: "user", text: id });
    const rows = [row("old", "2026-10-23T12:00:00"), row("done", "2026-10-24T13:00:00", true), row("today", "2026-10-24T12:00:00")];
    expect(orderTodos(rows, new Date("2026-10-24T14:00:00")).map((r) => r.id)).toEqual(["today", "old", "done"]);
  });
});