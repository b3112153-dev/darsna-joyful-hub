import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { useMyFocus } from "@/hooks/use-focus";
import { FocusTimer } from "@/components/FocusTimer";
import { ActiveStudents } from "@/components/ActiveStudents";
import { RoomNotes } from "@/components/RoomNotes";

export const Route = createFileRoute("/_authenticated/focus")({
  head: () => ({
    meta: [
      { title: "غرفة التركيز | Darsna Jo" },
      { name: "description", content: "غرفة دراسة صامتة بمؤقت شخصي ونافذتين حسب الحقل." },
      { property: "og:title", content: "غرفة التركيز | Darsna Jo" },
      { property: "og:description", content: "غرفة دراسة صامتة بمؤقت شخصي ونافذتين حسب الحقل." },
    ],
  }),
  component: Focus,
});

function Focus() {
  const { user } = useMe();
  const focus = useMyFocus(user?.id);
  const { data: windows = [] } = useQuery({
    queryKey: ["focus-rooms"],
    queryFn: async () => (await supabase.from("rooms").select("*").eq("kind", "focus").order("created_at")).data ?? [],
  });
  const [picked, setPicked] = useState<string | null>(null);
  const active = picked ?? windows[0]?.id;
  const current = windows.find((w) => w.id === active);

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">غرفة التركيز</h1>
        <p className="text-muted-foreground">غرفة صامتة بدون دردشة — اختار نافذتك، شغّل المؤقت، وشوف مين بدرس معك.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {windows.map((w) => (
          <button
            key={w.id}
            onClick={() => setPicked(w.id)}
            className={`rounded-2xl border p-4 text-start shadow-card transition ${w.id === active ? "border-primary bg-secondary" : "bg-card hover:bg-muted"}`}
          >
            <p className="font-semibold">{w.name}</p>
            <p className="text-xs text-muted-foreground">{w.description}</p>
          </button>
        ))}
      </div>
      {current && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <FocusTimer focus={focus} roomId={current.id} />
            <ActiveStudents roomId={current.id} />
          </div>
          {user && <RoomNotes key={current.id} roomId={current.id} userId={user.id} />}
        </div>
      )}
    </main>
  );
}
