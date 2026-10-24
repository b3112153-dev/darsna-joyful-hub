import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { remainingSeconds, type FocusRow } from "@/lib/focus";
import { readData, requestSignal } from "@/lib/requests";

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** The current user's active (running/paused) focus session, persisted in the database. */
export function useMyFocus(userId: string | undefined, autoComplete = false) {
  const qc = useQueryClient();
  const key = ["focus", userId];
  const now = useNow();
  const completing = useRef<string | null>(null);
  const query = useQuery({
    queryKey: key,
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      if (!userId) return null;
      return await readData(supabase
          .from("focus_sessions")
          .select("*")
          .eq("user_id", userId)
          .in("status", ["running", "paused"])
          .order("started_at", { ascending: false })
          .limit(1)
          .abortSignal(requestSignal(signal)).maybeSingle()) as FocusRow | null;
    },
  });
  const session = query.data;
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["focus", userId] });
    qc.invalidateQueries({ queryKey: ["progress"] });
    qc.invalidateQueries({ queryKey: ["active"] });
  };

  const left = session ? remainingSeconds(session, now) : 0;

  // auto-complete when time runs out
  useEffect(() => {
    if (autoComplete && session?.status === "running" && left === 0 && completing.current !== session.id) {
      completing.current = session.id;
      void readData(supabase
        .from("focus_sessions")
        .update({ status: "completed", remaining_seconds: 0, studied_seconds: session.duration_seconds, finished_at: new Date().toISOString(), ends_at: null })
        .eq("id", session.id).eq("status", "running").select("id"))
        .then((rows) => {
          if (!rows?.length) return;
          toast.success("خلصت الجلسة! يعطيك العافية، إنجازك بقرّبك لهدفك 🎉");
          refresh();
        }).catch(() => { toast.error("تعذر حفظ نهاية الجلسة؛ حاول تحديث الصفحة."); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoComplete, session?.id, session?.status, left]);

  async function save(operation: () => PromiseLike<unknown>) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    try { await operation(); await refresh(); }
    catch { toast.error("ما قدرنا نحفظ المؤقت، جرّب مرة ثانية"); }
    finally { busy.current = false; setPending(false); }
  }
  async function start(minutes: number, subject: string, roomId: string | null) {
    if (!userId || session || query.isLoading || query.isError) return;
    const dur = minutes * 60;
    await save(() => readData(supabase.from("focus_sessions").insert({
      user_id: userId, room_id: roomId, subject: subject.trim() || "عام", duration_seconds: dur, remaining_seconds: dur,
      status: "running", ends_at: new Date(Date.now() + dur * 1000).toISOString(),
    })));
  }
  async function pause() {
    if (!session) return;
    await save(() => readData(supabase.from("focus_sessions").update({ status: "paused", remaining_seconds: left, ends_at: null }).eq("id", session.id)));
  }
  async function resume() {
    if (!session) return;
    await save(() => readData(supabase.from("focus_sessions").update({ status: "running", ends_at: new Date(Date.now() + left * 1000).toISOString() }).eq("id", session.id)));
  }
  async function reset() {
    if (!session) return;
    await save(() => readData(supabase.from("focus_sessions").update({
      status: "cancelled", remaining_seconds: left, studied_seconds: session.duration_seconds - left, finished_at: new Date().toISOString(), ends_at: null,
    }).eq("id", session.id)));
  }
  return { session, left, now, start, pause, resume, reset, pending, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}
