import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Crown, Footprints, Gem, Glasses, Layers, PawPrint, Scissors, Shirt, Sparkles, Trophy, Watch, Wand2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { parseWallet, useWallet, type AvatarState, type Wallet } from "@/hooks/use-wallet";
import { imageFor, useAvatarCatalog, useAvatarImages, type CatalogItem } from "@/hooks/use-avatar";
import { itemState } from "@/lib/avatar-shop";
import { BRANCHES, type Branch } from "@/lib/branches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { invalidateIdentity } from "@/components/ProfileSync";
import { AvatarPic } from "@/components/AvatarPic";
import { AvatarPreview } from "@/components/AvatarPreview";
import { WalletChip } from "@/components/WalletChip";
import { PageState } from "@/components/PageState";
import { cn } from "@/lib/utils";
import { useLang, t } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "ملفي | Darsna Jo" },
      { name: "description", content: "أفتارك ومصاريكك ومستواك وإعداداتك." },
      { property: "og:title", content: "ملفي | Darsna Jo" },
      { property: "og:description", content: "أفتارك ومصاريكك ومستواك وإعداداتك." },
    ],
  }),
  component: Profile,
});

const HAIR_COLORS = ["#2b1b12", "#4a2c1a", "#7a4a2b", "#aa5533", "#c98a4b", "#8c0610", "#5b3a8e", "#1f3a5f"];

const CATEGORY_ICON: Record<string, typeof Shirt> = {
  outfit: Shirt, hair: Scissors, clothes: Layers, traditional: Crown, shoes: Footprints,
  accessory: Gem, glasses: Glasses, watch: Watch, pet: PawPrint, royal_pet: Crown, effect: Wand2,
};

const TABS: { id: string; label: string; cats: string[] }[] = [
  { id: "outfit", label: "الأزياء", cats: ["outfit"] },
  { id: "hair", label: "الشعر", cats: ["hair"] },
  { id: "clothes", label: "الملابس", cats: ["clothes", "traditional"] },
  { id: "shoes", label: "الأحذية", cats: ["shoes"] },
  { id: "accessory", label: "الإكسسوار", cats: ["accessory", "glasses", "watch"] },
  { id: "pets", label: "الحيوانات", cats: ["pet", "royal_pet"] },
  { id: "effects", label: "التأثيرات", cats: ["effect"] },
];

function Profile() {
  const { user, me } = useMe();
  const wallet = useWallet(user?.id);
  const gender = me?.profile?.gender ?? null;

  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("ملفي")}</h1>
        <WalletChip userId={user?.id} />
      </div>
      {wallet.isLoading && <PageState loading />}
      {wallet.isError && <PageState error retry={() => wallet.refetch()} />}
      {wallet.data && user && (
        <>
          <LevelCard wallet={wallet.data} />
          <AvatarCard wallet={wallet.data} gender={gender} userId={user.id} />
          <Button asChild variant="outline" className="w-full">
            <Link to="/board"><Trophy /> {t("لوحة الأسبوع")}</Link>
          </Button>
          <AccountCard />
        </>
      )}
    </main>
  );
}

function LevelCard({ wallet }: { wallet: Wallet }) {
  const into = Math.max(0, wallet.hours - (wallet.level - 1) * 5);
  const remaining = Math.max(0, 5 - into);
  return (
    <section className="rounded-[20px] border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <p className="font-display text-lg font-extrabold">Level {wallet.level}</p>
        <p className="text-sm text-muted-foreground">{wallet.hours} ساعة دراسة</p>
      </div>
      <Progress dir="ltr" value={Math.min(100, (into / 5) * 100)} className="mt-3 h-2.5" />
      <p className="mt-2 text-xs text-muted-foreground">{remaining.toFixed(1)} ساعات للمستوى التالي</p>
    </section>
  );
}

