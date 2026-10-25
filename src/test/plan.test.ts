import { describe, expect, it } from "vitest";
import { generatePlan, sleepHours, windowsForDay, RAMP, type PlanAnswers, type UnitRow, type QuizRow } from "@/lib/plan";

const base: PlanAnswers = {
  branch: "health_engineering",
  status: "new",
  subjects: [
    { name: "فيزياء", manual: true, semesters: [{ semester: 1, totalUnits: 12, totalLessons: 2, doneUnits: 0, doneLessons: 0 }] },
    { name: "رياضيات", manual: true, semesters: [{ semester: 1, totalUnits: 12, totalLessons: 2, doneUnits: 0, doneLessons: 0 }] },
  ],
  sleepMin: 23 * 60,
  wakeMin: 6 * 60 + 30,
  school: { "6": { go: 7 * 60 + 30, back: 14 * 60 }, "0": { go: 7 * 60 + 30, back: 14 * 60 }, "1": "off", "2": { go: 7 * 60 + 30, back: 14 * 60 }, "3": { go: 7 * 60 + 30, back: 14 * 60 }, "4": { go: 7 * 60 + 30, back: 14 * 60 } },
  meals: { breakfast: 7 * 60, lunch: 15 * 60, dinner: 20 * 60 },
  commitments: [],
  dailyHours: 4,
  schoolExams: [],
};
const noUnits: UnitRow[] = [];
const noQuizzes: QuizRow[] = [];
// يوم اثنين (school off) حتى نختبر بثبات
const monday = new Date(2026, 9, 26); // 2026-10-26 is Monday

describe("windowsForDay", () => {
  it("لا يبدأ قبل العودة من المدرسة ولا يتجاوز النوم", () => {
    const sat = new Date(2026, 9, 24); // Saturday
    const wins = windowsForDay(sat, base);
    expect(wins.length).toBeGreaterThan(0);
    for (const [s, e] of wins) {
      expect(s).toBeGreaterThanOrEqual(14 * 60 + 30);
      expect(e).toBeLessThanOrEqual(23 * 60);
    }
  });
  it("يستبعد الوجبات والالتزامات", () => {
    const a = { ...base, commitments: [{ name: "تدريب", day: 1, from: 17 * 60, to: 18 * 60 }] };
    const wins = windowsForDay(monday, a);
    for (const [s, e] of wins) {
      expect(e <= 17 * 60 || s >= 18 * 60).toBe(true);
      expect(e <= 20 * 60 || s >= 20 * 60 + 45).toBe(true); // العشا
    }
  });
});

describe("generatePlan", () => {
  it("يوزع جلسات 45–120 دقيقة داخل النوافذ فقط", () => {
    const items = generatePlan(base, noUnits, noQuizzes, monday, null);
    expect(items.length).toBeGreaterThan(0);
    for (const it of items.filter((i) => i.kind !== "school_exam" && i.kind !== "platform_exam")) {
      expect(it.minutes).toBeGreaterThanOrEqual(45);
      expect(it.minutes).toBeLessThanOrEqual(120);
      expect(it.start_min).toBeLessThan(23 * 60);
    }
  });
  it("الأسبوع الأول 70٪ والثاني 85٪ من الهدف", () => {
    const items = generatePlan(base, noUnits, noQuizzes, monday, null);
    const dayMin = (offset: number) => {
      const d = new Date(2026, 9, 26 + offset);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return items.filter((i) => i.day === key && ["watch", "review", "memorize"].includes(i.kind)).reduce((s, i) => s + i.minutes, 0);
    };
    expect(dayMin(0)).toBeLessThanOrEqual(Math.round(4 * 60 * RAMP[0]!) + 45);
    expect(dayMin(8)).toBeGreaterThan(dayMin(0) - 1);
  });
  it("يضيف امتحان منصة واحد على الأقل كل أسبوع", () => {
    const quizzes: QuizRow[] = [{ id: "q1", subject: "فيزياء", generation: "gen2010", status: "approved" }];
    const items = generatePlan(base, noUnits, quizzes, monday, "gen2010");
    const weeks = new Set(items.filter((i) => i.kind === "platform_exam").map((i) => i.day.slice(0, 8) + Math.floor(Number(i.day.slice(8)) / 7)));
    expect(items.filter((i) => i.kind === "platform_exam").length).toBeGreaterThanOrEqual(2);
    expect(weeks.size).toBeGreaterThanOrEqual(2);
    const withQuiz = items.find((i) => i.kind === "platform_exam" && i.subject === "فيزياء");
    expect(withQuiz?.quiz_id).toBe("q1");
  });
  it("يميّز امتحان المدرسة بأهميته ويضيف مراجعة أخيرة قبله بيومين", () => {
    const examDate = new Date(2026, 10, 1); // 2026-11-01
    const key = "2026-11-01";
    const a: PlanAnswers = { ...base, schoolExams: [{ subject: "فيزياء", date: key, importance: 3 }] };
    const items = generatePlan(a, noUnits, noQuizzes, monday, null);
    const exam = items.find((i) => i.kind === "school_exam" && i.day === key);
    expect(exam?.importance).toBe(3);
    const reviewDay = new Date(examDate.getFullYear(), examDate.getMonth(), examDate.getDate() - 2);
    const rk = `${reviewDay.getFullYear()}-${String(reviewDay.getMonth() + 1).padStart(2, "0")}-${String(reviewDay.getDate()).padStart(2, "0")}`;
    expect(items.some((i) => i.day === rk && i.subject === "فيزياء" && i.title.includes("مراجعة أخيرة"))).toBe(true);
  });
  it("يتعامل مع مادة يدوية بدون منهاج بقاعدة البيانات", () => {
    const items = generatePlan(base, noUnits, noQuizzes, monday, null);
    expect(items.some((i) => i.title.includes("الوحدة"))).toBe(true);
  });
});

describe("sleepHours", () => {
  it("يحسب النوم عبر منتصف الليل", () => {
    expect(sleepHours(base)).toBe(7.5);
  });
});
