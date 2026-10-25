// منطق جدول «حلّها» — حسابات نقية بدون أي ذكاء اصطناعي.

export type Importance = 1 | 2 | 3;

export interface SchoolExam {
  subject: string;
  date: string; // YYYY-MM-DD
  importance: Importance;
}

export interface SemesterProgress {
  semester: 1 | 2;
  totalUnits: number;
  totalLessons: number; // دروس الوحدة الواحدة (يدوي)
  doneUnits: number;
  doneLessons: number; // دروس مخلّصة من الوحدة الحالية
}

export interface SubjectPlan {
  name: string;
  manual?: boolean;
  semesters: SemesterProgress[];
}

export interface Commitment {
  name: string;
  day: number; // JS day 0..6
  from: number; // دقائق من منتصف الليل
  to: number;
}

export interface PlanAnswers {
  branch: string;
  status: "new" | "repeat";
  subjects: SubjectPlan[];
  sleepMin: number;
  wakeMin: number;
  /** مفتاح = JS day (6=سبت … 4=خميس)، القيمة وقت الذهاب/العودة أو "off". */
  school: Record<string, { go: number; back: number } | "off">;
  meals: { breakfast: number; lunch: number; dinner: number };
  commitments: Commitment[];
  dailyHours: number;
  schoolExams: SchoolExam[];
  manualIds?: string[];
}

export interface UnitRow {
  id: string;
  generation: string;
  track: string;
  subject: string;
  semester: number;
  unit_no: number;
  title: string;
  lessons: number;
}

export interface QuizRow {
  id: string;
  subject: string;
  generation: string | null;
  status: string;
}

export interface PlanItemDraft {
  day: string;
  start_min: number;
  minutes: number;
  kind: string;
  subject: string;
  title: string;
  unit_id: string | null;
  quiz_id: string | null;
  importance: number | null;
}

export const SESSION_MIN = 45;
export const SESSION_MAX = 120;
export const BREAK_MIN = 12;
export const MEAL_MIN = 45;
export const MAX_DAYS = 60;
/** تدرّج الأسبوع الأول/الثاني ثم كامل الهدف. */
export const RAMP = [0.7, 0.85, 1];

const AR = "٠١٢٣٤٥٦٧٨٩";
export const arDigits = (s: string | number) => String(s).replace(/\d/g, (d) => AR[Number(d)]);

export function fmtMin(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  return arDigits(`${h}:${mm}`);
}

export const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const dateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y ?? 2000, (m || 1) - 1, d || 1);
};
export const diffDays = (from: Date, to: Date) =>
  Math.round((stripTime(to).getTime() - stripTime(from).getTime()) / 86_400_000);
export const todayStr = () => dateStr(new Date());

export const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
/** أيام المدرسة بالأردن: سبت→خميس. */
export const SCHOOL_DAYS = [6, 0, 1, 2, 3, 4];

function subtract(windows: [number, number][], busy: [number, number]): [number, number][] {
  const [bs, be] = busy;
  const out: [number, number][] = [];
  for (const [ws, we] of windows) {
    if (be <= ws || bs >= we) { out.push([ws, we]); continue; }
    if (bs > ws) out.push([ws, bs]);
    if (be < we) out.push([be, we]);
  }
  return out;
}

/** نوافذ الدراسة الفاضية باليوم: بعد العودة للبيت، بدون نوم ولا وجبات ولا التزامات. */
export function windowsForDay(d: Date, a: PlanAnswers): [number, number][] {
  const js = d.getDay();
  const sch = a.school[String(js)];
  const start = sch && sch !== "off" ? sch.back + 30 : a.wakeMin + 60;
  let end = a.sleepMin;
  if (end <= start) end += 1440;
  end = Math.min(end, 1440);
  let wins: [number, number][] = end - start >= SESSION_MIN ? [[start, end]] : [];
  for (const t of [a.meals.breakfast, a.meals.lunch, a.meals.dinner]) wins = subtract(wins, [t, t + MEAL_MIN]);
  for (const c of a.commitments.filter((c) => c.day === js)) wins = subtract(wins, [c.from, c.to]);
  return wins.filter(([s, e]) => e - s >= 15);
}

/** ساعات النوم المحسوبة من الإجابات. */
export function sleepHours(a: PlanAnswers): number {
  let dur = a.wakeMin - a.sleepMin;
  if (dur <= 0) dur += 1440;
  return Math.round((dur / 60) * 10) / 10;
}

