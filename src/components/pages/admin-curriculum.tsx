import { canDeleteContent } from "@/lib/message-permissions";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { useCurriculum } from "@/hooks/use-plan";
import { PageState, Unavailable } from "@/components/PageState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { readData, withTimeout } from "@/lib/requests";
import { BRANCHES, branchLabel } from "@/lib/branches";
import { arDigits, type UnitRow } from "@/lib/plan";
import { t } from "@/lib/i18n";

const GENERATIONS = [
  { value: "gen2009", label: "جيل 2009" },
  { value: "gen2010", label: "جيل 2010" },
  { value: "all", label: "الكل" },
];

type Draft = { id?: string; generation: string; track: string; subject: string; semester: number; unit_no: number; title: string; lessons: number };

const emptyDraft: Draft = { generation: "all", track: "all", subject: "", semester: 1, unit_no: 1, title: "", lessons: 4 };

export function AdminCurriculum() {
  const { user, me, loading, isError, refetch } = useMe();
  const unitsQ = useCurriculum();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState("");
  const [pasteGen, setPasteGen] = useState("all");
  const [pasteTrack, setPasteTrack] = useState("all");

  if (loading || (user && unitsQ.isLoading)) return <PageState loading />;
  if (isError || unitsQ.isError) return <PageState error retry={() => { void refetch(); void unitsQ.refetch(); }} />;
  if (!me || !(me.isAdmin || me.isSupport || me.isOwner)) return <Unavailable kind={t("الصفحة")} />;

  const units = unitsQ.data ?? [];

  async function save() {
    if (!edit || busy) return;
    if (!edit.subject.trim() || !edit.title.trim()) { toast.error(t("عبّي المادة والعنوان")); return; }
    setBusy(true);
    try {
      const row = {
        generation: edit.generation, track: edit.track, subject: edit.subject.trim(),
        semester: edit.semester, unit_no: edit.unit_no, title: edit.title.trim(), lessons: edit.lessons,
        created_by: user?.id ?? null,
      };
      if (edit.id) await readData(supabase.from("curriculum_units").update(row).eq("id", edit.id));
      else await readData(supabase.from("curriculum_units").insert(row));
      toast.success(t("تم الحفظ"));
      setEdit(null);
      void qc.invalidateQueries({ queryKey: ["curriculum-units"] });
    } catch { toast.error(t("ما قدرنا نحفظ الوحدة")); } finally { setBusy(false); }
  }

  async function remove(u: UnitRow) {
    if (busy) return;
    setBusy(true);
    try {
      await readData(supabase.from("curriculum_units").delete().eq("id", u.id));
      toast.success(t("انحذفت الوحدة"));
      void qc.invalidateQueries({ queryKey: ["curriculum-units"] });
    } catch { toast.error(t("ما قدرنا نحذف الوحدة")); } finally { setBusy(false); }
  }

  async function pasteAll() {
    if (busy) return;
    const lines = paste.split("\n").map((l) => l.trim()).filter(Boolean);
    const rows = [];
    for (const line of lines) {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length < 5) { toast.error(`السطر مش مكتمل: ${line}`); return; }
      const [subject, sem, no, title, lessons] = parts;
      if (!subject || !title || isNaN(Number(sem)) || isNaN(Number(no)) || isNaN(Number(lessons))) {
        toast.error(`صيغة غلط بالسطر: ${line}`);
        return;
      }
      rows.push({
        generation: pasteGen, track: pasteTrack, subject,
        semester: Number(sem), unit_no: Number(no), title, lessons: Number(lessons), created_by: user?.id ?? null,
      });
    }
    if (!rows.length) { toast.error(t("الصق أسطر الوحدات أولاً")); return; }
    setBusy(true);
    try {
      await withTimeout(supabase.from("curriculum_units").insert(rows)).then((r) => { if (r.error) throw r.error; });
      toast.success(`انضافت ${arDigits(rows.length)} وحدات`);
      setPaste("");
      void qc.invalidateQueries({ queryKey: ["curriculum-units"] });
    } catch { toast.error(t("ما قدرنا نضيف الوحدات")); } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-5 py-5 font-display">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold">{t("إدارة المنهاج")}</h1>
          <p className="text-sm text-muted-foreground">{t("وحدات المواد المستخدمة بجداول حلّها")}</p>
        </div>
        <Button className="rounded-xl bg-brand" onClick={() => setEdit({ ...emptyDraft })}><Plus /> {t("إضافة وحدة")}</Button>
      </div>

      <div className="space-y-2 rounded-[20px] border bg-card p-4 shadow-card">
        <p className="text-sm font-extrabold">{t("لصق سريع")}</p>
        <p className="text-xs text-muted-foreground">{t("سطر لكل وحدة بالصيغة: المادة | الفصل | رقم الوحدة | العنوان | عدد الدروس")}</p>
        <div className="grid grid-cols-2 gap-2">
          <Select value={pasteGen} onValueChange={setPasteGen}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{GENERATIONS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={pasteTrack} onValueChange={setPasteTrack}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("كل الفروع")}</SelectItem>
              {BRANCHES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Textarea dir="rtl" rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={t("رياضيات | 1 | 1 | الجبر | 6\nفيزياء | 1 | 2 | الحركة | 4")} aria-label={t("لصق الوحدات")} />
        <Button variant="outline" className="rounded-xl" disabled={busy} onClick={pasteAll}>{t("إدخال الدفعة")}</Button>
      </div>

      <div className="space-y-2">
        {units.length === 0 && <p className="rounded-[20px] border bg-card p-5 text-center text-sm text-muted-foreground">{t("لسا ما في وحدات. أضف أول وحدة أو استخدم اللصق السريع.")}</p>}
        {units.map((u) => (
          <div key={u.id} className="flex items-center gap-2 rounded-[20px] border bg-card p-3 shadow-card">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold">{u.subject} — {u.title}</p>
              <p className="text-xs text-muted-foreground">
                {GENERATIONS.find((g) => g.value === u.generation)?.label ?? u.generation} · {u.track === "all" ? t("كل الفروع") : branchLabel(u.track)} · الفصل {arDigits(u.semester)} · وحدة {arDigits(u.unit_no)} · {arDigits(u.lessons)} دروس
              </p>
            </div>
            <Button size="sm" variant="ghost" className="h-8 shrink-0" onClick={() => setEdit({ id: u.id, generation: u.generation, track: u.track, subject: u.subject, semester: u.semester, unit_no: u.unit_no, title: u.title, lessons: u.lessons })} aria-label={t("تعديل")}>
              <Pencil className="size-4" />
            </Button>
            {canDeleteContent(me) && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-destructive" disabled={busy} onClick={() => remove(u)} aria-label={t("حذف")}>
              <Trash2 className="size-4" />
            </Button>}
          </div>
        ))}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-sm font-display">
          <DialogTitle>{edit?.id ? t("تعديل وحدة") : "إضافة وحدة"}</DialogTitle>
          <DialogDescription>{t("حدد الجيل والفرع والمادة وتفاصيل الوحدة.")}</DialogDescription>
          {edit && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Select value={edit.generation} onValueChange={(v) => setEdit({ ...edit, generation: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{GENERATIONS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={edit.track} onValueChange={(v) => setEdit({ ...edit, track: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("كل الفروع")}</SelectItem>
                    {BRANCHES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Input value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} placeholder={t("المادة")} aria-label={t("المادة")} />
              <Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder={t("عنوان الوحدة")} aria-label={t("عنوان الوحدة")} />
              <div className="grid grid-cols-3 gap-2">
                <Select value={String(edit.semester)} onValueChange={(v) => setEdit({ ...edit, semester: Number(v) })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t("الفصل 1")}</SelectItem>
                    <SelectItem value="2">{t("الفصل 2")}</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" min={1} value={edit.unit_no} onChange={(e) => setEdit({ ...edit, unit_no: Math.max(1, Number(e.target.value) || 1) })} aria-label={t("رقم الوحدة")} />
                <Input type="number" min={1} value={edit.lessons} onChange={(e) => setEdit({ ...edit, lessons: Math.max(1, Number(e.target.value) || 1) })} aria-label={t("عدد الدروس")} />
              </div>
              <Button className="w-full rounded-xl bg-brand" disabled={busy} onClick={save}>{busy ? t("بنحفظ…") : "حفظ"}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
