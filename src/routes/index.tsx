import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpLeft,
  BookOpen,
  Heart,
  MessagesSquare,
  Sparkles,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Darsna Jo | مجتمع طلاب التوجيهي الأردني" },
      {
        name: "description",
        content:
          "مساحات للدردشة والأسئلة والملفات والتحفيز والتركيز لطلاب التوجيهي الأردني.",
      },
      {
        property: "og:title",
        content: "Darsna Jo | مجتمع طلاب التوجيهي الأردني",
      },
      {
        property: "og:description",
        content:
          "مساحات للدردشة والأسئلة والملفات والتحفيز والتركيز لطلاب التوجيهي الأردني.",
      },
    ],
  }),
  component: Index,
});

const spaces = [
  {
    icon: MessagesSquare,
    title: "الدردشة",
    text: "غرف للأعمال واللغات والصحي والهندسي، وساحة مشتركة لكل الطلاب.",
    to: "/rooms",
    action: "استكشف الغرف",
    extra: false,
  },
  {
    icon: BookOpen,
    title: "بنوك الأسئلة والملفات",
    text: "وصل سريع للملفات والمراجعات والمواضيع الدراسية.",
    to: "/library",
    action: "افتح المكتبة",
    extra: true,
  },
  {
    icon: Heart,
    title: "التحفيز",
    text: "شارك إنجازًا أو صورة وذكرى تشجّع زملاءك.",
    to: "/motivation",
    action: "شارك لحظتك",
    extra: false,
  },
  {
    icon: Timer,
    title: "غرف التركيز",
    text: "مؤقّت خاص فيك وملاحظات تحفظ تلقائيًا، والدردشة تتوقف أثناء الدراسة.",
    to: "/study",
    action: "ابدأ جلسة تركيز",
    extra: false,
  },
] as const;

function Index() {
  return (
    <div className="min-h-screen bg-sky">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-14">
        <section className="grid items-center gap-9 py-10 md:grid-cols-[1.05fr_0.95fr] md:py-16">
          <div className="space-y-6 text-center md:text-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-silver bg-card/80 px-4 py-1.5 text-sm font-medium text-secondary-foreground shadow-card">
              <Sparkles className="size-4 text-primary" />
              مجتمع طلاب التوجيهي الأردني
            </span>
            <h1 className="mx-auto max-w-2xl text-4xl font-bold leading-[1.25] md:mx-0 md:text-5xl">
              كل اللي تحتاجه لدراستك،{" "}
              <span className="text-brand">بمكان واحد</span>
            </h1>
            <p className="mx-auto max-w-xl text-lg leading-8 text-muted-foreground md:mx-0">
              اسأل زملاءك، اعثر على ملفات وأسئلة، شارك لحظاتك، وادرس بتركيز مع
              مؤقّت وملاحظاتك الخاصة.
            </p>
            <div className="flex flex-wrap justify-center gap-3 md:justify-start">
              <Button asChild size="lg" className="bg-brand shadow-soft">
                <Link to="/rooms">
                  ابدأ من غرف الدردشة <ArrowUpLeft className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="bg-card/70"
              >
                <Link to="/auth">إنشاء حساب</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              مساحات منظّمة حسب التخصص، مع تجربة عربية كاملة.
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-3 rounded-[2rem] bg-brand opacity-15 blur-2xl" />
            <img
              src={hero}
              width={1280}
              height={960}
              alt="طلاب توجيهي يدرسون معاً"
              className="relative aspect-[4/3] w-full rounded-[2rem] border-4 border-card object-cover shadow-soft"
            />
            <div className="absolute bottom-4 right-4 left-4 flex items-center justify-between gap-3 rounded-2xl border bg-card/90 p-4 shadow-card backdrop-blur">
              <div>
                <p className="font-semibold">خطوة صغيرة كل يوم</p>
                <p className="text-sm text-muted-foreground">بتقرّبك من هدفك</p>
              </div>
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <Heart className="size-5" />
              </span>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-1 text-sm font-semibold text-primary">
                مساحتك الدراسية
              </p>
              <h2 className="text-2xl font-bold md:text-3xl">
                اختَر من وين تبدأ
              </h2>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              أربع قوائم واضحة توصّلك مباشرة للأشياء اللي تستخدمها كل يوم.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {spaces.map((space) => (
              <article
                key={space.title}
                className="group flex min-h-56 flex-col rounded-2xl border bg-card p-5 shadow-card transition hover:-translate-y-1 hover:shadow-soft"
              >
                <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <space.icon className="size-5" />
                </span>
                <h3 className="mb-2 font-semibold">{space.title}</h3>
                <p className="mb-5 flex-1 text-sm leading-6 text-muted-foreground">
                  {space.text}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
                  <Link
                    to={space.to}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {space.action} <ArrowUpLeft className="size-4" />
                  </Link>
                  {space.extra && (
                    <Link
                      to="/topics"
                      className="text-muted-foreground hover:text-primary hover:underline"
                    >
                      مواضيع ونقاشات
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t bg-card py-6 text-center text-sm text-muted-foreground">
        © 2026 Darsna Jo — صُنع لطلاب الأردن
      </footer>
    </div>
  );
}
