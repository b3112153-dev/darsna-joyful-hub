import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Image, Search, Plus, LoaderCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { PageState } from "@/components/PageState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { readData, withTimeout } from "@/lib/requests";
import { formatSize, quizRequired, questionOptions } from "@/lib/library";
import type { Tables } from "@/integrations/supabase/types";

export { formatSize } from "@/lib/library";
type ReviewTarget = { id: string; title: string; kind: "file" | "quiz" };
function SubjectChips({ subjects, selected, onSelect }: { subjects: string[]; selected: string; onSelect: (s: string) => void }) {
  return <div className="flex gap-2 overflow-x-auto py-2" aria-label="تصفية حسب المادة">{["الكل", ...subjects.filter((s) => s !== "الكل")].map((s) => <Button key={s} variant="secondary" aria-pressed={selected === s} className={`h-10 shrink-0 rounded-full px-5 ${selected === s ? "bg-foreground text-background hover:bg-foreground/90" : "bg-card border"}`} onClick={() => onSelect(s)}>{s}</Button>)}</div>;
}
export function Library() {
  const { user, loading: meLoading, isError: meError, refetch: refetchMe } = useMe(); const qc = useQueryClient();
  const [q, setQ] = useState(""); const [fileSubject, setFileSubject] = useState("الكل"); const [quizSubject, setQuizSubject] = useState("الكل");
  const [downloadId, setDownloadId] = useState<string | null>(null); const [reviewBusy, setReviewBusy] = useState<string | null>(null);
  const [reject, setReject] = useState<ReviewTarget | null>(null); const [reason, setReason] = useState(""); const [reviewError, setReviewError] = useState(""); const [preview, setPreview] = useState<ReviewTarget | null>(null);
  const support = useQuery({ queryKey: ["library-support", user?.id], enabled: !!user, staleTime: 300_000, queryFn: async () => user ? await readData(supabase.rpc("can_support", { _user_id: user.id })) : false });
  const filesQuery = useQuery({ queryKey: ["library", user?.id], enabled: !!user, staleTime: 60_000, queryFn: async () => await readData(supabase.from("library_files").select("*").is("deleted_at", null).order("created_at", { ascending: false })) });
  const quizzesQuery = useQuery({ queryKey: ["quizzes", user?.id], enabled: !!user, staleTime: 60_000, queryFn: async () => {
    const quizzes = await readData(supabase.from("quizzes").select("*,quiz_questions(id)").is("deleted_at", null).order("created_at", { ascending: false }));
    return quizzes;
  } });
  const attemptsQuery = useQuery({ queryKey: ["quiz-attempts", user?.id], enabled: !!user, queryFn: async () => user ? await readData(supabase.from("quiz_attempts").select("*").eq("user_id", user.id).order("created_at", { ascending: false })) : [] });
  const files = filesQuery.data ?? []; const quizzes = quizzesQuery.data ?? [];
  const uploaderIds = [...new Set(files.flatMap((f) => f.uploaded_by ? [f.uploaded_by] : []))].sort();
  const profiles = useQuery({ queryKey: ["library-uploaders", uploaderIds], enabled: uploaderIds.length > 0, staleTime: 300_000, queryFn: async () => await readData(supabase.from("profiles").select("id,display_name").in("id", uploaderIds)) });
  const previewQuery = useQuery({ queryKey: ["quiz-preview", preview?.id], enabled: preview?.kind === "quiz", queryFn: async () => preview ? await readData(supabase.from("quiz_questions").select("id,position,prompt,options").eq("quiz_id", preview.id).order("position")) : [] });
  async function download(file: Tables<"library_files">) {
    if (downloadId) return; setDownloadId(file.id);
    try { const { data, error } = await withTimeout(supabase.storage.from("library").createSignedUrl(file.file_path, 60, { download: file.file_name })); if (error || !data) throw error; const a = document.createElement("a"); a.href = data.signedUrl; a.download = file.file_name; a.rel = "noopener"; a.click(); } catch { toast.error("تعذر التنزيل، جرّب مرة ثانية"); } finally { setDownloadId(null); }
  }
  async function review(target: ReviewTarget, approved: boolean) {
    if (!user || reviewBusy || !support.data) return;
    if (!approved && !reason.trim()) { setReviewError("اكتب سبب الرفض"); return; }
    setReviewBusy(target.id); setReviewError("");
    try {
      const values = { status: approved ? "approved" : "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString(), reject_reason: approved ? null : reason.trim() };
      const response = target.kind === "file" ? await withTimeout(supabase.from("library_files").update(values).eq("id", target.id).eq("status", "pending").select("id").single()) : await withTimeout(supabase.from("quizzes").update(values).eq("id", target.id).eq("status", "pending").select("id").single());
      if (response.error) throw response.error;
      toast.success(approved ? "تمت الموافقة" : "تم رفض المشاركة"); setReject(null); setReason("");
      void qc.invalidateQueries({ queryKey: ["library"] }); void qc.invalidateQueries({ queryKey: ["quizzes"] });
    } catch { setReviewError("ما قدرنا نحفظ المراجعة، جرّب مرة ثانية"); toast.error("تعذر حفظ المراجعة"); } finally { setReviewBusy(null); }
  }
  const myPending = files.filter((f) => f.uploaded_by === user?.id && f.status === "pending");
  const myRejected = files.filter((f) => f.uploaded_by === user?.id && f.status === "rejected");
  const approvedFiles = files.filter((f) => f.status === "approved");
  const fileList = approvedFiles.filter((f) => (fileSubject === "الكل" || f.subject === fileSubject) && (!q.trim() || [f.title, f.subject, f.unit ?? ""].some((text) => text.includes(q.trim()))));
  const approvedQuizzes = quizzes.filter((quiz) => quiz.status === "approved");
  function reviewActions(target: ReviewTarget) { return <div className="mt-3 flex flex-wrap gap-2"><Button disabled={!!reviewBusy} className="rounded-xl" onClick={() => void review(target, true)}>{reviewBusy === target.id && <LoaderCircle className="animate-spin" />}موافقة</Button><Button disabled={!!reviewBusy} variant="outline" className="rounded-xl" onClick={() => { setReject(target); setReason(""); setReviewError(""); }}>رفض</Button>{target.kind === "quiz" && <Button variant="ghost" onClick={() => setPreview(target)}><Eye /> معاينة الأسئلة</Button>}</div>; }
  return <main dir="rtl" className="mx-auto max-w-3xl px-4 py-6 pb-24 font-display">
    <header className="mb-6 flex items-center justify-between gap-3"><h1 className="text-3xl font-extrabold">المكتبة</h1><Button asChild className="h-11 rounded-2xl"><Link to="/library/upload" search={{ tab: "file" }}><Plus /> ارفع ملف</Link></Button></header>
    <PageState loading={meLoading} error={meError} retry={() => void refetchMe()} />
    <Tabs defaultValue="files" dir="rtl"><TabsList className="h-14 w-full rounded-[20px] bg-library-tabs p-1"><TabsTrigger className="h-full flex-1 rounded-2xl text-base font-bold data-[state=active]:bg-card" value="files">ملفات</TabsTrigger><TabsTrigger className="h-full flex-1 rounded-2xl text-base font-bold data-[state=active]:bg-card" value="quizzes">اختبارات</TabsTrigger></TabsList>
      <TabsContent value="files" className="mt-5 space-y-4"><div className="relative"><Search className="absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" /><Input aria-label="دوّر على ملف أو مادة" placeholder="دوّر على ملف أو مادة" className="h-12 rounded-2xl bg-card ps-12" value={q} onChange={(e) => setQ(e.target.value)} /></div><SubjectChips subjects={[...new Set(approvedFiles.map((f) => f.subject))].sort()} selected={fileSubject} onSelect={setFileSubject} />
        <PageState loading={filesQuery.isLoading} error={filesQuery.isError} retry={() => void filesQuery.refetch()} />
        {!!myPending.length && <div className="rounded-[20px] bg-peach p-5 text-peach-foreground"><h2 className="font-bold">ملفاتك بانتظار موافقة الدعم ({myPending.length})</h2><ul className="my-2 space-y-1">{myPending.map((f) => <li key={f.id} className="break-words">{f.title}</li>)}</ul><p className="text-sm">بتظهر للكل بعد المراجعة</p></div>}
        {!!myRejected.length && <div className="rounded-[20px] border bg-card p-5"><h2 className="font-bold">ملفات لم تتم الموافقة عليها</h2>{myRejected.map((f) => <div key={f.id} className="mt-3"><p className="break-words font-semibold">{f.title}</p><p className="break-words text-sm text-destructive">{f.reject_reason || "لم تتم الموافقة"}</p></div>)}</div>}
        <PageState error={support.isError} retry={() => void support.refetch()} />
        {support.data && files.some((f) => f.status === "pending") && <section className="space-y-3 border-b pb-5"><h2 className="text-xl font-extrabold">بانتظار المراجعة</h2>{files.filter((f) => f.status === "pending").map((f) => <article key={f.id} className="rounded-[20px] border bg-card p-4"><h3 className="break-words font-bold">{f.title}</h3><p className="text-sm text-muted-foreground">{f.subject} · {f.unit} · {formatSize(f.file_size)}</p><Button variant="secondary" className="mt-3 rounded-xl" disabled={!!downloadId} onClick={() => void download(f)}><Download /> عرض الملف</Button>{reviewActions({ id: f.id, title: f.title, kind: "file" })}</article>)}</section>}
        <PageState error={profiles.isError} retry={() => void profiles.refetch()} />
        <div className="space-y-3">{fileList.map((f) => { const ext = f.file_name.split(".").pop()?.toUpperCase() ?? "TXT"; const type = ext.startsWith("DOC") ? "DOC" : ext.startsWith("PPT") ? "PPT" : ext.startsWith("XLS") ? "XLS" : ext; const image = !["PDF", "DOC", "PPT", "XLS", "TXT"].includes(type); return <article key={f.id} className="flex items-center gap-3 rounded-[20px] border bg-card p-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-peach text-sm font-extrabold text-peach-foreground">{image ? <Image className="size-6" /> : type}</span><div className="min-w-0 flex-1"><h2 className="break-words font-extrabold">{f.title}</h2><p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{f.subject}{f.unit ? ` · ${f.unit}` : ""} · رفعها {profiles.data?.find((p) => p.id === f.uploaded_by)?.display_name ?? "طالب"} · <bdi>{formatSize(f.file_size)}</bdi></p></div><Button size="icon" variant="secondary" aria-label={`تنزيل ${f.title}`} className="size-10 shrink-0 rounded-xl" disabled={!!downloadId} onClick={() => void download(f)}>{downloadId === f.id ? <LoaderCircle className="animate-spin" /> : <Download />}</Button></article>; })}</div>
        {!filesQuery.isLoading && !filesQuery.isError && !fileList.length && <p className="py-8 text-center text-muted-foreground">ما في ملفات مطابقة.</p>}
      </TabsContent>
      <TabsContent value="quizzes" className="mt-5 space-y-4"><p className="text-sm text-muted-foreground">كل الاختبارات اختيار من متعدد، والنتيجة بتتسجل لحالها.</p><SubjectChips subjects={[...new Set(approvedQuizzes.map((quiz) => quiz.subject))].sort()} selected={quizSubject} onSelect={setQuizSubject} /><PageState loading={quizzesQuery.isLoading || attemptsQuery.isLoading} error={quizzesQuery.isError || attemptsQuery.isError} retry={() => { void quizzesQuery.refetch(); void attemptsQuery.refetch(); }} />
        {support.data && quizzes.some((quiz) => quiz.status === "pending") && <section className="space-y-3 border-b pb-5"><h2 className="text-xl font-extrabold">بانتظار المراجعة</h2>{quizzes.filter((quiz) => quiz.status === "pending").map((quiz) => <article key={quiz.id} className="rounded-[20px] border bg-card p-4"><h3 className="break-words font-bold">{quiz.title}</h3><p className="text-sm text-muted-foreground">{quiz.subject} · {quiz.quiz_questions.length} سؤال · {quiz.minutes} دقيقة</p>{reviewActions({ id: quiz.id, title: quiz.title, kind: "quiz" })}</article>)}</section>}
        {quizzes.filter((quiz) => quiz.created_by === user?.id && quiz.status !== "approved").map((quiz) => <div key={quiz.id} className="rounded-[20px] bg-peach p-4 text-peach-foreground"><h3 className="font-bold">{quiz.title}</h3><p className="mt-1 text-sm">{quiz.status === "pending" ? "اختبارك بانتظار موافقة الدعم" : `لم تتم الموافقة: ${quiz.reject_reason ?? ""}`}</p></div>)}
        {approvedQuizzes.filter((quiz) => quizSubject === "الكل" || quiz.subject === quizSubject).map((quiz) => { const attempt = attemptsQuery.data?.find((a) => a.quiz_id === quiz.id); const required = quizRequired(quiz.required_from, !!attempt); return <article key={quiz.id} className="rounded-[20px] border bg-card p-5"><h2 className="break-words text-lg font-extrabold">{quiz.title}</h2><p className="mt-2 text-sm text-muted-foreground">{quiz.subject}{quiz.unit ? ` · ${quiz.unit}` : ""} · {quiz.quiz_questions.length} سؤال · {quiz.minutes} دقيقة</p>{required && <span className="mt-3 inline-block rounded-full bg-peach px-3 py-1 text-xs font-bold text-peach-foreground">مطلوب خلال ٢٤ ساعة</span>}{attempt && <p className="mt-3 font-bold">حليته: {attempt.score} من {attempt.total}</p>}<Button asChild variant={required ? "default" : "secondary"} className="mt-4 h-11 rounded-xl"><Link to="/library/quiz/$quizId" params={{ quizId: quiz.id }}>{required ? "ابدأ الاختبار" : attempt ? "حل مرة ثانية" : "ابدأ"}</Link></Button></article>; })}
        {!quizzesQuery.isLoading && !quizzesQuery.isError && !approvedQuizzes.length && <p className="py-6 text-center text-muted-foreground">ما في اختبارات منشورة بعد.</p>}
        <Link to="/library/upload" search={{ tab: "quiz" }} className="block rounded-[20px] border bg-mint p-5 text-mint-foreground"><h2 className="font-bold">عندك أسئلة اختبار؟</h2><p className="mt-2 text-sm">ارفعها وبعد موافقة الدعم بتنضاف للاختبارات</p></Link>
      </TabsContent>
    </Tabs>
    <Dialog open={!!reject} onOpenChange={(open) => { if (!open && !reviewBusy) setReject(null); }}><DialogContent dir="rtl" className="max-w-[calc(100%-2rem)] rounded-[20px] sm:max-w-lg"><DialogTitle>سبب الرفض</DialogTitle><DialogDescription>{reject?.title}</DialogDescription><Textarea aria-label="سبب الرفض" value={reason} maxLength={600} onChange={(e) => setReason(e.target.value)} />{reviewError && <p role="alert" className="text-destructive">{reviewError}</p>}<Button disabled={!!reviewBusy || !reason.trim()} onClick={() => reject && void review(reject, false)}>تأكيد الرفض</Button></DialogContent></Dialog>
    <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}><DialogContent dir="rtl" className="max-h-[85dvh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-[20px] sm:max-w-lg"><DialogTitle>{preview?.title}</DialogTitle><DialogDescription>أسئلة الاختبار</DialogDescription><PageState loading={previewQuery.isLoading} error={previewQuery.isError} retry={() => void previewQuery.refetch()} />{previewQuery.data?.map((question, i) => <div key={question.id} className="border-b pb-3"><h3 className="break-words font-bold">{i + 1}. {question.prompt}</h3><ul className="mt-2 space-y-1">{questionOptions(question.options).map((o, j) => <li key={j} className="break-words text-sm">{j + 1}. {o}</li>)}</ul></div>)}</DialogContent></Dialog>
  </main>;
}
