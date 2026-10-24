import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/UserAvatar";

type Post = { id: string; user_id: string; content: string | null; image_path: string | null; from_admin: boolean; created_at: string; profiles: { display_name: string; avatar_url: string | null } | null };

function PostImage({ path }: { path: string }) {
  const { data } = useQuery({
    queryKey: ["mot-img", path],
    staleTime: 50 * 60 * 1000,
    queryFn: async () => (await supabase.storage.from("motivation").createSignedUrl(path, 3600)).data?.signedUrl ?? null,
  });
  return data ? <img src={data} alt="" loading="lazy" className="max-h-96 w-full rounded-xl object-cover" /> : <div className="h-48 animate-pulse rounded-xl bg-muted" />;
}

export function Motivation() {
  const { user, me } = useMe();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: posts = [] } = useQuery({
    queryKey: ["motivation"],
    queryFn: async () =>
      ((await supabase.from("motivation_posts").select("id,user_id,content,image_path,from_admin,created_at,profiles(display_name,avatar_url)").order("created_at", { ascending: false }).limit(60)).data ?? []) as Post[],
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || (!text.trim() && !file)) return;
    setBusy(true);
    let image_path: string | null = null;
    if (file) {
      if (!file.type.startsWith("image/")) { setBusy(false); toast.error("اختر صورة"); return; }
      image_path = `${user.id}/${Date.now()}.${file.name.split(".").pop()}`;
      const up = await supabase.storage.from("motivation").upload(image_path, file);
      if (up.error) { setBusy(false); toast.error("تعذر رفع الصورة (الحد 5MB)"); return; }
    }
    const { error } = await supabase.from("motivation_posts").insert({ user_id: user.id, content: text.trim() || null, image_path });
    setBusy(false);
    if (error) { toast.error("تعذر النشر"); return; }
    setText(""); setFile(null);
    (e.target as HTMLFormElement).reset();
    qc.invalidateQueries({ queryKey: ["motivation"] });
  }
  async function del(p: Post) {
    if (!confirm("حذف المنشور؟")) return;
    if (p.image_path) await supabase.storage.from("motivation").remove([p.image_path]);
    await supabase.from("motivation_posts").delete().eq("id", p.id);
    qc.invalidateQueries({ queryKey: ["motivation"] });
  }

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">التحفيز ✨</h1>
        <p className="text-muted-foreground">شارك صورة، ذكرى، أو كلمة بتشحن زملاءك.</p>
      </div>
      {!me?.isBanned && (
        <form onSubmit={submit} className="space-y-3 rounded-2xl border bg-card p-4 shadow-card">
          <Textarea maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب كلمة تحفيزية…" />
          <div className="flex items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-primary">
              <ImagePlus className="size-5" /> {file ? file.name : "إضافة صورة"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <Button disabled={busy} className="bg-brand">{busy ? "جاري النشر…" : "نشر"}</Button>
          </div>
        </form>
      )}
      {posts.length === 0 && <p className="py-10 text-center text-muted-foreground">كن أول من ينشر!</p>}
      {posts.map((p) => {
        const name = p.from_admin ? "الإدارة" : p.profiles?.display_name;
        return (
          <article key={p.id} className="space-y-3 rounded-2xl border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <UserAvatar path={p.from_admin ? null : p.profiles?.avatar_url} name={name} className="size-9" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{name}</p>
                <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("ar-JO", { day: "numeric", month: "long" })}</p>
              </div>
              {(p.user_id === user?.id || me?.isStaff) && (
                <button onClick={() => del(p)} aria-label="حذف" className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
              )}
            </div>
            {p.content && <p className="whitespace-pre-wrap text-lg leading-relaxed">{p.content}</p>}
            {p.image_path && <PostImage path={p.image_path} />}
          </article>
        );
      })}
    </main>
  );
}
