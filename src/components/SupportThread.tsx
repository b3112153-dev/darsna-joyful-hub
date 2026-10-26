import { memo, useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { ChatMessage } from "@/components/ChatMessage";
import { ImagePicker, useImagePicker } from "@/components/ImagePicker";
import { ReplyQuote } from "@/components/ReplyQuote";
import { canDeleteEntry } from "@/lib/message-permissions";
import type { Message } from "@/lib/chat-messages";
import type { InfiniteData } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { useNow } from "@/hooks/use-focus";
import { useReactions } from "@/hooks/use-reactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageActionsBar, copyMessage } from "@/components/MessageActions";
import { canEditNow, groupReactions, type ReactionRow } from "@/lib/reactions";
import { AvatarPic } from "@/components/AvatarPic";
import { PageState } from "@/components/PageState";
import { readData } from "@/lib/requests";
import { profileName, type PublicProfile } from "@/lib/identity";
import { useLang, t } from "@/lib/i18n";

type SupportMessage = {
  id: string;
  student_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  image_path: string | null;
  reply_to: string | null;
  deleted_at: string | null;
  edited_at: string | null;
  sender_role?: string | null;
  profiles: PublicProfile | null;
};

export function SupportThread({ studentId, className = "" }: { studentId: string; className?: string }) {
  const { user, me } = useMe();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const image = useImagePicker();
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<SupportMessage | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const now = useNow();
  const key = ["support", studentId];

  const history = useInfiniteQuery({
    queryKey: key, staleTime: 30_000, initialPageParam: null as { created_at: string; id: string } | null,
    queryFn: async ({ pageParam }) => {
      let query = supabase.from("support_messages").select("*,profiles!support_messages_sender_id_fkey(display_name,nickname,avatar,gender)").eq("student_id", studentId).is("deleted_at", null).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(50);
      if (pageParam) query = query.or(`created_at.lt.${pageParam.created_at},and(created_at.eq.${pageParam.created_at},id.lt.${pageParam.id})`);
      return (await readData(query)) ?? [];
    },
    getNextPageParam: (last) => { const row = last.at(-1); return last.length === 50 && row ? { created_at: row.created_at, id: row.id } : undefined; },
  });
  const msgs = [...new Map((history.data?.pages.flat() ?? []).map((m) => [m.id, m])).values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)) as SupportMessage[];
  const reactionsApi = useReactions("support_reactions", msgs.map((m) => m.id), user?.id, studentId);
  const previewOf = (id: string | null) => id ? msgs.find((m) => m.id === id) ?? { content: t("رسالة محذوفة") } : null;

  useEffect(() => {
    const ch = supabase
      .channel(`support-${studentId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages", filter: `student_id=eq.${studentId}` }, () => {
        qc.invalidateQueries({ queryKey: ["support", studentId] });
        qc.invalidateQueries({ queryKey: ["support-threads"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [studentId, qc]);

  const { showNew, markSent, jumpToNew } = useChatScroll(listRef, msgs.length, history.isSuccess, studentId);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if ((!content && !image.file) || !user || sending) return;
    setSending(true); let uploaded: string | null = null;
    try {
      uploaded = await image.upload(user.id, "support-images");
      await readData(supabase.from("support_messages").insert({ student_id: studentId, sender_id: user.id, content, image_path: uploaded, reply_to: replyTo?.id ?? null } as never));
      setText(""); setReplyTo(null); image.select(null);
      await qc.invalidateQueries({ queryKey: key });
    } catch (error) { if (uploaded) void supabase.storage.from("support-images").remove([uploaded]); toast.error(error && typeof error === "object" && "message" in error ? String(error.message) : t("تعذر الإرسال")); }
    finally { setSending(false); }
  }

  async function remove(id: string) {
    const previous = qc.getQueryData<InfiniteData<SupportMessage[]>>(key);
    qc.setQueryData<InfiniteData<SupportMessage[]>>(key, (cache) => cache ? { ...cache, pages: cache.pages.map((page) => page.filter((m) => m.id !== id)) } : cache);
    const { error } = await supabase.from("support_messages").delete().eq("id", id);
    if (error) { if (previous) qc.setQueryData(key, previous); toast.error(error.message || t("تعذر الحذف؛ حاول مرة ثانية.")); }
    void qc.invalidateQueries({ queryKey: key });
  }

  async function edit(id: string, content: string) {
    if (!user || !content.trim()) return false;
    const { error } = await supabase.from("support_messages").update({ content: content.trim() } as never).eq("id", id).eq("sender_id", user.id);
    if (error) { toast.error(error.message || t("تعذر تعديل الرسالة؛ حاول مرة ثانية.")); return false; }
    qc.invalidateQueries({ queryKey: key });
    return true;
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl border bg-card/70 p-3">
        <PageState loading={history.isPending} error={history.isError} retry={() => void history.refetch()} />
        {history.hasNextPage && <Button variant="outline" size="sm" disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>{t("تحميل الأقدم")}</Button>}
        {history.isSuccess && msgs.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{t("ابدأ المحادثة…")}</p>}
        {msgs.map((m) => {
          const own = m.sender_id === user?.id;
          const role = m.sender_role ?? (m.sender_id !== studentId ? "support" : null);
          const message: Message = { ...m, user_id: m.sender_id, room_id: studentId, sender_role: role, from_admin: role === "admin", deleted_by: null };
          return <ChatMessage key={m.id} message={message} own={own} canDelete={canDeleteEntry(m.sender_id, role, role === "admin", user?.id, me, false)} reactions={reactionsApi.reactions} userId={user?.id} now={now} onDelete={remove} onEdit={edit} onReact={(id, emoji) => void reactionsApi.toggle(id, emoji)} onReply={() => setReplyTo(m)} replyQuote={previewOf(m.reply_to)} imageBucket="support-images" />;
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} onPaste={image.paste} className="mt-3 flex flex-col gap-2">
        {replyTo && <ReplyQuote quote={replyTo} bucket="support-images" onCancel={() => setReplyTo(null)} />}
        <div className="flex min-w-0 gap-2">
          <ImagePicker file={image.file} onChange={image.select} disabled={sending} />
          <Input value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder={t("اكتب رسالتك…")} className="h-11 min-w-0 flex-1 bg-card" />
          <Button size="icon" disabled={sending || (!text.trim() && !image.file)} className="size-11 shrink-0 bg-brand" aria-label={t("إرسال")}><Send className="size-4 -scale-x-100" /></Button>
        </div>
      </form>
    </div>
  );
}
