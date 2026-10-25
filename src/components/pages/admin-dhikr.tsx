import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { PageState, Unavailable } from "@/components/PageState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { t } from "@/lib/i18n";

type Story = { id: string; kind: string; title: string; body: string; source: string | null; sort: number };
const empty = { kind: "story", title: "", body: "", source: "", sort: 0 };

export function AdminDhikr() {
  const { me } = useMe();
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const allowed = !!me && (me.isStaff || me.isSupport || me.isOwner);

  const query = useQuery({
    queryKey: ["dhikr-stories"],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase.from("dhikr_stories").select("id,kind,title,body,source,sort").order("sort");
      if (error) throw error;
      return (data ?? []) as Story[];
    },
  });

  if (me && !allowed) return <Unavailable kind=t("الصفحة") />;

  async function save() {
    if (!form.title.trim() || !form.body.trim() || saving) return;
    setSaving(true);
    try {
      const payload = { kind: form.kind, title: form.title.trim(), body: form.body.trim(), source: form.source.trim() || null, sort: form.sort };
      const { error } = editingId
        ? await supabase.from("dhikr_stories").update(payload as never).eq("id", editingId)
        : await supabase.from("dhikr_stories").insert(payload as never);
      if (error) throw error;
      toast.success(editingId ? t("تم التعديل") : "تمت الإضافة");
      setForm(empty);
      setEditingId(null);
      await qc.invalidateQueries({ queryKey: ["dhikr-stories"] });
    } catch { toast.error(t("تعذر الحفظ؛ حاول مرة ثانية.")); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("dhikr_stories").delete().eq("id", id);
    if (error) toast.error(t("تعذر الحذف؛ حاول مرة ثانية."));
    else { toast.success(t("انحذفت")); await qc.invalidateQueries({ queryKey: ["dhikr-stories"] }); }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-5 py-6 font-display">
      <div className="flex items-center gap-3">
        <Link to="/dhikr" aria-label={t("العودة لذكرى")} className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-secondary"><ArrowRight className="size-5" /></Link>
        <h1 className="text-[24px] font-extrabold">{t("إدارة قصص ذكرى")}</h1>
      </div>

      <section className="space-y-3 rounded-[20px] border bg-card p-4 shadow-card">
        <h2 className="text-sm font-extrabold">{editingId ? t("تعديل سجل") : "سجل جديد"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("النوع")}</Label>
            <Select value={form.kind} onValueChange={(kind) => setForm((f) => ({ ...f, kind }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="story">{t("قصة نبي")}</SelectItem>
                <SelectItem value="muwashshah">{t("موشح أندلسي")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("الترتيب")}</Label>
            <Input type="number" min={0} value={form.sort} onChange={(e) => setForm((f) => ({ ...f, sort: Math.max(0, Number(e.target.value) || 0) }))} />
          </div>
        </div>
        <div className="space-y-1.5"><Label>{t("العنوان")}</Label><Input maxLength={120} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
        <div className="space-y-1.5"><Label>{t("النص")}</Label><Textarea rows={5} maxLength={5000} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} /></div>
        <div className="space-y-1.5"><Label>{t("المصدر (اختياري)")}</Label><Input maxLength={200} value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} /></div>
        <div className="flex gap-2">
          <Button disabled={saving || !form.title.trim() || !form.body.trim()} onClick={() => void save()}><Plus className="size-4" /> {editingId ? t("حفظ التعديل") : "إضافة"}</Button>
          {editingId && <Button variant="ghost" onClick={() => { setEditingId(null); setForm(empty); }}>{t("إلغاء")}</Button>}
        </div>
      </section>

      <PageState loading={query.isPending} error={query.isError} retry={() => void query.refetch()} />
      <section className="space-y-2">
        {(query.data ?? []).map((story) => (
          <div key={story.id} className="flex items-start gap-3 rounded-[18px] border bg-card p-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground">{story.kind === "muwashshah" ? t("موشح") : "قصة نبي"} · ترتيب {story.sort}</p>
              <h3 className="truncate text-sm font-extrabold">{story.title}</h3>
              <p className="line-clamp-2 text-xs leading-6 text-muted-foreground">{story.body}</p>
            </div>
            <Button size="icon" variant="ghost" aria-label={t("تعديل")} onClick={() => { setEditingId(story.id); setForm({ kind: story.kind, title: story.title, body: story.body, source: story.source ?? "", sort: story.sort }); }}><Pencil className="size-4" /></Button>
            <Button size="icon" variant="ghost" aria-label={t("حذف")} className="text-destructive" onClick={() => void remove(story.id)}><Trash2 className="size-4" /></Button>
          </div>
        ))}
        {query.isSuccess && query.data?.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t("ما في سجلات بعد.")}</p>}
      </section>
    </main>
  );
}
