import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "./UserAvatar";
import { SupportThread } from "./SupportThread";

export function SupportAdmin() {
  const [active, setActive] = useState<string | null>(null);
  const { data: threads = [] } = useQuery({
    queryKey: ["support-threads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("student_id,content,created_at,sender_id,profiles!support_messages_student_id_fkey(display_name,avatar_url)")
        .order("created_at", { ascending: false })
        .limit(1000);
      const seen = new Map<string, NonNullable<typeof data>[number]>();
      for (const m of data ?? []) if (!seen.has(m.student_id)) seen.set(m.student_id, m);
      return [...seen.values()];
    },
  });

  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <div className="divide-y rounded-2xl border bg-card shadow-card">
        {threads.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">ما في محادثات بعد</p>}
        {threads.map((t) => (
          <button
            key={t.student_id}
            onClick={() => setActive(t.student_id)}
            className={`flex w-full items-center gap-3 p-3 text-start hover:bg-muted ${active === t.student_id ? "bg-secondary" : ""}`}
          >
            <UserAvatar path={t.profiles?.avatar_url} name={t.profiles?.display_name} className="size-9" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-semibold">
                {t.profiles?.display_name}
                {t.sender_id === t.student_id && <span className="size-2 rounded-full bg-primary" aria-label="بانتظار الرد" />}
              </p>
              <p className="truncate text-xs text-muted-foreground">{t.content}</p>
            </div>
          </button>
        ))}
      </div>
      {active ? (
        <SupportThread key={active} studentId={active} className="h-[60vh]" />
      ) : (
        <div className="grid h-[60vh] place-items-center rounded-2xl border bg-card text-sm text-muted-foreground">اختر محادثة للرد</div>
      )}
    </div>
  );
}
