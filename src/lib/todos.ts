import type { Tables } from "@/integrations/supabase/types";

export type Todo = Tables<"todos">;
export const TODO_LIMIT = 100;
export const TODO_TEXT_LIMIT = 200;
export const ENCOURAGEMENT = [
  "يا سلام عليك! كمل هيك 💪", "خطوة وراء خطوة بتوصل", "شاطر/ة والله!", "هاي المهمة خلصت، الجاي أسهل",
  "قدّها وقدود!", "كل خطوة بتفرق", "إنجازك اليوم بستاهل", "كمل، إنت ماشي صح", "يعطيك العافية!", "مهمة أقل، حلم أقرب",
  "هيك الهمة ولا بلاش", "فخورين فيك!", "إنت بتقدر!", "جهدك مش رايح عالفاضي", "يلا عاللي بعدها", "إنجاز حلو منك",
  "اليوم أحسن من مبارح", "على مهلك، المهم تكمل", "خلصتها! تستاهل استراحة", "كفو! قربت أكثر",
] as const;

export function nextEncouragement(previous: number, random = Math.random()) {
  const count = ENCOURAGEMENT.length;
  if (previous < 0) return Math.min(count - 1, Math.floor(random * count));
  return (previous + 1 + Math.min(count - 2, Math.floor(random * (count - 1)))) % count;
}
export function validTodoText(text: string) { const value = text.trim(); return value.length > 0 && value.length <= TODO_TEXT_LIMIT; }
export function completionPatch(done: boolean, now = new Date()) { return { done, done_at: done ? now.toISOString() : null }; }
export function orderTodos(rows: Todo[], now = new Date()) {
  const today = now.toDateString();
  return [...rows].sort((a, b) => Number(a.done) - Number(b.done)
    || Number(new Date(b.created_at).toDateString() === today) - Number(new Date(a.created_at).toDateString() === today)
    || b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
}