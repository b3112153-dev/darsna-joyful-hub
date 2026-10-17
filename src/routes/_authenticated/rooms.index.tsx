import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessagesSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { branchLabel } from "@/lib/branches";
import { useMe } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/rooms/")({
  head: () => ({
    meta: [
      { title: "غرف الدردشة | Darsna Jo" },
      { name: "description", content: "اختر غرفة فرعك وابدأ النقاش مع زملاءك." },
      { property: "og:title", content: "غرف الدردشة | Darsna Jo" },
      { property: "og:description", content: "اختر غرفة فرعك وابدأ النقاش مع زملاءك." },
    ],
  }),
  component: Rooms,
});

function Rooms() {
  const { me } = useMe();
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => (await supabase.from("rooms").select("*").eq("kind", "chat").order("created_at")).data ?? [],
  });
  const mine = me?.profile?.branch;
  const sorted = [...rooms].sort((a, b) => Number(b.branch === mine) - Number(a.branch === mine));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-bold">غرف الدردشة</h1>
      <p className="mb-6 text-muted-foreground">
        {mine ? `غرفة فرعك (${branchLabel(mine)}) بالأول.` : "حدد فرعك من ملفك الشخصي لنرتب لك الغرف."}
      </p>
      {isLoading && <p className="text-muted-foreground">جاري التحميل…</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((r) => (
          <Link
            key={r.id}
            to="/rooms/$roomId"
            params={{ roomId: r.id }}
            className={`group rounded-2xl border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft ${r.branch === mine && mine ? "border-primary" : ""}`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                <MessagesSquare className="size-5" />
              </span>
              <span className="rounded-full bg-muted px-3 py-0.5 text-xs text-muted-foreground">{branchLabel(r.branch)}</span>
            </div>
            <h2 className="font-semibold group-hover:text-primary">{r.name}</h2>
            <p className="text-sm text-muted-foreground">{r.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
