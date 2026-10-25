import type { Json } from "@/integrations/supabase/types";
import { t } from "@/lib/i18n";

export const MAX_LIBRARY_BYTES = 10 * 1024 * 1024;
export const LIBRARY_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "webp", "gif", "bmp", "avif", "heic", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt"];
export const hasExternalLink = (text: string) => /https?:|www\./i.test(text);
export function fileValidation(file: { name: string; size: number }) {
  if (file.size > MAX_LIBRARY_BYTES) return t("حجم الملف لازم يكون 10 ميغا أو أقل");
  if (!LIBRARY_EXTENSIONS.includes(file.name.split(".").pop()?.toLowerCase() ?? "")) return t("نوع الملف غير مسموح");
  return null;
}
export const formatSize = (n: number | null) => !n ? "" : n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`;
export function quizRequired(requiredFrom: string | null, attempted: boolean, now = Date.now()) {
  if (!requiredFrom || attempted) return false;
  const start = Date.parse(requiredFrom);
  return now >= start && now < start + 24 * 60 * 60 * 1000;
}
export function questionOptions(options: Json): string[] {
  return Array.isArray(options) ? options.filter((v): v is string => typeof v === "string") : [];
}
export type QuizResult = { score: number; total: number; answers: { id: string; correct: number }[] };
export function parseQuizResult(value: Json): QuizResult {
  if (!value || typeof value !== "object" || Array.isArray(value) || typeof value['score'] !== "number" || typeof value['total'] !== "number" || !Array.isArray(value['answers'])) throw new Error("invalid quiz result");
  const answers = value['answers'].flatMap((answer) => answer && typeof answer === "object" && !Array.isArray(answer) && typeof answer['id'] === "string" && typeof answer['correct'] === "number" ? [{ id: answer['id'], correct: answer['correct'] }] : []);
  return { score: value['score'], total: value['total'], answers };
}
export type DraftQuestion = { prompt: string; options: string[]; correct: number };
export function validDraftQuestion(q: DraftQuestion) {
  return !!q.prompt.trim() && q.options.length >= 2 && q.options.length <= 6 && q.options.every((o) => !!o.trim()) && Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length;
}