function AvatarCard({ wallet, gender, userId }: { wallet: Wallet; gender: string | null; userId: string }) {
  const qc = useQueryClient();
  const images = useAvatarImages();
  const catalog = useAvatarCatalog();
  const [tab, setTab] = useState("outfit");
  const [nickOpen, setNickOpen] = useState(false);
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const key = ["wallet", userId];

  // Mandatory nickname on first visit.
  useEffect(() => {
    if (!wallet.nickname) setNickOpen(true);
  }, [wallet.nickname]);

  const items = useMemo(() => {
    const cats = TABS.find((t) => t.id === tab)?.cats ?? [];
    return (catalog.data ?? []).filter(
      (it) => cats.includes(it.category) && (it.gender === "all" || it.gender === gender),
    );
  }, [catalog.data, tab, gender]);

  function setCache(next: Partial<Wallet>) {
    qc.setQueryData<Wallet>(key, (old) => (old ? { ...old, ...next } : old));
  }

  async function saveAvatar(next: AvatarState, optimistic = true) {
    const prev = wallet.avatar;
    if (optimistic) setCache({ avatar: next });
    const { data, error } = await supabase.rpc("set_avatar", { _a: next });
    if (error) {
      if (optimistic) setCache({ avatar: prev });
      toast.error(error.message);
      return false;
    }
    setCache({ avatar: (data as AvatarState) ?? next });
    await invalidateIdentity(qc);
    return true;
  }

  async function wear(it: CatalogItem) {
    if (busy) return;
    setBusy(it.id);
    await saveAvatar({ ...wallet.avatar, [it.category]: it.id });
    setBusy(null);
  }

  async function unwear(it: CatalogItem) {
    if (busy || it.category === "outfit") return;
    setBusy(it.id);
    const next = { ...wallet.avatar };
    delete next[it.category];
    await saveAvatar(next);
    setBusy(null);
  }

  async function buy(it: CatalogItem) {
    if (busy) return;
    setBusy(it.id);
    const { data, error } = await supabase.rpc("buy_item", { _item: it.id });
    if (error) { toast.error(error.message); setBusy(null); return; }
    setCache(parseWallet(data));
    await saveAvatar({ ...parseWallet(data).avatar, [it.category]: it.id }, false);
    toast.success(t("مبروك! صار عندك ") + it.name_ar);
    setBusy(null);
  }

  async function setHairColor(color: string) {
    if (busy) return;
    setBusy("hairColor");
    await saveAvatar({ ...wallet.avatar, hairColor: color });
    setBusy(null);
  }

  const worn = wallet.avatar;
  return (
    <section className="rounded-[20px] border bg-card p-4 shadow-card">
      <div className="mx-auto max-w-[240px] rounded-[20px] bg-secondary/60 p-4">
        <AvatarPreview
          avatar={worn}
          images={images.data ?? {}}
          gender={gender}
          nickname={wallet.nickname ?? undefined}
          className="mx-auto aspect-square w-full max-w-[200px]"
        />
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2 text-center">
        <Button variant="secondary" size="sm" onClick={() => { setWardrobeOpen(true); requestAnimationFrame(() => document.getElementById("avatar-wardrobe")?.scrollIntoView({ behavior: "smooth", block: "start" })); }}>{t("غيّر الصورة")}</Button>
        <Button variant="outline" size="sm" onClick={() => setNickOpen(true)}>{t("سمّي أفتارك")}</Button>
        <p className="mt-1.5 text-xs text-muted-foreground">{t("تقدر تغيّره مرة كل 40 يوم")}</p>
      </div>

      <div id="avatar-wardrobe" className={wardrobeOpen ? "scroll-mt-20 ring-1 ring-primary rounded-2xl p-2" : "scroll-mt-20"}>
      {gender === "female" && (
        <div className="mt-4 rounded-2xl bg-secondary/50 p-3">
          <p className="mb-2 text-sm font-bold">{t("لون الشعر")}</p>
          <div className="flex flex-wrap items-center gap-2">
            {HAIR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setHairColor(c)}
                disabled={busy === "hairColor"}
                className={cn("size-8 rounded-full border-2 transition", worn["hairColor"] === c ? "border-primary scale-110" : "border-card")}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              aria-label={t("لون مخصص")}
              value={worn["hairColor"] ?? "#aa5533"}
              onChange={(e) => setHairColor(e.target.value)}
              className="size-8 cursor-pointer rounded-full border-2 border-card bg-transparent"
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-1.5 overflow-x-auto rounded-2xl bg-library-tabs p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-xl px-3 py-1.5 text-sm font-semibold transition",
              tab === t.id ? "bg-card font-extrabold shadow-card" : "text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {catalog.isLoading && <PageState loading />}
      {catalog.isError && <PageState error retry={() => catalog.refetch()} />}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {items.map((it) => {
          const state = itemState(it, wallet);
          const isWorn = state === "worn";
          const owned = state === "wear";
          const levelOk = state !== "locked";
          const canAfford = state === "buy" || owned;
          const url = imageFor(images.data ?? {}, it.id, it.category, gender);
          const Icon = CATEGORY_ICON[it.category] ?? Sparkles;
          return (
            <div key={it.id} className="flex flex-col rounded-2xl border bg-card p-2.5">
              <div className="grid aspect-square place-items-center overflow-hidden rounded-xl bg-tint">
                {url ? <img src={url} alt={it.name_ar} loading="lazy" className="h-full w-full object-contain" /> : <Icon className="size-10 text-primary" />}
              </div>
              <p className="mt-2 truncate text-sm font-bold">{it.name_ar}</p>
              <p className="text-xs text-muted-foreground">Level {it.level_req} · {it.price === 0 ? "مجاني" : `${it.price} JD`}</p>
              {isWorn ? (
                <Button size="sm" variant="secondary" className="mt-2" disabled={busy === it.id || it.category === "outfit"} onClick={() => unwear(it)}>
                  لابسته{it.category !== "outfit" && t(" — اخلعه")}
                </Button>
              ) : owned ? (
                <Button size="sm" className="mt-2 bg-brand" disabled={busy === it.id} onClick={() => wear(it)}>{t("ألبس")}</Button>
              ) : !levelOk ? (
                <Button size="sm" variant="outline" className="mt-2" disabled>Level {it.level_req}</Button>
              ) : !canAfford ? (
                <Button size="sm" variant="outline" className="mt-2" disabled>{t("رصيدك ما يكفي")}</Button>
              ) : (
                <Button size="sm" className="mt-2 bg-brand" disabled={busy === it.id} onClick={() => buy(it)}>اشتري بـ {it.price} JD</Button>
              )}
            </div>
          );
        })}
      </div>
      {catalog.data && items.length === 0 && <p className="mt-3 text-center text-sm text-muted-foreground">{t("ما في أغراض بهالقسم بعد")}</p>}
      </div>

      <NicknameDialog
        open={nickOpen}
        mandatory={!wallet.nickname}
        onOpenChange={(o) => (wallet.nickname ? setNickOpen(o) : undefined)}
        onSaved={(n) => { setCache({ nickname: n }); setNickOpen(false); void invalidateIdentity(qc); }}
      />
    </section>
  );
}

function NicknameDialog({ open, mandatory, onOpenChange, onSaved }: {
  open: boolean; mandatory: boolean; onOpenChange: (o: boolean) => void; onSaved: (n: string) => void;
}) {
  const { lang } = useLang();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    const n = name.trim();
    if (n.length < 2 || n.length > 16) { toast.error(t("الاسم من 2 إلى 16 حرف")); return; }
    setBusy(true);
    const { error } = await supabase.rpc("set_nickname", { _n: n });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("تم حفظ الاسم"));
    onSaved(n);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={lang === "ar" ? "rtl" : "ltr"} className={mandatory ? "[&>button:last-child]:hidden" : undefined} onInteractOutside={(e) => mandatory && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("سمّي أفتارك")}</DialogTitle>
          <DialogDescription>{t("هاد الاسم بيظهر فوق الأفتار وبالمسابقات. تقدر تغيّره مرة كل 40 يوم (حد أقصى 16 حرف).")}</DialogDescription>
        </DialogHeader>
        <Input value={name} maxLength={16} placeholder={t("اسمك المستعار")} onChange={(e) => setName(e.target.value)} />
        <Button onClick={save} disabled={busy} className="bg-brand">{t("حفظ")}</Button>
      </DialogContent>
    </Dialog>
  );
}

