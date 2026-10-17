import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock, MessagesSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BRANCHES, branchLabel } from "@/lib/branches";
import { useMe } from "@/hooks/use-auth";
import { useMyFocus } from "@/hooks/use-focus";
import { isChatLocked } from "@/lib/focus";
import { fmtClock } from "@/components/StudyRounds";

export const Route = createFileRoute("/_authenticated/rooms/")({
  head: () => ({
    meta: [
      { title: "غرف الدردشة | Darsna Jo" },
      {
        name: "description",
        content: "اختر غرفة فرعك وابدأ النقاش مع زملاءك.",
      },
      { property: "og:title", content: "غرف الدردشة | Darsna Jo" },
      {
        property: "og:description",
        content: "اختر غرفة فرعك وابدأ النقاش مع زملاءك.",
      },
    ],
  }),
  component: Rooms,
});

function Rooms() {
  const { user, me } = useMe();
  const focus = useMyFocus(user?.id);
  const locked =
    focus.isLoading || focus.isError || isChatLocked(focus.session, focus.now);
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () =>
      (await supabase.from("rooms").select("*").order("created_at")).data ?? [],
  });
  const mine = me?.profile?.branch;
  const sorted = rooms
    .filter(
      (room) =>
        room.branch === null ||
        BRANCHES.some((branch) => branch.value === room.branch),
    )
    .sort((a, b) => Number(b.branch === mine) - Number(a.branch === mine));
  const groups = [
    {
      title: "الأعمال واللغات",
      description: "غرف منفصلة لطلاب الأعمال واللغات.",
      branches: ["business", "languages"],
    },
    {
      title: "الصحي والهندسي",
      description: "غرف منفصلة لطلاب الصحي والهندسي.",
      branches: ["health", "engineering"],
    },
    {
      title: "مشترك للجميع",
      description: "مساحة مفتوحة لكل طلاب التوجيهي.",
      branches: ["shared"],
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <p className="mb-1 text-sm font-semibold text-primary">مساحة النقاش</p>
        <h1 className="text-3xl font-bold">غرف الدردشة</h1>
        <p className="mt-2 text-muted-foreground">
          {mine
            ? `غرفة فرعك (${branchLabel(mine)}) تظهر بالأول داخل مجموعتها.`
            : "حدد فرعك من ملفك الشخصي لنرتب لك الغرف."}
        </p>
      </div>
      {locked && (
        <div
          role="status"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
              <Lock className="size-5" />
            </span>
            <div>
              <p className="font-semibold">
                {focus.isError
                  ? "تعذر التحقق من جلسة التركيز"
                  : focus.isLoading
                    ? "نتحقق من جلسة التركيز…"
                    : "الدردشة مقفلة أثناء جلستك"}
              </p>
              <p className="text-sm text-muted-foreground">
                {focus.isError
                  ? "الدردشة تظل مقفلة حفاظًا على جلستك. حدّث الصفحة للمحاولة مرة ثانية."
                  : focus.isLoading
                    ? "لحظات ونفتح لك المساحات المتاحة."
                    : `باقي ${fmtClock(focus.left * 1000)} — بتنفتح تلقائيًا عند انتهاء المؤقّت.`}
              </p>
            </div>
          </div>
          {focus.session?.room_id && (
            <Link
              to="/rooms/$roomId"
              params={{ roomId: focus.session.room_id }}
              className="text-sm font-semibold text-primary hover:underline"
            >
              ارجع لغرفة التركيز
            </Link>
          )}
        </div>
      )}
      {isLoading && <p className="text-muted-foreground">جاري التحميل…</p>}
      {!isLoading && sorted.length === 0 && (
        <p className="rounded-2xl border bg-card p-6 text-center text-muted-foreground">
          ما في غرف دردشة جاهزة حاليًا.
        </p>
      )}
      <div className="space-y-8">
        {groups.map((group) => {
          const groupRooms = sorted.filter((room) =>
            group.branches.includes(room.branch ?? "shared"),
          );
          if (!groupRooms.length) return null;
          return (
            <section key={group.title} className="space-y-3">
              <div>
                <h2 className="text-xl font-bold">{group.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {group.description}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groupRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    mine={mine}
                    disabled={locked}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function RoomCard({
  room,
  mine,
  disabled,
}: {
  room: {
    id: string;
    name: string;
    description: string | null;
    branch: string | null;
  };
  mine: string | null | undefined;
  disabled: boolean;
}) {
  const content = (
    <div
      className={`rounded-2xl border bg-card p-5 shadow-card transition ${disabled ? "opacity-60" : "hover:-translate-y-0.5 hover:shadow-soft"} ${room.branch === mine && mine ? "border-primary" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
          <MessagesSquare className="size-5" />
        </span>
        <span className="rounded-full bg-muted px-3 py-0.5 text-xs text-muted-foreground">
          {branchLabel(room.branch)}
        </span>
      </div>
      <h3 className="font-semibold">{room.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{room.description}</p>
      <p className="mt-4 text-sm font-semibold text-primary">
        {disabled ? "مقفلة أثناء المؤقّت" : "افتح الغرفة ←"}
      </p>
    </div>
  );

  if (disabled) {
    return (
      <div aria-disabled="true" className="cursor-not-allowed">
        {content}
      </div>
    );
  }
  return (
    <Link to="/rooms/$roomId" params={{ roomId: room.id }} className="group">
      {content}
    </Link>
  );
}
