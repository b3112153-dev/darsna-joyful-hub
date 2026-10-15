import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BRANCHES, branchLabel } from "@/lib/branches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function LibraryAdmin() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [branch, setBranch] = useState("shared");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: files = [] } = useQuery({
    queryKey: ["library"],
    queryFn: async () =>
      (await supabase.from("library_files").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("اختر ملف");
      return;
    }
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const path = `${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from("library").upload(path, file, { contentType: file.type });
    if (up.error) {
      setBusy(false);
      toast.error("تعذر رفع الملف (الحد 50MB)");
      return;
    }
    const { error } = await supabase.from("library_files").insert({
      title: title.trim(),
      subject: subject.trim(),
      branch: branch === "shared" ? null : branch,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      uploaded_by: u.user?.id ?? null,
    });
    setBusy(false);
    if (error) {
      await supabase.storage.from("library").remove([path]);
      toast.error("تعذر حفظ الملف");
      return;
    }
    toast.success("تم رفع الملف");
    setTitle("");
    setFile(null);
    (e.target as HTMLFormElement).reset();
    qc.invalidateQueries({ queryKey: ["library"] });
  }

  async function del(id: string, path: string) {
    if (!confirm("حذف الملف؟")) return;
    await supabase.storage.from("library").remove([path]);
    const { error } = await supabase.from("library_files").delete().eq("id", id);
    if (error) toast.error("تعذر الحذف");
    qc.invalidateQueries({ queryKey: ["library"] });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={upload} className="grid gap-3 rounded-2xl border bg-card p-4 shadow-card sm:grid-cols-2">
        <Input required minLength={2} maxLength={120} placeholder="عنوان الملف (مثلاً: مراجعة الوحدة الأولى)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input required maxLength={60} placeholder="المادة (مثلاً: رياضيات)" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Select dir="rtl" value={branch} onValueChange={setBranch}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {BRANCHES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
            <SelectItem value="shared">مشترك</SelectItem>
          </SelectContent>
        </Select>
        <Input type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button disabled={busy} className="bg-brand sm:col-span-2"><Upload /> {busy ? "جاري الرفع…" : "رفع الملف"}</Button>
      </form>
      <div className="divide-y rounded-2xl border bg-card shadow-card">
        {files.length === 0 && <p className="p-6 text-center text-muted-foreground">ما في ملفات بعد</p>}
        {files.map((f) => (
          <div key={f.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold break-words">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.subject} · {branchLabel(f.branch)} · {f.file_name}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => del(f.id, f.file_path)} aria-label="حذف"><Trash2 className="text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
