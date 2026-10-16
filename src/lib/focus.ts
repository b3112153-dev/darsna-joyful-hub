export type FocusRow = {
  id: string;
  status: string;
  duration_seconds: number;
  remaining_seconds: number;
  ends_at: string | null;
  subject: string;
  studied_seconds: number;
  started_at: string;
  finished_at: string | null;
};

/** Seconds left on a focus session at time `now` (ms). */
export function remainingSeconds(s: Pick<FocusRow, "status" | "remaining_seconds" | "ends_at">, now: number) {
  if (s.status === "running" && s.ends_at) return Math.max(0, Math.ceil((new Date(s.ends_at).getTime() - now) / 1000));
  if (s.status === "paused") return s.remaining_seconds;
  return 0;
}

/** Chat is locked while a session is running (with time left) or paused. */
export function isChatLocked(s: Pick<FocusRow, "status" | "remaining_seconds" | "ends_at"> | null | undefined, now: number) {
  if (!s) return false;
  if (s.status === "paused") return true;
  return s.status === "running" && remainingSeconds(s, now) > 0;
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export function summarize(rows: Pick<FocusRow, "subject" | "studied_seconds" | "started_at">[], now = new Date()) {
  const byDay = new Map<string, number>();
  const bySubject = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    if (r.studied_seconds <= 0) continue;
    total += r.studied_seconds;
    const k = dayKey(new Date(r.started_at));
    byDay.set(k, (byDay.get(k) ?? 0) + r.studied_seconds);
    bySubject.set(r.subject, (bySubject.get(r.subject) ?? 0) + r.studied_seconds);
  }
  const week: { date: Date; seconds: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    week.push({ date: d, seconds: byDay.get(dayKey(d)) ?? 0 });
  }
  // streak: consecutive days with >= 60s; today may be empty without breaking it
  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if ((byDay.get(dayKey(cursor)) ?? 0) < 60) cursor.setDate(cursor.getDate() - 1);
  while ((byDay.get(dayKey(cursor)) ?? 0) >= 60) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const subjects = [...bySubject.entries()].map(([subject, seconds]) => ({ subject, seconds })).sort((a, b) => b.seconds - a.seconds);
  return { total, week, weekTotal: week.reduce((a, b) => a + b.seconds, 0), streak, subjects };
}

export const hoursLabel = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h} س ${m} د` : `${m} د`;
};
