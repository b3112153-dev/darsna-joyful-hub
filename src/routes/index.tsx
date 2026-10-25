import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { BookOpen, Timer, CalendarDays, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { useMe } from "@/hooks/use-auth";
import { PageState } from "@/components/PageState";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://drsna-joful.com/" },
      { name: "twitter:card", content: "summary" },
      { title: "درسنا جو: منصة دراسة جماعية لطلاب التوجيهي الأردني 2009 و2010" },
      { name: "description", content: "درسنا جو: منصة دراسة للتوجيهي الأردني (2009 و2010) فيها غرف دراسة ومؤقت تركيز وجدول حلّها ومكتبة ملفات واختبارات." },
      { property: "og:title", content: "درسنا جو: منصة دراسة جماعية لطلاب التوجيهي الأردني 2009 و2010" },
      { property: "og:description", content: "درسنا جو: منصة دراسة للتوجيهي الأردني (2009 و2010) فيها غرف دراسة ومؤقت تركيز وجدول حلّها ومكتبة ملفات واختبارات." },
    ],
    links: [{ rel: "canonical", href: "https://drsna-joful.com/" }],
  }),
  component: Index,
});

const features = [
  { icon: Users, title: "جولة الدراسة", text: "ادرس مع غيرك", color: "bg-secondary text-secondary-foreground", tilt: "-rotate-2" },
  { icon: Timer, title: "المؤقت", text: "تركيز بدون إزعاج", color: "bg-peach text-peach-foreground", tilt: "rotate-2" },
  { icon: CalendarDays, title: "حلّها", text: "جدول على قدّك", color: "bg-mint text-mint-foreground", tilt: "rotate-1" },
  { icon: BookOpen, title: "المكتبة", text: "ملفات من الطلاب", color: "bg-secondary text-secondary-foreground", tilt: "-rotate-1" },
];

function Index() {
  const { user, me, loading, isError, refetch } = useMe();
  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error(t("تعذر تسجيل الدخول عبر Google"));
  }
  if (loading) return <PageState loading />;
  if (user && isError) return <PageState error retry={() => void refetch()} />;
  if (user && me) return <Navigate to={me.isStaff || me.isOwner || me.isSupport || me.profile?.onboarded_v2 === true ? "/focus" : "/onboarding"} replace />;
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="rise-in text-center">
          <div className="mb-5 flex items-center justify-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><BookOpen className="size-7" /></span>
            <p className="font-display text-3xl font-bold">{t("درسنا جو")}</p>
          </div>
          <span className="inline-flex rounded-full border bg-card px-4 py-1.5 text-sm font-bold text-primary">{t("توجيهي 2009 و2010")}</span>
          <h1 className="mx-auto mt-6 max-w-2xl font-display text-4xl font-extrabold leading-normal sm:text-5xl">{t("الدراسة أخف لما نكون سوا")}</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">{t("غرف دراسة لكل جيل، مؤقت تركيز، وجدول على قدّك. وفي ناس حقيقية بتجاوبك لما تعلق.")}</p>
          <div className="mx-auto mt-7 flex max-w-sm flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="flex-1 rounded-2xl"><Link to="/auth">{t("إنشاء حساب")} <ArrowLeft className="size-4" /></Link></Button>
            <Button asChild size="lg" variant="outline" className="flex-1 rounded-2xl"><Link to="/auth">{t("عندي حساب")}</Link></Button>
          </div>
          <Button variant="ghost" onClick={google} className="mt-3 gap-2 text-muted-foreground"><span className="font-display font-bold" aria-hidden="true">G</span> {t("المتابعة باستخدام Google")}</Button>
        </section>
        <section className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 pb-5 sm:mt-14 sm:gap-6 lg:grid-cols-4">
          {features.map((f) => <article key={f.title} className={`rounded-3xl border p-4 shadow-card transition-transform hover:rotate-0 sm:p-6 ${f.color} ${f.tilt}`}>
            <f.icon className="mb-5 size-8" strokeWidth={1.5} />
            <h2 className="text-lg font-bold">{f.title}</h2>
            <p className="mt-1 text-sm leading-relaxed">{f.text}</p>
          </article>)}
        </section>
      </main>
      <footer className="border-t px-5 py-6 text-center text-sm text-muted-foreground">
        <p>{t("© 2026 Darsna Jo — جميع الحقوق محفوظة")}</p>
        <Link to="/terms" className="mt-2 inline-block underline underline-offset-4 hover:text-primary">{t("الشروط والخصوصية")}</Link>
      </footer>
    </div>
  );
}
