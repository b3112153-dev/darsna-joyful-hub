import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowRight, DoorOpen, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { useMyFocus } from "@/hooks/use-focus";
import { useAvatarImages } from "@/hooks/use-avatar";
import { PageState, Unavailable } from "@/components/PageState";
import { Button } from "@/components/ui/button";
import { FocusTimer } from "@/components/FocusTimer";
import { AvatarChip, sceneOf, useRoomPresence, type StudyRoom } from "@/components/pages/study-rooms";
import { t } from "@/lib/i18n";

export function StudyRoom() {
  const { roomId } = useParams({ from: "/_authenticated/study-rooms/$roomId" });
  const { user } = useMe();
  const navigate = useNavigate();
  const focus = useMyFocus(user?.id);
  const images = useAvatarImages();

  const roomQuery = useQuery({
    queryKey: ["study-room", roomId],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("id,name,scene,max_members,created_by").eq("id", roomId).maybeSingle();
      if (error) throw error;
      return data as StudyRoom | null;
    },
  });
  const room = roomQuery.data;
  const presenceQuery = useRoomPresence(room ? [roomId] : []);
  const members = useMemo(
    () => (presenceQuery.data ?? []).filter((p) => (p as { room_id: string }).room_id === roomId),
    [presenceQuery.data, roomId],
  );
  const max = room?.max_members ?? 8;
  const iAmIn = !!user && members.some((p) => p.user_id === user.id);
  const full = members.length >= max && !iAmIn;
  const isOwner = !!user && room?.created_by === user.id;
  const meta = sceneOf(room?.scene);

  async function closeRoom() {
    const { error } = await supabase.rpc("close_study_room", { _id: roomId });
    if (error) toast.error(error.message || t("تعذر إغلاق الروم."));
    else { toast.success(t("انغلق الروم")); navigate({ to: "/study-rooms" }); }
  }

  if (roomQuery.isPending) return <PageState loading />;
  if (roomQuery.isError) return <PageState error retry={() => void roomQuery.refetch()} />;
  if (roomQuery.isSuccess && room === null) return <Unavailable kind={t("الروم")} />;

  return (
    <main className={`min-h-[calc(100dvh-136px)] font-display lg:min-h-[calc(100dvh-4rem)] ${meta.page}`}>
      <div className="mx-auto max-w-[480px] space-y-4 px-5 py-5">
        <div className="flex items-center gap-3">
          <Link to="/study-rooms" aria-label={t("مغادرة الروم")} className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-card text-card-foreground"><ArrowRight className="size-5" /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold">{room?.name}</h1>
            <p className="flex items-center gap-1 text-[13px] font-semibold text-muted-foreground"><meta.icon className="size-4" /> {meta.label} · {members.length}/{max}</p>
          </div>
          {isOwner && (
            <Button size="sm" variant="outline" className="bg-card text-destructive" onClick={() => void closeRoom()}><XCircle className="size-4" /> {t("إغلاق الروم")}</Button>
          )}
        </div>

        <section className="rounded-[26px] border bg-card/80 p-4 shadow-card" aria-label={t("المتواجدون بالروم")}>
          <h2 className="mb-3 text-sm font-extrabold">بدرسوا معك ({members.length})</h2>
          {members.length === 0 && <p className="py-3 text-center text-sm text-muted-foreground">{t("ما حدا هون بعد — ابدأ جلستك وخلّي رفقاتك يلحقوك.")}</p>}
          <div className="flex flex-wrap justify-center gap-3">
            {members.map((p) => <AvatarChip key={p.user_id} presence={p} images={images.data ?? {}} />)}
          </div>
        </section>

        {full ? (
          <section className="space-y-3 rounded-[26px] border bg-card p-6 text-center shadow-card">
            <p className="font-extrabold">الروم ممتلئ ({max} طلاب)</p>
            <p className="text-sm text-muted-foreground">{t("جرّب روم ثاني أو ارجع بعد شوي.")}</p>
            <Button asChild variant="outline"><Link to="/study-rooms"><DoorOpen className="size-4" /> {t("رومات الدراسة")}</Link></Button>
          </section>
        ) : (
          <FocusTimer focus={focus} roomId={roomId} />
        )}

        <Button variant="ghost" className="w-full" onClick={() => navigate({ to: "/study-rooms" })}><DoorOpen className="size-4" /> {t("مغادرة")}</Button>
      </div>
    </main>
  );
}
