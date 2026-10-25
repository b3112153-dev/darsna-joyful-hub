import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { useMe } from "@/hooks/use-auth";
import { useFocusMode } from "@/components/FocusMode";
import { FocusTimer } from "@/components/FocusTimer";
import { TodoList } from "@/components/TodoList";
import { Button } from "@/components/ui/button";
import { fmtClock } from "@/components/StudyRounds";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/UserAvatar";
import { WalletChip } from "@/components/WalletChip";
import { SoundsSheet } from "@/components/SoundsSheet";
import { Music4 } from "lucide-react";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/focus")({
  head: () => ({ meta: [
    { name: "robots", content: "noindex" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "الرئيسية | Darsna Jo" },
    { name: "description", content: "مؤقت الدراسة ومهامك اليومية في درسنا جو." },
    { property: "og:title", content: "الرئيسية | Darsna Jo" },
    { property: "og:description", content: "مؤقت الدراسة ومهامك اليومية في درسنا جو." },
  ] }),
  component: Focus,
});
function Focus() {
  const { user, me } = useMe();
  const { focus, enter, enabled, setEnabled } = useFocusMode();
  return <main className="mx-auto max-w-[480px] space-y-3.5 px-5 py-5 font-display">
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar path={me?.profile?.avatar_url} name={me?.profile?.display_name} className="size-11 shrink-0 rounded-[14px] border-0 bg-staff-foreground [&_span]:rounded-[14px] [&_span]:bg-staff-foreground [&_span]:text-primary-foreground" />
        <div className="min-w-0"><p className="text-[13px] text-muted-foreground">{t("أهلاً فيك")}</p><h1 className="truncate text-[18px] font-extrabold">{t("يلا نبدأ دراسة")}</h1></div>
      </div>
      <WalletChip userId={user?.id} />
    </div>
    <Link to="/board" className="flex items-center gap-3 rounded-[20px] border bg-card p-3 shadow-card transition hover:bg-secondary/50">
      <span className="grid size-9 place-items-center rounded-xl bg-staff text-staff-foreground"><Trophy className="size-5" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">{t("لوحة الأسبوع")}</span><span className="block text-xs text-muted-foreground">{t("ترتيبك بين طلاب دفعتك وجوائز الأسبوع")}</span></span>
    </Link>
    <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-3">
      <FocusTimer focus={focus} roomId={null} compact />
      <section className="flex min-w-0 flex-col rounded-[26px] bg-peach p-4 text-peach-foreground">
        <h2 className="text-[13px] font-semibold">{t("وضع التركيز")}</h2>
        <p className="mt-3 text-[15px] font-extrabold">{t("بعد ما تبدأ")}</p>
        <p className="mt-1 text-xs leading-6">{t("بتشوف بس المؤقت والمهام")}</p>
        <Switch dir="ltr" aria-label={t("تفعيل وضع التركيز")} checked={enabled} onCheckedChange={setEnabled} className="mt-auto h-[30px] w-14 border-0 bg-card data-[state=checked]:bg-card data-[state=unchecked]:bg-card [&_span]:size-6 [&_span]:bg-primary [&_span]:data-[state=checked]:translate-x-7 [&_span]:data-[state=unchecked]:translate-x-1" />
      </section>
    </div>
    {focus.session && <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[20px] border bg-card p-3 text-xs"><p className="min-w-0">{t("جلسة شغّالة:")} <span dir="ltr" className="inline-block font-bold tabular-nums">{fmtClock(focus.left * 1000)}</span></p><Button size="sm" variant="ghost" className="text-xs" onClick={enter}>{t("ارجع للتركيز")}</Button></div>}
    <SoundsSheet trigger={<button className="flex w-full items-center gap-3 rounded-[20px] border bg-card p-3 text-start shadow-card transition hover:bg-secondary/50"><span className="grid size-9 place-items-center rounded-xl bg-secondary"><Music4 className="size-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">{t("أصوات الدراسة")}</span><span className="block text-xs text-muted-foreground">{t("مطر، نار، بحر وعصافير — ادمج اللي بيريّحك")}</span></span></button>} />
    {user && <TodoList userId={user.id} />}
  </main>;
}
