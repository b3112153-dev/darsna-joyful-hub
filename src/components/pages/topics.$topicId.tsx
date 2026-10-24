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
import { UserAvatar } from "@/components/UserAvatar";


const Route = getRouteApi("/_authenticated/topics/$topicId");
type C = { id: string; parent_id: string | null; user_id: string; content: string; from_admin: boolean; created_at: string; profiles: { display_name: string; avatar_url: string | null } | null };

export function TopicPage() {
  const { topicId } = Route.useParams();
  const { user, me } = useMe();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<C | null>(null);

  const { data: topic, isPending, isError, refetch } = useQuery({
    queryKey: ["topic", topicId],
    queryFn: async () => await readData(supabase.from("topics").select("*").eq("id", topicId).maybeSingle()),
  });
  const { data: studied } = useQuery({
    queryKey: ["topic-read", topicId, user?.id],
    enabled: !!user,
    queryFn: async () => !!(await supabase.from("topic_reads").select("topic_id").eq("topic_id", topicId).eq("user_id", user!.id).maybeSingle()).data,
  });
  const { data: comments = [] } = useQuery({
    queryKey: ["comments", topicId],
    queryFn: async () =>
      ((await supabase.from("topic_comments").select("id,parent_id,user_id,content,from_admin,created_at,profiles(display_name,avatar_url)").eq("topic_id", topicId).order("created_at")).data ?? []) as C[],
  });
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
    toast.success("ممتاز! هلأ بتقدر تعلّق");
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;
    const { error } = await supabase.from("topic_comments").insert({ topic_id: topicId, user_id: user.id, content: text.trim(), parent_id: replyTo?.id ?? null });
    if (error) {
      toast.error("تعذر إرسال التعليق");
      return;
    }
    setText(""); setReplyTo(null);
    qc.invalidateQueries({ queryKey: ["comments", topicId] });
  }
  async function del(id: string) {
    await supabase.from("topic_comments").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["comments", topicId] });
  }
  async function toggleReplies(v: boolean) {
    await supabase.from("topics").update({ allow_replies: v }).eq("id", topicId);
    qc.invalidateQueries({ queryKey: ["topic", topicId] });
  }

  const roots = comments.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => comments.filter((c) => c.parent_id === id);

  function Comment({ c, depth }: { c: C; depth: number }) {
    const name = c.from_admin ? "الإدارة" : c.profiles?.display_name;
    return (
      <div className={depth ? "ms-6 border-s-2 border-silver ps-3" : ""}>
        <div className="flex gap-2 py-2">
          <UserAvatar path={c.from_admin ? null : c.profiles?.avatar_url} name={name} className="size-8" />
          <div className="flex-1 rounded-2xl bg-bubble px-3 py-2">
            <p className="text-xs font-semibold text-primary">{name}</p>
            <p className="whitespace-pre-wrap break-words text-sm">{c.content}</p>
            <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
              <span>{new Date(c.created_at).toLocaleString("ar-JO", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</span>
              {topic?.allow_replies && canComment && depth < 3 && (
                <button onClick={() => setReplyTo(c)} className="flex items-center gap-1 hover:text-primary"><CornerDownLeft className="size-3" /> رد</button>
              )}
              {(c.user_id === user?.id || me?.isStaff) && <button onClick={() => del(c.id)} className="hover:text-destructive"><Trash2 className="size-3" /></button>}
            </div>
          </div>
        </div>
        {childrenOf(c.id).map((r) => <Comment key={r.id} c={r} depth={depth + 1} />)}
      </div>
    );
  }

  if (isPending) return <PageState loading />;
  if (isError) return <PageState error retry={() => void refetch()} />;
  if (topic === null) return <Unavailable kind="الصفحة" />;

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <Link to="/topics" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowRight className="size-4" /> كل المواضيع</Link>
      {topic && (
        <article className="rounded-2xl border bg-card p-6 shadow-card">
          <p className="mb-1 text-xs text-muted-foreground">الإدارة · {topic.subject ?? "عام"}</p>
          <h1 className="mb-3 text-2xl font-bold">{topic.title}</h1>
          <p className="whitespace-pre-wrap leading-relaxed">{topic.body}</p>
          {me?.isAdmin && (
            <Label className="mt-4 flex items-center gap-2 text-sm"><Switch checked={topic.allow_replies} onCheckedChange={toggleReplies} /> السماح بالردود</Label>
          )}
        </article>
      )}
      {!canComment && (
        <Button onClick={markStudied} className="w-full bg-brand"><CheckCircle2 /> خلصت دراسة الموضوع — بدي أعلّق</Button>
      )}
      <section className="rounded-2xl border bg-card p-4 shadow-card">
        <h2 className="mb-2 font-semibold">التعليقات ({comments.length})</h2>
        {roots.length === 0 && <p className="py-4 text-sm text-muted-foreground">ما في تعليقات بعد.</p>}
        {roots.map((c) => <Comment key={c.id} c={c} depth={0} />)}
        {canComment && !me?.isBanned && (
          <form onSubmit={send} className="mt-3 space-y-2">
            {replyTo && (
              <p className="flex justify-between rounded-lg bg-secondary px-3 py-1.5 text-xs">
                رد على: {replyTo.from_admin ? "الإدارة" : replyTo.profiles?.display_name}
                <button type="button" onClick={() => setReplyTo(null)}>✕</button>
              </p>
            )}
            <Textarea value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder="شاركنا رأيك أو سؤالك…" />
            <Button className="bg-brand">إرسال</Button>
          </form>
        )}
      </section>
    </main>
  );
}
