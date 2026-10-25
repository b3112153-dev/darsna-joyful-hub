import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BookOpen, Check, Flame, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { PageState } from "@/components/PageState";
import { Progress } from "@/components/ui/progress";
import { DHIKR_ENCOURAGEMENT, DHIKR_ITEMS, ammanDayOfYear, ammanHour, ammanToday, dhikrStreak, fardComplete, storyIndex, storyUnlocked } from "@/lib/dhikr";

type Story = { id: string; kind: string; title: string; body: string; source: string | null; sort: number };

export function Dhikr() {
  const { user, me } = useMe();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const today = ammanToday();
  const canManage = !!me && (me.isStaff || me.isSupport || me.isOwner);

  const dailyQuery = useQuery({
    queryKey: ["dhikr", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const since = new Date(`${today}T00:00:00Z`);
      since.setUTCDate(since.getUTCDate() - 60);
      const { data, error } = await supabase.from("dhikr_daily").select("day,items").eq("user_id", user!.id).gte("day", since.toISOString().slice(0, 10));
      if (error) throw error;
      return (data ?? []).map((row) => ({ day: row.day, items: Array.isArray(row.items) ? (row.items as string[]) : [] }));
    },
  });

  const storiesQuery = useQuery({
    queryKey: ["dhikr-stories"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("dhikr_stories").select("id,kind,title,body,source,sort").order("sort");
      if (error) throw error;
      return (data ?? []) as Story[];
    },
  });

  const todayItems = useMemo(() => dailyQuery.data?.find((row) => row.day === today)?.items ?? [], [dailyQuery.data, today]);
  const streak = useMemo(() => dhikrStreak(dailyQuery.data ?? [], today), [dailyQuery.data, today]);
  const doneCount = DHIKR_ITEMS.filter((item) => todayItems.includes(item.id)).length;
  const complete = fardComplete(todayItems);
  const encouragement = DHIKR_ENCOURAGEMENT[ammanDayOfYear() % DHIKR_ENCOURAGEMENT.length];
  const stories = storiesQuery.data ?? [];
  const story = stories.length ? stories[storyIndex(stories.length, ammanDayOfYear())] : null;
  const unlocked = storyUnlocked(todayItems, ammanHour());

  async function toggleItem(id: string) {
    if (!user || saving) return;
    setSaving(true);
    const next = todayItems.includes(id) ? todayItems.filter((item) => item !== id) : [...todayItems, id];
    try {
      const { error } = await supabase.from("dhikr_daily").upsert({ user_id: user.id, day: today, items: next } as never, { onConflict: "user_id,day" });
      if (error) throw error;
      if (!todayItems.includes(id) && fardComplete(next)) toast.success(encouragement);
      await qc.invalidateQueries({ queryKey: ["dhikr", user.id] });
    } catch { toast.error("تعذر الحفظ؛ حاول مرة ثانية."); }
    finally { setSaving(false); }
  }

  return (
    <main className="mx-auto max-w-[480px] space-y-4 px-5 py-6 font-display">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-[26px] font-extrabold">ذكرى</h1>
          <p className="text-sm text-muted-foreground">أذكارك وفرائضك اليومية، يوم {today}</p>
        </div>
        {canManage && (
          <Link to="/admin/dhikr" aria-label="إدارة قصص ذكرى" className="grid size-11 shrink-0 place-items-center rounded-[14px] border bg-card"><Settings2 className="size-5" /></Link>
        )}
      </div>

      <PageState loading={dailyQuery.isPending} error={dailyQuery.isError} retry={() => void dailyQuery.refetch()} />

      {dailyQuery.isSuccess && (
        <>
          <section className="space-y-2 rounded-[20px] border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between text-sm font-bold">
              <span>إنجاز اليوم: {doneCount} من {DHIKR_ITEMS.length}</span>
              <span className="flex items-center gap-1 text-primary"><Flame className="size-4" /> {streak} {streak === 1 ? "يوم" : "أيام"} متتالية</span>
            </div>
            <Progress value={(doneCount / DHIKR_ITEMS.length) * 100} className="h-2" aria-label="شريط إنجاز اليوم" />
            {complete && <p className="rounded-[14px] bg-secondary px-3 py-2 text-center text-sm font-bold">{encouragement}</p>}
          </section>

          <section className="space-y-2" aria-label="قائمة التأشير اليومية">
            {DHIKR_ITEMS.map((item) => {
              const checked = todayItems.includes(item.id);
              return (
                <button key={item.id} type="button" disabled={saving} onClick={() => void toggleItem(item.id)}
                  className={`flex w-full items-center gap-3 rounded-[18px] border p-3.5 text-start transition active:scale-[0.99] ${checked ? "border-primary bg-secondary" : "bg-card"}`}>
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full border ${checked ? "border-primary bg-primary text-primary-foreground" : "text-transparent"}`}><Check className="size-4" /></span>
                  <span className={`text-sm leading-6 ${checked ? "font-bold" : "font-semibold"}`}>{item.label}</span>
                </button>
              );
            })}
          </section>

          <section className="rounded-[20px] border bg-card p-4 shadow-card" aria-label="قصة اليوم">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold"><BookOpen className="size-4" /> قصة اليوم</h2>
            <PageState loading={storiesQuery.isPending} error={storiesQuery.isError} retry={() => void storiesQuery.refetch()} />
            {storiesQuery.isSuccess && stories.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">قريباً 🤍</p>}
            {storiesQuery.isSuccess && story && !unlocked && (
              <p className="py-4 text-center text-sm leading-7 text-muted-foreground">🔒 بتنفتح قصة اليوم بعد ما تكمل الفروض الخمسة، أو بعد الساعة ٨ مساءً.</p>
            )}
            {storiesQuery.isSuccess && story && unlocked && (
              <article className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">{story.kind === "muwashshah" ? "موشح أندلسي" : "قصة نبي"}</p>
                <h3 className="text-base font-extrabold">{story.title}</h3>
                <p className="whitespace-pre-wrap text-sm leading-7">{story.body}</p>
                {story.source && <p className="text-xs text-muted-foreground">المصدر: {story.source}</p>}
              </article>
            )}
          </section>
        </>
      )}
    </main>
  );
}
