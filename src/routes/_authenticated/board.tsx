import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { useAvatarImages } from "@/hooks/use-avatar";
import { readData } from "@/lib/requests";
import { AvatarPreview } from "@/components/AvatarPreview";
import { PageState } from "@/components/PageState";
import { Button } from "@/components/ui/button";
import type { AvatarState } from "@/hooks/use-wallet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/board")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "لوحة الأسبوع | Darsna Jo" },
      { name: "description", content: "أكثر طلاب دفعتك دراسة هذا الأسبوع وجوائزهم." },
      { property: "og:title", content: "لوحة الأسبوع | Darsna Jo" },
      { property: "og:description", content: "أكثر طلاب دفعتك دراسة هذا الأسبوع وجوائزهم." },
    ],
  }),
  component: Board,
});

import { BOARD_PRIZES as PRIZES, weekDaysLeft } from "@/lib/avatar-shop";
import { t } from "@/lib/i18n";

type Row = { rank: number; user_id: string; nickname: string; avatar: AvatarState; hours: number; is_me: boolean };

function ammanNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Amman" }));
}

/** Week runs Saturday..Friday (Amman). Days left until the week ends. */
function daysLeft() {
  return weekDaysLeft(ammanNow().getDay());
}

function Board() {
  const { me } = useMe();
  const [offset, setOffset] = useState(0);
  const images = useAvatarImages();

  // Claim last week's prizes once, silently.
  useEffect(() => {
    void supabase.rpc("claim_last_week_prizes").then(() => undefined, () => undefined);
  }, []);

  const board = useQuery({
    queryKey: ["weekly-board", offset],
    staleTime: 60_000,
    queryFn: async () => ((await readData(supabase.rpc("weekly_board", { _offset: offset }))) ?? []) as Row[],
  });

  const rows = board.data ?? [];
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  const meRow = rows.find((r) => r.is_me);
  const ahead = meRow && meRow.rank > 1 ? rows.find((r) => r.rank === meRow.rank - 1) : null;
  const podium = [top3[1], top3[0], top3[2]].filter((r): r is Row => !!r);

  return (
    <main className="mx-auto max-w-lg px-4 pb-32 pt-6">
      <div className="flex items-center gap-3">
        <Button asChild size="icon" variant="ghost" aria-label={t("رجوع")}><Link to="/focus"><ArrowRight /></Link></Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{t("لوحة الأسبوع")}</h1>
          <p className="text-xs text-muted-foreground">تنتهي بعد {daysLeft()} {daysLeft() === 1 ? t("يوم") : "أيام"}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-1.5 rounded-2xl bg-library-tabs p-1.5">
        {[{ o: 0, label: "هذا الأسبوع" }, { o: -1, label: "الأسبوع الماضي" }].map((t) => (
          <button
            key={t.o}
            type="button"
            onClick={() => setOffset(t.o)}
            className={cn("flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition", offset === t.o ? "bg-card font-extrabold shadow-card" : "text-muted-foreground")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {board.isLoading && <PageState loading />}
      {board.isError && <PageState error retry={() => board.refetch()} />}
      {board.data && (
        <>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {rows.length} طالب درسوا هذا الأسبوع، وأول ١٠ بياخدوا جائزة
          </p>

          {rows.length === 0 && (
            <div className="mt-6 rounded-[20px] border bg-card p-8 text-center text-muted-foreground shadow-card">
              <Trophy className="mx-auto mb-2 size-8 text-primary" />
              {t("لسا ما حدا درس هذا الأسبوع — كون أولهم!")}
            </div>
          )}

          {top3.length > 0 && (
            <div className="mt-6 grid grid-cols-3 items-end gap-2">
              {podium.map((r) => (
                <div
                  key={r.user_id}
                  className={cn(
                    "flex flex-col items-center rounded-[20px] border bg-card p-3 text-center shadow-card",
                    r.rank === 1 ? "pb-6 ring-2 ring-staff" : "mt-6",
                  )}
                >
                  <span className={cn("mb-1 font-display text-lg font-extrabold", r.rank === 1 && "text-primary")}>#{r.rank}</span>
                  <AvatarPreview avatar={r.avatar} images={images.data ?? {}} gender={me?.profile?.gender} animate={false} className="size-16" />
                  <p className="mt-2 w-full truncate text-sm font-bold">{r.nickname || t("طالب")}</p>
                  <p className="text-xs text-muted-foreground">{r.hours} ساعة</p>
                  <span className="mt-1.5 rounded-full bg-staff px-2.5 py-0.5 text-xs font-bold text-staff-foreground">{PRIZES[r.rank]} JD</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 divide-y rounded-[20px] border bg-card shadow-card">
            {rest.map((r) => (
              <div key={r.user_id} className={cn("flex items-center gap-3 p-3", r.is_me && "bg-secondary/60")}>
                <span className="w-8 text-center font-display font-extrabold text-muted-foreground">{r.rank}</span>
                <AvatarPreview avatar={r.avatar} images={images.data ?? {}} gender={me?.profile?.gender} animate={false} className="size-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{r.nickname || t("طالب")}{r.is_me && t(" (أنت)")}</p>
                  <p className="text-xs text-muted-foreground">{r.hours} ساعة</p>
                </div>
                {PRIZES[r.rank] && (
                  <span className="rounded-full bg-staff px-2.5 py-0.5 text-xs font-bold text-staff-foreground">{PRIZES[r.rank]} JD</span>
                )}
              </div>
            ))}
          </div>

          <p className="mt-6 rounded-[20px] bg-secondary/50 p-4 text-center text-xs leading-6 text-muted-foreground">
            {t("اللوحة بتبدأ من جديد كل سبت. بتظهر الأسماء المستعارة والأفتارات بس، مش الأسماء الحقيقية. الجوائز لطلاب نفس دفعتك فقط.")}
          </p>
        </>
      )}

      {board.data && !meRow && (
        <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-lg px-4 pb-2 lg:bottom-4">
          <div className="rounded-[20px] border bg-card p-3 text-center text-sm font-semibold shadow-soft">
            {me?.profile?.gender === "female" ? t("أنتِ") : "أنت"} لسا خارج اللوحة — ابدأ جلسة دراسة وادخل الترتيب!
          </div>
        </div>
      )}
      {meRow && (
        <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-lg px-4 pb-2 lg:bottom-4">
          <div className="flex items-center gap-3 rounded-[20px] border bg-card p-3 shadow-soft">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand font-display text-sm font-extrabold text-primary-foreground">{meRow.rank}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{me?.profile?.gender === "female" ? t("أنتِ") : "أنت"}: {meRow.nickname || t("طالب")} · {meRow.hours} ساعة</p>
              {ahead && (
                <p className="text-xs text-muted-foreground">
                  ناقصك {(Math.max(0, ahead.hours - meRow.hours)).toFixed(1)} ساعة للمركز {ahead.rank}
                </p>
              )}
              {!ahead && <p className="text-xs text-muted-foreground">{t("أنت بالصدارة، حافظ عليها!")}</p>}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
