import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/library_/upload")({
  validateSearch: (search: Record<string, unknown>): { tab?: "file" | "quiz" } => ({ tab: search['tab'] === "quiz" ? "quiz" : "file" }),
  head: () => ({ meta: [{ title: "رفع ملف أو اختبار | درسنا جو" }, { name: "description", content: "شارك ملفاتك وأسئلة الاختبارات مع طلاب درسنا جو للمراجعة والنشر." }, { property: "og:title", content: "رفع ملف أو اختبار | درسنا جو" }, { property: "og:description", content: "مشاركة الملفات وأسئلة الاختبارات للمراجعة." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: lazyRouteComponent(() => import("@/components/pages/library-upload"), "LibraryUpload"),
});
