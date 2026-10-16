import { useState } from "react";
import { Pause, Play, RotateCcw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtClock } from "./StudyRounds";
import type { useMyFocus } from "@/hooks/use-focus";

const PRESETS = [15, 25, 50, 90];

export function FocusTimer({ focus, roomId }: { focus: ReturnType<typeof useMyFocus>; roomId: string }) {
  const { session, left, start, pause, resume, reset } = focus;
  const [minutes, setMinutes] = useState(25);
  const [subject, setSubject] = useState("");

  if (session) {
    const pct = 100 - (left / session.duration_seconds) * 100;
    const paused = session.status === "paused";
    return (
      <div className="space-y-4 rounded-2xl border bg-card p-5 text-center shadow-card">
        <p className="text-sm text-muted-foreground">بتدرس: <span className="font-semibold text-foreground">{session.subject}</span></p>
        <p className="font-display text-5xl font-bold tabular-nums text-primary" dir="ltr">{fmtClock(left * 1000)}</p>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" /> الدردشة مقفلة لحد ما يخلص المؤقت</p>
        <div className="flex justify-center gap-2">
          {paused ? (
            <Button onClick={resume} className="bg-brand"><Play /> استئناف</Button>
          ) : (
            <Button onClick={pause} variant="outline"><Pause /> إيقاف مؤقت</Button>
          )}
          <Button onClick={() => confirm("إعادة ضبط المؤقت؟ رح ينحسب الوقت اللي درسته بس.") && reset()} variant="ghost"><RotateCcw /> إعادة ضبط</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-card">
      <div className="space-y-1.5">
        <Label>المادة</Label>
        <Input maxLength={60} placeholder="مثلاً: رياضيات" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>المدة (دقيقة)</Label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((m) => (
            <Button key={m} type="button" size="sm" variant={minutes === m ? "default" : "outline"} onClick={() => setMinutes(m)}>{m}</Button>
          ))}
          <Input type="number" min={1} max={240} value={minutes} onChange={(e) => setMinutes(Math.min(240, Math.max(1, Number(e.target.value) || 1)))} className="w-20" />
        </div>
      </div>
      <Button onClick={() => start(minutes, subject, roomId)} className="w-full bg-brand"><Play /> ابدأ الدراسة</Button>
      <p className="text-center text-xs text-muted-foreground">خلال الجلسة الدردشة بتتقفل، وبتنفتح لحالها لما يخلص الوقت.</p>
    </div>
  );
}
