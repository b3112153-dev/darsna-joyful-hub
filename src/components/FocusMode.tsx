import { createContext, useContext, useState, type ReactNode } from "react";
import { Minimize2, Pause, Play, Square } from "lucide-react";
import { useSession } from "@/hooks/use-auth";
import { useMyFocus } from "@/hooks/use-focus";
import { Button } from "@/components/ui/button";
import { TodoList } from "@/components/TodoList";
import { EndFocusDialog } from "@/components/EndFocusDialog";
import { fmtClock } from "@/components/StudyRounds";
import { Progress } from "@/components/ui/progress";

type Mode = { focus: ReturnType<typeof useMyFocus>; visible: boolean; enter: () => void; exit: () => void };
const FocusModeContext = createContext<Mode | null>(null);
export function useFocusMode() { const mode = useContext(FocusModeContext); if (!mode) throw new Error("Focus mode provider missing"); return mode; }

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const focus = useMyFocus(user?.id);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const visible = !!focus.session && dismissed !== focus.session.id;
  return <FocusModeContext.Provider value={{ focus, visible, enter: () => setDismissed(null), exit: () => setDismissed(focus.session?.id ?? null) }}>{children}</FocusModeContext.Provider>;
}

export function FocusModeScreen() {
  const { user } = useSession();
  const { focus, exit } = useFocusMode();
  const [endOpen, setEndOpen] = useState(false);
  const { session, left, pending } = focus;
  if (!session || !user) return null;
  return <main dir="rtl" className="min-h-dvh bg-background px-4 py-6 sm:py-10">
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={exit}><Minimize2 className="size-4" /> خروج من وضع التركيز</Button></div>
      <section className="space-y-5 text-center">
        <h1 className="break-words text-2xl font-bold">{session.subject}</h1>
        <p className="font-display text-7xl font-bold tabular-nums text-primary sm:text-8xl" dir="ltr" aria-label="الوقت المتبقي">{fmtClock(left * 1000)}</p>
        <Progress value={Math.max(0, Math.min(100, 100 - left / session.duration_seconds * 100))} aria-label="تقدم الجلسة" />
        <div className="flex flex-wrap justify-center gap-2">
          <Button disabled={pending} onClick={session.status === "paused" ? focus.resume : focus.pause}>{session.status === "paused" ? <Play /> : <Pause />}{session.status === "paused" ? "استئناف" : "إيقاف مؤقت"}</Button>
          <Button disabled={pending} variant="outline" onClick={() => setEndOpen(true)}><Square className="size-4" /> إنهاء الجلسة</Button>
        </div>
      </section>
      <TodoList userId={user.id} />
      <EndFocusDialog open={endOpen} onOpenChange={setEndOpen} pending={pending} onEnd={focus.reset} />
    </div>
  </main>;
}