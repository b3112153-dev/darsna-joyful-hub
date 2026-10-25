import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, X, Plus, LoaderCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageState } from "@/components/PageState";
import { fileValidation, formatSize, hasExternalLink, validDraftQuestion, type DraftQuestion } from "@/lib/library";
import { withTimeout } from "@/lib/requests";
import { Route } from "@/routes/_authenticated/library_.upload";
import { t } from "@/lib/i18n";

const newQuestion = (): DraftQuestion => ({ prompt: "", options: ["", ""], correct: 0 });
export function LibraryUpload() {
  const { tab: initialTab } = Route.useSearch();
  const [tab, setTab] = useState(initialTab ?? "file");
  const [title, setTitle] = useState(""); const [subject, setSubject] = useState(""); const [unit, setUnit] = useState("");
  const [file, setFile] = useState<File | null>(null); const [minutes, setMinutes] = useState(15);
  const [questions, setQuestions] = useState<DraftQuestion[]>([newQuestion()]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const lock = useRef(false);
  const input = useRef<HTMLInputElement>(null); const navigate = useNavigate(); const qc = useQueryClient();
  const { user, loading, isError, refetch } = useMe();
  function choose(candidate?: File) { if (!candidate) return; const problem = fileValidation(candidate); if (problem) { setError(problem); return; } setError(""); setFile(candidate); }
  function updateQuestion(index: number, patch: Partial<DraftQuestion>) { setQuestions((rows) => rows.map((row, i) => i === index ? { ...row, ...patch } : row)); }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!user || lock.current) return;
    const texts = [title, subject, unit, ...(tab === "quiz" ? questions.flatMap((q) => [q.prompt, ...q.options]) : [file?.name ?? ""])];
    if (texts.some(hasExternalLink)) { setError("ممنوع نشر الروابط"); return; }
    if (!title.trim() || !subject.trim()) { setError("اكتب العنوان والمادة"); return; }
    if (tab === "file" && (!file || fileValidation(file))) { setError(file ? fileValidation(file) ?? "" : "اختار ملف أولاً"); return; }
    if (tab === "quiz" && (!questions.every(validDraftQuestion) || !Number.isInteger(minutes) || minutes < 1 || minutes > 180)) { setError("كمّل الأسئلة وخياراتها وحدد مدة بين ١ و١٨٠ دقيقة"); return; }
    lock.current = true; setBusy(true); setError(""); let uploadedPath: string | null = null;
    try {
      if (tab === "file" && file) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "txt";
        const path = `students/${user.id}/${crypto.randomUUID()}.${ext}`;
        const up = await withTimeout(supabase.storage.from("library").upload(path, file, file.type ? { contentType: file.type } : {}));
        if (up.error) throw up.error; uploadedPath = path;
        const result = await withTimeout(supabase.from("library_files").insert({ title: title.trim(), subject: subject.trim(), unit: unit.trim() || null, file_path: path, file_name: file.name, file_size: file.size, uploaded_by: user.id }));
        if (result.error) throw result.error;
        uploadedPath = null;
      } else {
        const result = await withTimeout(supabase.rpc("submit_quiz_draft", { _title: title.trim(), _subject: subject.trim(), _unit: unit.trim(), _minutes: minutes, _questions: questions.map((q) => ({ prompt: q.prompt.trim(), options: q.options.map((o) => o.trim()), correct: q.correct })) }));
        if (result.error) throw result.error;
      }
      await qc.invalidateQueries({ queryKey: ["library"] }); await qc.invalidateQueries({ queryKey: ["quizzes"] });
      toast.success(t("تم الإرسال للمراجعة")); navigate({ to: "/library" });
    } catch { if (uploadedPath) await withTimeout(supabase.storage.from("library").remove([uploadedPath])).catch(() => undefined); setError("ما قدرنا نرسل، جرّب مرة ثانية"); }
    finally { lock.current = false; setBusy(false); }
  }
  if (loading || isError) return <PageState loading={loading} error={isError} retry={() => void refetch()} />;
  return <main dir="rtl" className="mx-auto max-w-2xl px-4 py-6 pb-24 font-display">
    <Button variant="ghost" onClick={() => navigate({ to: "/library" })}><ArrowRight /> {t("المكتبة")}</Button>
    <h1 className="my-5 text-3xl font-extrabold">{t("ارفع للمكتبة")}</h1>
    <Tabs value={tab} onValueChange={(v) => { if (!busy && (v === "file" || v === "quiz")) setTab(v); }} dir="rtl">
      <TabsList className="h-14 w-full rounded-[20px] bg-library-tabs p-1"><TabsTrigger className="h-full flex-1 rounded-2xl data-[state=active]:bg-card" value="file">{t("ملف أو صورة")}</TabsTrigger><TabsTrigger className="h-full flex-1 rounded-2xl data-[state=active]:bg-card" value="quiz">{t("أسئلة اختبار")}</TabsTrigger></TabsList>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <fieldset disabled={busy} className="space-y-5">
          <TabsContent value="file">
            <input ref={input} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif,.heic,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" onChange={(e) => choose(e.target.files?.[0])} />
            {file ? <div className="flex items-center gap-3 rounded-[20px] border bg-card p-4"><Upload className="shrink-0" /><div className="min-w-0 flex-1"><p className="break-all font-bold">{file.name}</p><p className="text-sm text-muted-foreground">{formatSize(file.size)}</p></div><Button type="button" size="icon" variant="ghost" aria-label={t("إزالة الملف")} onClick={() => { setFile(null); if (input.current) input.current.value = ""; }}><X /></Button></div> : <Button type="button" variant="outline" className="h-36 w-full flex-col rounded-[20px] border-2 border-dashed bg-card whitespace-normal" onClick={() => input.current?.click()}><Upload className="size-8" /><span>{t("اضغط لاختيار ملف")}</span><span className="text-xs text-muted-foreground">{t("PDF، صور، Word، PowerPoint، Excel، نص — حتى ١٠ ميغا")}</span></Button>}
          </TabsContent>
          <label className="block space-y-2"><span>{t("العنوان")}</span><Input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span>{t("المادة")}</span><Input required maxLength={60} value={subject} onChange={(e) => setSubject(e.target.value)} /></label><label className="space-y-2"><span>{t("الوحدة")}</span><Input maxLength={60} value={unit} onChange={(e) => setUnit(e.target.value)} /></label></div>
          <TabsContent value="quiz" className="space-y-5">
            <label className="block space-y-2"><span>{t("المدة بالدقائق")}</span><Input type="number" min={1} max={180} step={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label>
            {questions.map((q, i) => <section key={i} className="space-y-3 border-b pb-5"><div className="flex items-center justify-between"><h2 className="font-bold">السؤال {i + 1}</h2>{questions.length > 1 && <Button type="button" size="icon" variant="ghost" aria-label={`حذف السؤال ${i + 1}`} onClick={() => setQuestions((rows) => rows.filter((_, j) => j !== i))}><X /></Button>}</div><Textarea aria-label={`نص السؤال ${i + 1}`} maxLength={600} value={q.prompt} onChange={(e) => updateQuestion(i, { prompt: e.target.value })} />
              {q.options.map((option, j) => <div key={j} className="flex items-center gap-2"><input type="radio" name={`correct-${i}`} aria-label={`الإجابة الصحيحة الخيار ${j + 1} للسؤال ${i + 1}`} checked={q.correct === j} onChange={() => updateQuestion(i, { correct: j })} className="size-5 accent-primary" /><Input aria-label={`الخيار ${j + 1} للسؤال ${i + 1}`} maxLength={600} value={option} onChange={(e) => updateQuestion(i, { options: q.options.map((o, k) => k === j ? e.target.value : o) })} />{q.options.length > 2 && <Button type="button" variant="ghost" size="icon" aria-label={t("حذف الخيار")} onClick={() => updateQuestion(i, { options: q.options.filter((_, k) => k !== j), correct: q.correct === j ? 0 : q.correct > j ? q.correct - 1 : q.correct })}><X /></Button>}</div>)}
              {q.options.length < 6 && <Button type="button" variant="outline" onClick={() => updateQuestion(i, { options: [...q.options, ""] })}><Plus /> {t("خيار")}</Button>}
            </section>)}
            <Button type="button" variant="secondary" disabled={questions.length >= 60} onClick={() => setQuestions((rows) => [...rows, newQuestion()])}><Plus /> {t("إضافة سؤال")}</Button>
          </TabsContent>
        </fieldset>
        <p className="rounded-[20px] bg-peach p-4 text-sm text-peach-foreground">{t("بعد ما ترسله، فريق الدعم بيراجعه وبعدين بينشر للكل. ما بيظهر لغيرك قبل الموافقة، وممنوع الروابط الخارجية.")}</p>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <Button disabled={busy} className="h-12 w-full rounded-2xl">{busy && <LoaderCircle className="animate-spin" />} {busy ? "جاري الإرسال…" : "إرسال للمراجعة"}</Button>
      </form>
    </Tabs>
  </main>;
}
