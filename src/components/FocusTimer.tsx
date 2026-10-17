import { useState } from "react";
import { Play, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtClock } from "./StudyRounds";
import type { useMyFocus } from "@/hooks/use-focus";

const PRESETS = [15, 25, 50, 90];

export function FocusTimer({
  focus,
  roomId,
}: {
  focus: ReturnType<typeof useMyFocus>;
  roomId: string;
}) {
  const { session, left, start, isLoading, isError } = focus;
  const [minutes, setMinutes] = useState(25);
  const [subject, setSubject] = useState("");
  const [starting, setStarting] = useState(false);

  async function begin() {
    setStarting(true);
    await start(minutes, subject, roomId);
    setStarting(false);
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-5 text-center text-sm text-muted-foreground shadow-card">
        بنفحص حالة جلسة التركيز…
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="rounded-2xl border bg-card p-5 text-center text-sm text-destructive shadow-card"
      >
        تعذر التحقق من جلسة التركيز. حدّث الصفحة قبل بدء جلسة جديدة.
      </div>
    );
  }

  if (session) {
    const pct = 100 - (left / session.duration_seconds) * 100;
    return (
      <div className="space-y-4 rounded-2xl border bg-card p-5 text-center shadow-card">
        <p className="text-sm text-muted-foreground">
          بتدرس:{" "}
          <span className="font-semibold text-foreground">
            {session.subject}
          </span>
        </p>
        <p
          className="font-display text-5xl font-bold tabular-nums text-primary"
          dir="ltr"
        >
          {fmtClock(left * 1000)}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-brand transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
          <Lock className="size-4" /> الدردشة مقفلة حتى ينتهي الوقت
        </p>
        <p className="text-xs text-muted-foreground">
          كمّل جلستك؛ بتنفتح الدردشة تلقائيًا عند انتهاء المؤقّت.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-card">
      <div className="space-y-1.5">
        <Label>المادة</Label>
        <Input
          maxLength={60}
          placeholder="مثلاً: رياضيات"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>المدة (دقيقة)</Label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((m) => (
            <Button
              key={m}
              type="button"
              size="sm"
              variant={minutes === m ? "default" : "outline"}
              onClick={() => setMinutes(m)}
            >
              {m}
            </Button>
          ))}
          <Input
            type="number"
            min={1}
            max={240}
            value={minutes}
            onChange={(e) =>
              setMinutes(
                Math.min(240, Math.max(1, Number(e.target.value) || 1)),
              )
            }
            className="w-20"
          />
        </div>
      </div>
      <Button onClick={begin} disabled={starting} className="w-full bg-brand">
        <Play /> {starting ? "جاري بدء الجلسة…" : "ابدأ الدراسة"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        خلال الجلسة الدردشة بتتقفل، وبتنفتح لحالها لما يخلص الوقت.
      </p>
    </div>
  );
}
