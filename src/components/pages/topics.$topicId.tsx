import { PageState, Unavailable } from "@/components/PageState";
import { readData } from "@/lib/requests";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, CornerDownLeft, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AvatarPic } from "@/components/AvatarPic";
import { profileName, type PublicProfile } from "@/lib/identity";
import { ChatMessage } from "@/components/ChatMessage";
import { ImagePicker, useImagePicker } from "@/components/ImagePicker";
import { ReplyQuote } from "@/components/ReplyQuote";
import { useReactions } from "@/hooks/use-reactions";
import { useNow } from "@/hooks/use-focus";
import { canDeleteEntry, canDeleteContent } from "@/lib/message-permissions";
import type { Message } from "@/lib/chat-messages";
import { t } from "@/lib/i18n";


const Route = getRouteApi("/_authenticated/topics/$topicId");
type C = { id: string; parent_id: string | null; user_id: string; content: string; from_admin: boolean; created_at: string; image_path: string | null; sender_role: string | null; edited_at: string | null; deleted_at: string | null; profiles: PublicProfile | null };

export function TopicPage() {
  const { topicId } = Route.useParams();
  const { user, me } = useMe();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const image = useImagePicker();
  const now = useNow();
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<C | null>(null);

  const { data: topic, isPending, isError, refetch } = useQuery({
    queryKey: ["topic", topicId],
    queryFn: async () => await readData(supabase.from("topics").select("*").eq("id", topicId).maybeSingle()),
  });
  const { data: studied } = useQuery({
    queryKey: ["topic-read", topicId, user?.id],
    enabled: !!user,
    queryFn: async () => user ? !!(await readData(supabase.from("topic_reads").select("topic_id").eq("topic_id", topicId).eq("user_id", user.id).maybeSingle())) : false,
  });
  const { data: comments = [], isPending: commentsPending, isError: commentsError, refetch: refetchComments } = useQuery({
    queryKey: ["comments", topicId],
    queryFn: async () =>
      ((await readData(supabase.from("topic_comments").select("*,profiles(display_name,nickname,avatar,gender)").eq("topic_id", topicId).is("deleted_at", null).order("created_at"))) ?? []) as C[],
  });
  const reactions = useReactions("topic_reactions", comments.map((c) => c.id), user?.id, topicId);
  useEffect(() => {
    const ch = supabase
      .channel(`topic-${topicId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "topic_comments", filter: `topic_id=eq.${topicId}` }, () =>
        qc.invalidateQueries({ queryKey: ["comments", topicId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [topicId, qc]);

  const canComment = me?.isAdmin || studied;

  async function markStudied() {
    if (!user) return;
    await supabase.from("topic_reads").insert({ topic_id: topicId, user_id: user.id });
    qc.invalidateQueries({ queryKey: ["topic-read", topicId] });
    toast.success(t("ممتاز! هلأ بتقدر تعلّق"));
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || (!text.trim() && !image.file) || sending) return;
    setSending(true); let uploaded: string | null = null;
    try {
      uploaded = await image.upload(user.id, "chat-images");
      await readData(supabase.from("topic_comments").insert({ topic_id: topicId, user_id: user.id, content: text.trim(), image_path: uploaded, parent_id: replyTo?.id ?? null }));
      setText(""); setReplyTo(null); image.select(null);
      await qc.invalidateQueries({ queryKey: ["comments", topicId] });
    } catch (error) { if (uploaded) void supabase.storage.from("chat-images").remove([uploaded]); toast.error(error && typeof error === "object" && "message" in error ? String(error.message) : t("تعذر إرسال التعليق")); }
    finally { setSending(false); }
  }
  async function del(id: string) {
    const previous = comments.find((c) => c.id === id);
    qc.setQueryData<C[]>(["comments", topicId], (rows) => rows?.filter((c) => c.id !== id));
    try { await readData(supabase.from("topic_comments").delete().eq("id", id)); }
    catch (error) { if (previous) qc.setQueryData<C[]>(["comments", topicId], (rows) => [...(rows ?? []), previous]); toast.error(error && typeof error === "object" && "message" in error ? String(error.message) : t("تعذر الحذف")); }
  }
  async function edit(id: string, content: string) {
    if (!user) return false;
    try { await readData(supabase.from("topic_comments").update({ content: content.trim() }).eq("id", id).eq("user_id", user.id)); await qc.invalidateQueries({ queryKey: ["comments", topicId] }); return true; }
    catch (error) { toast.error(error && typeof error === "object" && "message" in error ? String(error.message) : t("تعذر تعديل الرسالة؛ حاول مرة ثانية.")); return false; }
  }

  async function toggleReplies(v: boolean) {
    await supabase.from("topics").update({ allow_replies: v }).eq("id", topicId);
    qc.invalidateQueries({ queryKey: ["topic", topicId] });
  }

  const roots = comments.filter((c) => !c.parent_id || !comments.some((parent) => parent.id === c.parent_id));
  const childrenOf = (id: string) => comments.filter((c) => c.parent_id === id);

  function renderComment(c: C, depth: number, visited = new Set<string>()): React.ReactNode {
    if (visited.has(c.id)) return null;
    const next = new Set(visited).add(c.id);
    const message: Message = { ...c, reply_to: c.parent_id, room_id: topicId, deleted_by: null };
    const quote = c.parent_id ? comments.find((r) => r.id === c.parent_id) ?? { content: t("رسالة محذوفة") } : null;
    return <div key={c.id} className={depth ? "ms-2 min-w-0 border-s-2 border-silver ps-1 sm:ms-4" : "min-w-0"}>
      <ChatMessage message={message} own={c.user_id === user?.id} canDelete={canDeleteEntry(c.user_id, c.sender_role, c.from_admin, user?.id, me)} reactions={reactions.reactions} userId={user?.id} now={now} onDelete={del} onEdit={edit} onReact={(id, emoji) => void reactions.toggle(id, emoji)} onReply={() => { if (topic?.allow_replies && canComment) setReplyTo(c); }} replyQuote={quote} />
      {childrenOf(c.id).map((child) => renderComment(child, Math.min(depth + 1, 3), next))}
    </div>;
  }

  if (isPending) return <PageState loading />;
  if (isError) return <PageState error retry={() => void refetch()} />;
  if (topic === null) return <Unavailable kind={t("الصفحة")} />;

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <Link to="/topics" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowRight className="size-4" /> {t("كل المواضيع")}</Link>
      {topic && (
        <article className="rounded-2xl border bg-card p-6 shadow-card">
          <p className="mb-1 text-xs text-muted-foreground">الإدارة · {topic.subject ?? t("عام")}</p>
          <div className="flex items-start justify-between gap-2"><h1 className="mb-3 min-w-0 break-words text-2xl font-bold">{topic.title}</h1>{canDeleteContent(me) && <Button variant="ghost" size="icon" aria-label={t("حذف")} onClick={async () => { const { error } = await supabase.from("topics").delete().eq("id", topicId); if (error) toast.error(error.message); else { void qc.invalidateQueries({ queryKey: ["topics"] }); void refetch(); } }}><Trash2 className="text-destructive" /></Button>}</div>
          <p className="whitespace-pre-wrap leading-relaxed">{topic.body}</p>
          {canDeleteContent(me) && (
            <Label className="mt-4 flex items-center gap-2 text-sm"><Switch checked={topic.allow_replies} onCheckedChange={toggleReplies} /> {t("السماح بالردود")}</Label>
          )}
        </article>
      )}
      {!canComment && (
        <Button onClick={markStudied} className="w-full bg-brand"><CheckCircle2 /> {t("خلصت دراسة الموضوع — بدي أعلّق")}</Button>
      )}
      <section className="rounded-2xl border bg-card p-4 shadow-card">
        <h2 className="mb-2 font-semibold">التعليقات ({comments.length})</h2>
        {roots.length === 0 && <p className="py-4 text-sm text-muted-foreground">{t("ما في تعليقات بعد.")}</p>}
        <PageState loading={commentsPending} error={commentsError} retry={() => void refetchComments()} />
         {roots.map((c) => renderComment(c, 0))}
        {canComment && !me?.isBanned && (
          <form onSubmit={send} onPaste={image.paste} className="mt-3 space-y-2">
            {replyTo && <ReplyQuote quote={replyTo} onCancel={() => setReplyTo(null)} />}
            <Textarea aria-label={t("شاركنا رأيك أو سؤالك…")} value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder={t("شاركنا رأيك أو سؤالك…")} />
            <div className="flex items-center gap-2"><ImagePicker file={image.file} onChange={image.select} disabled={sending} /><Button disabled={sending || (!text.trim() && !image.file)} className="bg-brand">{t("إرسال")}</Button></div>
          </form>
        )}
      </section>
    </main>
  );
}