interface Task {
  subject: string;
  kind: string;
  title: string;
  unit_id: string | null;
  minutes: number;
}

const lessonsWord = (n: number) => (n === 1 ? "درس" : n === 2 ? "درسين" : `${arDigits(n)} دروس`);

function subjectTasks(s: SubjectPlan, units: UnitRow[], generation: string | null): Task[] {
  const tasks: Task[] = [];
  const dbUnits = units
    .filter((u) => u.subject === s.name && (u.generation === "all" || !generation || u.generation === generation))
    .sort((x, y) => x.semester - y.semester || x.unit_no - y.unit_no);
  if (dbUnits.length && !s.manual) {
    for (const sem of s.semesters) {
      const semUnits = dbUnits.filter((u) => u.semester === sem.semester);
      semUnits.slice(Math.min(sem.doneUnits, semUnits.length)).forEach((u, idx) => {
        const remLessons = idx === 0 ? Math.max(1, u.lessons - (sem.doneLessons || 0)) : u.lessons;
        tasks.push({
          subject: s.name, kind: "watch",
          title: `مشاهدة ${lessonsWord(remLessons)} من ${u.title}`,
          unit_id: u.id, minutes: Math.min(SESSION_MAX, Math.max(SESSION_MIN, remLessons * 45)),
        });
        tasks.push({ subject: s.name, kind: "review", title: `تثبيت — ${u.title}`, unit_id: u.id, minutes: SESSION_MIN });
        tasks.push({ subject: s.name, kind: "memorize", title: `حفظ ومراجعة — ${u.title}`, unit_id: u.id, minutes: SESSION_MIN });
      });
    }
    return tasks;
  }
  // مادة يدوية بدون منهاج بقاعدة البيانات
  for (const sem of s.semesters) {
    const rem = Math.max(0, sem.totalUnits - sem.doneUnits);
    for (let i = 0; i < rem; i++) {
      const n = sem.doneUnits + i + 1;
      const label = `الوحدة ${arDigits(n)} (الفصل ${sem.semester === 1 ? "الأول" : "الثاني"})`;
      tasks.push({
        subject: s.name, kind: "watch",
        title: `مشاهدة ${lessonsWord(Math.max(1, sem.totalLessons || 2))} من ${label}`,
        unit_id: null,
        minutes: Math.min(SESSION_MAX, Math.max(SESSION_MIN, (sem.totalLessons || 2) * 45)),
      });
      tasks.push({ subject: s.name, kind: "review", title: `تثبيت ${label}`, unit_id: null, minutes: SESSION_MIN });
      tasks.push({ subject: s.name, kind: "memorize", title: `حفظ ومراجعة ${label}`, unit_id: null, minutes: SESSION_MIN });
    }
  }
  return tasks;
}

