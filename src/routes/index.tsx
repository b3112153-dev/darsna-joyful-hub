import { createFileRoute, Link } from "@tanstack/react-router";
import { MessagesSquare, ShieldCheck, Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Darsna Jo | مجتمع طلاب التوجيهي الأردني" },
      { name: "description", content: "غرف دردشة لكل فرع من فروع التوجيهي الأردني، ادرس وناقش واسأل زملاءك." },
      { property: "og:title", content: "Darsna Jo | مجتمع طلاب التوجيهي الأردني" },
      { property: "og:description", content: "غرف دردشة لكل فرع من فروع التوجيهي الأردني، ادرس وناقش واسأل زملاءك." },
    ],
  }),
  component: Index,
});

const features = [
  { icon: MessagesSquare, title: "غرف حسب الفرع", text: "غرفة للصحي والهندسي، غرفة للأعمال واللغات، وغرفة مشتركة للكل." },
  { icon: Users, title: "زملاء من كل الأردن", text: "اسأل، جاوب، وشارك ملخصاتك مع طلاب من كل المحافظات." },
  { icon: ShieldCheck, title: "بيئة آمنة", text: "مشرفين يراقبوا المحتوى ويحافظوا على جو محترم." },
  { icon: BookOpen, title: "تركيز على الدراسة", text: "مساحة هادئة ونظيفة بدون تشتيت." },
];

function Index() {
  return (
    <div className="min-h-screen bg-sky">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4">
        <section className="grid items-center gap-10 py-12 md:grid-cols-2 md:py-20">
          <div className="space-y-6 text-center md:text-start">
            <span className="inline-block rounded-full border border-silver bg-card px-4 py-1 text-sm text-secondary-foreground">
              توجيهي 2026 🇯🇴
            </span>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              ادرس مع زملاءك في <span className="text-brand">Darsna Jo</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              منصة عربية لطلاب التوجيهي الأردني: غرف دردشة مباشرة لكل فرع، تسأل فيها وتتناقش وتحضّر للامتحانات مع غيرك.
            </p>
            <div className="flex flex-wrap justify-center gap-3 md:justify-start">
              <Button asChild size="lg" className="bg-brand shadow-soft">
                <Link to="/focus">ابدأ الدراسة الآن</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-silver-sheen">
                <Link to="/rooms">ادخل الدردشة</Link>
              </Button>
            </div>
          </div>
          <img
            src={hero}
            width={1280}
            height={960}
            alt="طلاب توجيهي يدرسون معاً"
            className="w-full rounded-3xl border-4 border-card shadow-soft"
          />
        </section>
        <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-card">
              <span className="mb-4 grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mb-1 font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
      <footer className="border-t bg-card py-6 text-center text-sm text-muted-foreground">
        © 2026 Darsna Jo — صُنع لطلاب الأردن
      </footer>
    </div>
  );
}
