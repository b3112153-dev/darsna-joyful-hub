import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { readData } from "@/lib/requests";
import type { CatalogItem } from "@/hooks/use-avatar";
import { Button } from "@/components/ui/button";
import { PageState } from "@/components/PageState";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin_/avatar-art")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("is_owner", { _user_id: context.userId });
    if (!data) throw redirect({ to: "/rooms" });
  },
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "صور الأفتار | Darsna Jo" },
      { name: "description", content: "إدارة صور أغراض الأفتار." },
      { property: "og:title", content: "صور الأفتار | Darsna Jo" },
      { property: "og:description", content: "إدارة صور أغراض الأفتار." },
    ],
  }),
  component: AvatarArtAdmin,
});

const MAX_BYTES = 2 * 1024 * 1024;
const OK_TYPES = ["image/png", "image/jpeg", "image/webp"];

type Slot = { key: string; label: string };

function AvatarArtAdmin() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const catalog = useQuery({
    queryKey: ["avatar-catalog-all"],
    staleTime: 10 * 60_000,
    queryFn: async () => ((await readData(supabase.from("avatar_catalog").select("*").order("sort"))) ?? []) as CatalogItem[],
  });
  const images = useQuery({
    queryKey: ["avatar-images"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const rows = (await readData(supabase.from("avatar_images").select("*"))) ?? [];
      const map: Record<string, string> = {};
      for (const r of rows) map[r.key] = r.url;
      return map;
    },
  });

  const slots: { item: CatalogItem; slot: Slot }[] = [];
  for (const it of catalog.data ?? []) {
    slots.push({ item: it, slot: { key: it.id, label: it.name_ar } });
    // The six base outfits have per-gender art.
    if (it.category === "outfit" && it.sort <= 6) {
      slots.push({ item: it, slot: { key: `${it.id}:female`, label: `${it.name_ar} (بنات)` } });
      slots.push({ item: it, slot: { key: `${it.id}:male`, label: `${it.name_ar} (أولاد)` } });
    }
  }

  async function upload(key: string, file: File) {
    if (!OK_TYPES.includes(file.type)) { toast.error(t("الصيغ المسموحة: png / jpg / webp")); return; }
    if (file.size > MAX_BYTES) { toast.error(t("الحد الأقصى ٢MB")); return; }
    setBusy(key);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${key.replace(":", "-")}-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("avatar-art").upload(path, file, { upsert: true });
    if (up.error) { toast.error(t("تعذر رفع الصورة")); setBusy(null); return; }
    const url = supabase.storage.from("avatar-art").getPublicUrl(path).data.publicUrl;
    const { error } = await supabase.from("avatar_images").upsert({ key, url });
    setBusy(null);
    if (error) { toast.error(t("تعذر حفظ الرابط")); return; }
    toast.success(t("تم حفظ الصورة"));
    qc.invalidateQueries({ queryKey: ["avatar-images"] });
  }

  async function remove(key: string, url: string | undefined) {
    setBusy(key);
    if (url) {
      const marker = "/object/public/avatar-art/";
      const i = url.indexOf(marker);
      if (i >= 0) await supabase.storage.from("avatar-art").remove([url.slice(i + marker.length)]);
    }
    const { error } = await supabase.from("avatar_images").delete().eq("key", key);
    setBusy(null);
    if (error) { toast.error(t("تعذر الحذف")); return; }
    toast.success(t("انحذفت الصورة"));
    qc.invalidateQueries({ queryKey: ["avatar-images"] });
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Button asChild size="icon" variant="ghost" aria-label={t("رجوع")}><Link to="/admin"><ArrowRight /></Link></Button>
        <h1 className="text-2xl font-bold">{t("صور الأفتار")}</h1>
      </div>
      {catalog.isLoading && <PageState loading />}
      {catalog.isError && <PageState error retry={() => catalog.refetch()} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map(({ item, slot }) => {
          const url = images.data?.[slot.key];
          return (
            <div key={slot.key} className="flex items-center gap-3 rounded-[20px] border bg-card p-3 shadow-card">
              <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-tint">
                {url ? <img src={url} alt={slot.label} className="h-full w-full object-contain" /> : <span className="text-[10px] text-muted-foreground">{t("بدون صورة")}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{slot.label}</p>
                <p className="truncate text-xs text-muted-foreground" dir="ltr">{slot.key}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold">
                  <Upload className="size-3.5" /> {busy === slot.key ? "…" : "رفع"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={busy === slot.key}
                    onChange={(e) => e.target.files?.[0] && upload(slot.key, e.target.files[0])}
                  />
                </label>
                {url && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" disabled={busy === slot.key} onClick={() => remove(slot.key, url)}>
                    <Trash2 className="size-3.5" /> {t("حذف")}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
