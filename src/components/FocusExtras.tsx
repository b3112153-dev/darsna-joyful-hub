import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-auth";
import { useFocusMode } from "@/components/FocusMode";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { soundEngine } from "@/lib/sounds";
import { buildStudyProgram, type ProgramBlock } from "@/lib/study-program";
import { getProgram, setProgram, subscribeProgram } from "@/lib/study-program-store";
import { fmtClock } from "@/components/StudyRounds";

export function useProgram() {
  return useSyncExternalStore(subscribeProgram, getProgram);
}

/** Start a multi-block study program: first study block starts as a normal focus session. */
export function startStudyProgram(hours: number, subject: string, roomId: string | null, start: (minutes: number, subject: string, roomId: string | null) => Promise<unknown>) {
  const blocks = buildStudyProgram(hours);
  const first = blocks[0];
  if (!first || first.kind !== "study") return false;
  setProgram({ blocks, index: 0, subject, roomId, breakEndsAt: null });
  void start(first.minutes, subject, roomId);
  return true;
}

const ATTENDANCE_INTERVAL_S = 3600;
const ATTENDANCE_COUNTDOWN_S = 10;

/**
 * Global driver for: hourly attendance checks, auto study/break transitions of
 * multi-hour programs, and stopping sounds when the session ends.
 */
export function FocusExtras() {
  const { user } = useSession();
  const { focus } = useFocusMode();
  const { session, left } = focus;
  const program = useProgram();
  const [attendanceDue, setAttendanceDue] = useState(false);
  const [countdown, setCountdown] = useState(ATTENDANCE_COUNTDOWN_S);
  const ack = useRef({ sessionId: "", studied: 0 });
  const lastSession = useRef<{ id: string; duration: number } | null>(null);
  const breakTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [breakLeft, setBreakLeft] = useState(0);

  // stop sounds + forget acknowledgements when the session ends
  useEffect(() => {
    if (session) {
      if (ack.current.sessionId !== session.id) ack.current = { sessionId: session.id, studied: 0 };
      lastSession.current = { id: session.id, duration: session.duration_seconds };
    } else if (lastSession.current) {
      soundEngine.stopAll();
    }
  }, [session]);

  // hourly attendance check (only counts studied time, pauses don't advance `left`)
  const studied = session ? session.duration_seconds - left : 0;
  useEffect(() => {
    if (!session || session.status !== "running" || attendanceDue) return;
    if (studied - ack.current.studied >= ATTENDANCE_INTERVAL_S) {
      setAttendanceDue(true);
      setCountdown(ATTENDANCE_COUNTDOWN_S);
      soundEngine.beep();
    }
  }, [session, studied, attendanceDue]);

  useEffect(() => {
    if (!attendanceDue) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [attendanceDue]);

  useEffect(() => {
    if (attendanceDue && countdown <= 0) {
      setAttendanceDue(false);
      void focus.pause().then(() => toast.error("تم إيقاف الجلسة لأنك غير موجود"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceDue, countdown]);

  // program driver: session completed -> break -> next study block
  useEffect(() => {
    if (!program || session || focus.isLoading) return;
    const last = lastSession.current;
    if (!last) return;
    lastSession.current = null;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.from("focus_sessions").select("status").eq("id", last.id).maybeSingle();
      if (cancelled) return;
      if (data?.status !== "completed") { setProgram(null); return; } // user ended it manually
      const next = program.index + 1;
      const block: ProgramBlock | undefined = program.blocks[next];
      if (!block) {
        setProgram(null);
        toast.success("خلصت برنامجك كامل! يعطيك العافية 🎉");
        return;
      }
      if (block.kind === "break") {
        soundEngine.beep();
        setProgram({ ...program, index: next, breakEndsAt: Date.now() + block.minutes * 60_000 });
      } else {
        soundEngine.beep();
        setProgram({ ...program, index: next, breakEndsAt: null });
        void focus.start(block.minutes, program.subject, program.roomId);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, session, focus.isLoading]);

  // break countdown
  useEffect(() => {
    if (!program?.breakEndsAt) { setBreakLeft(0); return; }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((program.breakEndsAt! - Date.now()) / 1000));
      setBreakLeft(remaining);
      if (remaining === 0) {
        if (breakTimer.current) clearInterval(breakTimer.current);
        const next = program.index + 1;
        const block = program.blocks[next];
        if (block?.kind === "study") {
          soundEngine.beep();
          setProgram({ ...program, index: next, breakEndsAt: null });
          void focus.start(block.minutes, program.subject, program.roomId);
        } else setProgram(null);
      }
    };
    tick();
    breakTimer.current = setInterval(tick, 1000);
    return () => { if (breakTimer.current) clearInterval(breakTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.breakEndsAt]);

  if (!user) return null;

  if (attendanceDue) {
    return (
      <div dir="rtl" className="fixed inset-0 z-[70] grid place-items-center bg-background/95 px-6 font-display backdrop-blur">
        <div className="w-full max-w-sm space-y-5 rounded-[26px] border bg-card p-8 text-center shadow-card">
          <p className="text-2xl">👋</p>
          <h2 className="text-xl font-extrabold">ما زلت معنا؟</h2>
          <p className="text-sm text-muted-foreground">أكبس الزر خلال {countdown} ثواني وإلا بنوقف الجلسة مؤقتاً.</p>
          <p className="text-4xl font-extrabold tabular-nums text-primary" dir="ltr">{countdown}</p>
          <Button className="h-14 w-full rounded-[16px] text-lg" onClick={() => { ack.current = { sessionId: session?.id ?? "", studied }; setAttendanceDue(false); }}>أنا هون</Button>
        </div>
      </div>
    );
  }

  if (program?.breakEndsAt) {
    const studyDone = program.blocks.slice(0, program.index + 1).filter((b) => b.kind === "study").length;
    const studyTotal = program.blocks.filter((b) => b.kind === "study").length;
    return (
      <div dir="rtl" className="fixed inset-0 z-[60] grid place-items-center bg-background/95 px-6 font-display backdrop-blur">
        <div className="w-full max-w-sm space-y-5 rounded-[26px] border bg-card p-8 text-center shadow-card">
          <p className="text-2xl">☕</p>
          <h2 className="text-xl font-extrabold">استراحة</h2>
          <p className="text-sm text-muted-foreground">خلصت جلسة {studyDone} من {studyTotal}. خذ نفس، الاستراحة ما بتنحسب دراسة.</p>
          <p className="text-4xl font-extrabold tabular-nums text-primary" dir="ltr">{fmtClock(breakLeft * 1000)}</p>
          <Progress value={100 - (breakLeft / (program.breakEndsAt ? ((program.blocks[program.index]?.minutes ?? 1) * 60) : 1)) * 100} className="h-1.5" />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-12 rounded-[16px]" onClick={() => {
              const next = program.index + 1;
              const block = program.blocks[next];
              if (block?.kind === "study") { soundEngine.beep(); setProgram({ ...program, index: next, breakEndsAt: null }); void focus.start(block.minutes, program.subject, program.roomId); }
            }}>ابدأ هلأ</Button>
            <Button variant="ghost" className="h-12 rounded-[16px]" onClick={() => setProgram(null)}>إنهاء البرنامج</Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
