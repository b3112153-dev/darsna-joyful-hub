import { DeleteContent } from "@/components/DeleteContent";
import { PageState, Unavailable } from "@/components/PageState";
import { readData } from "@/lib/requests";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/i18n";

export function Topics() {
  const { me } = useMe();
  const { data: topics = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["topics"],
    queryFn: async () =>
      await readData(supabase.from("topics").select("id,title,body,subject,created_at,topic_comments(count)").order("created_at", { ascending: false })) ?? [],
  });
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">{t("مواضيع ونقاشات")}</h1>
        <p className="text-muted-foreground">{t("موضوع جديد من الإدارة بشكل دوري — ادرسه وبعدين شارك برأيك.")}</p>
      </div>
      {(me?.isAdmin || me?.isOwner) && <NewTopic />}
      <PageState loading={isLoading} error={isError} retry={() => void refetch()} />
      {!isLoading && !isError && topics.length === 0 && <p className="py-10 text-center text-muted-foreground">{t("ما في مواضيع بعد.")}</p>}
      <div className="space-y-3">
        {topics.map((topic) => (
          <div key={topic.id} className="relative"><div className="absolute end-2 top-2"><DeleteContent table="topics" id={topic.id} /></div><Link to="/topics/$topicId" params={{ topicId: topic.id }} className="block rounded-2xl border bg-card p-5 pe-12 shadow-card transition hover:shadow-soft">
            <p className="mb-1 text-xs text-muted-foreground">الإدارة · {topic.subject ?? t("عام")} · {new Date(topic.created_at).toLocaleDateString("ar-u-nu-latn")}</p>
            <h2 className="font-semibold">{topic.title}</h2>
            <p className="line-clamp-2 text-sm text-muted-foreground">{topic.body}</p>
            <p className="mt-2 flex items-center gap-1 text-xs text-primary"><MessageCircle className="size-3.5" /> {(topic.topic_comments as unknown as { count: number }[])[0]?.count ?? 0} تعليق</p>
          </Link></div>
        ))}
      </div>
    </main>
  );
}

function NewTopic() {
  const { user } = useMe();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [replies, setReplies] = useState(true);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("topics").insert({ title: title.trim(), body: body.trim(), subject: subject.trim() || null, allow_replies: replies, created_by: user.id });
    if (error) {
      toast.error(t("تعذر النشر"));
      return;
    }
    setTitle(""); setBody(""); setSubject("");
    toast.success(t("تم نشر الموضوع"));
    qc.invalidateQueries({ queryKey: ["topics"] });
  }
  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-primary bg-card p-4 shadow-card">
      <p className="text-sm font-semibold">{t("نشر موضوع جديد (يظهر باسم \"الإدارة\")")}</p>
      <Input required minLength={2} maxLength={150} placeholder={t("عنوان الموضوع")} value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input maxLength={60} placeholder={t("المادة (اختياري)")} value={subject} onChange={(e) => setSubject(e.target.value)} />
      <Textarea required maxLength={10000} placeholder={t("محتوى الموضوع…")} value={body} onChange={(e) => setBody(e.target.value)} className="min-h-28" />
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2"><Switch checked={replies} onCheckedChange={setReplies} /> {t("السماح بالردود على التعليقات")}</Label>
        <Button className="bg-brand">{t("نشر")}</Button>
      </div>
    </form>
  );
}
