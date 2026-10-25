import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, LoaderCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageState, Unavailable } from "@/components/PageState";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { readData, withTimeout } from "@/lib/requests";
import { parseQuizResult, questionOptions, type QuizResult } from "@/lib/library";
import { Route } from "@/routes/_authenticated/library_.quiz.$quizId";

export function LibraryQuiz() {
  const { quizId } = Route.useParams();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["quiz-play", quizId], staleTime: 60_000, queryFn: async () => {
    const quiz = await readData(supabase.from("quizzes").select("*").eq("id", quizId).eq("status", "approved").is("deleted_at", null).maybeSingle());
    if (!quiz) return null;
    const questions = await readData(supabase.from("quiz_questions").select("id,position,prompt,options").eq("quiz_id", quizId).order("position"));
    return { quiz, questions: (questions ?? []).map((q) => ({ ...q, options: questionOptions(q.options) })) };
  } });
  if (query.isLoading || query.isError) return <PageState loading={query.isLoading} error={query.isError} retry={() => void query.refetch()} />;
  if (!query.data) return <Unavailable kind="الاختبار" />;
  if (!query.data.questions.length) return <div className="py-12 text-center"><p>ما في أسئلة متاحة لهذا الاختبار حالياً.</p><Button asChild variant="outline" className="mt-4"><Link to="/library">المكتبة</Link></Button></div>;
  return <QuizSession key={quizId} quizId={quizId} data={query.data} onSubmitted={() => { void qc.invalidateQueries({ queryKey: ["quizzes"] }); void qc.invalidateQueries({ queryKey: ["quiz-attempts"] }); }} />;
}

type SessionData = { quiz: { title: string; minutes: number }; questions: { id: string; prompt: string; options: string[]; position: number }[] };
function QuizSession({ quizId, data, onSubmitted }: { quizId: string; data: SessionData; onSubmitted: () => void }) {
  const [index, setIndex] = useState(0); const [answers, setAnswers] = useState<Record<string, number>>({});
  const [deadline] = useState(() => Date.now() + data.quiz.minutes * 60_000);
  const [remaining, setRemaining] = useState(data.quiz.minutes * 60);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [result, setResult] = useState<QuizResult | null>(null);
  const lock = useRef(false); const attemptedAutoSubmit = useRef(false);
  const answerRef = useRef(answers); answerRef.current = answers;
  const question = data.questions[index];
  async function finish() {
    if (lock.current || result) return; lock.current = true; setBusy(true); setError("");
    try {
      const response = await withTimeout(supabase.rpc("submit_quiz", { _quiz: quizId, _answers: answerRef.current }));
      if (response.error) throw response.error;
      setResult(parseQuizResult(response.data)); onSubmitted();
    } catch { setError("ما قدرنا نحفظ النتيجة، إجاباتك محفوظة هون. جرّب مرة ثانية"); }
    finally { lock.current = false; setBusy(false); }
  }
  useEffect(() => {
    if (result) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer);
  }, [deadline, result]);
  useEffect(() => { if (remaining === 0 && !attemptedAutoSubmit.current && !result) { attemptedAutoSubmit.current = true; void finish(); } }, [remaining, result]);
  if (result) return <main dir="rtl" className="mx-auto max-w-2xl px-4 py-8 pb-24 font-display"><h1 className="text-3xl font-extrabold">نتيجتك</h1><div className="my-6 rounded-[20px] border bg-mint p-6 text-center text-mint-foreground"><Check className="mx-auto mb-3 size-8" /><p className="text-4xl font-extrabold">{result.score} من {result.total}</p></div><div className="space-y-4">{data.questions.map((q) => { const correct = result.answers.find((a) => a.id === q.id)?.correct; const selected = answers[q.id]; return <article key={q.id} className="rounded-[20px] border bg-card p-5"><h2 className="font-bold">{q.prompt}</h2><p className="mt-2 text-sm">إجابتك: {selected === undefined ? "بدون إجابة" : q.options[selected]}</p><p className="mt-1 text-sm font-bold text-primary">الإجابة الصحيحة: {correct === undefined ? "غير متاحة" : q.options[correct]}</p></article>; })}</div><Button asChild className="mt-6 h-12 w-full rounded-2xl"><Link to="/library">العودة للمكتبة</Link></Button></main>;
  if (!question) return null;
  const expired = remaining === 0;
  return <main dir="rtl" className="mx-auto max-w-2xl px-4 py-6 pb-24 font-display"><h1 className="mb-5 break-words text-2xl font-extrabold">{data.quiz.title}</h1><div className="mb-3 flex items-center justify-between text-sm"><span>السؤال {index + 1} من {data.questions.length}</span><span role="timer" className="flex items-center gap-2 tabular-nums"><Clock /> {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</span></div><Progress value={((index + 1) / data.questions.length) * 100} className="mb-6 h-2" />
    <h2 className="mb-6 break-words text-xl font-bold">{question.prompt}</h2><div role="group" aria-label="خيارات الإجابة" className="space-y-3">{question.options.map((option, i) => <Button key={i} disabled={busy || expired} variant={answers[question.id] === i ? "default" : "outline"} aria-pressed={answers[question.id] === i} className="min-h-16 h-auto w-full justify-start whitespace-normal rounded-[20px] px-5 py-4 text-start text-base" onClick={() => setAnswers((a) => ({ ...a, [question.id]: i }))}>{option}</Button>)}</div>
    {error && <p role="alert" className="mt-5 text-destructive">{error}</p>}
    <div className="mt-6 flex gap-3"><Button variant="outline" className="h-12 rounded-2xl" disabled={index === 0 || busy} onClick={() => setIndex((i) => i - 1)}>السابق</Button>{index < data.questions.length - 1 && !expired ? <Button className="h-12 flex-1 rounded-2xl" disabled={busy} onClick={() => setIndex((i) => i + 1)}>التالي</Button> : <Button className="h-12 flex-1 rounded-2xl" disabled={busy} onClick={() => void finish()}>{busy && <LoaderCircle className="animate-spin" />}{busy ? "جاري حفظ النتيجة…" : error ? "إعادة المحاولة" : "إنهاء الاختبار"}</Button>}</div>
  </main>;
}
