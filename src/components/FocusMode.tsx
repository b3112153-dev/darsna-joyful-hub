import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { Minimize2, Music4, Pause, Play, Square } from "lucide-react";
import { useSession } from "@/hooks/use-auth";
import { useMyFocus } from "@/hooks/use-focus";
import { Button } from "@/components/ui/button";
import { TodoList } from "@/components/TodoList";
import { EndFocusDialog } from "@/components/EndFocusDialog";
import { fmtClock } from "@/components/StudyRounds";
import { Progress } from "@/components/ui/progress";
import { FOCUS_PREFERENCE_DEFAULT, focusPreferenceEnabled } from "@/lib/focus-preference";
import { SoundsSheet } from "@/components/SoundsSheet";
import { t } from "@/lib/i18n";

type Mode = { focus: ReturnType<typeof useMyFocus>; visible: boolean; enter: () => void; exit: () => void; enabled: boolean; setEnabled: (value: boolean) => void };
const FocusModeContext = createContext<Mode | null>(null);
export function useFocusMode() { const mode = useContext(FocusModeContext); if (!mode) throw new Error("Focus mode provider missing"); return mode; }

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const focus = useMyFocus(user?.id);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [enabled, updateEnabled] = useState(FOCUS_PREFERENCE_DEFAULT);
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState<string | null>(null);
  const storageKey = `darsna-focus-mode-${user?.id ?? "guest"}`;
  useEffect(() => {
    try { updateEnabled(focusPreferenceEnabled(localStorage.getItem(storageKey))); } catch { updateEnabled(FOCUS_PREFERENCE_DEFAULT); }
    setReady(true);
  }, [storageKey]);
  const setEnabled = (value: boolean) => { updateEnabled(value); try { localStorage.setItem(storageKey, value ? "on" : "off"); } catch { /* Storage may be unavailable. */ } };
  const visible = ready && !!focus.session && dismissed !== focus.session.id && (enabled || entered === focus.session.id);
  return <FocusModeContext.Provider value={{ focus, visible, enabled, setEnabled, enter: () => { setDismissed(null); setEntered(focus.session?.id ?? null); }, exit: () => setDismissed(focus.session?.id ?? null) }}>{children}</FocusModeContext.Provider>;
}

export function FocusModeScreen() {
  const { user } = useSession();
  const { focus, exit } = useFocusMode();
  const [endOpen, setEndOpen] = useState(false);
  const { session, left, pending } = focus;
  if (!session || !user) return null;
  return <main dir="rtl" className="min-h-dvh bg-background px-5 py-6 font-display text-foreground sm:py-10">
    <div className="mx-auto max-w-[440px] space-y-5">
      <div className="flex justify-end"><Button variant="ghost" size="sm" className="text-muted-foreground" onClick={exit}><Minimize2 className="size-4" /> {t("خروج من وضع التركيز")}</Button></div>
      <section className="space-y-5 text-center">
        <h1 className="break-words text-sm font-semibold text-muted-foreground">{session.subject}</h1>
        <p className="py-6 text-[64px] font-extrabold tabular-nums leading-none text-foreground" dir="ltr" aria-label={t("الوقت المتبقي")}>{fmtClock(left * 1000)}</p>
        <Progress className="h-1.5" value={Math.max(0, Math.min(100, 100 - left / session.duration_seconds * 100))} aria-label={t("تقدم الجلسة")} />
      </section>
      <TodoList userId={user.id} />
      <SoundsSheet trigger={<Button variant="secondary" className="h-12 w-full rounded-[16px]"><Music4 className="size-4" /> {t("أصوات الدراسة")}</Button>} />
      <div className="grid grid-cols-2 gap-3">
        <Button className="h-12 rounded-[16px]" variant="secondary" disabled={pending} onClick={session.status === "paused" ? focus.resume : focus.pause}>{session.status === "paused" ? <Play /> : <Pause />}{session.status === "paused" ? "استئناف" : "إيقاف مؤقت"}</Button>
        <Button className="h-12 rounded-[16px]" disabled={pending} variant="outline" onClick={() => setEndOpen(true)}><Square className="size-4" /> {t("إنهاء الجلسة")}</Button>
      </div>
      <EndFocusDialog open={endOpen} onOpenChange={setEndOpen} pending={pending} onEnd={focus.reset} />
    </div>
  </main>;
}