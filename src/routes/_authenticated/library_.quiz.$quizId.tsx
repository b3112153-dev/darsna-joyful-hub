import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/library_/quiz/$quizId")({
  head: () => ({ meta: [{ title: "حل الاختبار | درسنا جو" }, { name: "description", content: "حل اختبارات التوجيهي وشاهد نتيجتك وإجاباتك في درسنا جو." }, { property: "og:title", content: "حل الاختبار | درسنا جو" }, { property: "og:description", content: "اختبارات التوجيهي ونتائجك المسجلة." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: lazyRouteComponent(() => import("@/components/pages/library-quiz"), "LibraryQuiz"),
});
