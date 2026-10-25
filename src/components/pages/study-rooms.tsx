import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, CloudRain, Coffee, Flame, Plus, Trees, Waves } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { useAvatarImages } from "@/hooks/use-avatar";
import { AvatarPic } from "@/components/AvatarPic";
import { PageState } from "@/components/PageState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AvatarState } from "@/hooks/use-wallet";
import { useLang, t } from "@/lib/i18n";

export const SCENES = [
  { id: "library", label: "مكتبة", icon: BookOpen, card: "bg-secondary", page: "bg-secondary" },
  { id: "cafe", label: "مقهى", icon: Coffee, card: "bg-peach text-peach-foreground", page: "bg-peach" },
  { id: "forest", label: "غابة", icon: Trees, card: "bg-secondary", page: "bg-secondary" },
  { id: "rain", label: "مطر", icon: CloudRain, card: "bg-card", page: "bg-card" },
  { id: "sea", label: "بحر", icon: Waves, card: "bg-card", page: "bg-card" },
  { id: "desert", label: "صحراء", icon: Flame, card: "bg-staff text-staff-foreground", page: "bg-staff" },
] as const;

export type SceneId = (typeof SCENES)[number]["id"];
export const sceneOf = (scene: string | null | undefined) => SCENES.find((s) => s.id === scene) ?? SCENES[0];

export type StudyRoom = { id: string; name: string; scene: string | null; max_members: number | null; created_by: string | null };
export type Presence = { user_id: string; status: string; subject: string; profiles: { nickname: string | null; avatar: AvatarState | null; gender: string | null } | null };

export function useRoomPresence(roomIds: string[]) {
  const qc = useQueryClient();
  const idsKey = roomIds.join(",");
  const query = useQuery({
    queryKey: ["study-presence", idsKey],
    enabled: roomIds.length > 0,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("focus_sessions")
        .select("user_id,status,subject,room_id,profiles(nickname,avatar,gender)")
        .in("room_id", roomIds)
        .in("status", ["running", "paused"]);
      const now = Date.now();
      return ((data ?? []) as unknown as (Presence & { room_id: string; ends_at?: string | null })[])
        .filter((s) => s.status === "paused" || !s.ends_at || new Date(s.ends_at).getTime() > now);
    },
  });
  useEffect(() => {
    if (!roomIds.length) return;
    const ch = supabase
      .channel(`study-presence-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "focus_sessions" }, () =>
        qc.invalidateQueries({ queryKey: ["study-presence"] }),
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [idsKey, qc]);
  return query;
}

export function AvatarChip({ presence, images, size = "size-10" }: { presence: Presence; images: Record<string, string>; size?: string }) {
  return (
    <div className="flex w-14 flex-col items-center gap-1">
      <AvatarPic profile={presence.profiles} images={images} animate={presence.status === "running"} className={size} />
      <span className="w-full truncate text-center text-[10px] font-bold">{presence.profiles?.nickname ?? t("طالب")}</span>
      <span className={`rounded-full px-1.5 py-px text-[9px] font-semibold ${presence.status === "paused" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
        {presence.status === "paused" ? t("استراحة") : "يدرس"}
      </span>
    </div>
  );
}

export function StudyRooms() {
  const { lang } = useLang();
  const { user } = useMe();
  const navigate = useNavigate();
  const images = useAvatarImages();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scene, setScene] = useState<SceneId>("library");
  const [creating, setCreating] = useState(false);

  const roomsQuery = useQuery({
    queryKey: ["study-rooms", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("id,name,scene,max_members,created_by").eq("kind", "focus").not("scene", "is", null).order("created_at");
      if (error) throw error;
      return (data ?? []) as StudyRoom[];
    },
  });
  const rooms = useMemo(() => roomsQuery.data ?? [], [roomsQuery.data]);
  const presenceQuery = useRoomPresence(rooms.map((r) => r.id));
  const presence = presenceQuery.data ?? [];

  async function create() {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 30 || creating) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc("create_study_room", { _name: trimmed, _scene: scene });
      if (error) throw error;
      setOpen(false);
      setName("");
      navigate({ to: "/study-rooms/$roomId", params: { roomId: String(data) } });
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "تعذر إنشاء الروم؛ حاول مرة ثانية.");
    } finally { setCreating(false); }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 font-display">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold">{t("رومات الدراسة")}</h1>
          <p className="text-sm text-muted-foreground">{t("ادرس مع رفقاتك بنفس المشهد — بدون دردشة، بس تركيز")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="rounded-[14px]"><Plus className="size-4" /> {t("روم جديد")}</Button></DialogTrigger>
          <DialogContent dir={lang === "ar" ? "rtl" : "ltr"} className="font-display">
            <DialogHeader><DialogTitle>{t("روم دراسة جديد")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="room-name">{t("الاسم (2–30 حرف)")}</Label>
                <Input id="room-name" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("مثلاً: Study Room الفجر")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("المشهد")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {SCENES.map((s) => (
                    <button key={s.id} type="button" onClick={() => setScene(s.id)}
                      className={`flex flex-col items-center gap-1.5 rounded-[16px] border-2 p-3 text-xs font-bold transition ${scene === s.id ? "border-primary bg-secondary" : "border-border bg-card"}`}>
                      <s.icon className="size-5" /> {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full" disabled={creating || name.trim().length < 2} onClick={() => void create()}>
                {creating ? t("جاري الإنشاء…") : "إنشاء ودخول"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <PageState loading={roomsQuery.isPending} error={roomsQuery.isError} retry={() => void roomsQuery.refetch()} />
      <div className="grid gap-3">
        {rooms.map((room) => {
          const meta = sceneOf(room.scene);
          const members = presence.filter((p) => (p as Presence & { room_id: string }).room_id === room.id);
          const max = room.max_members ?? 8;
          return (
            <Link key={room.id} to="/study-rooms/$roomId" params={{ roomId: room.id }}
              className={`grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 rounded-[26px] p-4 transition hover:shadow-soft ${meta.card}`}>
              <span className="grid size-14 shrink-0 place-items-center rounded-[18px] bg-card text-card-foreground"><meta.icon className="size-7" /></span>
              <div className="min-w-0">
                <h2 className="truncate text-[17px] font-extrabold">{room.name}</h2>
                <p className="text-[13px] font-semibold text-muted-foreground">{meta.label} · {members.length}/{max} بدرسوا هلأ</p>
                {members.length > 0 && images.data && (
                  <div className="mt-1.5 flex gap-1 overflow-hidden">
                    {members.slice(0, 6).map((p) => (
                      <AvatarPic key={p.user_id} profile={p.profiles} images={images.data} className="size-7" />
                    ))}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
        {roomsQuery.isSuccess && rooms.length === 0 && (
          <p className="rounded-[22px] border-2 border-dashed p-6 text-center text-sm text-muted-foreground">{t("ما في رومات دراسة متاحة إلك حالياً — جرّب تنشئ واحد!")}</p>
        )}
      </div>
    </main>
  );
}
