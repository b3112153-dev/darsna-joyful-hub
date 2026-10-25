import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarCheck, Check, Pencil, Plus, Settings2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { useApprovedQuizzes, useCurriculum, usePlanItems, usePlanMutations, useStudyPlan } from "@/hooks/use-plan";
import { PageState } from "@/components/PageState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { BRANCHES } from "@/lib/branches";
import {
  arDigits, DAY_NAMES, SCHOOL_DAYS, addDays, dateStr, fmtMin, sleepHours, stripTime, todayStr,
  type Commitment, type PlanAnswers, type SchoolExam, type SubjectPlan, type UnitRow,
} from "@/lib/plan";
import type { Tables } from "@/integrations/supabase/types";
import { t } from "@/lib/i18n";

const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const toTime = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const KIND_LABEL: Record<string, string> = {
  watch: "مشاهدة", review: "تثبيت", memorize: "حفظ ومراجعة",
  school_exam: "امتحان مدرسة", platform_exam: "امتحان المنصة", custom: "مخصص",
};

const defaultAnswers = (branch: string): PlanAnswers => ({
  branch,
  status: "new",
  subjects: [],
  sleepMin: 23 * 60,
  wakeMin: 6 * 60 + 30,
  school: Object.fromEntries(SCHOOL_DAYS.map((d) => [String(d), { go: 7 * 60 + 30, back: 14 * 60 }])),
  meals: { breakfast: 7 * 60, lunch: 15 * 60, dinner: 20 * 60 },
  commitments: [],
  dailyHours: 4,
  schoolExams: [],
});

