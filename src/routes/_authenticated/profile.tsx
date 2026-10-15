import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { BRANCHES, type Branch } from "@/lib/branches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/UserAvatar";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "ملفي الشخصي | Darsna Jo" },
      { name: "description", content: "عدّل اسمك وصورتك وفرعك." },
      { property: "og:title", content: "ملفي الشخصي | Darsna Jo" },
      { property: "og:description", content: "عدّل اسمك وصورتك وفرعك." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { user, me } = useMe();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [branch, setBranch] = useState<Branch | "">("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (me?.profile) {
      setName(me.profile.display_name);
      setBranch(me.profile.branch ?? "");
    }
  }, [me?.profile]);

  async function save() {
    if (!user || name.trim().length < 2) { toast.error("الاسم قصير"); return; }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim().slice(0, 40), branch: branch || null })
      .eq("id", user.id);
    setBusy(false);
    if (error) { toast.error("تعذر الحفظ"); return; }
    toast.success("تم الحفظ");
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  async function upload(file: File) {
    if (!user) return;
    if (!file.type.startsWith("image/")) { toast.error("اختر صورة"); return; }
    const path = `${user.id}/${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file);
    if (error) { toast.error("تعذر رفع الصورة (الحد 3MB)"); return; }
    await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
    toast.success("تم تحديث الصورة");
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div className="space-y-6 rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
        <h1 className="text-2xl font-bold">ملفي الشخصي</h1>
        <div className="flex items-center gap-4">
          <UserAvatar path={me?.profile?.avatar_url} name={me?.profile?.display_name} className="size-20" />
          <Label className="cursor-pointer rounded-lg border bg-silver-sheen px-4 py-2 text-sm">
            تغيير الصورة
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </Label>
        </div>
        <div className="space-y-1.5">
          <Label>الاسم</Label>
          <Input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>الفرع</Label>
          <Select dir="rtl" value={branch} onValueChange={(v) => setBranch(v as Branch)}>
            <SelectTrigger><SelectValue placeholder="اختر فرعك" /></SelectTrigger>
            <SelectContent>
              {BRANCHES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={save} disabled={busy} className="w-full bg-brand">حفظ</Button>
      </div>
    </main>
  );
}
