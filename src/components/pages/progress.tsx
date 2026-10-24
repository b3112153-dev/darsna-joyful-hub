import { PageState, Unavailable } from "@/components/PageState";
import { readData } from "@/lib/requests";
import { useQuery } from "@tanstack/react-query";
import { Flame, Clock, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { hoursLabel, summarize } from "@/lib/focus";

export function Progress() {
  const { user } = useMe();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error("سجّل دخولك أولاً");
      const since = new Date(Date.now() - 120 * 86400000).toISOString();
      const data = await readData(supabase
        .from("focus_sessions")
        .select("subject,studied_seconds,started_at")
        .eq("user_id", user.id)
        .in("status", ["completed", "cancelled"])
        .gte("started_at", since));
      return summarize(data ?? []);
    },
  });
  if (isError) return <PageState error retry={() => void refetch()} />;
  if (isLoading || !data) return <main className="mx-auto max-w-4xl px-4 py-8 text-muted-foreground">جاري التحميل…</main>;
  const max = Math.max(...data.week.map((d) => d.seconds), 1);
  const maxSub = data.subjects[0]?.seconds ?? 1;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <h1 className="text-3xl font-bold">تقدمي</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Flame} label="أيام متتالية" value={`${data.streak} يوم`} />
        <Stat icon={CalendarDays} label="هالأسبوع" value={hoursLabel(data.weekTotal)} />
        <Stat icon={Clock} label="المجموع" value={hoursLabel(data.total)} />
      </div>
      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="mb-4 font-semibold">آخر 7 أيام</h2>
        <div className="flex h-40 items-end gap-2">
          {data.week.map((d) => (
            <div key={d.date.toISOString()} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-muted-foreground">{d.seconds ? Math.round(d.seconds / 60) : ""}</span>
              <div className="w-full rounded-t-lg bg-brand" style={{ height: `${(d.seconds / max) * 100}%`, minHeight: d.seconds ? 4 : 0 }} />
              <span className="text-xs text-muted-foreground">{d.date.toLocaleDateString("ar-JO", { weekday: "short" })}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">الأرقام بالدقائق</p>
      </section>
      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="mb-4 font-semibold">حسب المادة</h2>
        {data.subjects.length === 0 && <p className="text-sm text-muted-foreground">لسا ما خلصت أي جلسة — ابدأ المؤقت من أي غرفة.</p>}
        <div className="space-y-3">
          {data.subjects.map((s) => (
            <div key={s.subject}>
              <div className="mb-1 flex justify-between text-sm"><span>{s.subject}</span><span className="text-muted-foreground">{hoursLabel(s.seconds)}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-brand" style={{ width: `${(s.seconds / maxSub) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Flame; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <Icon className="mb-2 size-6 text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
