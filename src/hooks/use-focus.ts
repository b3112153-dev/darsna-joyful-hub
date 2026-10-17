import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { remainingSeconds, type FocusRow } from "@/lib/focus";

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** The current user's active (running/paused) focus session, persisted in the database. */
export function useMyFocus(userId: string | undefined) {
  const qc = useQueryClient();
  const key = ["focus", userId];
  const now = useNow();
  const {
    data: session,
    isLoading,
    isError,
  } = useQuery({
    queryKey: key,
    enabled: !!userId,
    queryFn: async () =>
      ((
        await supabase
          .from("focus_sessions")
          .select("*")
          .eq("user_id", userId!)
          .eq("status", "running")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data ?? null) as FocusRow | null,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["focus", userId] });
    qc.invalidateQueries({ queryKey: ["progress"] });
    qc.invalidateQueries({ queryKey: ["active"] });
  };

  const left = session ? remainingSeconds(session, now) : 0;

  // auto-complete when time runs out
  useEffect(() => {
    if (session?.status === "running" && left === 0) {
      supabase
        .from("focus_sessions")
        .update({
          status: "completed",
          remaining_seconds: 0,
          studied_seconds: session.duration_seconds,
          finished_at: new Date().toISOString(),
        })
        .eq("id", session.id)
        .then(({ error }) => {
          if (error) {
            toast.error("تعذر إنهاء الجلسة تلقائيًا");
            return;
          }
          toast.success("خلصت الجلسة! يعطيك العافية 🎉 — الدردشة انفتحت.");
          refresh();
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.status, left]);

  async function start(
    minutes: number,
    subject: string,
    roomId: string | null,
  ) {
    if (!userId) return false;
    const dur = minutes * 60;
    const { error } = await supabase.from("focus_sessions").insert({
      user_id: userId,
      room_id: roomId,
      subject: subject.trim() || "عام",
      duration_seconds: dur,
      remaining_seconds: dur,
      status: "running",
      ends_at: new Date(Date.now() + dur * 1000).toISOString(),
    });
    if (error) {
      toast.error("تعذر بدء المؤقت");
      return false;
    }
    refresh();
    return true;
  }
  return { session, left, now, isLoading, isError, start };
}