function AccountCard() {
  const { lang } = useLang();
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
    if (!user || name.trim().length < 2) { toast.error(t("الاسم قصير")); return; }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim().slice(0, 40), branch: branch || null })
      .eq("id", user.id);
    setBusy(false);
    if (error) { toast.error(t("تعذر الحفظ")); return; }
    toast.success(t("تم الحفظ"));
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  async function upload(file: File) {
    if (!user) return;
    if (!file.type.startsWith("image/")) { toast.error(t("اختر صورة")); return; }
    const path = `${user.id}/${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file);
    if (error) { toast.error(t("تعذر رفع الصورة (الحد 3MB)")); return; }
    await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
    toast.success(t("تم تحديث الصورة"));
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  return (
    <section className="space-y-6 rounded-[20px] border bg-card p-6 shadow-card">
      <h2 className="text-lg font-bold">{t("إعدادات الحساب")}</h2>
      <div className="flex items-center gap-4">
        <AvatarPic profile={me?.profile} className="size-20" />
        <Label className="cursor-pointer rounded-lg border bg-silver-sheen px-4 py-2 text-sm">
          {t("تغيير الصورة")}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </Label>
      </div>
      <div className="space-y-1.5">
        <Label>{t("الاسم")}</Label>
        <Input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>{t("الفرع")}</Label>
        <Select dir={lang === "ar" ? "rtl" : "ltr"} value={branch} onValueChange={(v) => setBranch(v as Branch)}>
          <SelectTrigger><SelectValue placeholder={t("اختر فرعك")} /></SelectTrigger>
          <SelectContent>
            {BRANCHES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={save} disabled={busy} className="w-full bg-brand">{t("حفظ")}</Button>
    </section>
  );
}
