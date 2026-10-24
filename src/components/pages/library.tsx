import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BRANCHES, branchLabel } from "@/lib/branches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const formatSize = (n: number | null) =>
  !n ? "" : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`;

export function Library() {
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("all");
  const [subject, setSubject] = useState("all");
  const { data: files = [], isLoading } = useQuery({
    queryKey: ["library"],
    queryFn: async () =>
      (await supabase.from("library_files").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const subjects = useMemo(() => [...new Set(files.map((f) => f.subject))].sort(), [files]);
  const list = files.filter(
    (f) =>
      (branch === "all" || (branch === "shared" ? !f.branch : f.branch === branch)) &&
      (subject === "all" || f.subject === subject) &&
      (!q || f.title.includes(q) || f.subject.includes(q)),
  );

  async function download(path: string, name: string) {
    const { data, error } = await supabase.storage.from("library").createSignedUrl(path, 60, { download: name });
    if (error || !data) {
      toast.error("تعذر التنزيل");
      return;
    }
    window.location.href = data.signedUrl;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-bold">المكتبة</h1>
      <p className="mb-6 text-muted-foreground">ملخصات ومراجعات وأوراق عمل، ابحث ونزّل اللي بدك إياه.</p>
      <div className="mb-6 grid gap-3 rounded-2xl border bg-card p-4 shadow-card sm:grid-cols-[1fr_200px_200px]">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="ابحث بالعنوان أو المادة…" value={q} onChange={(e) => setQ(e.target.value)} className="ps-9" />
        </div>
        <Select dir="rtl" value={branch} onValueChange={setBranch}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الفروع</SelectItem>
            {BRANCHES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
            <SelectItem value="shared">مشترك</SelectItem>
          </SelectContent>
        </Select>
        <Select dir="rtl" value={subject} onValueChange={setSubject}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المواد</SelectItem>
            {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {isLoading && <p className="text-muted-foreground">جاري التحميل…</p>}
      {!isLoading && list.length === 0 && <p className="py-10 text-center text-muted-foreground">ما في ملفات مطابقة.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((f) => (
          <div key={f.id} className="flex flex-col rounded-2xl border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><FileText className="size-5" /></span>
              <div className="min-w-0">
                <h2 className="font-semibold break-words">{f.title}</h2>
                <p className="text-xs text-muted-foreground">{f.subject} · {branchLabel(f.branch)}</p>
              </div>
            </div>
            <div className="mt-auto flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">{formatSize(f.file_size)}</span>
              <Button size="sm" className="bg-brand" onClick={() => download(f.file_path, f.file_name)}>
                <Download /> تنزيل
              </Button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
