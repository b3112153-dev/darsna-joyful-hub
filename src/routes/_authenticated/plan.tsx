import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({ meta: [
    { title: "حلّها | درسنا جو" },
    { name: "description", content: "جدول دراسة منطقي على قدّ وقتك، من أول درس لحد الامتحان." },
    { property: "og:title", content: "حلّها | درسنا جو" },
    { property: "og:description", content: "جدول دراسة منطقي على قدّ وقتك." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: lazyRouteComponent(() => import("@/components/pages/plan"), "Plan"),
});
