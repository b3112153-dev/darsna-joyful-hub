import { useCallback, useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { requestSignal, readData } from "@/lib/requests";
import { MESSAGE_PAGE_SIZE, mergeMessage, orderedMessages, removeMessage, type Message, type MessageCache, type MessageCursor } from "@/lib/chat-messages";

const fields = "*,profiles(display_name,avatar_url)";

export function useRoomMessages(roomId: string, userId: string | undefined, enabled: boolean) {
  const qc = useQueryClient();
  const pendingDeletes = useRef(new Set<string>());
  const key = useMemo(() => ["messages", roomId, userId], [roomId, userId]);
  const query = useInfiniteQuery({
    queryKey: key,
    enabled,
    initialPageParam: null as MessageCursor,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async ({ pageParam, signal }) => {
      let request = supabase.from("messages").select(fields).eq("room_id", roomId).is("deleted_at", null)
        .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(MESSAGE_PAGE_SIZE);
      if (pageParam) request = request.or(`created_at.lt.${pageParam.created_at},and(created_at.eq.${pageParam.created_at},id.lt.${pageParam.id})`);
      const messages = await readData(request.abortSignal(requestSignal(signal))) ?? [];
      const last = messages.at(-1);
      return { messages, next: messages.length === MESSAGE_PAGE_SIZE && last ? { created_at: last.created_at, id: last.id } : null };
    },
    getNextPageParam: (page) => page.next ?? undefined,
  });

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const refreshOne = async (id: string) => {
      try {
        const message = await readData(supabase.from("messages").select(fields).eq("id", id).eq("room_id", roomId).is("deleted_at", null).maybeSingle());
        if (!active) return;
        qc.setQueryData<MessageCache>(key, (cache) => message && !pendingDeletes.current.has(id) ? mergeMessage(cache, message) : removeMessage(cache, id));
      } catch { if (active) toast.error("تعذر تحديث الرسالة؛ تأكد من اتصالك."); }
    };
    const channel = supabase.channel(`room-${roomId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` }, (payload) => {
        const row = payload.eventType === "DELETE" ? payload.old : payload.new;
        const id = row['id'];
        if (typeof id !== "string") return;
        if (payload.eventType === "DELETE" || ("deleted_at" in row && row['deleted_at'])) {
          qc.setQueryData<MessageCache>(key, (cache) => removeMessage(cache, id));
        } else void refreshOne(id);
      }).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [enabled, key, qc, roomId]);

  const remove = useCallback(async (id: string) => {
    if (pendingDeletes.current.has(id)) return;
    pendingDeletes.current.add(id);
    await qc.cancelQueries({ queryKey: key });
    const previous = orderedMessages(qc.getQueryData<MessageCache>(key)).find((message) => message.id === id);
    qc.setQueryData<MessageCache>(key, (cache) => removeMessage(cache, id));
    try {
      await readData(supabase.from("messages").delete().eq("id", id));
    } catch {
      if (previous) qc.setQueryData<MessageCache>(key, (cache) => mergeMessage(cache, previous));
      toast.error("تعذر الحذف، رجّعنا الرسالة.");
    } finally { pendingDeletes.current.delete(id); }
  }, [key, qc]);

  const edit = useCallback(async (id: string, content: string) => {
    if (!userId || !content.trim()) return false;
    try {
      const message = await readData(supabase.from("messages").update({ content: content.trim() }).eq("id", id).eq("user_id", userId).select(fields).single());
      if (!message) throw new Error("تعذر تعديل الرسالة");
      qc.setQueryData<MessageCache>(key, (cache) => mergeMessage(cache, message));
      return true;
    } catch (error) { toast.error(error instanceof Error && error.message ? error.message : "تعذر تعديل الرسالة؛ حاول مرة ثانية."); return false; }
  }, [key, qc, userId]);

  const append = useCallback((message: Message) => qc.setQueryData<MessageCache>(key, (cache) => mergeMessage(cache, message)), [key, qc]);
  const messages = useMemo(() => orderedMessages(query.data), [query.data]);
  return { ...query, messages, remove, edit, append };
}