import type { Tables } from "@/integrations/supabase/types";
import { t } from "@/lib/i18n";

export type Todo = Tables<"todos">;
export const TODO_LIMIT = 100;
export const TODO_TEXT_LIMIT = 200;
export const ENCOURAGEMENT_DURATION_MS = 4000;
export const ENCOURAGEMENT = [
  t("يا سلام عليك! كمل هيك 💪"), t("خطوة وراء خطوة بتوصل"), t("شاطر/ة والله!"), t("هاي المهمة خلصت، الجاي أسهل"),
  t("قدّها وقدود!"), t("كل خطوة بتفرق"), t("إنجازك اليوم بستاهل"), t("كمل، إنت ماشي صح"), t("يعطيك العافية!"), t("مهمة أقل، حلم أقرب"),
  t("هيك الهمة ولا بلاش"), t("فخورين فيك!"), t("إنت بتقدر!"), t("جهدك مش رايح عالفاضي"), t("يلا عاللي بعدها"), t("إنجاز حلو منك"),
  t("اليوم أحسن من مبارح"), t("على مهلك، المهم تكمل"), t("خلصتها! تستاهل استراحة"), t("كفو! قربت أكثر"),
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