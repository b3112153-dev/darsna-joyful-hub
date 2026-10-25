export type DhikrItem = { id: string; label: string; fard: boolean };

export const DHIKR_ITEMS: DhikrItem[] = [
  { id: "fajr", label: "صلاة الفجر", fard: true },
  { id: "dhuhr", label: "صلاة الظهر", fard: true },
  { id: "asr", label: "صلاة العصر", fard: true },
  { id: "maghrib", label: "صلاة المغرب", fard: true },
  { id: "isha", label: "صلاة العشاء", fard: true },
  { id: "rawatib", label: "السنن الرواتب (٢ قبل الفجر، ٤ قبل الظهر و٢ بعده، ٢ بعد المغرب، ٢ بعد العشاء)", fard: false },
  { id: "duha", label: "صلاة الضحى", fard: false },
  { id: "witr", label: "صلاة الوتر", fard: false },
  { id: "morning", label: "أذكار الصباح", fard: false },
  { id: "evening", label: "أذكار المساء", fard: false },
  { id: "sleep", label: "أذكار النوم", fard: false },
  { id: "quran", label: "ورد القرآن (صفحة)", fard: false },
];

export const FARD_IDS = DHIKR_ITEMS.filter((item) => item.fard).map((item) => item.id);

export function fardComplete(items: string[]) {
  return FARD_IDS.every((id) => items.includes(id));
}

const ammanFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Amman", year: "numeric", month: "2-digit", day: "2-digit" });

/** Today's date (YYYY-MM-DD) in Amman. */
export function ammanToday(now = new Date()) {
  return ammanFmt.format(now);
}

/** Current hour (0-23) in Amman. */
export function ammanHour(now = new Date()) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Amman", hour: "2-digit", hour12: false }).format(now));
}

/** Day-of-year in Amman, used to rotate the daily story. */
export function ammanDayOfYear(now = new Date()) {
  const parts = ammanToday(now).split("-").map(Number);
  return Math.floor((Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!) - Date.UTC(parts[0]!, 0, 0)) / 86400000);
}

/** Pick today's story index by rotating through the sorted records. */
export function storyIndex(count: number, dayOfYear: number) {
  return count > 0 ? dayOfYear % count : -1;
}

/** Stories unlock after finishing the five prayers, or for everyone after 8pm. */
export function storyUnlocked(items: string[], hour: number) {
  return fardComplete(items) || hour >= 20;
}

/** Consecutive days (ending today or yesterday) with all five prayers checked. */
export function dhikrStreak(days: { day: string; items: string[] }[], today: string) {
  const done = new Set(days.filter((row) => fardComplete(row.items)).map((row) => row.day));
  const cursor = new Date(`${today}T00:00:00Z`);
  if (!done.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (done.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export const DHIKR_ENCOURAGEMENT = [
  t("ما شاء الله، يومك كامل بالفرائض 🤍"),
  t("الله يتقبل، ثباتك أحلى شي"),
  t("يوم مبارك! كمّل على هالخير"),
  t("فرائضك تمام، الله يبارك بوقتك"),
];
