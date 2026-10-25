import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/i18n";

export function RoomNotes({ roomId, userId }: { roomId: string; userId: string }) {
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const loaded = useRef(false);
  const { data, isFetched } = useQuery({
    queryKey: ["notes", roomId, userId],
    queryFn: async () =>
      (await supabase.from("room_notes").select("content").eq("room_id", roomId).eq("user_id", userId).maybeSingle()).data,
  });
  useEffect(() => {
    if (isFetched && !loaded.current) {
      setText(data?.content ?? "");
      loaded.current = true;
    }
  }, [isFetched, data]);
  useEffect(() => {
    if (!loaded.current) return;
    setState("saving");
    const t = setTimeout(async () => {
      await supabase.from("room_notes").upsert({ room_id: roomId, user_id: userId, content: text, updated_at: new Date().toISOString() });
      setState("saved");
    }, 800);
    return () => clearTimeout(t);
  }, [text, roomId, userId]);

  return (
    <div className="space-y-2 rounded-2xl border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{t("ملاحظاتي الخاصة")}</p>
        <span className="text-xs text-muted-foreground">{state === "saving" ? "جاري الحفظ…" : state === "saved" ? "تم الحفظ ✓" : "بس إنت بتشوفها"}</span>
      </div>
      <Textarea value={text} maxLength={10000} onChange={(e) => setText(e.target.value)} placeholder={t("اكتب ملخصك أو أسئلتك هون…")} className="min-h-56" />
    </div>
  );
}
