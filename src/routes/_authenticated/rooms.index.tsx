import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessagesSquare, CircleHelp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { branchLabel } from "@/lib/branches";
import { readData, requestSignal } from "@/lib/requests";
import { PageState } from "@/components/PageState";
import { useMe } from "@/hooks/use-auth";

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

function Rooms() {
  const { user, me } = useMe();
  const { data: rooms = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["rooms", "chat", user?.id],
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => await readData(supabase.from("rooms").select("*").eq("kind", "chat").order("created_at").abortSignal(requestSignal(signal))) ?? [],
  });
  const mine = me?.profile?.branch;
  const sorted = [...rooms].sort((a, b) => Number(b.branch === mine) - Number(a.branch === mine));

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 font-display">
      <h1 className="mb-1 text-[28px] font-extrabold">الدردشات</h1>
      <p className="mb-5 text-sm leading-7 text-muted-foreground">غرفتك والجولة المشتركة والدعم، كلها هون</p>
      <PageState loading={isLoading} error={isError} retry={() => void refetch()} />
      <div className="grid gap-3">
        {sorted.map((r) => (
          <Link
            key={r.id}
            to="/rooms/$roomId"
            params={{ roomId: r.id }}
            className="group grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 rounded-[26px] bg-secondary p-4 text-secondary-foreground transition hover:shadow-soft"
          >
              <span className="grid size-14 shrink-0 place-items-center rounded-[18px] bg-card text-lg font-extrabold text-card-foreground">
                {r.generation === "gen2009" ? "٢٠٠٩" : r.generation === "gen2010" ? "٢٠١٠" : <MessagesSquare className="size-6" />}
              </span>
            <div className="min-w-0"><h2 className="truncate text-[17px] font-extrabold">{r.name}</h2><p className="text-[13px] font-semibold leading-6 text-muted-foreground">{r.description}</p>{r.branch && <p className="truncate text-sm text-muted-foreground">{branchLabel(r.branch)}</p>}</div>
          </Link>
        ))}
        <Link to="/support" className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 rounded-[26px] bg-peach p-4 text-peach-foreground"><span className="grid size-14 shrink-0 place-items-center rounded-[18px] bg-card text-card-foreground"><CircleHelp className="size-7" /></span><div className="min-w-0"><h2 className="text-[17px] font-extrabold">الدعم</h2><p className="text-[13px] font-semibold text-muted-foreground">تواصل مع الإدارة</p></div></Link>
        {!isLoading && !isError && !me?.isStaff && !me?.isOwner && rooms.length === 1 && rooms.every((r) => r.audience === me?.profile?.gender && r.generation === me?.profile?.generation) && <p className="rounded-[22px] border-2 border-dashed p-4 text-sm leading-7 text-muted-foreground">بتشوف بس غرفتك. غرف الجيل والجنس التانيين مخفية عنك.</p>}
      </div>
    </main>
  );
}
