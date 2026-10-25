import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { reactionToggle, type ReactionRow } from "@/lib/reactions";
import { t } from "@/lib/i18n";

type Table = "message_reactions" | "support_reactions" | "topic_reactions";

/** Live reactions for a set of message ids, with toggle (same emoji removes). */
export function useReactions(table: Table, messageIds: string[], userId: string | undefined, scope: string) {
  const qc = useQueryClient();
  const column = table === "topic_reactions" ? "comment_id" : "message_id";
  const key = [table, scope];
  const idsKey = messageIds.join(",");
  const query = useQuery({
    queryKey: [...key, idsKey],
    enabled: messageIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select(`${column},user_id,emoji`).in(column, messageIds);
      if (error) throw error;
      return (data ?? []).map((row) => { const r = row as unknown as Record<string, string>; return { message_id: r[column], user_id: r["user_id"], emoji: r["emoji"] }; }) as ReactionRow[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`${table}-${scope}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        void qc.invalidateQueries({ queryKey: key });
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [table, scope, qc]);

  async function toggle(messageId: string, emoji: string) {
    if (!userId) return;
    const rows = qc.getQueryData<ReactionRow[]>([...key, idsKey]) ?? [];
    const { remove, add } = reactionToggle(rows, messageId, userId, emoji);
    try {
      if (remove.length) {
        const { error } = await supabase.from(table).delete().eq(column, messageId).eq("user_id", userId).in("emoji", remove);
        if (error) throw error;
      }
      if (add) {
        const { error } = await supabase.from(table).insert({ [column]: messageId, user_id: userId, emoji: add } as never);
        if (error) throw error;
      }
    } catch { toast.error(t("تعذر حفظ التفاعل؛ حاول مرة ثانية.")); }
    await qc.invalidateQueries({ queryKey: key });
  }

  return { reactions: query.data ?? [], toggle };
}
