import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AvatarPic } from "./AvatarPic";
import { profileName } from "@/lib/identity";
import { useMe } from "@/hooks/use-auth";
import { t } from "@/lib/i18n";

export function ActiveStudents({ roomId }: { roomId: string }) {
  const qc = useQueryClient();
  const { me } = useMe();
  const { data = [] } = useQuery({
    queryKey: ["active", roomId],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await supabase
        .from("focus_sessions")
        .select("user_id,subject,status,ends_at,profiles(display_name,nickname,avatar,avatar_url,gender)")
        .eq("room_id", roomId)
        .in("status", ["running", "paused"]);
      const now = Date.now();
      return (data ?? []).filter((s) => s.status === "paused" || (s.ends_at && new Date(s.ends_at).getTime() > now));
    },
  });
  useEffect(() => {
    const ch = supabase
      .channel(`active-${roomId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "focus_sessions", filter: `room_id=eq.${roomId}` }, () =>
        qc.invalidateQueries({ queryKey: ["active", roomId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [roomId, qc]);

  return (
    <div className="space-y-2 rounded-2xl border bg-card p-4 shadow-card">
      <p className="text-sm font-semibold">بدرسوا هلأ ({data.length})</p>
      {data.length === 0 && <p className="text-xs text-muted-foreground">{t("ما حدا بدرس حالياً بهاي الغرفة.")}</p>}
      <div className="flex flex-wrap gap-3">
        {data.map((s) => (
          <div key={s.user_id} className="flex items-center gap-2 rounded-full bg-secondary py-1 pe-3 ps-1">
            <span className="relative">
              <AvatarPic profile={s.profiles} className="size-7" />
              <span className={`absolute -bottom-0.5 -end-0.5 size-2.5 rounded-full ring-2 ring-card ${s.status === "paused" ? "bg-silver" : "bg-primary"}`} />
            </span>
            <span className="text-xs"><b>{profileName(s.profiles, !!(me?.isStaff || me?.isSupport || me?.isOwner))}</b> · {s.subject}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
