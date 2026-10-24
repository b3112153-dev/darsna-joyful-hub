import { useState } from "react";
import { Pause, Play, RotateCcw, Lock, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtClock } from "./StudyRounds";
import type { useMyFocus } from "@/hooks/use-focus";
import { PageState } from "@/components/PageState";
import { EndFocusDialog } from "@/components/EndFocusDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const PRESETS = [15, 25, 50, 90];

export function FocusTimer({ focus, roomId, compact = false }: { focus: ReturnType<typeof useMyFocus>; roomId: string | null; compact?: boolean }) {
  const { session, left, start, pause, resume, reset } = focus;
  const [minutes, setMinutes] = useState(25);
  const [subject, setSubject] = useState("");
  const [endOpen, setEndOpen] = useState(false);
  if (focus.isLoading) return <PageState loading />;
  if (focus.isError) return <PageState error retry={() => void focus.refetch()} />;

  if (compact) return <section className="min-w-0 rounded-[26px] bg-secondary p-4 text-secondary-foreground" aria-label="مؤقت الدراسة">
    <p className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold"><span className="size-1.5 shrink-0 animate-pulse rounded-full bg-primary motion-reduce:animate-none" /> مؤقت الدراسة</p>
    <Popover><PopoverTrigger asChild><Button variant="ghost" className="mt-2 h-auto w-full px-0 py-1 text-[42px] font-extrabold leading-tight tabular-nums text-secondary-foreground" aria-label="اختيار المادة والمدة" dir="ltr">{fmtClock((session ? left : minutes * 60) * 1000)}</Button></PopoverTrigger>
      <PopoverContent dir="rtl" className="w-72 space-y-3 rounded-[20px] font-display">
        <Label htmlFor="compact-subject">المادة</Label><Input id="compact-subject" maxLength={60} placeholder="مثلاً: رياضيات" value={subject} onChange={(event) => setSubject(event.target.value)} disabled={!!session} />
        <Label htmlFor="compact-duration">المدة (دقيقة)</Label><div className="flex flex-wrap gap-2">{PRESETS.map((m) => <Button key={m} size="sm" variant={minutes === m ? "default" : "outline"} disabled={!!session} onClick={() => setMinutes(m)}>{m}</Button>)}</div>
        <Input id="compact-duration" type="number" min={1} max={240} value={minutes} disabled={!!session} onChange={(event) => setMinutes(Math.min(240, Math.max(1, Number(event.target.value) || 1)))} />
      </PopoverContent>
    </Popover>
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_44px] gap-2">
      <Button className="h-11 min-w-0 rounded-[14px] px-2 font-bold" disabled={focus.pending} onClick={() => session ? session.status === "paused" ? resume() : pause() : start(minutes, subject, roomId)}>{focus.pending ? <LoaderCircle className="animate-spin" /> : session ? session.status === "paused" ? <Play /> : <Pause /> : null}{session ? session.status === "paused" ? "استئناف" : "إيقاف" : "ابدأ"}</Button>
      <Button className="size-11 rounded-[14px] bg-card text-card-foreground" variant="ghost" size="icon" aria-label="إعادة ضبط المؤقت" disabled={focus.pending} onClick={() => session ? setEndOpen(true) : (setMinutes(25), setSubject(""))}><RotateCcw /></Button>
    </div>
    <EndFocusDialog open={endOpen} onOpenChange={setEndOpen} onEnd={reset} pending={focus.pending} />
  </section>;

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
            <Button disabled={focus.pending} onClick={resume} className="bg-brand"><Play /> استئناف</Button>
          ) : (
            <Button disabled={focus.pending} onClick={pause} variant="outline"><Pause /> إيقاف مؤقت</Button>
          )}
          <Button disabled={focus.pending} onClick={() => setEndOpen(true)} variant="ghost"><RotateCcw /> إعادة ضبط</Button>
        </div>
        <EndFocusDialog open={endOpen} onOpenChange={setEndOpen} onEnd={reset} pending={focus.pending} />
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
      <Button disabled={focus.pending} onClick={() => start(minutes, subject, roomId)} className="w-full bg-brand">{focus.pending ? <LoaderCircle className="animate-spin" /> : <Play />} ابدأ الدراسة</Button>
      <p className="text-center text-xs text-muted-foreground">خلال الجلسة الدردشة بتتقفل، وبتنفتح لحالها لما يخلص الوقت.</p>
    </div>
  );
}