export function Plan() {
  const { user, me, loading: meLoading, isError: meError, refetch } = useMe();
  const unitsQ = useCurriculum();
  const planQ = useStudyPlan(user?.id);
  const itemsQ = usePlanItems(user?.id);
  const quizzesQ = useApprovedQuizzes();
  const gen = me?.profile?.generation ?? null;
  const mut = usePlanMutations(user?.id, gen);
  const [wizard, setWizard] = useState(false);
  const [day, setDay] = useState(todayStr());
  const [editItem, setEditItem] = useState<Tables<"plan_items"> | null>(null);
  const [adding, setAdding] = useState(false);

  // خصم نقاط الامتحانات الفائتة بصمت عند فتح الصفحة
  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const { data } = await supabase.rpc("penalize_missed_exams");
        if (typeof data === "number" && data > 0) toast(`انخصم ${arDigits(data)} نقاط لأنك ما حليت الامتحان خلال ٢٤ ساعة`);
      } catch { /* بصمت */ }
    })();
  }, [user?.id]);

  const answers = planQ.data ?? null;
  const items = itemsQ.data ?? [];
  const units = unitsQ.data ?? [];
  const quizzes = quizzesQ.data ?? [];

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(stripTime(new Date()), i)), []);
  const dayItems = useMemo(() => items.filter((it) => it.day === day), [items, day]);
  const studyMin = dayItems.filter((it) => !["school_exam", "platform_exam"].includes(it.kind)).reduce((s, it) => s + it.minutes, 0);
  const dueExam = items.find((it) => it.kind === "platform_exam" && it.quiz_id && !it.done && it.day <= todayStr())
    ?? items.find((it) => it.kind === "platform_exam" && it.quiz_id && !it.done);
  const manualIds = new Set(answers?.manualIds ?? []);
  const canManage = !!(me?.isStaff || me?.isSupport || me?.isOwner);

  if (meLoading || (user && planQ.isLoading)) return <PageState loading />;
  if (meError || planQ.isError || itemsQ.isError) return <PageState error retry={() => { void refetch(); void planQ.refetch(); void itemsQ.refetch(); }} />;
  if (!user) return <PageState error />;

  async function runGenerate(a: PlanAnswers) {
    try {
      await mut.saveAnswers.mutateAsync(a);
      await mut.regenerate.mutateAsync({ answers: a, units, quizzes });
      toast.success(t("جهّزنا جدولك"));
      setWizard(false);
    } catch {
      toast.error(t("ما قدرنا نجهّز الجدول، جرّب مرة ثانية"));
    }
  }

  if (!answers || wizard) {
    return (
      <main className="mx-auto max-w-[480px] px-5 py-5 font-display">
        <PlanWizard
          initial={answers ?? defaultAnswers(me?.profile?.branch ?? BRANCHES[0]!.value)}
          units={units}
          generation={gen}
          busy={mut.saveAnswers.isPending || mut.regenerate.isPending}
          onCancel={answers ? () => setWizard(false) : undefined}
          onSave={runGenerate}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[480px] space-y-4 px-5 py-5 font-display">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold">{t("حلّها")}</h1>
          <p className="text-sm text-muted-foreground">{t("جدولك على قدّ وقتك، من أول درس لحد الامتحان")}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {canManage && (
            <Button asChild size="sm" variant="outline" className="rounded-xl">
              <Link to="/admin/curriculum"><Settings2 /> {t("المنهاج")}</Link>
            </Button>
          )}
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setWizard(true)}>
            <Pencil /> {t("عدّل إجاباتي")}
          </Button>
        </div>
      </div>

      <Button
        className="w-full rounded-2xl bg-brand text-base font-extrabold shadow-soft"
        disabled={mut.regenerate.isPending}
        onClick={() => runGenerate(answers)}
      >
        <Sparkles /> {mut.regenerate.isPending ? "بنحلّها…" : "حلّها"}
      </Button>

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label={t("أيام الجدول")}>
        {days.map((d) => {
          const ds = dateStr(d);
          const active = ds === day;
          return (
            <button
              key={ds}
              onClick={() => setDay(ds)}
              aria-pressed={active}
              className={`flex w-[72px] shrink-0 flex-col items-center rounded-2xl border py-2 transition ${active ? "border-[#8c0610] bg-[#8c0610] text-primary-foreground" : "bg-card"}`}
            >
              <span className="text-xs">{DAY_NAMES[d.getDay()]}</span>
              <span className="text-lg font-extrabold tabular-nums">{arDigits(d.getDate())}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto">
        <span className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold">{arDigits(Math.round(studyMin / 6) / 10)} ساعات دراسة</span>
        <span className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold">{arDigits(sleepHours(answers))} ساعات نوم</span>
        {answers.commitments.filter((c) => c.day === new Date(`${day}T12:00:00`).getDay()).map((c, i) => (
          <span key={i} className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold">{c.name} {fmtMin(c.from)}</span>
        ))}
      </div>

      {itemsQ.isLoading ? <PageState loading /> : (
        <div className="space-y-2.5">
          {dayItems.length === 0 && (
            <p className="rounded-[20px] border bg-card p-5 text-center text-sm text-muted-foreground">{t("ما في بطاقات بهذا اليوم. اضغط «حلّها» لتوليد الجدول.")}</p>
          )}
          {dayItems.map((it) => (
            <PlanCard
              key={it.id}
              item={it}
              manual={manualIds.has(it.id)}
              onToggle={() => mut.toggleDone.mutate({ id: it.id, done: !it.done })}
              onEdit={() => setEditItem(it)}
            />
          ))}
          <Button variant="outline" className="w-full rounded-2xl" onClick={() => setAdding(true)}>
            <Plus /> {t("أضف بطاقة مخصصة")}
          </Button>
        </div>
      )}

      <div className="rounded-[20px] border bg-card p-4 text-center shadow-card">
        <p className="text-sm font-bold">{t("خلصت جدول اليوم؟ حل الامتحان خلال ٢٤ ساعة وإلا بتخسر ٥ نقاط")}</p>
        {dueExam?.quiz_id ? (
          <Button asChild className="mt-3 rounded-2xl bg-brand shadow-soft">
            <Link to="/library/quiz/$quizId" params={{ quizId: dueExam.quiz_id }}>{t("حلّ الامتحان")}</Link>
          </Button>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">{t("ما في امتحان منصة مستحق حالياً.")}</p>
        )}
      </div>

      <EditItemDialog
        item={editItem}
        onClose={() => setEditItem(null)}
        onSave={async (patch) => {
          if (!editItem) return;
          try {
            await mut.updateItem.mutateAsync({ id: editItem.id, ...patch });
            await mut.markManual.mutateAsync({ answers, id: editItem.id });
            toast.success(t("تم الحفظ"));
            setEditItem(null);
          } catch { toast.error(t("ما قدرنا نحفظ التعديل")); }
        }}
        onDelete={async () => {
          if (!editItem) return;
          try {
            await mut.deleteItem.mutateAsync(editItem.id);
            toast.success(t("انحذفت البطاقة"));
            setEditItem(null);
          } catch { toast.error(t("ما قدرنا نحذف البطاقة")); }
        }}
      />
      <AddItemDialog
        open={adding}
        day={day}
        onClose={() => setAdding(false)}
        onAdd={async (draft) => {
          try {
            await mut.addItem.mutateAsync(draft);
            toast.success(t("انضافت البطاقة"));
            setAdding(false);
          } catch { toast.error(t("ما قدرنا نضيف البطاقة")); }
        }}
      />
    </main>
  );
}

function PlanCard({ item, manual, onToggle, onEdit }: { item: Tables<"plan_items">; manual: boolean; onToggle: () => void; onEdit: () => void }) {
  const isSchoolExam = item.kind === "school_exam";
  const isPlatform = item.kind === "platform_exam";
  const badge = isSchoolExam && item.importance === 3 ? "مهم كتير" : isSchoolExam && item.importance === 2 ? "مهم" : null;
  return (
    <div className="flex items-start gap-3">
      <span className="w-12 shrink-0 pt-4 text-center text-sm font-extrabold tabular-nums text-muted-foreground">{fmtMin(item.start_min)}</span>
      <div
        className={`min-w-0 flex-1 rounded-[20px] border p-3.5 shadow-card transition ${item.done ? "opacity-60" : ""} ${
          isSchoolExam ? "border-[#EBC7BF] bg-[#EBC7BF]/40" : isPlatform ? "border-[#f4d4a6] bg-[#f4d4a6]/40" : "bg-card"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {manual && <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-label={t("معدّلة يدوياً")} />}
            <p className={`truncate text-sm font-extrabold ${item.done ? "line-through" : ""}`}>{item.title}</p>
          </div>
          {badge && <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-primary-foreground">{badge}</span>}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {item.subject} · {KIND_LABEL[item.kind] ?? item.kind} · {arDigits(item.minutes)} دقيقة
        </p>
        {isSchoolExam && item.importance && item.importance >= 2 && (
          <p className="mt-1 text-xs font-bold text-brand">{t("امتحان قريب، أخدت وقت زيادة بالمراجعة")}</p>
        )}
        <div className="mt-2 flex items-center gap-1">
          <Button size="sm" variant={item.done ? "secondary" : "outline"} className="h-8 rounded-xl text-xs" onClick={onToggle}>
            <Check /> {item.done ? "منجزة" : "صح"}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs" onClick={onEdit}>
            <Pencil /> {t("تعديل")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditItemDialog({ item, onClose, onSave, onDelete }: {
  item: Tables<"plan_items"> | null;
  onClose: () => void;
  onSave: (patch: { day: string; start_min: number; minutes: number; title: string }) => void;
  onDelete: () => void;
}) {
  const [time, setTime] = useState("");
  const [day, setDay] = useState("");
  const [minutes, setMinutes] = useState(45);
  const [title, setTitle] = useState("");
  useEffect(() => {
    if (item) { setTime(toTime(item.start_min)); setDay(item.day); setMinutes(item.minutes); setTitle(item.title); }
  }, [item]);
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm font-display">
        <DialogTitle>{t("تعديل البطاقة")}</DialogTitle>
        <DialogDescription>{t("غيّر الوقت أو المدة أو اليوم، أو احذف البطاقة.")}</DialogDescription>
        <div className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label={t("عنوان البطاقة")} />
          <div className="grid grid-cols-2 gap-2">
            <Input type="time" dir="ltr" value={time} onChange={(e) => setTime(e.target.value)} aria-label={t("الوقت")} />
            <Input type="date" dir="ltr" value={day} onChange={(e) => setDay(e.target.value)} aria-label={t("اليوم")} />
          </div>
          <Input type="number" min={5} max={300} value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 45)} aria-label={t("المدة بالدقائق")} />
          <div className="flex gap-2">
            <Button className="flex-1 rounded-xl bg-brand" disabled={!title.trim() || !day} onClick={() => onSave({ day, start_min: toMin(time || "0:0"), minutes, title: title.trim() })}>{t("حفظ")}</Button>
            <Button variant="destructive" className="rounded-xl" onClick={onDelete}><Trash2 /> {t("حذف")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddItemDialog({ open, day, onClose, onAdd }: {
  open: boolean;
  day: string;
  onClose: () => void;
  onAdd: (draft: { day: string; start_min: number; minutes: number; kind: string; subject: string; title: string; unit_id: null; quiz_id: null; importance: null }) => void;
}) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [time, setTime] = useState("18:00");
  const [minutes, setMinutes] = useState(45);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm font-display">
        <DialogTitle>{t("بطاقة مخصصة")}</DialogTitle>
        <DialogDescription>{t("أضف نشاطاً خاصاً فيك لهذا اليوم.")}</DialogDescription>
        <div className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("العنوان")} aria-label={t("العنوان")} />
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("المادة (اختياري)")} aria-label={t("المادة")} />
          <div className="grid grid-cols-2 gap-2">
            <Input type="time" dir="ltr" value={time} onChange={(e) => setTime(e.target.value)} aria-label={t("الوقت")} />
            <Input type="number" min={5} max={300} value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 45)} aria-label={t("المدة بالدقائق")} />
          </div>
          <Button
            className="w-full rounded-xl bg-brand"
            disabled={!title.trim()}
            onClick={() => onAdd({ day, start_min: toMin(time), minutes, kind: "custom", subject: subject.trim() || "عام", title: title.trim(), unit_id: null, quiz_id: null, importance: null })}
          >
            {t("إضافة")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ================= معالج الأسئلة ================= */

function PlanWizard({ initial, units, generation, busy, onSave, onCancel }: {
  initial: PlanAnswers;
  units: UnitRow[];
  generation: string | null;
  busy: boolean;
  onSave: (a: PlanAnswers) => void;
  onCancel?: (() => void) | undefined;
}) {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<PlanAnswers>(initial);
  const [customSubject, setCustomSubject] = useState("");
  const set = (patch: Partial<PlanAnswers>) => setA((prev) => ({ ...prev, ...patch }));

  const availableSubjects = useMemo(() => {
    const names = units.filter((u) => u.generation === "all" || !generation || u.generation === generation).map((u) => u.subject);
    return [...new Set(names)].sort();
  }, [units, generation]);

  const steps = ["الفرع", "المواد", "النوم", "المدرسة", "الوجبات والالتزامات", "ساعات الدراسة", "امتحانات المدرسة"];

  const toggleSubject = (name: string, on: boolean) => {
    setA((prev) => {
      if (on) {
        if (prev.subjects.some((s) => s.name === name)) return prev;
        const dbSem = (sem: 1 | 2) => units.some((u) => u.subject === name && u.semester === sem && (u.generation === "all" || !generation || u.generation === generation));
        const sems = ([1, 2] as const).filter(dbSem).map((sem) => ({ semester: sem, totalUnits: 0, totalLessons: 0, doneUnits: 0, doneLessons: 0 }));
        const subject: SubjectPlan = sems.length
          ? { name, semesters: sems }
          : { name, manual: true, semesters: [{ semester: 1, totalUnits: 4, totalLessons: 4, doneUnits: 0, doneLessons: 0 }, { semester: 2, totalUnits: 4, totalLessons: 4, doneUnits: 0, doneLessons: 0 }] };
        return { ...prev, subjects: [...prev.subjects, subject] };
      }
      return { ...prev, subjects: prev.subjects.filter((s) => s.name !== name) };
    });
  };

  const patchSubject = (name: string, sem: 1 | 2, patch: Partial<SubjectPlan["semesters"][number]>) => {
    setA((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) => s.name === name
        ? { ...s, semesters: s.semesters.map((sm) => sm.semester === sem ? { ...sm, ...patch } : sm) }
        : s),
    }));
  };

  const canNext =
    step === 0 ? !!a.branch :
    step === 1 ? a.subjects.length > 0 :
    step === 6 ? true : true;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">{t("حلّها")}</h1>
        <p className="text-sm text-muted-foreground">{t("جاوب على كم سؤال وبنجهّزلك جدولك")}</p>
      </div>
      <div className="flex gap-1" aria-label={t("التقدم")}>
        {steps.map((s, i) => (
          <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-secondary"}`} />
        ))}
      </div>
      <p className="text-xs font-bold text-muted-foreground">{arDigits(step + 1)} / {arDigits(steps.length)} — {steps[step]}</p>

      <div className="rounded-[20px] border bg-card p-4 shadow-card">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-bold">{t("شو فرعك؟")}</p>
              <Select value={a.branch} onValueChange={(v) => set({ branch: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{BRANCHES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">{t("مستجد ولا معيد؟")}</p>
              <div className="grid grid-cols-2 gap-2">
                {(["new", "repeat"] as const).map((s) => (
                  <Button key={s} variant={a.status === s ? "default" : "outline"} className={`rounded-xl ${a.status === s ? "bg-brand" : ""}`} onClick={() => set({ status: s })}>
                    {s === "new" ? "مستجد" : "معيد"}
                  </Button>
                ))}
              </div>
            </div>
            {generation && <p className="text-xs text-muted-foreground">دفعتك: {generation} (من ملفك تلقائياً)</p>}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm font-bold">{t("شو المواد اللي بتدرسها؟")}</p>
            <div className="flex flex-wrap gap-2">
              {availableSubjects.map((name) => {
                const on = a.subjects.some((s) => s.name === name);
                return (
                  <Button key={name} size="sm" variant={on ? "default" : "outline"} className={`rounded-full ${on ? "bg-brand" : ""}`} onClick={() => toggleSubject(name, !on)}>
                    {name}
                  </Button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Input value={customSubject} onChange={(e) => setCustomSubject(e.target.value)} placeholder={t("مادة ثانية مش موجودة؟ اكتبها")} aria-label={t("مادة يدوية")} />
              <Button variant="outline" className="shrink-0 rounded-xl" disabled={!customSubject.trim()} onClick={() => { toggleSubject(customSubject.trim(), true); setCustomSubject(""); }}>
                <Plus /> {t("إضافة")}
              </Button>
            </div>
            {a.subjects.map((s) => (
              <div key={s.name} className="space-y-2 rounded-2xl border p-3">
                <p className="text-sm font-extrabold">{s.name}</p>
                {s.semesters.map((sm) => {
                  const dbCount = units.filter((u) => u.subject === s.name && u.semester === sm.semester && (u.generation === "all" || !generation || u.generation === generation)).length;
                  const semLabel = sm.semester === 1 ? "الفصل الأول" : "الفصل الثاني";
                  return (
                    <div key={sm.semester} className="space-y-1.5">
                      <p className="text-xs font-bold text-muted-foreground">{semLabel}</p>
                      {dbCount > 0 && !s.manual ? (
                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-xs">كم وحدة خلّصت؟ (من {arDigits(dbCount)})
                            <Input type="number" min={0} max={dbCount} value={sm.doneUnits} onChange={(e) => patchSubject(s.name, sm.semester, { doneUnits: Math.min(dbCount, Number(e.target.value) || 0) })} />
                          </label>
                          <label className="text-xs">{t("دروس مخلّصة من الوحدة الحالية")}
                            <Input type="number" min={0} value={sm.doneLessons} onChange={(e) => patchSubject(s.name, sm.semester, { doneLessons: Number(e.target.value) || 0 })} />
                          </label>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          <label className="text-xs">{t("عدد الوحدات")}
                            <Input type="number" min={1} value={sm.totalUnits} onChange={(e) => patchSubject(s.name, sm.semester, { totalUnits: Math.max(1, Number(e.target.value) || 1) })} />
                          </label>
                          <label className="text-xs">{t("دروس الوحدة")}
                            <Input type="number" min={1} value={sm.totalLessons} onChange={(e) => patchSubject(s.name, sm.semester, { totalLessons: Math.max(1, Number(e.target.value) || 1) })} />
                          </label>
                          <label className="text-xs">{t("خلّصت")}
                            <Input type="number" min={0} value={sm.doneUnits} onChange={(e) => patchSubject(s.name, sm.semester, { doneUnits: Math.max(0, Number(e.target.value) || 0) })} />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm font-bold">{t("متى بتنام ومتى بتصحى؟")}</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-bold">{t("ساعة النوم")}
                <Input type="time" dir="ltr" value={toTime(a.sleepMin)} onChange={(e) => set({ sleepMin: toMin(e.target.value || "23:00") })} />
              </label>
              <label className="text-xs font-bold">{t("ساعة الصحيان")}
                <Input type="time" dir="ltr" value={toTime(a.wakeMin)} onChange={(e) => set({ wakeMin: toMin(e.target.value || "06:30") })} />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">بتنام تقريباً {arDigits(sleepHours(a))} ساعات.</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2.5">
            <p className="text-sm font-bold">{t("جدول المدرسة الأسبوعي")}</p>
            {SCHOOL_DAYS.map((d) => {
              const sch = a.school[String(d)];
              const off = !sch || sch === "off";
              return (
                <div key={d} className="flex items-center gap-2 rounded-2xl border p-2.5">
                  <span className="w-16 shrink-0 text-sm font-bold">{DAY_NAMES[d]}</span>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Checkbox checked={off} onCheckedChange={(v) => set({ school: { ...a.school, [String(d)]: v ? "off" : { go: 7 * 60 + 30, back: 14 * 60 } } })} aria-label={`إجازة ${DAY_NAMES[d]}`} />
                    {t("إجازة")}
                  </label>
                  {!off && typeof sch === "object" && (
                    <div className="flex flex-1 items-center gap-1.5" dir="ltr">
                      <Input type="time" className="h-9" value={toTime(sch.go)} onChange={(e) => set({ school: { ...a.school, [String(d)]: { ...sch, go: toMin(e.target.value || "07:30") } } })} aria-label={`ذهاب ${DAY_NAMES[d]}`} />
                      <span className="text-xs">→</span>
                      <Input type="time" className="h-9" value={toTime(sch.back)} onChange={(e) => set({ school: { ...a.school, [String(d)]: { ...sch, back: toMin(e.target.value || "14:00") } } })} aria-label={`عودة ${DAY_NAMES[d]}`} />
                    </div>
                  )}
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground">{t("الجمعة إجازة دائماً.")}</p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-bold">{t("أوقات الوجبات")}</p>
              <div className="grid grid-cols-3 gap-2">
                {(["breakfast", "lunch", "dinner"] as const).map((m) => (
                  <label key={m} className="text-xs font-bold">{m === "breakfast" ? "فطور" : m === "lunch" ? "غدا" : "عشا"}
                    <Input type="time" dir="ltr" value={toTime(a.meals[m])} onChange={(e) => set({ meals: { ...a.meals, [m]: toMin(e.target.value || "12:00") } })} />
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">{t("طلعات والتزامات ثابتة")}</p>
              <div className="space-y-2">
                {a.commitments.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-2xl border p-2 text-xs">
                    <span className="min-w-0 flex-1 truncate font-bold">{c.name} — {DAY_NAMES[c.day]} {fmtMin(c.from)}</span>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => set({ commitments: a.commitments.filter((_, j) => j !== i) })}><Trash2 className="size-3.5" /></Button>
                  </div>
                ))}
                <CommitmentAdder onAdd={(c) => set({ commitments: [...a.commitments, c] })} />
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <p className="text-sm font-bold">{t("كم ساعة دراسة بدك باليوم؟")}</p>
            <Input type="number" min={1} max={12} value={a.dailyHours} onChange={(e) => set({ dailyHours: Math.min(12, Math.max(1, Number(e.target.value) || 4)) })} aria-label={t("ساعات الدراسة اليومية")} />
            <p className="text-xs leading-6 text-muted-foreground">بنبدأ تدريجياً: الأسبوع الأول {arDigits(Math.round(a.dailyHours * 0.7 * 10) / 10)} ساعات، الثاني {arDigits(Math.round(a.dailyHours * 0.85 * 10) / 10)}، وبعدين {arDigits(a.dailyHours)} ساعات.</p>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3">
            <p className="text-sm font-bold">{t("امتحانات المدرسة الجاية")}</p>
            <div className="space-y-2">
              {a.schoolExams.map((ex, i) => (
                <div key={i} className="flex items-center gap-2 rounded-2xl border p-2 text-xs">
                  <span className="min-w-0 flex-1 truncate font-bold">
                    {ex.subject} — {ex.date} — {ex.importance === 3 ? "مهم كتير" : ex.importance === 2 ? "مهم" : "عادي"}
                  </span>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => set({ schoolExams: a.schoolExams.filter((_, j) => j !== i) })}><Trash2 className="size-3.5" /></Button>
                </div>
              ))}
              <ExamAdder subjects={a.subjects.map((s) => s.name)} onAdd={(ex) => set({ schoolExams: [...a.schoolExams, ex] })} />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {step > 0 && <Button variant="outline" className="rounded-xl" onClick={() => setStep(step - 1)}>{t("رجوع")}</Button>}
        {onCancel && step === 0 && <Button variant="ghost" className="rounded-xl" onClick={onCancel}>{t("إلغاء")}</Button>}
        {step < steps.length - 1 ? (
          <Button className="flex-1 rounded-xl bg-brand" disabled={!canNext} onClick={() => setStep(step + 1)}>{t("التالي")}</Button>
        ) : (
          <Button className="flex-1 rounded-xl bg-brand" disabled={busy || !a.subjects.length} onClick={() => onSave(a)}>
            <CalendarCheck /> {busy ? "بنجهّز جدولك…" : "احفظ وجهّز الجدول"}
          </Button>
        )}
      </div>
    </div>
  );
}

function CommitmentAdder({ onAdd }: { onAdd: (c: Commitment) => void }) {
  const [name, setName] = useState("");
  const [day, setDay] = useState("6");
  const [from, setFrom] = useState("17:00");
  const [to, setTo] = useState("18:00");
  return (
    <div className="space-y-2 rounded-2xl border border-dashed p-2.5">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("اسم الالتزام (تدريب، درس خصوصي…)")} aria-label={t("اسم الالتزام")} />
      <div className="grid grid-cols-3 gap-2">
        <Select value={day} onValueChange={setDay}>
          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>{[6, 0, 1, 2, 3, 4, 5].map((d) => <SelectItem key={d} value={String(d)}>{DAY_NAMES[d]}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="time" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={t("من")} />
        <Input type="time" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} aria-label={t("إلى")} />
      </div>
      <Button size="sm" variant="outline" className="rounded-xl" disabled={!name.trim() || toMin(to) <= toMin(from)} onClick={() => { onAdd({ name: name.trim(), day: Number(day), from: toMin(from), to: toMin(to) }); setName(""); }}>
        <Plus /> {t("إضافة التزام")}
      </Button>
    </div>
  );
}

function ExamAdder({ subjects, onAdd }: { subjects: string[]; onAdd: (e: SchoolExam) => void }) {
  const [subject, setSubject] = useState(subjects[0] ?? "");
  const [date, setDate] = useState("");
  const [importance, setImportance] = useState("2");
  return (
    <div className="space-y-2 rounded-2xl border border-dashed p-2.5">
      <div className="grid grid-cols-2 gap-2">
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("المادة")} /></SelectTrigger>
          <SelectContent>{subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} aria-label={t("تاريخ الامتحان")} />
      </div>
      <Select value={importance} onValueChange={setImportance}>
        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="1">{t("عادي")}</SelectItem>
          <SelectItem value="2">{t("مهم")}</SelectItem>
          <SelectItem value="3">{t("مهم كتير")}</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" className="rounded-xl" disabled={!subject || !date} onClick={() => { onAdd({ subject, date, importance: Number(importance) as 1 | 2 | 3 }); setDate(""); }}>
        <Plus /> {t("إضافة امتحان")}
      </Button>
    </div>
  );
}
