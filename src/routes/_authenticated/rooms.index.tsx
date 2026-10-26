import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessagesSquare, CircleHelp, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lazy, Suspense } from "react";
import { chatAccess, studentChatRooms } from "@/lib/identity";
import { readData, requestSignal } from "@/lib/requests";
import { PageState } from "@/components/PageState";
import { useMe } from "@/hooks/use-auth";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/rooms/")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "غرف الدردشة | Darsna Jo" },
      { name: "description", content: "اختر غرفة فرعك وابدأ النقاش مع زملاءك." },
      { property: "og:title", content: "غرف الدردشة | Darsna Jo" },
      { property: "og:description", content: "اختر غرفة فرعك وابدأ النقاش مع زملاءك." },
    ],
  }),
  component: Rooms,
});

const StaffChats = lazy(() => import("@/components/pages/staff-chats").then((m) => ({ default: m.StaffChats })));
function Rooms() {
  const { user, me, loading, isError: meError, refetch: refetchMe } = useMe();
  const access = chatAccess(me);
  const query = useQuery({
    queryKey: ["rooms", "chat", user?.id], enabled: !!user && !access.staff,
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => await readData(supabase.from("rooms").select("id,generation,audience,kind").eq("kind", "chat").order("created_at").abortSignal(requestSignal(signal))) ?? [],
  });
  if (loading) return <PageState loading />;
  if (meError) return <PageState error retry={() => void refetchMe()} />;
  if (access.staff) return <Suspense fallback={<PageState loading />}><StaffChats /></Suspense>;
  const selected = studentChatRooms(query.data ?? [], me?.profile?.generation, me?.profile?.gender);
  const entries = [
    { title: t("شات"), detail: t(me?.profile?.gender === "female" ? "هذا مخصص للبنات" : "هذا مخصص للشباب"), room: selected.chat, icon: MessagesSquare, tone: "bg-secondary text-secondary-foreground" },
    { title: t("جولة الدراسة"), detail: t("ادرس مع كل طلاب التوجيهي"), room: selected.round, icon: Timer, tone: "bg-staff text-staff-foreground" },
  ];
  return <main className="mx-auto max-w-2xl px-5 py-6 font-display"><h1 className="mb-5 text-[28px] font-extrabold">{t("الدردشات")}</h1><PageState loading={query.isPending} error={query.isError} retry={() => void query.refetch()} /><div className="grid gap-3">
    {entries.map((entry) => {
      const body = <><span className="grid size-14 shrink-0 place-items-center rounded-[18px] bg-card text-card-foreground"><entry.icon className="size-6" /></span><span className="min-w-0"><span className="block text-[17px] font-extrabold">{entry.title}</span><span className="block text-[13px] leading-6 opacity-80">{entry.detail}</span>{query.isSuccess && !entry.room && <span className="block text-xs">{t("غير متاحة")}</span>}</span></>;
      const cls = `grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 rounded-[26px] p-4 ${entry.tone}`;
      return entry.room ? <Link key={entry.title} to="/rooms/$roomId" params={{ roomId: entry.room.id }} className={cls}>{body}</Link> : <div key={entry.title} className={cls}>{body}</div>;
    })}
    <Link to="/support" className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 rounded-[26px] bg-peach p-4 text-peach-foreground"><span className="grid size-14 shrink-0 place-items-center rounded-[18px] bg-card text-card-foreground"><CircleHelp className="size-7" /></span><span><span className="block text-[17px] font-extrabold">{t("الدعم")}</span><span className="block text-[13px] text-muted-foreground">{t("تواصل مع الإدارة")}</span></span></Link>
  </div></main>;
}