/** توليد الجدول كاملاً من اليوم لحد آخر امتحان (بحد أقصى ٦٠ يوم). */
export function generatePlan(
  a: PlanAnswers,
  units: UnitRow[],
  quizzes: QuizRow[],
  today: Date,
  generation: string | null,
): PlanItemDraft[] {
  const start = stripTime(today);
  const exams = [...a.schoolExams].sort((x, y) => x.date.localeCompare(y.date));
  const lastExam = exams.length ? parseDate(exams[exams.length - 1]!.date) : addDays(start, 13);
  const days = Math.min(MAX_DAYS, Math.max(14, diffDays(start, lastExam) + 1));
  const horizon = addDays(start, days);

  const names = a.subjects.map((s) => s.name);
  const queues = new Map<string, Task[]>();
  for (const s of a.subjects) queues.set(s.name, subjectTasks(s, units, generation));
  const remaining = new Map(names.map((n) => [n, queues.get(n)?.length ?? 0]));
  const cursor = new Map(names.map((n) => [n, 0]));

  const items: PlanItemDraft[] = [];
  let platformWeek = -1;
  let platformSubjIdx = 0;

  for (let d = new Date(start), off = 0; d < horizon; d = addDays(d, 1), off++) {
    const day = dateStr(d);
    const js = d.getDay();

    // امتحانات المدرسة بهذا اليوم
    for (const ex of exams.filter((e) => e.date === day)) {
      const sch = a.school[String(js)];
      const st = sch && sch !== "off" ? sch.go : 8 * 60;
      items.push({
        day, start_min: st, minutes: 60, kind: "school_exam", subject: ex.subject,
        title: `امتحان مدرسة: ${ex.subject}`, unit_id: null, quiz_id: null, importance: ex.importance,
      });
    }

    const wins = windowsForDay(d, a);

    // امتحان المنصة الأسبوعي (مساءً) — نحجز وقته قبل توزيع الدراسة
    const weekNo = Math.floor(off / 7);
    if (names.length && weekNo !== platformWeek && (js === 4 || off % 7 === 5 || off === days - 1)) {
      const subj = names[platformSubjIdx % names.length]!;
      const quiz =
        quizzes.find((q) => q.status === "approved" && q.subject === subj && (!generation || q.generation === generation)) ??
        quizzes.find((q) => q.status === "approved" && q.subject === subj);
      let eve = Math.min(19 * 60, a.sleepMin - 60);
      if (eve <= 0) eve = 19 * 60;
      items.push({
        day, start_min: eve, minutes: SESSION_MIN, kind: "platform_exam", subject: subj,
        title: `امتحان المنصة: ${subj}`, unit_id: null, quiz_id: quiz?.id ?? null, importance: null,
      });
      platformWeek = weekNo;
      platformSubjIdx++;
      for (let i = 0; i < wins.length; i++) { const w = wins[i]!; wins.splice(i, 1, ...subtract([w], [eve, eve + SESSION_MIN])); }
    }

    // هدف اليوم مع التدرّج الأسبوعي ويوم الراحة
    let factor = RAMP[Math.min(weekNo, RAMP.length - 1)] ?? 1;
    if (off % 7 === 6) factor *= 0.5;
    let budget = Math.round(a.dailyHours * 60 * factor);

    const placed: Task[] = [];

    // مراجعة أخيرة قبل الامتحان بيومين
    for (const ex of exams.filter((e) => diffDays(d, parseDate(e.date)) === 2)) {
      const mins = Math.min(90, Math.max(SESSION_MIN, budget));
      if (budget >= SESSION_MIN) {
        placed.push({ subject: ex.subject, kind: "review", title: `مراجعة أخيرة قبل الامتحان — ${ex.subject}`, unit_id: null, minutes: mins });
        budget -= mins;
      }
    }

    const weight = (name: string) => {
      const rem = remaining.get(name) ?? 0;
      if (rem <= 0) return 0;
      let boost = 1;
      let imp = 1;
      for (const e of exams) {
        if (e.subject !== name) continue;
        const dd = diffDays(d, parseDate(e.date));
        if (dd < 0) continue;
        const b = dd <= 1 ? 4 : dd <= 3 ? 3 : dd <= 7 ? 2 : 1;
        if (b > boost) {
          boost = b;
          imp = e.importance === 3 ? 2 : e.importance === 2 ? 1.5 : 1;
        }
      }
      return (rem + 1) * boost * imp;
    };

    // توزيع الجلسات بالتناوب حسب الأوزان
    let lastSubj = "";
    let guard = 0;
    while (budget >= SESSION_MIN && guard++ < 40) {
      const candidates = names.filter((n) => weight(n) > 0);
      if (!candidates.length) break;
      candidates.sort((x, y) => weight(y) - weight(x));
      const pick = (candidates.find((n) => n !== lastSubj) ?? candidates[0])!;
      const ci = cursor.get(pick) ?? 0;
      const q = queues.get(pick) ?? [];
      if (ci >= q.length) { remaining.set(pick, 0); continue; }
      const task = q[ci]!;
      const mins = Math.min(task.minutes, budget, SESSION_MAX);
      if (mins < SESSION_MIN) break;
      placed.push({ ...task, minutes: Math.max(SESSION_MIN, mins) });
      budget -= mins;
      cursor.set(pick, ci + 1);
      remaining.set(pick, Math.max(0, (remaining.get(pick) ?? 1) - 1));
      lastSubj = pick;
    }

    // توزيع المهام على النوافذ الفاضية مع استراحات
    let wi = 0;
    for (const task of placed) {
      let put = false;
      for (; wi < wins.length; wi++) {
        const [ws, we] = wins[wi]!;
        if (we - ws >= task.minutes) {
          items.push({
            day, start_min: ws, minutes: task.minutes, kind: task.kind, subject: task.subject,
            title: task.title, unit_id: task.unit_id, quiz_id: null, importance: null,
          });
          wins[wi] = [ws + task.minutes + BREAK_MIN, we];
          put = true;
          break;
        }
      }
      if (!put) break;
    }
  }

  return items.sort((x, y) => x.day.localeCompare(y.day) || x.start_min - y.start_min);
}
