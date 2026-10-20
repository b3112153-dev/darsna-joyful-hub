import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/banned")({
  head: () => ({
    meta: [
      { title: "الحساب موقوف | Darsna Jo" },
      { name: "description", content: "تم إيقاف هذا الحساب من الإدارة." },
      { property: "og:title", content: "الحساب موقوف | Darsna Jo" },
      { property: "og:description", content: "تم إيقاف هذا الحساب من الإدارة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <main className="grid min-h-screen place-items-center bg-sky px-4">
      <div className="max-w-md rounded-3xl border bg-card p-8 text-center shadow-soft">
        <h1 className="mb-2 text-2xl font-bold">حسابك موقوف</h1>
        <p className="mb-6 text-muted-foreground">الإدارة أوقفت حسابك بسبب مخالفة قواعد المجتمع. إذا بتشوف إنه في غلط، تواصل معنا عن طريق الإيميل.</p>
        <Link to="/" className="text-primary underline">الصفحة الرئيسية</Link>
      </div>
    </main>
  ),
});
