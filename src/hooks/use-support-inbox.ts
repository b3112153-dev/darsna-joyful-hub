import { useEffect } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { readData } from "@/lib/requests";
import type { PublicProfile } from "@/lib/identity";

export type InboxRow = { id: string; student_id: string; sender_id: string; content: string; created_at: string; profiles: PublicProfile | null };
export function useSupportInbox(userId: string | undefined, enabled = true) {
  const qc = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ["support-threads", userId], enabled: enabled && !!userId, staleTime: 30_000,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => (await readData(supabase.from("support_messages")
      .select("id,student_id,sender_id,content,created_at,profiles!support_messages_student_id_fkey(display_name,nickname,avatar,avatar_url,gender)")
      .is("deleted_at", null).order("created_at", { ascending: false }).order("id", { ascending: false }).range(pageParam, pageParam + 49))) ?? [],
    getNextPageParam: (last, pages) => last.length === 50 ? pages.length * 50 : undefined,
  });
  useEffect(() => {
    if (!enabled || !userId) return;
    const channel = supabase.channel(`support-inbox-${crypto.randomUUID()}`).on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, () => { void qc.invalidateQueries({ queryKey: ["support-threads"] }); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [enabled, userId, qc]);
  const latest = new Map<string, InboxRow>();
  query.data?.pages.flat().forEach((row) => { if (!latest.has(row.student_id)) latest.set(row.student_id, row); });
  return { ...query, threads: [...latest.values()] };
}
export function readInboxSeen(userId: string | undefined): Record<string, string> {
  if (!userId) return {};
  try { const value: unknown = JSON.parse(localStorage.getItem(`support-seen:${userId}`) ?? "{}"); return value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).filter((entry) => typeof entry[1] === "string")) : {}; } catch { return {}; }
}
export function inboxUnread(row: InboxRow, seen: Record<string, string>) {
  const lastSeen = seen[row.student_id];
  return row.sender_id === row.student_id && (!lastSeen || row.created_at > lastSeen);
}